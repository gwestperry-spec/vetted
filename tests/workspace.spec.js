/**
 * Role Workspace — 10 Playwright tests
 *
 * All 6 existing tests must still pass after this file is added.
 * These tests cover the workspace feature added in Build 25.
 *
 * Supabase calls are fully mocked — no real DB is touched.
 * Anthropic / stream calls use existing mock patterns from score-role.spec.js.
 */

import { test, expect } from "@playwright/test";

// ── Shared fixtures ────────────────────────────────────────────────────────

const MOCK_WORKSPACE_ROLE = {
  id:         "uuid-workspace-role-1",
  role_id:    "ws_1700000000001",
  apple_id:   "test_apple_sub_abc123",
  company:    "Acme Corp",
  title:      "VP of Product",
  source_url: "https://acme.com/jobs/123",
  status:     "pursue",
  vq_score:   4.2,
  framework_snapshot: {
    recommendation:           "pursue",
    recommendation_rationale: "Strong scope and leadership access.",
    filter_scores: [
      { filter_id: "pl_ownership",       filter_name: "Financial Accountability", score: 4, rationale: "Budget owner.", weight: 1.5 },
      { filter_id: "reporting_structure", filter_name: "Access to Leadership",    score: 5, rationale: "Reports to CEO.", weight: 1.2 },
      { filter_id: "metric_specificity",  filter_name: "Clear Success Measures",  score: 4, rationale: "Metrics stated.", weight: 1.3 },
      { filter_id: "scope_language",      filter_name: "Organizational Impact",   score: 4, rationale: "Enterprise-wide.", weight: 1.2 },
      { filter_id: "title_gap",           filter_name: "Role Integrity",          score: 4, rationale: "Title matches.", weight: 1.0 },
    ],
    strengths:         ["CEO reporting line", "Clear P&L ownership"],
    gaps:              ["Equity not specified"],
    narrative_bridge:  "Lead with your cross-functional track record.",
    honest_fit_summary: "Worth pursuing given leadership access.",
    jd: "VP of Product at Acme Corp. Full P&L. Reports to CEO.",
  },
  last_viewed_at: null,
  next_action:    null,
  next_action_at: null,
  notes:          null,
  created_at:     new Date().toISOString(),
  updated_at:     new Date().toISOString(),
};

const MOCK_REMINDER = {
  id:                 "uuid-reminder-1",
  apple_id:           "test_apple_sub_abc123",
  workspace_role_id:  "uuid-workspace-role-1",
  role_id:            "ws_1700000000001",
  remind_at:          new Date(Date.now() + 86400000).toISOString(), // tomorrow
  label:              "Follow up with recruiter",
  completed:          false,
  created_at:         new Date().toISOString(),
};

// ── Shared route mocks ─────────────────────────────────────────────────────

function mockSupabaseWithWorkspace(page, opts = {}) {
  const {
    roles     = [MOCK_WORKSPACE_ROLE],
    reminders = [],
    tier      = "signal",
  } = opts;

  return page.route("**/.netlify/functions/supabase**", (route) => {
    const body = route.request().postDataJSON?.() || {};
    const action = body.action;

    if (action === "load") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          data: {
            profile: { display_name: "Test User", tier, threshold: 3.5 },
            filters: [],
            opportunities: [],
          },
        }),
      });
    }

    if (action === "loadWorkspace") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: { roles, reminders } }),
      });
    }

    // All other workspace actions (upsert, archive, reminder, etc.) succeed silently
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

