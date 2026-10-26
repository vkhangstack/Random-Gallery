import { test, expect } from "playwright/test";
import { upload } from "../fixtures/images";
import { holdStorageWrites } from "./locks";
test("upload UI never reports a pending write as saved, and picker can retry the same file", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await holdStorageWrites(page);
  await page.getByLabel("Upload images").setInputFiles(upload("same.png"));
  await expect(page.getByText(/Processing 0 of 1/)).toBeVisible();
  await expect(page.locator(".collection-count")).toContainText("0 images");
  await expect(page.getByText("1 saved · 0 failed")).toHaveCount(0);
  await expect(page.getByLabel("Upload images")).toBeDisabled();
  await page.evaluate(() => window.releaseStorageLock());
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.getByLabel("Upload images").setInputFiles(upload("same.png"));
  await expect(page.locator(".collection-count")).toContainText("2 images");
});
test("refresh during a suspended batch retains only committed files", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode;
    let calls = 0;
    HTMLImageElement.prototype.decode = function () {
      return ++calls === 2 ? new Promise<void>(() => {}) : decode.call(this);
    };
  });
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page
    .getByLabel("Upload images")
    .setInputFiles([upload("committed.png"), upload("unfinished.png")]);
  await expect(page.getByText(/Processing 1 of 2/)).toBeVisible();
  await expect(page.locator(".collection-count")).toContainText("1 image");
  await page.reload();
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await expect(page.locator(".gallery-card")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Open committed.png" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open unfinished.png" }),
  ).toHaveCount(0);
});
test("pending favorites/deletion expose committed state and prevent conflicting mutations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.getByLabel("Upload images").setInputFiles(upload("one.png"));
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  await holdStorageWrites(page);
  await page
    .getByRole("button", { name: "Favorite one.png", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Favorite one.png", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Favorite one.png", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "Delete", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => window.releaseStorageLock());
  await expect(
    page.getByRole("button", { name: "Unfavorite one.png", exact: true }),
  ).toBeEnabled();
  await holdStorageWrites(page);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete image", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Deleting…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => window.releaseStorageLock());
  await expect(
    page.getByRole("heading", { name: "A little room for your images." }),
  ).toBeVisible();
});
