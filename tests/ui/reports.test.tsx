import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockFrom, mockReplace, state, router, client } = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockReplace = vi.fn();
  const state = {
    scans: [] as unknown[],
    findings: [] as unknown[],
    error: null as unknown,
    deleted: [] as string[],
    deleteRowsReturned: true,
    deleteError: null as unknown,
  };
  const router = { replace: mockReplace, push: vi.fn() };
  const client = { auth: { getUser: mockGetUser }, from: mockFrom };
  return { mockGetUser, mockFrom, mockReplace, state, router, client };
});

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../../src/lib/supabase/browser", () => ({ createSupabaseBrowserClient: () => client }));

import DashboardPage from "../../src/app/dashboard/page";
import FindingsPage from "../../src/app/findings/page";

function query(table: "scans" | "findings") {
  const result = Promise.resolve(
    state.error
      ? { data: null, error: state.error }
      : { data: table === "scans" ? state.scans : state.findings, error: null },
  );
  const builder = { order: () => builder, then: result.then.bind(result) };
  return builder;
}

function deleteChain(table: string) {
  return {
    eq: (_column: string, id: string) => ({
      select: () => {
        state.deleted.push(`${table}:${id}`);
        if (state.deleteError) return Promise.resolve({ data: null, error: state.deleteError });
        return Promise.resolve({ data: state.deleteRowsReturned ? [{ id }] : [], error: null });
      },
    }),
  };
}

const scans = [
  { id: "s1", file_name: "older.csv", created_at: "2026-10-20T09:00:00+00:00", overall_risk: "Low", total_findings: 1 },
  { id: "s2", file_name: "newer.txt", created_at: "2026-10-21T10:00:00+00:00", overall_risk: "Critical", total_findings: 3 },
];

const findings = [
  { id: "f1", scan_id: "s1", detector_type: "email", risk: "Low", occurrence_count: 1, masked_example: "u***@example.test" },
  { id: "f2", scan_id: "s2", detector_type: "payment_card", risk: "Critical", occurrence_count: 2, masked_example: "4111 **** **** 1111" },
  { id: "f3", scan_id: "s2", detector_type: "email", risk: "Low", occurrence_count: 1, masked_example: "a***@example.test" },
];

beforeEach(() => {
  mockGetUser.mockReset();
  mockFrom.mockReset();
  mockReplace.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mockFrom.mockImplementation((table: "scans" | "findings") => ({
    select: () => query(table),
    delete: () => deleteChain(table),
  }));
  state.scans = scans;
  state.findings = findings;
  state.error = null;
  state.deleted = [];
  state.deleteRowsReturned = true;
  state.deleteError = null;
});

