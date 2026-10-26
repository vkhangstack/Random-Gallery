import { test, expect } from "playwright/test";
import { upload } from "../fixtures/images";
import { holdStorageWrites } from "../integration/locks";

for (const theme of ["light", "dark"] as const) {
  test(`Gallery context survives resizing during a favorite write (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");
    await expect(page.getByLabel("Upload images")).toBeEnabled();
    await page.getByLabel("Upload images").setInputFiles([
      upload("keep-ảnh.png"), upload("other.png"),
    ]);
    await expect(page.getByText("2 saved · 0 failed")).toBeVisible();
    await page.getByRole("button", { name: "Gallery", exact: true }).click();
    await page.getByRole("button", { name: "Favorite keep-ảnh.png", exact: true }).click();
    await expect(page.getByRole("button", { name: "Unfavorite keep-ảnh.png", exact: true }))
      .toHaveAttribute("aria-pressed", "true");
    await page.getByRole("searchbox").fill("keep-ảnh");
    await page.getByRole("checkbox", { name: "Favorites only" }).check();
    await page.getByRole("button", { name: "Open keep-ảnh.png", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Preview keep-ảnh.png", exact: true });
    const favorite = dialog.getByRole("button", { name: "Unfavorite keep-ảnh.png", exact: true });
    // Ensure the rendered image has finished reading before holding all image-store writes.
    await expect(dialog.locator("img")).toBeVisible();
    await holdStorageWrites(page);
    try {
      await favorite.click();
      for (const size of [{ width: 800, height: 375 }, { width: 375, height: 800 }]) {
        await page.setViewportSize(size);
        await expect(dialog).toBeVisible();
        await expect(favorite).toBeDisabled();
        await expect(favorite).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByRole("button", { name: "Gallery", exact: true, includeHidden: true }))
          .toHaveAttribute("aria-current", "page");
        await expect(page.getByRole("searchbox", { includeHidden: true })).toHaveValue("keep-ảnh");
        await expect(page.getByRole("checkbox", { name: "Favorites only", includeHidden: true })).toBeChecked();
      }
    } finally {
      await page.evaluate(() => window.releaseStorageLock());
    }
    await expect(dialog.getByRole("button", { name: "Favorite keep-ảnh.png", exact: true }))
      .toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".gallery-card")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    const confirmation = page.getByRole("dialog", { name: "Delete this image?", exact: true });
    await page.setViewportSize({ width: 800, height: 375 });
    await expect(confirmation).toBeVisible();
    await expect(confirmation.locator(".delete-name")).toHaveText("keep-ảnh.png");
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("searchbox")).toHaveValue("keep-ảnh");
    await expect(page.getByRole("checkbox", { name: "Favorites only" })).toBeChecked();
  });

  test(`Random scope and image survive resizing during a favorite write (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");
    await expect(page.getByLabel("Upload images")).toBeEnabled();
    await page.getByLabel("Upload images").setInputFiles(upload("only.png"));
    await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
    const favorite = page.locator(".viewer button[aria-pressed]");
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    const scope = page.getByRole("button", { name: "Favorites only", exact: true });
    await scope.click();
    await expect(page.locator(".viewer img")).toBeVisible();
    await holdStorageWrites(page);
    try {
      await favorite.click();
      for (const size of [{ width: 800, height: 375 }, { width: 375, height: 800 }]) {
        await page.setViewportSize(size);
        await expect(page.locator(".viewer h2")).toHaveText("only.png");
        await expect(scope).toHaveAttribute("aria-pressed", "true");
        await expect(favorite).toBeDisabled();
        await expect(favorite).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByRole("button", { name: "Random", exact: true }))
          .toHaveAttribute("aria-current", "page");
      }
    } finally {
      await page.evaluate(() => window.releaseStorageLock());
    }
    await expect(page.getByRole("heading", { name: "Your favorites are waiting." })).toBeVisible();
    await expect(scope).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "All images", exact: true }).click();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
  });
}
