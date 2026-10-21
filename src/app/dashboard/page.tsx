"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { PageHeading } from "@/components/PageHeading";
import { DashboardAssistant } from "@/components/DashboardAssistant";
import { EmptyState, Notice, RiskBadge } from "@/components/Lepidus";
import { RISKS, type ScanRow } from "@/lib/reports/model";
import { deleteScan } from "@/lib/reports/delete";
import { paginate } from "@/lib/reports/findings";
import { formatTimestamp } from "@/lib/reports/format";
import { loadReports } from "@/lib/reports/load";
import { summarise } from "@/lib/reports/summary";
import { useSignedInClient } from "@/lib/supabase/use-signed-in-client";

export default function DashboardPage() {
  const client = useSignedInClient();
  const [scans, setScans] = useState<ScanRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const summary = useMemo(() => (scans ? summarise(scans) : null), [scans]);
  const history = useMemo(() => paginate(summary?.scans ?? [], historyPage), [summary, historyPage]);

  useEffect(() => {
    if (!client) return;
    let active = true;
    loadReports(client)
      .then(({ scans: loaded }) => {
        if (active) setScans(loaded);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [client]);

  async function removeScan(scanId: string) {
    if (!client) return;
    setDeletingId(scanId);
    setDeleteError(null);
    try {
      await deleteScan(client, scanId);
      setScans((current) => current?.filter((scan) => scan.id !== scanId) ?? null);
      setConfirmId(null);
    } catch {
      setDeleteError("That scan could not be deleted. Refresh the page and try again.");
    } finally {
      setDeletingId(null);
    }
  }

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

          <section className="lp-card lp-card--elevated lp-card--borderless" aria-labelledby="history-title">
            <div className="lp-card__header">
              <div className="lp-card__title" id="history-title">Scan history</div>
            </div>
            <div className="lp-card__body">
              {deleteError && (
                <Notice variant="error" title="Delete failed">
                  {deleteError}
                </Notice>
              )}
              <div className="lp-table">
                <table className="lp-table__table">
                  <thead>
                    <tr>
                      <th className="lp-table__th" scope="col">File</th>
                      <th className="lp-table__th" scope="col">Scanned at</th>
                      <th className="lp-table__th" scope="col">Overall risk</th>
                      <th className="lp-table__th" scope="col">Findings</th>
                      <th className="lp-table__th" scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.items.map((scan) => (
                      <tr key={scan.id}>
                        <td className="lp-table__td">{scan.file_name}</td>
                        <td className="lp-table__td">{formatTimestamp(scan.created_at)}</td>
                        <td className="lp-table__td">
                          <RiskBadge risk={scan.overall_risk} />
                        </td>
                        <td className="lp-table__td">{scan.total_findings}</td>
                        <td className="lp-table__td">
                          {confirmId === scan.id ? (
                            <div className="delete-confirm">
                              <span>Delete {scan.file_name}?</span>
                              <button
                                className="lp-button lp-button--danger lp-button--sm history-action"
                                type="button"
                                disabled={deletingId !== null}
                                onClick={() => removeScan(scan.id)}
                              >
                                {deletingId === scan.id ? "Deleting" : "Confirm delete"}
                              </button>
                              <button
                                className="lp-button lp-button--secondary lp-button--sm history-action"
                                type="button"
                                disabled={deletingId !== null}
                                onClick={() => setConfirmId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="lp-button lp-button--danger lp-button--sm history-action"
                              type="button"
                              aria-label={`Delete ${scan.file_name}`}
                              onClick={() => {
                                setDeleteError(null);
                                setConfirmId(scan.id);
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {history.pages > 1 && (
                <nav className="lp-pagination" role="navigation" aria-label="Scan history pages">
                  <button
                    className="lp-pagination__button"
                    type="button"
                    disabled={history.page === 1}
                    onClick={() => setHistoryPage(1)}
                  >
                    First
                  </button>
                  <button
                    className="lp-pagination__button"
                    type="button"
                    disabled={history.page === 1}
                    onClick={() => setHistoryPage(history.page - 1)}
                  >
                    Previous
                  </button>
                  <span className="lp-pagination__label">
                    Page {history.page} of {history.pages}
                  </span>
                  <button
                    className="lp-pagination__button"
                    type="button"
                    disabled={history.page === history.pages}
                    onClick={() => setHistoryPage(history.page + 1)}
                  >
                    Next
                  </button>
                  <button
                    className="lp-pagination__button"
                    type="button"
                    disabled={history.page === history.pages}
                    onClick={() => setHistoryPage(history.pages)}
                  >
                    Last
                  </button>
                </nav>
              )}
              <p>
                Showing {history.firstIndex} to {history.lastIndex} of {summary.scanCount} scans.
              </p>
            </div>
          </section>
        </>
      )}

      {summary && <DashboardAssistant summary={summary} />}
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
          {percent > 0 && <div className="lp-progress__fill" style={{ width: `${percent}%` }} />}
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
