import { test, expect, type Locator, type Page } from "playwright/test";
import { upload } from "../fixtures/images";
import { holdStorageWrites } from "../integration/locks";

const filename = "a-very-long-filename-for-favorites-layout-ảnh.png";
type View = "Random" | "Gallery" | "preview";

async function openView(page: Page, view: View) {
  await page.getByRole("button", { name: view === "Random" ? "Random" : "Gallery", exact: true }).click();
  if (view === "preview") {
    await page.getByRole("button", { name: `Open ${filename}`, exact: true }).click();
  }
  const surface = view === "Gallery"
    ? page.locator(".gallery-card")
    : view === "preview" ? page.getByRole("dialog") : page.locator(".viewer");
  await expect(surface.locator("img")).toBeVisible();
  await expect.poll(() => surface.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  return surface.locator("button[aria-pressed]");
}

async function setup(page: Page, theme: "light" | "dark", width = 320) {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ colorScheme: theme });
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.getByLabel("Upload images").setInputFiles(upload(filename));
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

async function geometry(button: Locator) {
  await button.scrollIntoViewIfNeeded();
  const icon = button.locator(".favorite-icon");
  await expect(icon).toHaveCount(1);
  const result = await button.evaluate((element) => {
    const rect = (node: Element) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x: x + scrollX, y: y + scrollY, width, height };
    };
    const icon = element.querySelector(".favorite-icon")!;
    const card = element.closest(".gallery-card");
    const viewer = element.closest(".viewer");
    const neighbors = card
      ? [card.querySelector(".card-caption > span")!, card.querySelector(".thumbnail")!]
      : [viewer!.querySelector("h2")!, viewer!.querySelector(".danger")!];
    const b = rect(element);
    const i = rect(icon);
    return {
      button: b, icon: i, neighbors: neighbors.map(rect),
      viewport: { left: scrollX, right: scrollX + innerWidth },
    };
  });
  expect(Math.abs(result.icon.width - 24)).toBeLessThanOrEqual(0.1);
  expect(Math.abs(result.icon.height - 24)).toBeLessThanOrEqual(0.1);
  expect(result.button.width).toBeGreaterThanOrEqual(44);
  expect(result.button.height).toBeGreaterThanOrEqual(44);
  expect(result.icon.x).toBeGreaterThanOrEqual(result.button.x);
  expect(result.icon.y).toBeGreaterThanOrEqual(result.button.y);
  expect(result.icon.x + result.icon.width).toBeLessThanOrEqual(result.button.x + result.button.width + 0.1);
  expect(result.icon.y + result.icon.height).toBeLessThanOrEqual(result.button.y + result.button.height + 0.1);
  expect(Math.abs(result.icon.x + result.icon.width / 2 - result.button.x - result.button.width / 2)).toBeLessThanOrEqual(0.1);
  expect(Math.abs(result.icon.y + result.icon.height / 2 - result.button.y - result.button.height / 2)).toBeLessThanOrEqual(0.1);
  expect(result.button.x).toBeGreaterThanOrEqual(result.viewport.left);
  expect(result.button.x + result.button.width).toBeLessThanOrEqual(result.viewport.right);
  for (const neighbor of result.neighbors) {
    const overlapX = Math.min(result.button.x + result.button.width, neighbor.x + neighbor.width) - Math.max(result.button.x, neighbor.x);
    const overlapY = Math.min(result.button.y + result.button.height, neighbor.y + neighbor.height) - Math.max(result.button.y, neighbor.y);
    expect(overlapX <= 0.1 || overlapY <= 0.1).toBe(true);
  }
  return result;
}

function unchanged(before: Awaited<ReturnType<typeof geometry>>, after: Awaited<ReturnType<typeof geometry>>) {
  for (const [index, rectangle] of [before.button, before.icon, ...before.neighbors].entries()) {
    const actual = [after.button, after.icon, ...after.neighbors][index];
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(Math.abs(rectangle[key] - actual[key]), `rectangle ${index} ${key}`).toBeLessThanOrEqual(0.1);
    }
  }
}

async function state(button: Locator, active: boolean) {
  await expect(button).toBeEnabled();
  await expect(button).toHaveAttribute("aria-pressed", String(active));
  await expect(button).toHaveAccessibleName(`${active ? "Unfavorite" : "Favorite"} ${filename}`);
  await expect(button.locator(".favorite-icon")).toHaveAttribute("aria-hidden", "true");
  await expect(button.locator(".favorite-icon")).toHaveText(active ? "♥" : "♡");
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [320, 375, 768, 1440]) {
    test(`fixed favorites geometry ${width}px ${theme}`, async ({ page }, testInfo) => {
      await setup(page, theme, width);
      for (const view of ["Random", "Gallery", "preview"] as const) {
        let button = await openView(page, view);
        await state(button, false);
        const initial = await geometry(button);
        if (width === 320) await testInfo.attach(`${view}-inactive`, { body: await button.screenshot({ path: testInfo.outputPath(`${view}-inactive.png`) }), contentType: "image/png" });
        await button.click();
        await state(button, true);
        unchanged(initial, await geometry(button));
        if (width === 320) await testInfo.attach(`${view}-active`, { body: await button.screenshot({ path: testInfo.outputPath(`${view}-active.png`) }), contentType: "image/png" });
        await page.reload();
        button = await openView(page, view);
        await state(button, true);
        const saved = await geometry(button);
        await page.keyboard.press("Tab");
        await button.focus();
        await expect(button).toBeFocused();
        const focus = await button.evaluate((element) => {
          const style = getComputedStyle(element);
          return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
        });
        expect(focus.width).toBeGreaterThanOrEqual(2);
        expect(focus.style).not.toBe("none");
        await page.keyboard.press("Space");
        await state(button, false);
        unchanged(saved, await geometry(button));
        await button.focus();
        await page.keyboard.press("Enter");
        await state(button, true);
        unchanged(saved, await geometry(button));
        await button.click();
        await state(button, false);
        unchanged(saved, await geometry(button));
        if (view === "preview") await page.keyboard.press("Escape");
      }
    });
  }
  for (const view of ["Random", "Gallery", "preview"] as const) {
    test(`pending and failed favorites geometry ${view} ${theme}`, async ({ page }) => {
      await setup(page, theme);
      const button = await openView(page, view);
      const initial = await geometry(button);
      await holdStorageWrites(page);
      try {
        await button.click();
        await expect(button).toBeDisabled();
        await expect(button).toHaveAttribute("aria-pressed", "false");
        unchanged(initial, await geometry(button));
      } finally {
        await page.evaluate(() => window.releaseStorageLock());
      }
      await state(button, true);
      unchanged(initial, await geometry(button));
      await page.evaluate(() => {
        const original = IDBObjectStore.prototype.put;
        Object.assign(window, { restoreFavoriteWrite: () => { IDBObjectStore.prototype.put = original; } });
        IDBObjectStore.prototype.put = function () { throw new DOMException("Full", "QuotaExceededError"); };
      });
      try {
        await button.click();
        await expect(page.getByRole("button", { name: "Retry last action", includeHidden: true })).toHaveCount(1);
        await state(button, true);
        await geometry(button);
      } finally {
        await page.evaluate(() => (window as unknown as { restoreFavoriteWrite: () => void }).restoreFavoriteWrite());
      }
      await button.click();
      await state(button, false);
      await geometry(button);
    });
  }
}
