"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export type AppSection = "dashboard" | "upload" | "findings";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const ITEMS: { section: AppSection; label: string; href: string; icon: ReactNode }[] = [
  {
    section: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path {...STROKE} d="M4 4H10V12H4V4Z" />
        <path {...STROKE} d="M4 16H10V20H4V16Z" />
        <path {...STROKE} d="M14 12H20V20H14V12Z" />
        <path {...STROKE} d="M14 4H20V8H14V4Z" />
      </svg>
    ),
  },
  {
    section: "upload",
    label: "Upload",
    href: "/upload",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path {...STROKE} d="M12 15V4" />
        <path {...STROKE} d="M7 9L12 4L17 9" />
        <path {...STROKE} d="M4 15V19A1 1 0 0 0 5 20H19A1 1 0 0 0 20 19V15" />
      </svg>
    ),
  },
  {
    section: "findings",
    label: "Findings",
    href: "/findings",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path {...STROKE} d="M9 6H20" />
        <path {...STROKE} d="M9 12H20" />
        <path {...STROKE} d="M9 18H20" />
        <path {...STROKE} d="M4 6H4.01" />
        <path {...STROKE} d="M4 12H4.01" />
        <path {...STROKE} d="M4 18H4.01" />
      </svg>
    ),
  },
];

const SIGN_OUT_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path {...STROKE} d="M9 21H5A1 1 0 0 1 4 20V4A1 1 0 0 1 5 3H9" />
    <path {...STROKE} d="M16 17L21 12L16 7" />
    <path {...STROKE} d="M21 12H9" />
  </svg>
);

// Fixed left rail on signed-in pages. Sign out ends the session and returns to sign-in.
export function AppNav({ current }: { current: AppSection }) {
  const router = useRouter();

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut().catch(() => undefined);
    router.replace("/");
  }

  return (
    <nav className="lp-sidebar app-sidebar" aria-label="Primary">
      <div className="lp-sidebar__header">
        <svg width="40" height="26" viewBox="0 0 40 26" fill="currentColor" role="img" aria-label="Lepide">
          <path d="M10 2H16L6 24H0Z" />
          <path d="M20 2H26L16 24H10Z" />
          <path d="M30 2H36L26 24H20Z" />
        </svg>
      </div>
      <ul className="lp-sidebar__items">
        {ITEMS.map((item) => {
          const active = item.section === current;
          return (
            <li key={item.section}>
              <Link
                href={item.href}
                className={`lp-sidebar__item${active ? " lp-sidebar__item--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="lp-sidebar__icon-box">{item.icon}</span>
                <span className="lp-sidebar__label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="lp-sidebar__footer">
        <button type="button" className="lp-sidebar__item" onClick={signOut}>
          <span className="lp-sidebar__icon-box">{SIGN_OUT_ICON}</span>
          <span className="lp-sidebar__label">Sign out</span>
        </button>
      </div>
    </nav>
  );
}
