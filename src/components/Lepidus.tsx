import type { ReactNode } from "react";
import type { Risk } from "@/lib/reports/model";

// Thin wrappers over documented lp- markup. No new classes are invented here.

const RISK_BADGE: Record<Risk, string> = {
  None: "lp-badge--success",
  Low: "lp-badge--neutral",
  Medium: "lp-badge--warning",
  High: "lp-badge--error",
  Critical: "lp-badge--error",
};

export function RiskBadge({ risk }: { risk: Risk }) {
  return <span className={`lp-badge ${RISK_BADGE[risk]}`}>{risk}</span>;
}

type NoticeVariant = "info" | "success" | "warning" | "error";

export function Notice({
  variant,
  title,
  children,
}: {
  variant: NoticeVariant;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`lp-message lp-message--${variant}`} role={variant === "error" ? "alert" : "status"}>
      <div className="lp-message__content">
        <div className="lp-message__text">
          {title && <h3 className="lp-message__title">{title}</h3>}
          <p className="lp-message__body">{children}</p>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="lp-empty-state">
      <p className="lp-empty-state__message">{message}</p>
      {action && <div className="lp-empty-state__action">{action}</div>}
    </div>
  );
}
