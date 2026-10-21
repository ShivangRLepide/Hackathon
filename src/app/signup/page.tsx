"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "../../components/AuthShell";
import { PasswordField } from "../../components/PasswordField";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { GENERIC_SIGN_UP_ERROR, signUpErrorMessage } from "../../lib/auth/messages";

const MIN_PASSWORD_LENGTH = 8;

type Notice = {
  variant: "error" | "success";
  title: string;
  body: string;
};

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setNotice({
        variant: "error",
        title: "Check your password",
        body: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }
    if (password !== confirmPassword) {
      setNotice({
        variant: "error",
        title: "Check your password",
        body: "The passwords do not match.",
      });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const { data, error } = await createSupabaseBrowserClient().auth.signUp({ email, password });

      if (error) {
        setNotice({ variant: "error", title: "Sign-up failed", body: signUpErrorMessage(error) });
        setSubmitting(false);
        return;
      }

      // A session means email confirmation is off: the user is signed in straight away.
      if (data.session) {
        router.push("/dashboard");
        return;
      }

      // Supabase returns a user with no identities when the email is already registered.
      if (data.user && data.user.identities?.length === 0) {
        setNotice({
          variant: "error",
          title: "Sign-up failed",
          body: "An account with this email already exists. Sign in instead.",
        });
        setSubmitting(false);
        return;
      }

      setConfirmationSent(true);
      setNotice({
        variant: "success",
        title: "Check your email",
        body: "We sent a confirmation link to your address. Open it to activate your account, then sign in.",
      });
      setSubmitting(false);
    } catch {
      setNotice({ variant: "error", title: "Sign-up failed", body: GENERIC_SIGN_UP_ERROR });
      setSubmitting(false);
    }
  }

  return (
    <AuthShell label="Create account">
      <form className="form-stack" onSubmit={handleSubmit}>
        {notice && (
          <div
            className={`lp-message lp-message--${notice.variant}`}
            role={notice.variant === "error" ? "alert" : "status"}
          >
            <div className="lp-message__content">
              <div className="lp-message__text">
                <h3 className="lp-message__title">{notice.title}</h3>
                <p className="lp-message__body">{notice.body}</p>
              </div>
            </div>
          </div>
        )}

        {!confirmationSent && (
          <>
            <div className="lp-input lp-input--full-width">
              <div className="lp-input__row lp-input__row--label-top">
                <label className="lp-input__label" htmlFor="sign-up-email">Email</label>
                <div className="lp-input__field">
                  <input
                    className="lp-input__input"
                    id="sign-up-email"
                    name="email"
                    type="email"
                    placeholder="yourname@domain.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <PasswordField
              id="sign-up-password"
              name="password"
              label="Password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={setPassword}
            />

            <PasswordField
              id="sign-up-confirm-password"
              name="confirmPassword"
              label="Confirm password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={confirmPassword}
              onChange={setConfirmPassword}
            />

            <button
              className="lp-button lp-button--primary lp-button--md lp-button--full-width"
              type="submit"
              disabled={submitting}
            >
              Create account
            </button>
          </>
        )}

        <p className="signin-switch">
          Already have an account?{" "}
          <Link className="lp-link lp-link--inline" href="/">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
