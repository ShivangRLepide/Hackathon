import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import Home from "../../src/app/page";

const { mockSignIn, mockPush } = vi.hoisted(() => ({ mockSignIn: vi.fn(), mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("../../src/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signInWithPassword: mockSignIn } }),
}));

beforeEach(() => {
  mockSignIn.mockReset();
  mockPush.mockReset();
});

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Work email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

test("home page shows the app name, both fields and an enabled sign-in button", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: "MiniDSP Data Discovery" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  expect(screen.getByLabelText("Work email")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
});

test("valid credentials sign in and move to the upload page", async () => {
  mockSignIn.mockResolvedValue({ data: {}, error: null });
  render(<Home />);
  fillAndSubmit("user@example.test", "not-a-real-secret");
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  expect(mockSignIn).toHaveBeenCalledWith({
    email: "user@example.test",
    password: "not-a-real-secret",
  });
});

test("rejected credentials show one generic error and stay on the page", async () => {
  mockSignIn.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });
  render(<Home />);
  fillAndSubmit("someone@example.test", "wrong-password");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Sign-in failed. Check your email and password, then try again.",
  );
  expect(screen.queryByText(/Invalid login credentials/)).not.toBeInTheDocument();
  expect(mockPush).not.toHaveBeenCalled();
});
