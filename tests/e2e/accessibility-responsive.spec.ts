import { test, expect } from "playwright/test";
import { upload } from "../fixtures/images";
for (const width of [320, 375, 414, 768, 1440])
  for (const dark of [false, true]) {
    test(`layout and keyboard at ${width}px ${dark ? "dark" : "light"}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
      await page.goto("/");
      await expect(page.getByLabel("Upload images")).toBeEnabled();
      await page
        .getByLabel("Upload images")
        .setInputFiles(
          upload("a-very-long-filename-for-layout-checks-ảnh.png"),
        );
      await expect(page.getByText("1 saved · 0 failed")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        dark ? "dark" : "light",
      );
      await page.getByRole("button", { name: "Gallery", exact: true }).focus();
      await page.keyboard.press("Enter");
      await page.locator(".thumbnail").focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.locator(".thumbnail")).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("button", {
          name: dark ? "Use light theme" : "Use dark theme",
        })
        .click();
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        dark ? "light" : "dark",
      );
    });
  }

for (const dark of [false, true]) {
  test(`complete primary keyboard journey in ${dark ? "dark" : "light"} theme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
    await page.goto("/");
    const uploadInput = page.getByLabel("Upload images");
    await expect(uploadInput).toBeEnabled();
    await uploadInput.focus();
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await (await chooser).setFiles([upload("one.png"), upload("two.png")]);
    await expect(page.getByText("2 saved · 0 failed")).toBeVisible();
    await expect(page.locator(".upload-section [aria-live]")).toContainText(
      "2 saved",
    );
    const shuffle = page.getByRole("button", {
      name: "Random image",
      exact: true,
    });
    await shuffle.focus();
    const focusStyle = await shuffle.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        width: parseFloat(style.outlineWidth),
        style: style.outlineStyle,
      };
    });
    expect(focusStyle.width).toBeGreaterThanOrEqual(2);
    expect(focusStyle.style).not.toBe("none");
    await page.keyboard.press("Space");
    const favorite = page.locator(".viewer button[aria-pressed]");
    await favorite.focus();
    await page.keyboard.press("Enter");
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Gallery", exact: true }).focus();
    await page.keyboard.press("Enter");
    const search = page.getByRole("searchbox");
    await search.focus();
    await page.keyboard.type("one.png");
    await expect(page.locator(".gallery-card")).toHaveCount(1);
    await page.locator(".thumbnail").focus();
    await page.keyboard.press("Enter");
    const preview = page.getByRole("dialog", { name: "Preview one.png" });
    await expect(
      preview.getByRole("button", { name: "Close image preview" }),
    ).toBeFocused();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      expect(
        await preview.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
    }
    await preview.getByRole("button", { name: "Delete", exact: true }).focus();
    await page.keyboard.press("Enter");
    const confirmation = page.getByRole("dialog", {
      name: "Delete this image?",
    });
    await expect(
      confirmation.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(confirmation).toHaveCount(0);
    await expect(
      preview.getByRole("button", { name: "Delete", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await confirmation
      .getByRole("button", { name: "Delete image", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Your gallery.", exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("heading", { name: "No images found." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".gallery-card")).toHaveCount(1);
    const remainingClearControls = await page
      .getByRole("button", { name: "Clear filters" })
      .count();
    expect(remainingClearControls).toBe(0);
  });
  for (const width of [320, 768, 1440])
    test(`landscape error and empty layout at ${width}px ${dark ? "dark" : "light"}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 320 });
      await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
      await page.goto("/");
      await expect(page.getByLabel("Upload images")).toBeEnabled();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByLabel("Upload images")
        .setInputFiles(upload("bad.png", Buffer.from("corrupt")));
      await expect(page.getByText("0 saved · 1 failed")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
}
