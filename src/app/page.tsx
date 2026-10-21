"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/PasswordField";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { GENERIC_SIGN_IN_ERROR, signInErrorMessage } from "../lib/auth/messages";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    createSupabaseBrowserClient().auth.getUser().then(({ data: { user } }) => {
      if (active && user) router.replace("/dashboard");
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInErrorMessage(signInError));
        setSubmitting(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError(GENERIC_SIGN_IN_ERROR);
      setSubmitting(false);
    }
  }

  return (
    <AuthShell label="Sign in">
      <form className="form-stack" onSubmit={handleSubmit}>
        {error && (
          <div className="lp-message lp-message--error" role="alert">
            <div className="lp-message__content">
              <div className="lp-message__text">
                <h3 className="lp-message__title">Sign-in failed</h3>
                <p className="lp-message__body">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="lp-input lp-input--full-width">
          <div className="lp-input__row lp-input__row--label-top">
            <label className="lp-input__label" htmlFor="sign-in-email">Email</label>
            <div className="lp-input__field">
              <input
                className="lp-input__input"
                id="sign-in-email"
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
          id="sign-in-password"
          name="password"
          label="Password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />

        <button
          className="lp-button lp-button--primary lp-button--md lp-button--full-width"
          type="submit"
          disabled={submitting}
        >
          Sign In
        </button>

        <p className="signin-switch">
          New here?{" "}
          <Link className="lp-link lp-link--inline" href="/signup">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
