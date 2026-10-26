import { defineConfig, devices } from "playwright/test";
export default defineConfig({
  testDir: "./tests/account",
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  use: { baseURL: "http://127.0.0.1:8081", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
