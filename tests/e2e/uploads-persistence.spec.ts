import { test, expect } from "playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { batch, upload, paddedPng } from "../fixtures/images";
test("mixed uploads retain successes across refresh and page reopen", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little room for your images." }),
  ).toBeVisible();
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page
    .getByLabel("Upload images")
    .setInputFiles([
      ...batch(),
      upload("invalid.txt", Buffer.from("bad"), "text/plain"),
      upload("empty.png", Buffer.alloc(0)),
      upload("too-large.png", paddedPng(10485761)),
    ]);
  await expect(page.getByText("12 saved · 3 failed")).toBeVisible();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await expect(page.locator(".gallery-card")).toHaveCount(12);
  await page.reload();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await expect(page.locator(".gallery-card")).toHaveCount(12);
  const next = await context.newPage();
  await page.close();
  await next.goto("/");
  await next.getByRole("button", { name: "Gallery", exact: true }).click();
  await expect(next.locator(".gallery-card")).toHaveCount(12);
});
test("actual decoding, boundary validation, duplicate uploads and site-data loss", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page
    .getByLabel("Upload images")
    .setInputFiles([
      upload("boundary.png", paddedPng(10485760)),
      upload("corrupt.png", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      upload("same.png"),
      upload("same.png"),
    ]);
  await expect(page.getByText("3 saved · 1 failed")).toBeVisible();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await expect(page.locator(".gallery-card")).toHaveCount(3);
  await expect(page.locator(".gallery-card img").first()).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase("random-gallery");
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A little room for your images." }),
  ).toBeVisible();
});
test("browser restart with a persistent profile retains blobs", async ({
  browserName,
  playwright,
}) => {
  const browserType = playwright[browserName];
  const profile = await mkdtemp(join(tmpdir(), "random-gallery-profile-"));
  try {
    let ctx = await browserType.launchPersistentContext(profile);
    let page = await ctx.newPage();
    await page.goto("http://127.0.0.1:4173");
    await expect(page.getByLabel("Upload images")).toBeEnabled();
    await page.getByLabel("Upload images").setInputFiles(upload());
    await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
    await ctx.close();
    ctx = await browserType.launchPersistentContext(profile);
    page = await ctx.newPage();
    await page.goto("http://127.0.0.1:4173");
    await expect(page.locator(".viewer img")).toBeVisible();
    await ctx.close();
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
});
