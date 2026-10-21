import { beforeEach, expect, test, vi } from "vitest";

const { mockGetUser, mockFrom, state } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  state: { scans: [] as unknown[], findings: [] as unknown[], error: null as unknown },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [] }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}));

import { GET } from "../../src/app/api/export/route";

// A query builder that is awaitable and supports .order(), like the Supabase client.
function query(table: "scans" | "findings") {
  const result = Promise.resolve(
    state.error ? { data: null, error: state.error } : { data: table === "scans" ? state.scans : state.findings, error: null },
  );
  const builder = { order: () => builder, then: result.then.bind(result) };
  return builder;
}

const scans = [
  { id: "s1", file_name: "=cmd|people.csv", created_at: "2026-10-21T10:00:00+00:00", overall_risk: "High", total_findings: 2 },
];

const findings = [
  { id: "f1", scan_id: "s1", detector_type: "uk_nino", risk: "High", occurrence_count: 2, masked_example: "QQ ** ** ** C" },
  { id: "f2", scan_id: "other-user-scan", detector_type: "email", risk: "Low", occurrence_count: 1, masked_example: "u***@example.test" },
];

beforeEach(() => {
  mockGetUser.mockReset();
  mockFrom.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mockFrom.mockImplementation((table: "scans" | "findings") => ({ select: () => query(table) }));
  state.scans = scans;
  state.findings = findings;
  state.error = null;
});

test("returns 401 and reads nothing when there is no session", async () => {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await GET();
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "not_signed_in" });
  expect(mockFrom).not.toHaveBeenCalled();
});

test("returns a CSV attachment of masked findings and never caches it", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
  expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="minidsp-findings.csv"');
  expect(response.headers.get("Cache-Control")).toBe("no-store");

  const body = await response.text();
  expect(body.split("\r\n")[0]).toContain('"File name"');
  expect(body).toContain("QQ ** ** ** C");
  // Rows from scans not visible under RLS are dropped.
  expect(body).not.toContain("u***@example.test");
});

test("neutralises formula-leading file names in the export", async () => {
  const response = await GET();
  const body = await response.text();
  expect(body).toContain('"\'=cmd|people.csv"');
  expect(body).not.toContain('"=cmd|people.csv"');
});

test("returns 500 with a generic error when a query fails", async () => {
  state.error = { message: "database detail that must not leak" };
  const response = await GET();
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "export_failed" });
});
