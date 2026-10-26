import { test, expect } from "playwright/test";
import { upload } from "../fixtures/images";
test("collection operations remain local and localStorage contains only theme", async ({
  page,
}) => {
  const requests: { url: string; body: string | null }[] = [];
  page.on("request", (request) =>
    requests.push({ url: request.url(), body: request.postData() }),
  );
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page
    .getByLabel("Upload images")
    .setInputFiles(upload("private-unique-fixture.png"));
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  await page.locator(".viewer button[aria-pressed]").click();
  await page.getByRole("button", { name: "Random image", exact: true }).click();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await page.getByRole("searchbox").fill("private");
  await page.locator(".thumbnail").click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete image", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const request of requests) {
    if (new URL(request.url).pathname === "/api/auth/session") {
      expect(request.body).toBeNull();
      expect(new URL(request.url).origin).toBe("http://127.0.0.1:4173");
      continue;
    }
    expect(request.url).not.toContain("private-unique-fixture");
    expect(request.body).toBeNull();
    expect(new URL(request.url).origin).toBe("http://127.0.0.1:4173");
  }
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).every((key) => key === "random-gallery.theme"),
    ),
  ).toBe(true);
});
test("a failed file storage transaction preserves later successes without false saves", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add;
    let failed = false;
    IDBObjectStore.prototype.add = function (v: unknown, k?: IDBValidKey) {
      if (this.name === "blobs" && !failed) {
        failed = true;
        throw new DOMException("Full", "QuotaExceededError");
      }
      return add.call(this, v, k);
    };
  });
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page
    .getByLabel("Upload images")
    .setInputFiles([upload("failed.png"), upload("saved.png")]);
  await expect(page.getByText("1 saved · 1 failed")).toBeVisible();
  await expect(page.getByText(/Device storage is full/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await expect(page.locator(".gallery-card")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Open saved.png" }),
  ).toBeVisible();
});
test("denied storage is an opening error, not an empty collection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = function () {
      throw new DOMException("Denied", "SecurityError");
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Could not open your collection." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A little room for your images." }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Retry opening collection" }),
  ).toBeVisible();
});
test("failed favorites and deletion retain saved state, with visible retry", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.getByLabel("Upload images").setInputFiles(upload());
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.locator(".viewer button[aria-pressed]").click();
  await expect(page.locator(".viewer button[aria-pressed]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(
    page.getByRole("button", { name: "Retry last action" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.evaluate(() => {
    IDBObjectStore.prototype.delete = function () {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Delete image", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Delete this image?" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".viewer img")).toBeVisible();
});
test("failed theme save keeps a usable session preference", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Denied", "SecurityError");
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Use (dark|light) theme/ }).click();
  await expect(
    page.getByText(/This theme applies for this session only/),
  ).toBeVisible();
});
