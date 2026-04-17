/**
 * Auth setup — runs once before the test suite.
 *
 * Writes a fake storage state file directly to disk so every test starts
 * as an authenticated user without loading the app or touching OAuth.
 * Scoring, save, and apply calls are intercepted by route mocks in each spec.
 */

import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const STATE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".auth/user.json"
);

const MOCK_USER = {
  id: "test_apple_sub_abc123",
  email: "test@example.com",
  displayName: "Test User",
};
const MOCK_TOKEN = "deadbeef".repeat(8); // 64-char hex string, safe fake value

setup("authenticate", async () => {
  // Ensure the .auth directory exists
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });

  // Write storage state directly — no page load needed.
  // Playwright merges this into the browser context before each test runs.
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: "http://localhost:5173",
        localStorage: [
          { name: "vetted_user",             value: JSON.stringify(MOCK_USER) },
          { name: "vetted_session_token",    value: MOCK_TOKEN },
          { name: "vetted_walkthrough_seen", value: "1" },
          { name: "vetted_guide_seen",       value: "1" },
        ],
      },
    ],
  };

  fs.writeFileSync(STATE_PATH, JSON.stringify(storageState, null, 2));
});