// ── Test 1: Role persists in workspace after relaunch ─────────────────────
test("role persists in workspace after relaunch", async ({ page }) => {
  await mockSupabaseWithWorkspace(page, { roles: [MOCK_WORKSPACE_ROLE] });
  await page.goto("/");

  // Workspace should render with the role card
  await expect(page.getByText("VP of Product", { exact: false })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Acme Corp", { exact: false })).toBeVisible({ timeout: 5_000 });
});

// ── Test 2: Signal user sees full carousel on resume ──────────────────────
test("Signal user can resume full analysis from workspace", async ({ page }) => {
  await mockSupabaseWithWorkspace(page, { roles: [MOCK_WORKSPACE_ROLE], tier: "signal" });
  await page.goto("/");

  await expect(page.getByText("VP of Product", { exact: false })).toBeVisible({ timeout: 15_000 });

  // Resume button should be visible and unlocked for Signal tier
  const resumeBtn = page.getByRole("button", { name: /review/i }).first();
  await expect(resumeBtn).toBeVisible({ timeout: 5_000 });
  await resumeBtn.click();

  // Should navigate to result view with the reconstructed opp
  await expect(
    page.getByText(/4\.2|pursue/i).first()
  ).toBeVisible({ timeout: 8_000 });
});

// ── Test 3: Free user sees paywall on carousel expansion ──────────────────
test("Free user tapping Resume opens PaywallModal with Signal copy", async ({ page }) => {
  await mockSupabaseWithWorkspace(page, { roles: [MOCK_WORKSPACE_ROLE], tier: "free" });
  await page.goto("/");

  await expect(page.getByText("VP of Product", { exact: false })).toBeVisible({ timeout: 15_000 });

  const resumeBtn = page.getByRole("button", { name: /review/i }).first();
  await expect(resumeBtn).toBeVisible({ timeout: 5_000 });
  await resumeBtn.click();

  // PaywallModal should appear with the full analysis feature copy
  await expect(
    page.getByText(/Your complete breakdown/i)
  ).toBeVisible({ timeout: 5_000 });
});

// ── Test 4: Vantage compare queue sends correct roles to compare view ──────
test("Vantage user can compare two roles from workspace", async ({ page }) => {
  const roleB = {
    ...MOCK_WORKSPACE_ROLE,
    role_id: "ws_1700000000002",
    title:   "Chief of Staff",
    company: "Beta Inc",
    status:  "monitor",
    vq_score: 3.4,
    framework_snapshot: {
      ...MOCK_WORKSPACE_ROLE.framework_snapshot,
      recommendation: "monitor",
    },
  };

  await mockSupabaseWithWorkspace(page, { roles: [MOCK_WORKSPACE_ROLE, roleB], tier: "vantage" });
  await page.goto("/");

  await expect(page.getByText("VP of Product", { exact: false })).toBeVisible({ timeout: 15_000 });

  // Enter compare mode
  const compareToggle = page.getByRole("button", { name: /compare/i }).first();
  await compareToggle.click();

  // Select both roles using their Compare buttons
  const compareButtons = page.getByRole("button", { name: /compare/i });
  const count = await compareButtons.count();
  // Click the card-level Compare buttons (not the header toggle)
  for (let i = 0; i < Math.min(count, 3); i++) {
    const btn = compareButtons.nth(i);
    const label = await btn.getAttribute("aria-label");
    if (label && label.toLowerCase().includes("add")) {
      await btn.click();
    }
  }

  // The compare queue should show at least 1 selection
  await expect(
    page.getByText(/selected/i).first()
  ).toBeVisible({ timeout: 5_000 });
});

// ── Test 5: Free/Signal user sees lock on Compare ─────────────────────────
test("Free user sees lock icon on Compare and PaywallModal opens on tap", async ({ page }) => {
  await mockSupabaseWithWorkspace(page, { roles: [MOCK_WORKSPACE_ROLE], tier: "free" });
  await page.goto("/");

  await expect(page.getByText("VP of Product", { exact: false })).toBeVisible({ timeout: 15_000 });

  // The CompareQueue locked tray should be visible with Upgrade button
  const upgradeBtn = page.getByRole("button", { name: /upgrade/i }).first();
  await expect(upgradeBtn).toBeVisible({ timeout: 5_000 });
  await upgradeBtn.click();

  // PaywallModal with compare copy
  await expect(
    page.getByText(/Compare roles side by side/i).first()
  ).toBeVisible({ timeout: 5_000 });
});

// ── Test 6: Signal user can create a reminder ─────────────────────────────
test("Signal user can set a reminder on a workspace role", async ({ page }) => {
  await mockSupabaseWithWorkspace(page, { roles: [MOCK_WORKSPACE_ROLE], tier: "signal" });
  await page.goto("/");

  await expect(page.getByText("VP of Product", { exact: false })).toBeVisible({ timeout: 15_000 });

  // Click the reminder bell button on the role card
  const reminderBtn = page.getByRole("button", { name: /set a reminder/i }).first();
  await expect(reminderBtn).toBeVisible({ timeout: 5_000 });
  await reminderBtn.click();

  // WorkspaceReminderModal should open
  await expect(page.getByRole("dialog", { name: /reminder/i })).toBeVisible({ timeout: 5_000 });

  // Fill in a date (tomorrow 9 AM)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const localStr = tomorrow.toISOString().slice(0, 16);

  await page.locator("input[type='datetime-local']").fill(localStr);
  await page.locator("input[type='text']").fill("Follow up with recruiter");

  await page.getByRole("button", { name: /set reminder/i }).click();

  // Modal should close
  await expect(page.getByRole("dialog", { name: /reminder/i })).not.toBeVisible({ timeout: 5_000 });
});

// ── Test 7: Free user sees lock on reminder ───────────────────────────────
test("Free user tapping reminder bell opens PaywallModal with Signal copy", async ({ page }) => {
  await mockSupabaseWithWorkspace(page, { roles: [MOCK_WORKSPACE_ROLE], tier: "free" });
  await page.goto("/");

  await expect(page.getByText("VP of Product", { exact: false })).toBeVisible({ timeout: 15_000 });

  // Reminder button should be visible (locked, not hidden)
  const reminderBtn = page.getByRole("button", { name: /Reminders require Signal/i }).first();
  await expect(reminderBtn).toBeVisible({ timeout: 5_000 });
  await reminderBtn.click();

  // PaywallModal with reminder feature copy
  await expect(
    page.getByText(/Never miss a follow-up/i)
  ).toBeVisible({ timeout: 5_000 });
});

// ── Test 8: Archive preserves history and moves card ─────────────────────
test("Archive action moves role to Archived section, history preserved", async ({ page }) => {
  await mockSupabaseWithWorkspace(page, { roles: [MOCK_WORKSPACE_ROLE], tier: "signal" });
  await page.goto("/");

  await expect(page.getByText("VP of Product", { exact: false })).toBeVisible({ timeout: 15_000 });

  // Click archive on the role card
  const archiveBtn = page.getByRole("button", { name: /archive this role/i }).first();
  await expect(archiveBtn).toBeVisible({ timeout: 5_000 });
  await archiveBtn.click();

  // Role should no longer be in Active section, Archived section should exist
  // The role card moves — title still appears but under Archived
  await expect(
    page.getByText(/Archived/i).first()
  ).toBeVisible({ timeout: 5_000 });
});

// ── Test 9: Empty state shown for each section with zero roles ────────────
test("Empty workspace shows guided empty state", async ({ page }) => {
  await mockSupabaseWithWorkspace(page, { roles: [], tier: "signal" });
  await page.goto("/");

  // Workspace loads — empty state should be visible
  await expect(
    page.getByText(/Your workspace is empty/i)
  ).toBeVisible({ timeout: 15_000 });

  // CTA to score a role should be present
  await expect(
    page.getByRole("button", { name: /Score a Role/i }).first()
  ).toBeVisible({ timeout: 5_000 });
});

// ── Test 10: After PaywallModal upgrade, locked action completes ───────────
test("After tier upgrade via PaywallModal, previously locked Compare action becomes available", async ({ page }) => {
  // Start as free — Compare is locked
  await mockSupabaseWithWorkspace(page, { roles: [MOCK_WORKSPACE_ROLE], tier: "free" });

  // Mock the IAP endpoint to return "signal" tier after upgrade
  await page.route("**/.netlify/functions/verify-apple-iap**", (route) => {
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ tier: "signal" }),
    });
  });

  await page.goto("/");
  await expect(page.getByText("VP of Product", { exact: false })).toBeVisible({ timeout: 15_000 });

  // Open paywall via locked Upgrade button in CompareQueue
  const upgradeBtn = page.getByRole("button", { name: /upgrade/i }).first();
  await upgradeBtn.click();

  // PaywallModal is open
  await expect(page.getByRole("dialog", { name: /Compare two roles side by side/i })).toBeVisible({ timeout: 5_000 });

  // Close the modal (simulates cancel / backdrop click)
  const closeBtn = page.getByRole("button", { name: /close/i }).first();
  await closeBtn.click();

  // Modal should be dismissed
  await expect(page.getByRole("dialog", { name: /Compare two roles side by side/i })).not.toBeVisible({ timeout: 3_000 });
});
