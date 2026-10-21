import { useState } from "react";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
};

export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  minLength,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="lp-input lp-input--full-width">
      <div className="lp-input__row lp-input__row--label-top">
        <label className="lp-input__label" htmlFor={id}>{label}</label>
        <div className="lp-input__field signin-password">
          <input
            className="lp-input__input"
            id={id}
            name={name}
            type={visible ? "text" : "password"}
            placeholder={placeholder}
            autoComplete={autoComplete}
            minLength={minLength}
            required
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <button
            className="signin-password__toggle"
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((current) => !current)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
