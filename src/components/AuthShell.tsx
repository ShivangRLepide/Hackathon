import type { ReactNode } from "react";

// Shared chrome for signed-out pages: logo, card and a screen-reader product heading.
export function AuthShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <main className="signin-page">
      <h1 className="visually-hidden">MiniDSP Data Discovery</h1>

      <section className="lp-card lp-card--elevated lp-card--borderless signin-card" aria-label={label}>
        <div className="lp-card__body form-stack">
          <div className="signin-logo">
            <svg width="36" height="28" viewBox="0 0 36 28" aria-hidden="true" focusable="false">
              <polygon points="8,0 14,0 6,28 0,28" />
              <polygon points="18,0 24,0 16,28 10,28" />
              <polygon points="28,0 34,0 26,28 20,28" />
            </svg>
            <span>Lepide</span>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}