describe("DashboardPage", () => {
  it("shows summary metrics, the risk distribution and recent scans", async () => {
    render(<DashboardPage />);
    expect(await screen.findByText("Files scanned")).toBeInTheDocument();

    const metric = screen.getByText("Files scanned").closest("section") as HTMLElement;
    expect(within(metric).getByText("2")).toBeInTheDocument();
    const findingsMetric = screen.getByText("Total findings", { selector: ".lp-card__title" }).closest("section") as HTMLElement;
    expect(within(findingsMetric).getByText("4")).toBeInTheDocument();
    const criticalMetric = screen.getByText("Critical-risk files", { selector: ".lp-card__title" }).closest("section") as HTMLElement;
    expect(within(criticalMetric).getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Low share of files" })).toHaveAttribute("aria-valuenow", "50");

    const history = screen.getByText("Scan history").closest("section") as HTMLElement;
    const rows = within(history).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("newer.txt");
    expect(rows[2]).toHaveTextContent("older.csv");
  });

  it("deletes a scan after confirmation and updates the history and summary", async () => {
    render(<DashboardPage />);
    await screen.findByText("Files scanned");

    fireEvent.click(screen.getByRole("button", { name: "Delete older.csv" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(screen.queryByText("older.csv")).not.toBeInTheDocument());
    expect(state.deleted).toEqual(["scans:s1"]);
    const metric = screen.getByText("Files scanned").closest("section") as HTMLElement;
    expect(within(metric).getByText("1")).toBeInTheDocument();
  });

  it("cancels a delete without calling the database", async () => {
    render(<DashboardPage />);
    await screen.findByText("Files scanned");

    fireEvent.click(screen.getByRole("button", { name: "Delete older.csv" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: "Confirm delete" })).not.toBeInTheDocument();
    expect(screen.getByText("older.csv")).toBeInTheDocument();
    expect(state.deleted).toEqual([]);
  });

  it("keeps the scan and shows an error when the delete is refused", async () => {
    state.deleteRowsReturned = false;
    render(<DashboardPage />);
    await screen.findByText("Files scanned");

    fireEvent.click(screen.getByRole("button", { name: "Delete older.csv" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(
      await screen.findByText("That scan could not be deleted. Refresh the page and try again."),
    ).toBeInTheDocument();
    expect(screen.getByText("older.csv")).toBeInTheDocument();
  });

  it("pages the scan history ten rows at a time", async () => {
    state.scans = Array.from({ length: 12 }, (_, index) => ({
      id: `m${index}`,
      file_name: `file-${String(index + 1).padStart(2, "0")}.csv`,
      created_at: `2026-10-${String(index + 1).padStart(2, "0")}T09:00:00+00:00`,
      overall_risk: "Low",
      total_findings: 0,
    }));
    render(<DashboardPage />);
    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("file-12.csv")).toBeInTheDocument();
    expect(screen.queryByText("file-02.csv")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Showing 11 to 12 of 12 scans.")).toBeInTheDocument();
    expect(screen.getByText("file-02.csv")).toBeInTheDocument();
    expect(screen.queryByText("file-12.csv")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("shows an empty state with a link to upload when nothing has been scanned", async () => {
    state.scans = [];
    state.findings = [];
    render(<DashboardPage />);
    expect(await screen.findByText("No files have been scanned yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload a file" })).toHaveAttribute("href", "/upload");
  });

  it("shows an error message when the scans cannot be loaded", async () => {
    state.error = { message: "boom" };
    render(<DashboardPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Your scans could not be loaded.");
  });

  it("redirects to sign-in when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    render(<DashboardPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("FindingsPage", () => {
  it("lists findings with their file names, newest scan first", async () => {
    render(<FindingsPage />);
    expect(await screen.findByText("Showing 1 to 3 of 3 findings.")).toBeInTheDocument();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("newer.txt");
    expect(rows[1]).toHaveTextContent("4111 **** **** 1111");
    expect(rows[3]).toHaveTextContent("older.csv");
  });

  it("filters by finding type and marks the selected option as pressed", async () => {
    render(<FindingsPage />);
    await screen.findByText("Showing 1 to 3 of 3 findings.");

    fireEvent.click(screen.getByRole("button", { name: "Email address" }));

    expect(await screen.findByText("Showing 1 to 2 of 2 findings. Filters or search are applied.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Email address" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All types" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("4111 **** **** 1111")).not.toBeInTheDocument();
  });

  it("combines type and risk filters and shows an empty state when nothing matches", async () => {
    render(<FindingsPage />);
    await screen.findByText("Showing 1 to 3 of 3 findings.");

    fireEvent.click(screen.getByRole("button", { name: "Email address" }));
    fireEvent.click(screen.getByRole("button", { name: "Critical" }));

    expect(
      await screen.findByText("No findings match these filters or search. Change them to see more results."),
    ).toBeInTheDocument();
  });

  it("searches by file name and narrows the rows", async () => {
    render(<FindingsPage />);
    await screen.findByText("Showing 1 to 3 of 3 findings.");

    fireEvent.change(screen.getByLabelText("Search by file name"), { target: { value: "NEWER" } });

    expect(await screen.findByText("Showing 1 to 2 of 2 findings. Filters or search are applied.")).toBeInTheDocument();
    expect(screen.queryByText("older.csv")).not.toBeInTheDocument();
  });

  it("sorts by file name and flips the direction on a second click", async () => {
    render(<FindingsPage />);
    await screen.findByText("Showing 1 to 3 of 3 findings.");

    fireEvent.click(screen.getByRole("button", { name: /File name/ }));
    const header = screen.getByRole("columnheader", { name: /File name/ });
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(within(screen.getByRole("table")).getAllByRole("row")[1]).toHaveTextContent("newer.txt");

    fireEvent.click(screen.getByRole("button", { name: /File name/ }));
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(within(screen.getByRole("table")).getAllByRole("row")[1]).toHaveTextContent("older.csv");
  });

  it("pages the findings ten rows at a time", async () => {
    state.findings = Array.from({ length: 12 }, (_, index) => ({
      id: `x${index}`,
      scan_id: "s1",
      detector_type: "email",
      risk: "Low",
      occurrence_count: 1,
      masked_example: `m${index}***@example.test`,
    }));
    render(<FindingsPage />);
    expect(await screen.findByText("Showing 1 to 10 of 12 findings.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Showing 11 to 12 of 12 findings.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("shows an empty state when there are no findings", async () => {
    state.findings = [];
    render(<FindingsPage />);
    expect(await screen.findByText("No findings yet. Upload a file to scan it.")).toBeInTheDocument();
  });

  it("shows an error message when the findings cannot be loaded", async () => {
    state.error = { message: "boom" };
    render(<FindingsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Your findings could not be loaded.");
  });
});
