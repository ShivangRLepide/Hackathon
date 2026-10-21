"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
import { AppNav } from "../../components/AppNav";
import { PageHeading } from "../../components/PageHeading";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { precheckUpload } from "../../lib/upload/validate";

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

type ItemStatus = "waiting" | "scanning" | "saved" | "rejected";

interface QueueItem {
  id: number;
  file: File;
  status: ItemStatus;
  error: string | null;
  outcome: ScanOutcome | null;
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  waiting: "Waiting",
  scanning: "Scanning",
  saved: "Saved",
  rejected: "Not saved",
};

const STATUS_BADGE: Record<ItemStatus, string> = {
  waiting: "lp-badge--neutral",
  scanning: "lp-badge--default",
  saved: "lp-badge--success",
  rejected: "lp-badge--error",
};

let nextItemId = 0;

export default function UploadPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

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

  function addFiles(files: File[]) {
    if (files.length === 0) return;
    // Files that fail the browser pre-check are never uploaded; they are marked as not saved.
    const added = files.map((file): QueueItem => {
      const rejection = precheckUpload(file.name, file.size);
      return {
        id: ++nextItemId,
        file,
        status: rejection ? "rejected" : "waiting",
        error: rejection ? REJECTION_TEXT[rejection] : null,
        outcome: null,
      };
    });
    setItems((current) => [...current, ...added]);
  }

  function updateItem(id: number, patch: Partial<QueueItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    // Clear the input so choosing the same file again still fires a change event.
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (scanning) return;
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pending = items.filter((item) => item.status === "waiting");
    if (pending.length === 0) return;

    setScanning(true);
    try {
      // Files are sent one at a time so each result and error belongs to one file.
      for (const [index, item] of pending.entries()) {
        setProgress(`Scanning file ${index + 1} of ${pending.length}.`);
        updateItem(item.id, { status: "scanning", error: null });
        try {
          const body = new FormData();
          body.append("file", item.file);
          const response = await fetch("/api/scan", { method: "POST", body });
          if (response.status === 401) {
            updateItem(item.id, { status: "waiting" });
            router.replace("/");
            return;
          }
          const data = await response.json();
          if (response.ok) {
            updateItem(item.id, { status: "saved", outcome: data as ScanOutcome });
          } else {
            updateItem(item.id, { status: "rejected", error: REJECTION_TEXT[data.error] ?? GENERIC_ERROR });
          }
        } catch {
          updateItem(item.id, { status: "rejected", error: GENERIC_ERROR });
        }
      }
    } finally {
      setScanning(false);
      setProgress(null);
    }
  }

  const failures = items.filter((item) => item.status === "rejected");
  const waitingCount = items.filter((item) => item.status === "waiting").length;

  if (checking) {
    return (
      <main className="page-body">
        <h1 className="page-title">Upload and scan</h1>
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
    <main className="app-main">
      <AppNav current="upload" />
      <PageHeading
        current="Upload"
        title="Upload and scan"
        description="Scan a synthetic CSV or TXT file (1 byte to 1 MiB). The file is checked on the server and discarded; only masked, grouped findings are saved."
      />

      <section className="lp-card lp-card--elevated lp-card--borderless" aria-labelledby="upload-title">
        <div className="lp-card__header">
          <div className="lp-card__title" id="upload-title">Choose files</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lp-card__body form-stack">
            {failures.length > 0 && (
              <div className="lp-message lp-message--error" role="alert">
                <div className="lp-message__content">
                  <div className="lp-message__text">
                    <h3 className="lp-message__title">
                      {failures.length === 1 ? "Upload failed" : "Some uploads failed"}
                    </h3>
                    <ul className="upload-failures">
                      {failures.map((item) => (
                        <li key={item.id}>
                          {item.file.name}: {item.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div
              className={`upload-dropzone${dragging ? " upload-dropzone--active" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!scanning) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <p className="upload-dropzone__text">Drag files here, or choose them below.</p>
              <p className="upload-dropzone__limit">CSV or TXT, up to 1 MiB each.</p>
              <div className="file-picker">
                <span className="file-picker__control lp-button lp-button--secondary lp-button--md">
                  Choose file
                  <input
                    name="file"
                    type="file"
                    multiple
                    className="file-picker__input"
                    aria-label="Choose file"
                    accept=".csv,.txt,text/csv,text/plain"
                    disabled={scanning}
                    onChange={handleFileInput}
                  />
                </span>
                <span className="file-picker__name">
                  {items.length === 0 ? "No files chosen" : `${items.length} in the list`}
                </span>
              </div>
            </div>

            {items.length > 0 && (
              <ul className="upload-queue" aria-label="Files">
                {items.map((item) => (
                  <li key={item.id} className="upload-queue__item">
                    <span className="upload-queue__name">{item.file.name}</span>
                    <span className={`lp-badge ${STATUS_BADGE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                  </li>
                ))}
              </ul>
            )}

            {progress && (
              <div className="lp-message lp-message--info" role="status">
                <div className="lp-message__content">
                  <div className="lp-message__text">
                    <p className="lp-message__body">{progress}</p>
                  </div>
                </div>
              </div>
            )}

            {items.map((item) =>
              item.status === "saved" && item.outcome ? (
                <section key={item.id} className="form-stack upload-result">
                  <p className="upload-result__file">{item.file.name}</p>
                  <div className="lp-card__title">Scan result</div>
                  <p>
                    Overall risk:{" "}
                    <span className={`lp-badge ${RISK_BADGE[item.outcome.risk]}`}>{item.outcome.risk}</span>
                  </p>
                  <p>Saved to your scan history.</p>
                  {item.outcome.findings.length === 0 ? (
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
                          {item.outcome.findings.map((finding) => (
                            <tr key={finding.type}>
                              <td className="lp-table__td">{FINDING_LABEL[finding.type]}</td>
                              <td className="lp-table__td">
                                <span className={`lp-badge ${RISK_BADGE[finding.risk]}`}>{finding.risk}</span>
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
              ) : null,
            )}

            <div className="upload-actions">
              <button
                className="lp-button lp-button--primary lp-button--md upload-submit"
                type="submit"
                disabled={waitingCount === 0 || scanning}
              >
                Upload and scan
              </button>
              <button
                className="lp-button lp-button--secondary lp-button--md"
                type="button"
                disabled={items.length === 0 || scanning}
                onClick={() => setItems([])}
              >
                Clear list
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
