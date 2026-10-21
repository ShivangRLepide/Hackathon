import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import Home from "../../src/app/page";

const { mockSignIn, mockGetUser, mockPush, mockReplace } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockGetUser: vi.fn(),
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
vi.mock("../../src/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithPassword: mockSignIn, getUser: mockGetUser },
  }),
}));

beforeEach(() => {
  mockSignIn.mockReset();
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  mockPush.mockReset();
  mockReplace.mockReset();
});

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
}

test("home page shows the app name, both fields and an enabled sign-in button", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: "MiniDSP Data Discovery" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
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

test("unconfirmed email shows a specific message", async () => {
  mockSignIn.mockResolvedValue({
    data: {},
    error: { code: "email_not_confirmed", message: "Email not confirmed" },
  });
  render(<Home />);
  fillAndSubmit("new@example.test", "not-a-real-secret");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Confirm your email address first.",
  );
  expect(mockPush).not.toHaveBeenCalled();
});

test("a user who is already signed in goes straight to the dashboard", async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  render(<Home />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
});

test("the page links to the sign-up page", () => {
  render(<Home />);
  expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
    "href",
    "/signup",
  );
});
