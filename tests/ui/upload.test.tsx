import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import UploadPage from "../../src/app/upload/page";

test("upload page shows a disabled upload button and a not-connected message", () => {
  render(<UploadPage />);
  expect(screen.getByRole("heading", { name: "Upload a file" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload file" })).toBeDisabled();
  expect(screen.getByText("Upload is not connected yet")).toBeInTheDocument();
});
