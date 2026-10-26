import { test, expect } from "playwright/test";
import { paddedPng } from "../fixtures/images";
import { linkSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
let workloadDirectory: string | undefined;
test.afterEach(() => { if (workloadDirectory) rmSync(workloadDirectory, { recursive: true, force: true }); workloadDirectory = undefined; });
declare global {
  interface Window {
    uploadFeedbackMs: number;
  }
}
test("100-image timing workload reports visible shuffle/search results", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  workloadDirectory = mkdtempSync(join(tmpdir(), "random-gallery-workload-"));
  const source = join(workloadDirectory, "source.png");
  writeFileSync(source, paddedPng(2 * 1024 * 1024));
  const files = Array.from({ length: 100 }, (_, i) => {
    const path = join(workloadDirectory!, `workload-${i}.png`);
    linkSync(source, path);
    return path;
  });
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
    input.addEventListener(
      "change",
      () => {
        const start = performance.now();
        const observer = new MutationObserver(() => {
          if (
            document
              .querySelector(".upload-section [aria-live]")
              ?.textContent?.includes("Processing")
          ) {
            window.uploadFeedbackMs = performance.now() - start;
            observer.disconnect();
          }
        });
        observer.observe(document.querySelector(".upload-section")!, {
          subtree: true,
          childList: true,
          characterData: true,
        });
      },
      { once: true },
    );
  });
  await page.getByLabel("Upload images").setInputFiles(files);
  await expect(page.getByText(/Processing \d+ of 100/)).toBeVisible();
  const feedback = await page.evaluate(() => window.uploadFeedbackMs);
  expect(feedback).toBeLessThanOrEqual(1000);
  await expect(page.getByText("100 saved · 0 failed")).toBeVisible({
    timeout: 120000,
  });
  const shuffle: number[] = [],
    search: number[] = [];
  for (let i = 0; i < 100; i++) {
    const start = Date.now();
    const old = await page.locator(".viewer h2").textContent();
    await page
      .getByRole("button", { name: "Random image", exact: true })
      .click();
    await expect(page.locator(".viewer h2")).not.toHaveText(old!);
    await expect
      .poll(() =>
        page
          .locator(".viewer img")
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBe(true);
    shuffle.push(Date.now() - start);
  }
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  for (let i = 0; i < 100; i++) {
    const start = Date.now();
    await page.getByRole("searchbox").fill(`workload-${i}.png`);
    await expect(page.locator(".gallery-card")).toHaveCount(1);
    search.push(Date.now() - start);
  }
  const p95 = (values: number[]) => [...values].sort((a, b) => a - b)[94];
  await info.attach("timings.json", {
    body: JSON.stringify({
      browser: info.project.name,
      feedback,
      shuffle,
      search,
      p95Shuffle: p95(shuffle),
      p95Search: p95(search),
      note: "Automated host timing; physical-device acceptance remains separate.",
    }),
    contentType: "application/json",
  });
  expect(p95(shuffle)).toBeLessThanOrEqual(1000);
  expect(p95(search)).toBeLessThanOrEqual(1000);
});
