/**
 * Auth setup — runs once before the test suite.
 *
 * Injects a fake (but structurally valid) auth session directly into
 * localStorage so every test starts as an authenticated user without
 * going through the actual Apple / GitHub OAuth flow.
 *
 * The mock session uses a stub user ID and a dummy token. Scoring,
 * save, and apply calls are intercepted by route mocking in each spec.
 */

import { test as setup } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const STATE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".auth/user.json"
);

// Stable mock user — matches shape produced by apple-auth.js / github-auth.js
const MOCK_USER = {
  id: "test_apple_sub_abc123",
  email: "test@example.com",
  displayName: "Test User",
};
const MOCK_TOKEN = "deadbeef".repeat(8); // 64-char hex string

setup("authenticate", async ({ page }) => {
  await page.goto("/");

  // Inject auth state before the React app mounts so restoreSession() picks it up
  await page.evaluate(
    ({ user, token }) => {
      localStorage.setItem("vetted_user", JSON.stringify(user));
      localStorage.setItem("vetted_session_token", token);
      sessionStorage.setItem("vetted_session_token", token);
    },
    { user: MOCK_USER, token: MOCK_TOKEN }
  );

  // Save the browser storage state so Playwright can reuse it in every test
  await page.context().storageState({ path: STATE_PATH });
});
