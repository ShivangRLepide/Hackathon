import Link from "next/link";

export function PageHeading({
  current,
  title,
  description,
}: {
  current: string;
  title: string;
  description: string;
}) {
  return (
    <header className="page-heading">
      <nav className="lp-breadcrumb" aria-label="Breadcrumb">
        <ol className="lp-breadcrumb__list">
          <li className="lp-breadcrumb__item">
            <Link className="lp-breadcrumb__link" href="/dashboard">
              Lepide MiniDSP
            </Link>
            <span className="lp-breadcrumb__separator" aria-hidden="true">/</span>
          </li>
          <li className="lp-breadcrumb__item">
            <span className="lp-breadcrumb__current" aria-current="page">{current}</span>
          </li>
        </ol>
      </nav>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{description}</p>
    </header>
  );
}
