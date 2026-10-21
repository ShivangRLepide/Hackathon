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

const UPLOAD_LABEL = "Accepted types: CSV or TXT, 1 byte to 1 MiB";

function chooseFile(name = "sample.csv") {
  const input = screen.getByLabelText(UPLOAD_LABEL) as HTMLInputElement;
  const file = new File(["Name,Email\nSynthetic,user@example.test\n"], name, { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
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
  const button = await screen.findByRole("button", { name: "Upload file" });
  expect(screen.getByRole("heading", { name: "Upload a file" })).toBeInTheDocument();
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
  await screen.findByRole("button", { name: "Upload file" });
  chooseFile();
  fireEvent.click(screen.getByRole("button", { name: "Upload file" }));

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
  await screen.findByRole("button", { name: "Upload file" });
  chooseFile("data.json");
  fireEvent.click(screen.getByRole("button", { name: "Upload file" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Only CSV or TXT files are accepted.");
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
  await screen.findByRole("button", { name: "Upload file" });
  chooseFile();
  fireEvent.click(screen.getByRole("button", { name: "Upload file" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("The scan could not be saved");
  expect(screen.queryByText("Scan result")).not.toBeInTheDocument();
});

test("an expired session during scan sends the user back to sign-in", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "not_signed_in" }), { status: 401 })),
  );
  render(<UploadPage />);
  await screen.findByRole("button", { name: "Upload file" });
  chooseFile();
  fireEvent.click(screen.getByRole("button", { name: "Upload file" }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
});
