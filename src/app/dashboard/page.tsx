"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState, Notice, RiskBadge } from "@/components/Lepidus";
import { RISKS } from "@/lib/reports/model";
import { formatTimestamp } from "@/lib/reports/format";
import { loadReports } from "@/lib/reports/load";
import { summarise, type Summary } from "@/lib/reports/summary";
import { useSignedInClient } from "@/lib/supabase/use-signed-in-client";

export default function DashboardPage() {
  const client = useSignedInClient();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!client) return;
    let active = true;
    loadReports(client)
      .then(({ scans }) => {
        if (active) setSummary(summarise(scans));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [client]);

  return (
    <main className="app-main">
      <AppNav current="dashboard" />
      <PageHeading
        current="Dashboard"
        title="Dashboard"
        description="Your scanned files and masked findings. Synthetic training data only."
      />

      {failed && (
        <Notice variant="error" title="Dashboard unavailable">
          Your scans could not be loaded. Refresh the page and try again.
        </Notice>
      )}

      {!failed && !summary && (
        <Notice variant="info">{client ? "Loading your scans." : "Checking your sign-in."}</Notice>
      )}

      {summary && summary.scanCount === 0 && (
        <EmptyState
          message="No files have been scanned yet."
          action={
            <Link className="lp-link lp-link--standalone" href="/upload">
              Upload a file
            </Link>
          }
        />
      )}

      {summary && summary.scanCount > 0 && (
        <>
          <div className="metric-grid">
            <Metric label="Files scanned" value={summary.scanCount} />
            <Metric label="Total findings" value={summary.findingTotal} />
            <Metric label="High-risk files" value={summary.riskCounts.High} />
            <Metric label="Critical-risk files" value={summary.riskCounts.Critical} />
          </div>

          <section className="lp-card lp-card--elevated lp-card--borderless" aria-labelledby="risk-title">
            <div className="lp-card__header">
              <div className="lp-card__title" id="risk-title">Risk distribution</div>
            </div>
            <div className="lp-card__body">
              <div className="lp-table">
                <table className="lp-table__table">
                  <thead>
                    <tr>
                      <th className="lp-table__th" scope="col">Risk level</th>
                      <th className="lp-table__th" scope="col">Files</th>
                      <th className="lp-table__th" scope="col">Share of files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...RISKS].reverse().map((risk) => {
                      const count = summary.riskCounts[risk];
                      const percent = Math.round((count / summary.scanCount) * 100);
                      return (
                        <tr key={risk}>
                          <td className="lp-table__td">
                            <RiskBadge risk={risk} />
                          </td>
                          <td className="lp-table__td">{count}</td>
                          <td className="lp-table__td">
                            <ShareBar label={risk} percent={percent} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="lp-card lp-card--elevated lp-card--borderless" aria-labelledby="recent-title">
            <div className="lp-card__header">
              <div className="lp-card__title" id="recent-title">Recent scans</div>
            </div>
            <div className="lp-card__body">
              <div className="lp-table">
                <table className="lp-table__table">
                  <thead>
                    <tr>
                      <th className="lp-table__th" scope="col">File</th>
                      <th className="lp-table__th" scope="col">Scanned at</th>
                      <th className="lp-table__th" scope="col">Overall risk</th>
                      <th className="lp-table__th" scope="col">Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recent.map((scan) => (
                      <tr key={scan.id}>
                        <td className="lp-table__td">{scan.file_name}</td>
                        <td className="lp-table__td">{formatTimestamp(scan.created_at)}</td>
                        <td className="lp-table__td">
                          <RiskBadge risk={scan.overall_risk} />
                        </td>
                        <td className="lp-table__td">{scan.total_findings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function ShareBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="lp-progress lp-progress--full-width">
      <div className="lp-progress__row">
        <div
          className="lp-progress__track"
          role="progressbar"
          aria-label={`${label} share of files`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="lp-progress__fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="lp-progress__value">{percent}%</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <section className="lp-card lp-card--elevated lp-card--borderless">
      <div className="lp-card__header">
        <div className="lp-card__title">{label}</div>
      </div>
      <div className="lp-card__body">
        <p className="metric-value">{value}</p>
      </div>
    </section>
  );
}
