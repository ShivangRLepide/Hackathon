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
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="signin-page">
      <h1 className="visually-hidden">MiniDSP Data Discovery</h1>

      <section className="lp-card lp-card--elevated lp-card--borderless signin-card" aria-label="Sign in">
        <form onSubmit={handleSubmit}>
          <div className="lp-card__body form-stack">
            <div className="signin-logo">
              <svg width="36" height="28" viewBox="0 0 36 28" aria-hidden="true" focusable="false">
                <polygon points="8,0 14,0 6,28 0,28" />
                <polygon points="18,0 24,0 16,28 10,28" />
                <polygon points="28,0 34,0 26,28 20,28" />
              </svg>
              <span>Lepide</span>
            </div>

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

            <div className="lp-input lp-input--full-width">
              <div className="lp-input__row lp-input__row--label-top">
                <label className="lp-input__label" htmlFor="sign-in-password">Password</label>
                <div className="lp-input__field signin-password">
                  <input
                    className="lp-input__input"
                    id="sign-in-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    className="signin-password__toggle"
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <button
              className="lp-button lp-button--primary lp-button--md lp-button--full-width"
              type="submit"
              disabled={submitting}
            >
              Sign In
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
