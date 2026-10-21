import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "../../src/app/page";

test("home page shows the app name", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: "MiniDSP Data Discovery" })).toBeInTheDocument();
});
