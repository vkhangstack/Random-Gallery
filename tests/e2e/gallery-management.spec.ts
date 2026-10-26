import { test, expect } from "playwright/test";
import { upload } from "../fixtures/images";
test("gallery search/favorites, confirmation and deletion persist", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page
    .getByLabel("Upload images")
    .setInputFiles([upload("Café.PNG"), upload("second.png")]);
  await expect(page.getByText("2 saved · 0 failed")).toBeVisible();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search images" }).fill(" CAFÉ ");
  await expect(page.locator(".gallery-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Favorite Café.PNG", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "Favorites only" }).check();
  await expect(page.locator(".gallery-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Open Café.PNG" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Preview Café.PNG" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete image", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "No images found." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".gallery-card")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await expect(page.locator(".gallery-card")).toHaveCount(1);
});
test("deleting the displayed last image leaves a valid empty state", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page.getByLabel("Upload images").setInputFiles(upload());
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".viewer img")).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete image", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little room for your images." }),
  ).toBeVisible();
});
test("filtering an inspected image out keeps its viewer open and Random scope independent", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page
    .getByLabel("Upload images")
    .setInputFiles([upload("one.png"), upload("two.png")]);
  await expect(page.getByText("2 saved · 0 failed")).toBeVisible();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await page
    .getByRole("button", { name: "Favorite one.png", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "Favorites only" }).check();
  await page.getByRole("button", { name: "Open one.png" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Unfavorite one.png", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Preview one.png" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "No images found." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Random", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "All images", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("closing a preview whose trigger was filtered out restores focus to Gallery controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Upload images")).toBeEnabled();
  await page
    .getByLabel("Upload images")
    .setInputFiles(upload("only-favorite.png"));
  await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await page
    .getByRole("button", { name: "Favorite only-favorite.png", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Unfavorite only-favorite.png",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("checkbox", { name: "Favorites only" }).check();
  await page.getByRole("button", { name: "Open only-favorite.png" }).click();
  await page
    .getByRole("dialog", { name: "Preview only-favorite.png" })
    .getByRole("button", { name: "Unfavorite only-favorite.png", exact: true })
    .click();
  await expect(page.locator(".gallery-card")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your gallery.", exact: true }),
  ).toBeFocused();
});
