import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DashboardAssistant } from "../../src/components/DashboardAssistant";
import { summarise } from "../../src/lib/reports/summary";

const summary = summarise([
  { id: "s1", file_name: "older.csv", created_at: "2026-10-20T09:00:00+00:00", overall_risk: "Low", total_findings: 1 },
  { id: "s2", file_name: "newer.txt", created_at: "2026-10-21T10:00:00+00:00", overall_risk: "Critical", total_findings: 3 },
]);

test("the assistant answers questions from the dashboard data", () => {
  render(<DashboardAssistant summary={summary} />);
  expect(screen.queryByRole("log")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Ask the dashboard" }));
  fireEvent.change(screen.getByLabelText("Ask a question"), { target: { value: "How many files have I scanned?" } });
  fireEvent.click(screen.getByRole("button", { name: "Ask" }));

  expect(screen.getByRole("log")).toHaveTextContent("You have scanned 2 files so far.");
  expect(screen.getByLabelText("Ask a question")).toHaveValue("");
});

test("the panel closes from its Close button and the toggle returns", () => {
  render(<DashboardAssistant summary={summary} />);
  fireEvent.click(screen.getByRole("button", { name: "Ask the dashboard" }));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByLabelText("Ask a question")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ask the dashboard" })).toBeInTheDocument();
});
