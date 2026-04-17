// @ts-check
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * Run all tests:   npx playwright test
 * Run one file:    npx playwright test tests/score-role.spec.js
 * Show report:     npx playwright show-report
 *
 * BASE_URL can be overridden to hit staging or prod:
 *   BASE_URL=https://tryvettedai.com npx playwright test
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,        // sequential — auth state is shared across tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    // Capture a trace on first retry so failures are debuggable in CI
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Always run in headless mode; set HEADLESS=false for local debugging
    headless: process.env.HEADLESS !== "false",
  },

  projects: [
    // ── Shared auth setup — runs before all tests ───────────────────────────
    {
      name: "setup",
      testMatch: "**/auth.setup.js",
    },

    // ── Main test suite — depends on auth setup ─────────────────────────────
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Inject the auth state saved by the setup project
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
