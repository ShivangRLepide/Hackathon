import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockFrom, mockReplace, state, router, client } = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockReplace = vi.fn();
  const state = { scans: [] as unknown[], findings: [] as unknown[], error: null as unknown };
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
  mockFrom.mockImplementation((table: "scans" | "findings") => ({ select: () => query(table) }));
  state.scans = scans;
  state.findings = findings;
  state.error = null;
});

describe("DashboardPage", () => {
  it("shows summary metrics, the risk distribution and recent scans", async () => {
    render(<DashboardPage />);
    expect(await screen.findByText("Files scanned")).toBeInTheDocument();

    const metric = screen.getByText("Files scanned").closest("section") as HTMLElement;
    expect(within(metric).getByText("2")).toBeInTheDocument();
    const findingsMetric = screen.getByText("Findings", { selector: ".lp-card__title" }).closest("section") as HTMLElement;
    expect(within(findingsMetric).getByText("4")).toBeInTheDocument();

    const recent = screen.getByText("Recent scans").closest("section") as HTMLElement;
    const rows = within(recent).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("newer.txt");
    expect(rows[2]).toHaveTextContent("older.csv");
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
    expect(await screen.findByText("Showing 3 of 3 findings.")).toBeInTheDocument();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("newer.txt");
    expect(rows[1]).toHaveTextContent("4111 **** **** 1111");
    expect(rows[3]).toHaveTextContent("older.csv");
  });

  it("filters by finding type and marks the selected option as pressed", async () => {
    render(<FindingsPage />);
    await screen.findByText("Showing 3 of 3 findings.");

    fireEvent.click(screen.getByRole("button", { name: "Email address" }));

    expect(await screen.findByText("Showing 2 of 3 findings. Filters are applied.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Email address" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All types" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("4111 **** **** 1111")).not.toBeInTheDocument();
  });

  it("combines type and risk filters and shows an empty state when nothing matches", async () => {
    render(<FindingsPage />);
    await screen.findByText("Showing 3 of 3 findings.");

    fireEvent.click(screen.getByRole("button", { name: "Email address" }));
    fireEvent.click(screen.getByRole("button", { name: "Critical" }));

    expect(
      await screen.findByText("No findings match these filters. Choose other filters to see more results."),
    ).toBeInTheDocument();
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
