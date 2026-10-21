import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import SignUp from "../../src/app/signup/page";

const { mockSignUp, mockPush } = vi.hoisted(() => ({ mockSignUp: vi.fn(), mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: vi.fn() }) }));
vi.mock("../../src/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signUp: mockSignUp } }),
}));

beforeEach(() => {
  mockSignUp.mockReset();
  mockPush.mockReset();
});

function fillForm(email: string, password: string, confirm: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirm } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

test("sign-up page shows the fields and a link back to sign-in", () => {
  render(<SignUp />);
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
  expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/");
});

test("mismatched passwords are rejected before any request is sent", async () => {
  render(<SignUp />);
  fillForm("new@example.test", "long-enough-1", "long-enough-2");
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("The passwords do not match.");
  expect(mockSignUp).not.toHaveBeenCalled();
});

test("passwords shorter than the minimum are rejected before any request is sent", async () => {
  render(<SignUp />);
  fillForm("new@example.test", "short", "short");
  fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent("Use at least 8 characters.");
  expect(mockSignUp).not.toHaveBeenCalled();
});

test("a session from sign-up goes straight to the dashboard", async () => {
  mockSignUp.mockResolvedValue({
    data: { session: { access_token: "t" }, user: { identities: [{ id: "i" }] } },
    error: null,
  });
  render(<SignUp />);
  fillForm("new@example.test", "long-enough-1", "long-enough-1");
  submit();
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  expect(mockSignUp).toHaveBeenCalledWith({
    email: "new@example.test",
    password: "long-enough-1",
  });
});

test("with email confirmation on, the user is asked to check their inbox", async () => {
  mockSignUp.mockResolvedValue({
    data: { session: null, user: { identities: [{ id: "i" }] } },
    error: null,
  });
  render(<SignUp />);
  fillForm("new@example.test", "long-enough-1", "long-enough-1");
  submit();
  expect(await screen.findByRole("status")).toHaveTextContent("Check your email");
  expect(mockPush).not.toHaveBeenCalled();
});

test("an email that is already registered is reported without a session", async () => {
  mockSignUp.mockResolvedValue({
    data: { session: null, user: { identities: [] } },
    error: null,
  });
  render(<SignUp />);
  fillForm("taken@example.test", "long-enough-1", "long-enough-1");
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
  expect(mockPush).not.toHaveBeenCalled();
});

test("a project with sign-up turned off shows a clear message", async () => {
  mockSignUp.mockResolvedValue({
    data: { session: null, user: null },
    error: { code: "signup_disabled", message: "Signups not allowed for this instance" },
  });
  render(<SignUp />);
  fillForm("new@example.test", "long-enough-1", "long-enough-1");
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("Sign-up is turned off");
});

test("a duplicate account error shows the sign-in hint", async () => {
  mockSignUp.mockResolvedValue({
    data: { session: null, user: null },
    error: { code: "user_already_exists", message: "User already registered" },
  });
  render(<SignUp />);
  fillForm("taken@example.test", "long-enough-1", "long-enough-1");
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("Sign in instead.");
});

test("an unexpected failure shows the generic sign-up message", async () => {
  mockSignUp.mockRejectedValue(new Error("network down"));
  render(<SignUp />);
  fillForm("new@example.test", "long-enough-1", "long-enough-1");
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not create your account. Try again.",
  );
});
