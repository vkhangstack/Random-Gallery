import { expect, type Page } from "playwright/test";
export const password = "correct horse battery staple";
export function email() { return `test-${crypto.randomUUID()}@example.test`; }
export async function register(page: Page, address = email()) {
  await page.goto("/sign-up");
  await page.getByLabel("Email", { exact: true }).fill(address);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText(`Signed in as ${address}`)).toBeVisible();
  return address;
}
export async function login(page: Page, address: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(address);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to account", exact: true }).click();
  await expect(page.getByText(`Signed in as ${address}`)).toBeVisible();
}
