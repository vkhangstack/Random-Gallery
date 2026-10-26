import { test, expect } from "playwright/test";
import { register, login } from "./helpers";

test("returning from the file picker preserves a signed-in upload and never writes IndexedDB", async ({ page, browser }) => {
  const address = await register(page);
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.evaluate(() => {
    const original = HTMLImageElement.prototype.decode;
    let release!: () => void;
    (window as any).pickerValidation = new Promise<void>(resolve => { release = resolve; });
    (window as any).releasePickerValidation = release;
    HTMLImageElement.prototype.decode = async function () {
      await (window as any).pickerValidation;
      await original.call(this);
    };
  });
  let posts = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/images" && request.method() === "POST") posts++; });
  await page.getByLabel("Upload images").setInputFiles("tests/fixtures/landscape.png");
  await expect(page.getByText(/Processing 0 of 1/)).toBeVisible();
  const rechecked = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/session");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await rechecked;
  await expect(page.getByText(`Signed in as ${address}`)).toBeVisible();
  await page.evaluate(() => (window as any).releasePickerValidation());
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  expect(posts).toBe(1);
  await expect(page.locator(".viewer h2")).toHaveText("landscape.png");
  const databaseNames = await page.evaluate(async () => (await indexedDB.databases()).map(database => database.name));
  expect(databaseNames).not.toContain("random-gallery");
  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await login(second, address);
    await expect(second.locator(".viewer h2")).toHaveText("landscape.png");
    await expect.poll(() => second.locator(".viewer img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  } finally { await other.close(); }
});

test("session lookup failure never switches a known account upload to IndexedDB", async ({ page }) => {
  const address = await register(page);
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.route("**/api/auth/session", route => route.fulfill({ status: 503, json: { error: "Temporary account outage" } }));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText(`Signed in as ${address}`)).toBeVisible();
  await expect(page.getByText(/Uploads are paused until your account connection is restored/)).toBeVisible();
  await expect(page.getByText("Guest · images stay on this device")).toHaveCount(0);
  await expect(page.getByLabel("Upload images")).toBeHidden();
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(database => database.name))).not.toContain("random-gallery");
  await page.unroute("**/api/auth/session");
  await page.getByRole("button", { name: "Retry account connection" }).click();
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.getByLabel("Upload images").setInputFiles("tests/fixtures/landscape.png");
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  const images = await page.request.get("/api/images").then(response => response.json());
  expect(images.map((image: { name: string }) => image.name)).toEqual(["landscape.png"]);
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(database => database.name))).not.toContain("random-gallery");
});
