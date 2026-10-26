import { test, expect } from "playwright/test";
import { upload } from "../fixtures/images";
declare global {
  interface Window {
    activeUrls: Set<string>;
  }
}
test("URL consumers release replaced, hidden, and closed images", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.activeUrls = new Set();
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      window.activeUrls.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      window.activeUrls.delete(url);
      revoke(url);
    };
  });
  await page.goto("/");
  await page
    .getByLabel("Upload images")
    .setInputFiles([upload("one.png"), upload("two.png")]);
  await expect(page.getByText("2 saved · 0 failed")).toBeVisible();
  await expect(page.locator(".viewer img")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.activeUrls.size)).toBe(1);
  for (let i = 0; i < 10; i++)
    await page
      .getByRole("button", { name: "Random image", exact: true })
      .click();
  await expect.poll(() => page.evaluate(() => window.activeUrls.size)).toBe(1);
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await expect(page.locator(".gallery-card img")).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => window.activeUrls.size)).toBe(2);
  await page.getByRole("button", { name: "Open one.png" }).click();
  await expect.poll(() => page.evaluate(() => window.activeUrls.size)).toBe(3);
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => window.activeUrls.size)).toBe(2);
  await page.getByRole("searchbox").fill("nothing");
  await expect.poll(() => page.evaluate(() => window.activeUrls.size)).toBe(0);
});

test("a decode failure releases its URL while the error entry remains visible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.activeUrls = new Set();
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      window.activeUrls.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      window.activeUrls.delete(url);
      revoke(url);
    };
  });
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.getByLabel("Upload images").setInputFiles(upload());
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("random-gallery", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["images", "blobs"], "readwrite");
      const get = tx.objectStore("images").getAll();
      get.onsuccess = () =>
        tx
          .objectStore("blobs")
          .put({
            id: get.result[0].id,
            blob: new TextEncoder().encode("corrupt").buffer,
            mimeType: "image/png",
          });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await expect(page.locator(".image-error")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.activeUrls.size)).toBe(0);
});
