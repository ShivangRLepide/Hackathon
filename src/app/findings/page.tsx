"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState, Notice, RiskBadge } from "@/components/Lepidus";
import { DETECTOR_LABEL, DETECTOR_TYPES, RISKS } from "@/lib/reports/model";
import { formatTimestamp } from "@/lib/reports/format";
import {
  filterFindings,
  joinFindings,
  type ReportFinding,
  type RiskFilter,
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

  const visible = useMemo(() => (rows ? filterFindings(rows, { type, risk }) : []), [rows, type, risk]);
  const filtersActive = type !== "all" || risk !== "all";

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
            <FilterGroup legend="Finding type" options={TYPE_OPTIONS} value={type} onChange={setType} />
            <FilterGroup legend="Risk" options={RISK_OPTIONS} value={risk} onChange={setRisk} />
          </div>

          <p aria-live="polite">
            Showing {visible.length} of {rows.length} findings.
            {filtersActive ? " Filters are applied." : ""}
          </p>

          {visible.length === 0 ? (
            <EmptyState message="No findings match these filters. Choose other filters to see more results." />
          ) : (
            <div className="lp-table">
              <table className="lp-table__table">
                <thead>
                  <tr>
                    <th className="lp-table__th" scope="col">File name</th>
                    <th className="lp-table__th" scope="col">Scanned at</th>
                    <th className="lp-table__th" scope="col">Finding type</th>
                    <th className="lp-table__th" scope="col">Risk</th>
                    <th className="lp-table__th" scope="col">Occurrences</th>
                    <th className="lp-table__th" scope="col">Masked example</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((finding) => (
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
