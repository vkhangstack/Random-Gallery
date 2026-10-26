import { readFileSync } from "node:fs";
import { test, expect } from "playwright/test";
import { register, login } from "./helpers";
test("three formats synchronize original content into another browser", async ({ page, browser }) => {
  const address = await register(page);
  await page.getByLabel("Upload images").setInputFiles(["tests/fixtures/landscape.png", "tests/fixtures/portrait.jpg", "tests/fixtures/square.webp"]);
  await expect(page.getByText("3 saved · 0 failed")).toBeVisible();
  const secondContext = await browser.newContext();
  try {
    const second = await secondContext.newPage();
    await login(second, address);
    await second.getByRole("button", { name: "Gallery", exact: true }).click();
    for (const name of ["landscape.png", "portrait.jpg", "square.webp"]) {
      await expect(second.getByRole("button", { name: `Open ${name}`, exact: true })).toBeVisible();
    }
    await expect(second.locator(".gallery-card img")).toHaveCount(3);
    await expect.poll(() => second.locator(".gallery-card img").evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const entries = await second.request.get("/api/images").then(r => r.json());
    expect(entries).toHaveLength(3);
    for (const image of entries) {
      const content = await second.request.get(`/api/images/${image.id}/content`);
      expect(content.ok()).toBe(true);
      expect(await content.body()).toEqual(readFileSync(`tests/fixtures/${image.name}`));
    }
    await second.reload();
    await expect(second.getByText("3 images · saved to your account")).toBeVisible();
    await second.getByRole("button", { name: "Refresh account collection" }).click();
    await expect(second.getByText("3 images · saved to your account")).toBeVisible();
    await second.route("**/api/images", route => route.fulfill({ status: 503, json: { error: "Refresh unavailable" } }));
    await second.getByRole("button", { name: "Refresh account collection" }).click();
    await expect(second.getByRole("heading", { name: "Could not open your collection." })).toBeVisible();
    await expect(second.getByRole("heading", { name: "A little room for your images." })).toHaveCount(0);
    await second.unroute("**/api/images");
    await second.getByRole("button", { name: "Retry opening collection" }).click();
    await expect(second.getByText("3 images · saved to your account")).toBeVisible();
  } finally { await secondContext.close(); }
});
test("pending and failed upload never reports saved", async ({ page }) => {
  await register(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/images", async route => {
    if (route.request().method() !== "POST") return route.continue();
    await held;
    await route.fulfill({ status: 503, json: { error: "Upload rejected by storage" } });
  });
  await page.getByLabel("Upload images").setInputFiles("tests/fixtures/landscape.png");
  await expect(page.getByText(/Processing 0 of 1/)).toBeVisible();
  release();
  await expect(page.getByText("0 saved · 1 failed")).toBeVisible();
  await expect(page.getByText("Upload rejected by storage")).toBeVisible();
  await page.unroute("**/api/images");
  await page.getByLabel("Upload images").setInputFiles("tests/fixtures/landscape.png");
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
});

test("lost upload response is recovered by refresh without automatic replay", async ({ page }) => {
  await register(page);
  await page.route("**/api/images", async route => {
    if (route.request().method() !== "POST") return route.continue();
    // WebKit omits multipart Blob bytes from intercepted postData. Replay the
    // same metadata with the actual fixture bytes before dropping the response.
    const request = route.request();
    const form = await new Request(request.url(), { method: "POST", headers: { "Content-Type": request.headers()["content-type"] }, body: new Uint8Array(request.postDataBuffer()!) }).formData();
    const response = await page.request.post("/api/images", {
      headers: { Origin: "http://127.0.0.1:8081" },
      multipart: { metadata: String(form.get("metadata")), file: { name: "landscape.png", mimeType: "image/png", buffer: readFileSync("tests/fixtures/landscape.png") } },
    });
    expect(response.status()).toBe(201);
    await route.abort("failed");
  });
  await page.getByLabel("Upload images").setInputFiles("tests/fixtures/landscape.png");
  await expect(page.getByText("0 saved · 1 failed")).toBeVisible();
  await page.unroute("**/api/images");
  await page.getByRole("button", { name: "Refresh account collection" }).click();
  await expect(page.getByText("1 image · saved to your account")).toBeVisible();
  expect((await page.request.get("/api/images").then(r => r.json())).length).toBe(1);
});
