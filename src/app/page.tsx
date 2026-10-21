"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        setError("Sign-in failed. Check your email and password, then try again.");
        setSubmitting(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Sign-in failed. Check your email and password, then try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="page-body">
      <h1 className="page-title">MiniDSP Data Discovery</h1>

      <section className="lp-card lp-card--elevated lp-card--borderless" aria-labelledby="sign-in-title">
        <div className="lp-card__header">
          <div className="lp-card__title" id="sign-in-title">Sign in</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lp-card__body form-stack">
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
                <label className="lp-input__label" htmlFor="sign-in-email">Work email</label>
                <div className="lp-input__field">
                  <input
                    className="lp-input__input"
                    id="sign-in-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="lp-input lp-input--full-width">
              <div className="lp-input__row lp-input__row--label-top">
                <label className="lp-input__label" htmlFor="sign-in-password">Password</label>
                <div className="lp-input__field">
                  <input
                    className="lp-input__input"
                    id="sign-in-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lp-card__footer footer-actions">
            <button className="lp-button lp-button--primary lp-button--md" type="submit" disabled={submitting}>
              Sign in
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
