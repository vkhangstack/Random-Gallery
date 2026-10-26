import { test, expect } from "playwright/test";
import { holdStorageWrites } from "./locks";
test("a collection read remains loading until native storage releases it", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await holdStorageWrites(page);
  const target = await context.newPage();
  try {
    await target.goto("/");
    await expect(
      target
        .getByRole("status")
        .filter({ hasText: "Opening your collection…" }),
    ).toBeVisible();
    await expect(
      target.getByRole("heading", { name: "A little room for your images." }),
    ).toHaveCount(0);
    await expect(target.getByLabel("Upload images")).toBeDisabled();
    await page.evaluate(() => window.releaseStorageLock());
    await expect(
      target.getByRole("heading", { name: "A little room for your images." }),
    ).toBeVisible();
  } finally {
    await target.close();
  }
});
test("invalid theme follows system and follows later system changes until explicit choice", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("random-gallery.theme", "invalid"),
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("theme read exceptions retain usable system theme and announce the limitation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = function () {
      throw new DOMException("Denied", "SecurityError");
    };
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "This theme applies for this session only" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
