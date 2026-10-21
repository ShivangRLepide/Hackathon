"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

type Risk = "None" | "Low" | "Medium" | "High" | "Critical";

interface Finding {
  type: "payment_card" | "uk_nino" | "uk_phone" | "email";
  risk: Risk;
  count: number;
  maskedExample: string;
}

interface ScanOutcome {
  scanId: string;
  risk: Risk;
  findings: Finding[];
}

const FINDING_LABEL: Record<Finding["type"], string> = {
  payment_card: "Payment card number",
  uk_nino: "UK National Insurance number",
  uk_phone: "UK phone number",
  email: "Email address",
};

const RISK_BADGE: Record<Risk, string> = {
  None: "lp-badge--success",
  Low: "lp-badge--neutral",
  Medium: "lp-badge--warning",
  High: "lp-badge--error",
  Critical: "lp-badge--error",
};

const REJECTION_TEXT: Record<string, string> = {
  empty: "The file is empty.",
  oversized: "The file is larger than 1 MiB.",
  unsupported_type: "Only CSV or TXT files are accepted.",
  binary: "The file looks binary. Only text files are accepted.",
  invalid_utf8: "The file is not valid UTF-8 text.",
  missing_file: "Choose a file first.",
  bad_request: "The upload could not be read. Try again.",
  save_failed: "The scan could not be saved, so no results are shown. Try again.",
};

const GENERIC_ERROR = "The scan failed. Try again.";

export default function UploadPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);

  useEffect(() => {
    let active = true;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!active) return;
        if (data.user) setChecking(false);
        else router.replace("/");
      })
      .catch(() => {
        if (active) router.replace("/");
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setScanning(true);
    setError(null);
    setOutcome(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/scan", { method: "POST", body });
      if (response.status === 401) {
        router.replace("/");
        return;
      }
      const data = await response.json();
      if (response.ok) setOutcome(data as ScanOutcome);
      else setError(REJECTION_TEXT[data.error] ?? GENERIC_ERROR);
    } catch {
      setError(GENERIC_ERROR);
    }
    setScanning(false);
  }

  if (checking) {
    return (
      <main className="page-body">
        <h1 className="page-title">Upload a file</h1>
        <div className="lp-message lp-message--info" role="status">
          <div className="lp-message__content">
            <div className="lp-message__text">
              <p className="lp-message__body">Checking your sign-in.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-body">
      <nav className="lp-breadcrumb" aria-label="Breadcrumb">
        <ol className="lp-breadcrumb__list">
          <li className="lp-breadcrumb__item">
            <Link className="lp-breadcrumb__link" href="/">Sign in</Link>
            <span className="lp-breadcrumb__separator" aria-hidden="true">/</span>
          </li>
          <li className="lp-breadcrumb__item">
            <span className="lp-breadcrumb__current" aria-current="page">Upload file</span>
          </li>
        </ol>
      </nav>

      <h1 className="page-title">Upload a file</h1>

      <section className="lp-card lp-card--elevated lp-card--borderless" aria-labelledby="upload-title">
        <div className="lp-card__header">
          <div className="lp-card__title" id="upload-title">Choose a file to scan</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lp-card__body form-stack">
            {error && (
              <div className="lp-message lp-message--error" role="alert">
                <div className="lp-message__content">
                  <div className="lp-message__text">
                    <h3 className="lp-message__title">Upload failed</h3>
                    <p className="lp-message__body">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="lp-message lp-message--info" role="status">
              <div className="lp-message__content">
                <div className="lp-message__text">
                  <h3 className="lp-message__title">Files are not stored</h3>
                  <p className="lp-message__body">
                    The file is scanned in memory. Only masked results are shown.
                  </p>
                </div>
              </div>
            </div>

            <div className="file-picker">
              <label className="file-picker__label" htmlFor="upload-file">
                Accepted types: CSV or TXT, 1 byte to 1 MiB
              </label>
              <input
                id="upload-file"
                name="file"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                disabled={scanning}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setError(null);
                  setOutcome(null);
                }}
              />
            </div>

            {scanning && (
              <div className="lp-message lp-message--info" role="status">
                <div className="lp-message__content">
                  <div className="lp-message__text">
                    <p className="lp-message__body">Scanning file.</p>
                  </div>
                </div>
              </div>
            )}

            {outcome && (
              <section className="form-stack" aria-labelledby="result-title" role="status">
                <div className="lp-card__title" id="result-title">
                  Scan result
                </div>
                <p>
                  Overall risk:{" "}
                  <span className={`lp-badge ${RISK_BADGE[outcome.risk]}`}>{outcome.risk}</span>
                </p>
                <p>Saved to your scan history.</p>
                {outcome.findings.length === 0 ? (
                  <p>No sensitive-data patterns were found.</p>
                ) : (
                  <div className="lp-table">
                    <table className="lp-table__table">
                      <thead>
                        <tr>
                          <th className="lp-table__th" scope="col">Type</th>
                          <th className="lp-table__th" scope="col">Risk</th>
                          <th className="lp-table__th" scope="col">Count</th>
                          <th className="lp-table__th" scope="col">Masked example</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outcome.findings.map((finding) => (
                          <tr key={finding.type}>
                            <td className="lp-table__td">{FINDING_LABEL[finding.type]}</td>
                            <td className="lp-table__td">
                              <span className={`lp-badge ${RISK_BADGE[finding.risk]}`}>
                                {finding.risk}
                              </span>
                            </td>
                            <td className="lp-table__td">{finding.count}</td>
                            <td className="lp-table__td">{finding.maskedExample}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="lp-card__footer footer-actions">
            <button
              className="lp-button lp-button--primary lp-button--md"
              type="submit"
              disabled={!file || scanning}
            >
              Upload file
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
