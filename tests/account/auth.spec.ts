import { test, expect } from "playwright/test";
import { register, login, password } from "./helpers";
test("register, restore, invalid login and logout", async ({ page }) => {
  const address = await register(page);
  await page.reload();
  await expect(page.getByText(`Signed in as ${address}`)).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(address);
  await page.getByLabel("Password", { exact: true }).fill(password + "wrong");
  await page.getByRole("button", { name: "Sign in to account" }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to account" }).click();
  await expect(page.getByText(`Signed in as ${address}`)).toBeVisible();
});
test("failed session lookup is visible and retryable", async ({ page }) => {
  await page.route("**/api/auth/session", r => r.fulfill({ status: 503, json: { error: "Account service unavailable" } }));
  await page.goto("/");
  await expect(page.getByText(/Account connection: Account service unavailable/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry account connection" })).toBeVisible();
  await page.unroute("**/api/auth/session");
  await page.getByRole("button", { name: "Retry account connection" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("shared-cookie changes notify another tab and tab return rechecks", async ({ page, context }) => {
  const address = await register(page);
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByText(`Signed in as ${address}`)).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(second.getByText("Guest · images stay on this device")).toBeVisible();
  await login(page, address);
  await expect(second.getByText(`Signed in as ${address}`)).toBeVisible();
  await context.request.post("/api/auth/logout", { headers: { Origin: "http://127.0.0.1:8081" } });
  await second.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(second.getByText("Guest · images stay on this device")).toBeVisible();
});

test("auth URLs are dedicated pages and successful/signed-in auth redirects home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByLabel("Upload images")).toHaveCount(0);
  await page.reload();
  await page.getByRole("link", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await page.reload();
  await expect(page.getByLabel("Upload images")).toHaveCount(0);
  await page.getByRole("link", { name: "Back to gallery", exact: false }).click();
  await expect(page).toHaveURL("http://127.0.0.1:8081/");
  await page.getByRole("link", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  const address = await register(page);
  await expect(page).toHaveURL("http://127.0.0.1:8081/");
  for (const path of ["/sign-in", "/sign-up"]) {
    await page.goto(path);
    await expect(page).toHaveURL("http://127.0.0.1:8081/");
    await expect(page.getByText(`Signed in as ${address}`)).toBeVisible();
  }
});
