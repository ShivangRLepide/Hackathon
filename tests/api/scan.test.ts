import { beforeEach, expect, test, vi } from "vitest";

const { mockGetUser, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [] }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser }, rpc: mockRpc }),
}));

import { POST } from "../../src/app/api/scan/route";

const RAW_EMAIL = "user@example.test";

function uploadRequest(file: File): Request {
  const body = new FormData();
  body.append("file", file);
  return { headers: new Headers(), formData: async () => body } as unknown as Request;
}

const csvWithEmail = () =>
  new File([`Name,Email\nSynthetic,${RAW_EMAIL}\n`], "people.csv", { type: "text/csv" });

beforeEach(() => {
  mockGetUser.mockReset();
  mockRpc.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mockRpc.mockResolvedValue({ data: "11111111-2222-4333-8444-555555555555", error: null });
});

test("returns 401 and saves nothing when there is no session", async () => {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await POST(uploadRequest(csvWithEmail()));
  expect(response.status).toBe(401);
  expect(mockRpc).not.toHaveBeenCalled();
});

test("returns 400 for an unsupported file and saves nothing", async () => {
  const response = await POST(uploadRequest(new File(["{}"], "data.json", { type: "application/json" })));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "unsupported_type" });
  expect(mockRpc).not.toHaveBeenCalled();
});

test("saves masked results through save_scan and returns the scan id", async () => {
  const response = await POST(uploadRequest(csvWithEmail()));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");

  expect(mockRpc).toHaveBeenCalledWith(
    "save_scan",
    expect.objectContaining({
      p_file_name: "people.csv",
      p_file_type: "csv",
      p_overall_risk: "Low",
      p_findings: [expect.objectContaining({ type: "email", count: 1 })],
    }),
  );

  const body = await response.json();
  expect(body.scanId).toBe("11111111-2222-4333-8444-555555555555");
  expect(JSON.stringify(body)).not.toContain(RAW_EMAIL);
  expect(JSON.stringify(mockRpc.mock.calls)).not.toContain(RAW_EMAIL);
});

test("returns save_failed when the save does not succeed", async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: "insert failed" } });
  const response = await POST(uploadRequest(csvWithEmail()));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "save_failed" });
});
