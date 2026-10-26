// Run from the project root. Replaces the disposable `random-gallery` container.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium, expect } from "playwright/test";

const origin = "http://127.0.0.1:8080";
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8" });
const browser = await chromium.launch();
try {
  const entry = await fetch(origin);
  assert.equal(entry.status, 200);
  assert.equal(entry.headers.get("cache-control"), "no-cache");
  const html = await entry.text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((m) => m[1]);
  assert.ok(assets.length >= 2);
  for (const asset of assets) {
    const response = await fetch(origin + asset);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /immutable/);
    assert.match(response.headers.get("content-type"), asset.endsWith(".js") ? /javascript/ : /text\/css/);
  }
  assert.equal((await fetch(origin + "/assets/missing.js")).status, 404);
  assert.equal(await (await fetch(origin + "/gallery")).text(), html);
  assert.equal(await (await fetch(origin + "/healthz")).text(), "ok\n");
  docker("exec", "random-gallery", "nginx", "-t");
  docker("exec", "random-gallery", "sh", "-c", "test ! -d /app && ! command -v node");
  console.log("PASS: HTTP entry, assets, caching, missing asset, fallback, health, nginx config, runtime isolation");

  const page = await browser.newPage();
  await page.goto(origin);
  await page.getByLabel("Upload images").setInputFiles("tests/fixtures/landscape.png");
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  await page.locator(".viewer button[aria-pressed]").click();
  await expect(page.locator(".viewer button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(".viewer button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");
  console.log("PASS: Chromium upload, favorite commit, refresh persistence");

  docker("stop", "random-gallery");
  await assert.rejects(fetch(origin + "/healthz", { signal: AbortSignal.timeout(3000) }));
  docker("rm", "random-gallery");
  docker("run", "-d", "--name", "random-gallery", "-p", "127.0.0.1:8080:80", "random-gallery:local");
  await expect.poll(async () => {
    try { return (await fetch(origin + "/healthz")).status; } catch { return 0; }
  }).toBe(200);
  await page.reload();
  await expect(page.locator(".viewer h2")).toHaveText("landscape.png");
  await expect(page.locator(".viewer button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");
  assert.equal(await page.locator(".viewer img").evaluate((image) => image.complete && image.naturalWidth > 0), true);
  console.log("PASS: stopped service unavailable; replacement preserves saved image, favorite and readable blob at same origin");
  console.log("Browser: " + browser.version());
} finally {
  await browser.close();
}
