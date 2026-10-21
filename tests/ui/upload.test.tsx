import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import UploadPage from "../../src/app/upload/page";

const { mockGetUser, mockReplace, router } = vi.hoisted(() => {
  const mockReplace = vi.fn();
  return { mockGetUser: vi.fn(), mockReplace, router: { replace: mockReplace } };
});

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("../../src/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({ auth: { getUser: mockGetUser } }),
}));

const UPLOAD_LABEL = "Choose file";

function makeFile(name = "sample.csv", content = "Name,Email\nSynthetic,user@example.test\n") {
  return new File([content], name, { type: "text/csv" });
}

function chooseFiles(files: File[]) {
  const input = screen.getByLabelText(UPLOAD_LABEL) as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

function chooseFile(name = "sample.csv") {
  chooseFiles([makeFile(name)]);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockReplace.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("signed-out visitors are sent back to sign-in", async () => {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  render(<UploadPage />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
});

test("signed-in users see the upload form with the button disabled until a file is chosen", async () => {
  render(<UploadPage />);
  const button = await screen.findByRole("button", { name: "Upload and scan" });
  expect(screen.getByRole("heading", { name: "Upload and scan" })).toBeInTheDocument();
  expect(button).toBeDisabled();
  chooseFile();
  expect(button).toBeEnabled();
});

test("a successful scan shows the overall risk and each finding type", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          fileType: "csv",
          sizeBytes: 40,
          risk: "Low",
          findings: [{ type: "email", risk: "Low", count: 1, maskedExample: "u***@example.test" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload and scan" });
  chooseFile();
  fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));

  const heading = await screen.findByText("Scan result");
  expect(heading.closest("section")).toHaveTextContent("Overall risk: Low");
  expect(screen.getByText("Email address")).toBeInTheDocument();
  expect(screen.getByText("u***@example.test")).toBeInTheDocument();
});

test("a rejected file shows the matching error message in an alert", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "unsupported_type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload and scan" });
  chooseFile("data.txt");
  fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Only CSV or TXT files are accepted.");
});

test("files that fail the pre-check are marked as not saved and never uploaded", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload and scan" });
  chooseFile("data.json");

  expect(await screen.findByRole("alert")).toHaveTextContent("Only CSV or TXT files are accepted.");
  expect(screen.getByText("Not saved")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload and scan" })).toBeDisabled();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("files over 1 MiB are rejected before upload", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload and scan" });
  chooseFiles([makeFile("big.csv", "a".repeat(1_048_577))]);

  expect(await screen.findByRole("alert")).toHaveTextContent("The file is larger than 1 MiB.");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("several files are scanned one at a time with a status for each", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      jsonResponse({ scanId: "s1", fileType: "csv", sizeBytes: 40, risk: "None", findings: [] }),
    )
    .mockResolvedValueOnce(jsonResponse({ error: "save_failed" }, 500));
  vi.stubGlobal("fetch", fetchMock);
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload and scan" });
  chooseFiles([makeFile("first.csv"), makeFile("second.csv")]);
  fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));

  expect(await screen.findByText("Scan result")).toBeInTheDocument();
  expect(screen.getByText("Saved")).toBeInTheDocument();
  expect(screen.getByText("Not saved")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("second.csv: The scan could not be saved");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("the size and type limit is shown before any file is chosen", async () => {
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload and scan" });
  expect(screen.getByText("CSV or TXT, up to 1 MiB each.")).toBeInTheDocument();
});

test("dropped files join the queue", async () => {
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload and scan" });
  const dropzone = screen.getByText("Drag files here, or choose them below.").closest(".upload-dropzone");
  if (!dropzone) throw new Error("drop zone not found");
  fireEvent.drop(dropzone, { dataTransfer: { files: [makeFile("dropped.csv")] } });

  expect(screen.getByText("dropped.csv")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload and scan" })).toBeEnabled();
});

test("clear list removes every file from the queue", async () => {
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload and scan" });
  chooseFile("sample.csv");
  fireEvent.click(screen.getByRole("button", { name: "Clear list" }));

  expect(screen.queryByText("sample.csv")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload and scan" })).toBeDisabled();
});

test("a failed save shows a message and no results", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "save_failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload and scan" });
  chooseFile();
  fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("The scan could not be saved");
  expect(screen.queryByText("Scan result")).not.toBeInTheDocument();
});

test("an expired session during scan sends the user back to sign-in", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "not_signed_in" }), { status: 401 })),
  );
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload and scan" });
  chooseFile();
  fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
});
