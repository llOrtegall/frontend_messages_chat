import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against a real backend (see e2e/README section in README.md).
// The backend must already be running; the frontend is started here unless one is up.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false, // the tests share one backend and its rate limits
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: process.env.CI ? "bun run start -p 3001" : "bun run dev",
    url: "http://localhost:3001/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
