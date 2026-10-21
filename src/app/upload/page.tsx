import Link from "next/link";

export default function UploadPage() {
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

        <div className="lp-card__body form-stack">
          <div className="lp-message lp-message--info" role="status">
            <div className="lp-message__content">
              <div className="lp-message__text">
                <h3 className="lp-message__title">Upload is not connected yet</h3>
                <p className="lp-message__body">
                  No file is read, stored or scanned in this build.
                </p>
              </div>
            </div>
          </div>

          <div className="file-picker">
            <label className="file-picker__label" htmlFor="upload-file">
              Accepted types: CSV or TXT, 1 byte to 1 MiB
            </label>
            <input id="upload-file" name="file" type="file" accept=".csv,.txt,text/csv,text/plain" disabled />
          </div>
        </div>

        <div className="lp-card__footer footer-actions">
          <button className="lp-button lp-button--primary lp-button--md" type="button" disabled>
            Upload file
          </button>
        </div>
      </section>
    </main>
  );
}
