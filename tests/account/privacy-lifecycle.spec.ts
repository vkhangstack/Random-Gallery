import { test, expect } from "playwright/test";
import { register, login } from "./helpers";
const origin = "http://127.0.0.1:8081";
async function upload(page: import("playwright/test").Page) {
  await page.getByLabel("Upload images").setInputFiles("tests/fixtures/landscape.png");
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
}
test("favorite and deletion sync after refresh and deny another owner", async ({ page, browser }) => {
  const address = await register(page); await upload(page);
  const entries = await page.request.get("/api/images").then(r => r.json());
  const id = entries[0].id;
  const anonymous = await browser.newContext();
  try { expect((await anonymous.request.get(`${origin}/api/images/${id}/content`)).status()).toBe(401); } finally { await anonymous.close(); }
  const secondContext = await browser.newContext();
  try {
    const second = await secondContext.newPage(); await login(second, address);
    await page.locator(".viewer button[aria-pressed]").click();
    await expect(page.locator(".viewer button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");
    await second.getByRole("button", { name: "Refresh account collection" }).click();
    await expect(second.locator(".viewer button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Delete image", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await second.getByRole("button", { name: "Refresh account collection" }).click();
    await expect(second.getByRole("heading", { name: "A little room for your images." })).toBeVisible();
  } finally { await secondContext.close(); }
});
test("failed favorite and deletion preserve confirmed state and retry succeeds", async ({ page }) => {
  await register(page); await upload(page);
  await page.route("**/api/images/*", route => route.request().method() === "PATCH" ? route.fulfill({ status: 503, json: { error: "Favorite write rejected" } }) : route.continue());
  await page.locator(".viewer button[aria-pressed]").click();
  await expect(page.getByRole("alert")).toContainText("Favorite write rejected");
  await expect(page.locator(".viewer button[aria-pressed]")).toHaveAttribute("aria-pressed", "false");
  await page.unroute("**/api/images/*");
  await page.getByRole("button", { name: "Retry last action" }).click();
  await expect(page.locator(".viewer button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");
  await page.route("**/api/images/*", route => route.request().method() === "DELETE" ? route.fulfill({ status: 503, json: { error: "Deletion rejected" } }) : route.continue());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete image", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Deletion rejected");
  expect((await page.request.get("/api/images").then(r => r.json())).length).toBe(1);
  await page.unroute("**/api/images/*");
  await page.getByRole("button", { name: "Delete image", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("account switch cancels an old upload batch and releases old image URLs", async ({ page }) => {
  await page.addInitScript(() => { const revoke = URL.revokeObjectURL; (window as any).revoked = 0; URL.revokeObjectURL = value => { (window as any).revoked++; revoke(value); }; });
  await register(page); await upload(page);
  await expect.poll(() => page.locator(".viewer img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  let release!: () => void, entered!: () => void;
  const held = new Promise<void>(r => { release = r; }); const committed = new Promise<void>(r => { entered = r; });
  let calls = 0;
  await page.route("**/api/images", async route => {
    if (route.request().method() !== "POST") return route.continue();
    calls++; const response = await route.fetch(); entered(); await held;
    try { await route.fulfill({ response }); } catch { /* Original account request was cancelled. */ }
  });
  await page.getByLabel("Upload images").setInputFiles(["tests/fixtures/portrait.jpg", "tests/fixtures/square.webp"]);
  await committed;
  const revokedBefore = await page.evaluate(() => (window as any).revoked);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Guest · images stay on this device")).toBeVisible();
  expect(await page.evaluate(() => (window as any).revoked)).toBeGreaterThan(revokedBefore);
  await register(page);
  release();
  await expect(page.getByRole("heading", { name: "A little room for your images." })).toBeVisible();
  expect(await page.request.get("/api/images").then(r => r.json())).toEqual([]);
  expect(calls).toBe(1);
  await expect(page.getByText("landscape.png", { exact: true })).toHaveCount(0);
});
test("revoked session during a mutation clears private content without false save", async ({ page }) => {
  await register(page); await upload(page);
  await page.request.post("/api/auth/logout", { headers: { Origin: origin } });
  await page.locator(".viewer button[aria-pressed]").click();
  await expect(page.getByRole("alert")).toContainText("Your session has ended");
  await expect(page.getByText("Guest · images stay on this device")).toBeVisible();
  await expect(page.locator(".viewer")).toHaveCount(0);
});
test("late private content read cannot repopulate the signed-out view", async ({ page }) => {
  await register(page); await upload(page);
  let release!: () => void, entered!: () => void;
  const held = new Promise<void>(r => { release = r; }); const started = new Promise<void>(r => { entered = r; });
  await page.route("**/api/images/*/content", async route => { const response = await route.fetch(); entered(); await held; try { await route.fulfill({ response }); } catch { /* Scoped read was aborted. */ } });
  await page.reload(); await started;
  await page.getByRole("button", { name: "Sign out", exact: true }).click(); release();
  await expect(page.getByText("Guest · images stay on this device")).toBeVisible();
  await expect(page.locator(".viewer")).toHaveCount(0);
});
