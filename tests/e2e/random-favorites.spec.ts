import { test, expect } from "playwright/test";
import { upload } from "../fixtures/images";
test("random excludes current and favorites persist with last-favorite empty state", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page
    .getByLabel("Upload images")
    .setInputFiles([upload("one.png"), upload("two.png")]);
  await expect(page.getByText("2 saved · 0 failed")).toBeVisible();
  let previous = await page.locator(".viewer h2").textContent();
  for (let i = 0; i < 100; i++) {
    await page
      .getByRole("button", { name: "Random image", exact: true })
      .click();
    const name = await page.locator(".viewer h2").textContent();
    expect(name).not.toBe(previous);
    previous = name;
  }
  await page.locator(".viewer button[aria-pressed]").click();
  await expect(page.locator(".viewer button[aria-pressed]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("button", { name: "Favorites only", exact: true })
    .click();
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Random image", exact: true })
      .click();
    await expect(page.locator(".viewer h2")).toHaveText(previous!);
  }
  await page.reload();
  await page
    .getByRole("button", { name: "Favorites only", exact: true })
    .click();
  await expect(page.locator(".viewer h2")).toHaveText(previous!);
  await page.locator(".viewer button[aria-pressed]").click();
  await expect(
    page.getByRole("heading", { name: "Your favorites are waiting." }),
  ).toBeVisible();
});
test("favorites-only selections exclude nonfavorites across 100 shuffles", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page
    .getByLabel("Upload images")
    .setInputFiles([
      upload("favorite-one.png"),
      upload("favorite-two.png"),
      upload("excluded.png"),
    ]);
  await expect(page.getByText("3 saved · 0 failed")).toBeVisible();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  for (const name of ["favorite-one.png", "favorite-two.png"]) {
    await page
      .getByRole("button", { name: `Favorite ${name}`, exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Unfavorite ${name}`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Random", exact: true }).click();
  await page
    .getByRole("button", { name: "Favorites only", exact: true })
    .click();
  let previous = await page.locator(".viewer h2").textContent();
  for (let i = 0; i < 100; i++) {
    await page
      .getByRole("button", { name: "Random image", exact: true })
      .click();
    const name = await page.locator(".viewer h2").textContent();
    expect(name).not.toBe("excluded.png");
    expect(name).not.toBe(previous);
    previous = name;
  }
});
test("missing blobs give an error and retry without claiming the collection is empty", async ({
  page,
}) => {
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
      const tx = db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").clear();
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "These images could not be read." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A little room for your images." }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Retry images", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "These images could not be read." }),
  ).toBeVisible();
});
