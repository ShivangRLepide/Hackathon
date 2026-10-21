import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";
const sampleFile = fileURLToPath(new URL("../fixtures/sample-mixed.txt", import.meta.url));

test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in flow");

test("signed-in user uploads, sees findings and downloads the CSV", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/upload");
  await page.getByLabel("Choose file").setInputFiles(sampleFile);
  await page.getByRole("button", { name: "Upload and scan" }).click();
  await expect(page.getByText("Email address").first()).toBeVisible();

  await page.goto("/findings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Export findings CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});
