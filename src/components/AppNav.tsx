import Link from "next/link";

// Shown on signed-in pages only. Export is a plain link to the attachment route.
export function AppNav() {
  return (
    <nav aria-label="Main">
      <ul className="app-nav">
        <li>
          <Link className="lp-link lp-link--standalone" href="/dashboard">
            Dashboard
          </Link>
        </li>
        <li>
          <Link className="lp-link lp-link--standalone" href="/upload">
            Upload file
          </Link>
        </li>
        <li>
          <Link className="lp-link lp-link--standalone" href="/findings">
            Findings
          </Link>
        </li>
        <li>
          <a className="lp-link lp-link--standalone" href="/api/export" download>
            Export findings CSV
          </a>
        </li>
      </ul>
    </nav>
  );
}
