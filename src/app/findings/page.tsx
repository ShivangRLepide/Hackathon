"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState, Notice, RiskBadge } from "@/components/Lepidus";
import { DETECTOR_LABEL, DETECTOR_TYPES, RISKS } from "@/lib/reports/model";
import { formatTimestamp } from "@/lib/reports/format";
import {
  DEFAULT_SORT,
  filterFindings,
  joinFindings,
  paginate,
  searchFindings,
  sortFindings,
  toggleSort,
  type ReportFinding,
  type RiskFilter,
  type SortKey,
  type SortState,
  type TypeFilter,
} from "@/lib/reports/findings";
import { loadReports } from "@/lib/reports/load";
import { useSignedInClient } from "@/lib/supabase/use-signed-in-client";

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  ...DETECTOR_TYPES.map((type) => ({ value: type, label: DETECTOR_LABEL[type] })),
];

const RISK_OPTIONS: { value: RiskFilter; label: string }[] = [
  { value: "all", label: "All risks" },
  ...RISKS.filter((risk) => risk !== "None").map((risk) => ({ value: risk, label: risk })),
];

export default function FindingsPage() {
  const client = useSignedInClient();
  const [rows, setRows] = useState<ReportFinding[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [type, setType] = useState<TypeFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [requestedPage, setRequestedPage] = useState(1);
  // Holds the page number while the pager input is being edited; null means show the current page.
  const [pageDraft, setPageDraft] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let active = true;
    loadReports(client)
      .then(({ scans, findings }) => {
        if (active) setRows(joinFindings(findings, scans));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [client]);

  const sorted = useMemo(() => {
    const filtered = rows ? filterFindings(rows, { type, risk }) : [];
    return sortFindings(searchFindings(filtered, search), sort);
  }, [rows, type, risk, search, sort]);
  const pageData = useMemo(() => paginate(sorted, requestedPage), [sorted, requestedPage]);
  const filtersActive = type !== "all" || risk !== "all" || search.trim() !== "";

  function goToPage(page: number) {
    setRequestedPage(Math.min(Math.max(1, page), pageData.pages));
  }

  function commitPageDraft() {
    if (pageDraft !== null && /^\d+$/.test(pageDraft)) goToPage(Number(pageDraft));
    setPageDraft(null);
  }

  function sortBy(key: SortKey) {
    setSort((current) => toggleSort(current, key));
    setRequestedPage(1);
  }

  return (
    <main className="app-main">
      <AppNav current="findings" />
      <PageHeading
        current="Findings"
        title="Findings"
        description="Masked findings from your scans. Synthetic training data only."
      />

      {failed && (
        <Notice variant="error" title="Findings unavailable">
          Your findings could not be loaded. Refresh the page and try again.
        </Notice>
      )}

      {!failed && !rows && (
        <Notice variant="info">{client ? "Loading your findings." : "Checking your sign-in."}</Notice>
      )}

      {rows && rows.length === 0 && (
        <EmptyState message="No findings yet. Upload a file to scan it." />
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="form-stack">
            <FilterGroup
              legend="Finding type"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(value) => {
                setType(value);
                setRequestedPage(1);
              }}
            />
            <FilterGroup
              legend="Risk"
              options={RISK_OPTIONS}
              value={risk}
              onChange={(value) => {
                setRisk(value);
                setRequestedPage(1);
              }}
            />
            <div className="lp-input findings-search">
              <div className="lp-input__row lp-input__row--label-top">
                <label className="lp-input__label" htmlFor="findings-search">
                  Search by file name
                </label>
                <div className="lp-input__field">
                  <input
                    className="lp-input__input"
                    id="findings-search"
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setRequestedPage(1);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <p aria-live="polite">
            {sorted.length === 0
              ? "No findings to show."
              : `Showing ${pageData.firstIndex} to ${pageData.lastIndex} of ${sorted.length} findings.`}
            {filtersActive ? " Filters or search are applied." : ""}
          </p>

          {sorted.length === 0 ? (
            <EmptyState message="No findings match these filters or search. Change them to see more results." />
          ) : (
            <>
              <div className="lp-table">
                <table className="lp-table__table">
                  <thead>
                    <tr>
                      <SortHeader label="File name" sortKey="fileName" sort={sort} onSort={sortBy} />
                      <SortHeader label="Scanned at" sortKey="scannedAt" sort={sort} onSort={sortBy} />
                      <th className="lp-table__th" scope="col">Finding type</th>
                      <SortHeader label="Risk" sortKey="risk" sort={sort} onSort={sortBy} />
                      <SortHeader label="Occurrences" sortKey="occurrenceCount" sort={sort} onSort={sortBy} />
                      <th className="lp-table__th" scope="col">Masked example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.items.map((finding) => (
                      <tr key={finding.id}>
                        <td className="lp-table__td">{finding.fileName}</td>
                        <td className="lp-table__td">{formatTimestamp(finding.scannedAt)}</td>
                        <td className="lp-table__td">{finding.detectorLabel}</td>
                        <td className="lp-table__td">
                          <RiskBadge risk={finding.risk} />
                        </td>
                        <td className="lp-table__td">{finding.occurrenceCount}</td>
                        <td className="lp-table__td">{finding.maskedExample}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav className="lp-pagination" role="navigation" aria-label="Pagination">
                <button
                  className="lp-pagination__button"
                  type="button"
                  disabled={pageData.page === 1}
                  onClick={() => goToPage(1)}
                >
                  First
                </button>
                <button
                  className="lp-pagination__button"
                  type="button"
                  disabled={pageData.page === 1}
                  onClick={() => goToPage(pageData.page - 1)}
                >
                  Previous
                </button>
                <input
                  className="lp-pagination__page-input"
                  type="number"
                  min={1}
                  max={pageData.pages}
                  aria-label="Current page"
                  value={pageDraft ?? pageData.page}
                  onChange={(event) => setPageDraft(event.target.value)}
                  onBlur={commitPageDraft}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitPageDraft();
                  }}
                />
                <span className="lp-pagination__label">/{pageData.pages}</span>
                <button
                  className="lp-pagination__button"
                  type="button"
                  disabled={pageData.page === pageData.pages}
                  onClick={() => goToPage(pageData.page + 1)}
                >
                  Next
                </button>
                <button
                  className="lp-pagination__button"
                  type="button"
                  disabled={pageData.page === pageData.pages}
                  onClick={() => goToPage(pageData.pages)}
                >
                  Last
                </button>
              </nav>
            </>
          )}

          <div className="page-actions">
            <a className="lp-link lp-link--standalone" href="/api/export" download>
              Export findings CSV
            </a>
          </div>
          <Notice variant="info">
            The Export findings CSV link includes all findings, not only the rows shown here.
          </Notice>
        </>
      )}
    </main>
  );
}

function FilterGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="filter-group">
      <legend className="filter-group__legend">{legend}</legend>
      <div className="filter-group__options">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className={`lp-button lp-button--${selected ? "primary" : "secondary"} lp-button--sm`}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  const arrow = active ? (sort.direction === "ascending" ? "\u2191" : "\u2193") : "";
  return (
    <th className="lp-table__th" scope="col" aria-sort={active ? sort.direction : "none"}>
      <button type="button" className="sort-button" onClick={() => onSort(sortKey)}>
        {label} <span aria-hidden="true">{arrow}</span>
      </button>
    </th>
  );
}
