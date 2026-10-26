import { test, expect } from "playwright/test";
import { register } from "./helpers";
test("guest image remains local and survives account sign-in and sign-out", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Upload images").setInputFiles("tests/fixtures/landscape.png");
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  const before = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open("random-gallery", 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const result = await new Promise<unknown>((resolve) => { const r = db.transaction("images").objectStore("images").getAll(); r.onsuccess = () => resolve(r.result); }); db.close(); return result;
  });
  let uploads = 0;
  page.on("request", r => { if (r.method() === "POST" && new URL(r.url()).pathname === "/api/images") uploads++; });
  await register(page);
  await expect(page.getByRole("heading", { name: "A little room for your images." })).toBeVisible();
  expect(uploads).toBe(0);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator(".viewer h2")).toHaveText("landscape.png");
  await expect.poll(() => page.locator(".viewer img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const after = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("random-gallery", 1); r.onsuccess = () => resolve(r.result); });
    const result = await new Promise<unknown>((resolve) => { const r = db.transaction("images").objectStore("images").getAll(); r.onsuccess = () => resolve(r.result); }); db.close(); return result;
  });
  expect(after).toEqual(before);
  expect(uploads).toBe(0);
});
