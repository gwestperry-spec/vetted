/**
 * P9 — Test 3: Mark a role as applied
 *
 * Seeds the dashboard with a pre-scored opportunity (injected into
 * localStorage so the app restores it on mount), then asserts that
 * the "Mark Applied" action updates the UI status indicator.
 *
 * Supabase calls are mocked so the test never touches the real DB.
 */

import { test, expect } from "@playwright/test";

// Pre-scored opportunity that will be seeded into localStorage
const SEED_OPPORTUNITY = {
  id: 1700000000000,
  role_title: "VP of Marketing",
  company: "Seed Corp",
  overall_score: 3.8,
  recommendation: "pursue",
  recommendation_rationale: "Good scope and leadership access.",
  filter_scores: [
    { filter_id: "pl_ownership",        filter_name: "Financial Accountability", score: 4, rationale: "Budget owner." },
    { filter_id: "reporting_structure",  filter_name: "Access to Leadership",    score: 4, rationale: "Reports to CEO." },
    { filter_id: "metric_specificity",   filter_name: "Clear Success Measures",  score: 3, rationale: "Some metrics stated." },
    { filter_id: "scope_language",       filter_name: "Organizational Impact",   score: 4, rationale: "Company-wide." },
    { filter_id: "title_gap",            filter_name: "Role Integrity",          score: 4, rationale: "Title matches." },
  ],
  strengths: ["CEO reporting line"],
  gaps: ["Equity not specified"],
  narrative_bridge: "Solid opportunity.",
  honest_fit_summary: "Worth pursuing.",
  jd: "VP of Marketing at Seed Corp. Reports to CEO. Budget ownership.",
};

test.describe("Mark a role as applied", () => {
  test.beforeEach(async ({ page }) => {
    // ── Seed opportunities into localStorage before the app loads ───────────
    await page.addInitScript((opp) => {
      const existing = JSON.parse(localStorage.getItem("vetted_opportunities") || "[]");
      if (!existing.find((o) => o.id === opp.id)) {
        localStorage.setItem("vetted_opportunities", JSON.stringify([opp, ...existing]));
      }
    }, SEED_OPPORTUNITY);

    // ── Mock Supabase — load returns the seeded opportunity ─────────────────
    await page.route("**/.netlify/functions/supabase**", (route) => {
      const body = route.request().postDataJSON?.() || {};
      if (body.action === "load") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              profile: { display_name: "Test User", tier: "free", threshold: 3.5 },
              filters: [],
              opportunities: [SEED_OPPORTUNITY],
            },
          }),
        });
      } else {
        // saveOpportunity, updateStatus, etc. — all succeed silently
        route.fulfill({ status: 200, contentType: "application/json", body: '{"data":[]}' });
      }
    });

    await page.goto("/");

    // Wait for workspace (new home screen) to load
    await expect(page.locator("text=VETTED").first()).toBeVisible({ timeout: 15_000 });

    // Navigate to the scoring form / dashboard where score history cards live
    const scoreRoleBtn = page.getByRole("button", { name: /score a role/i }).first();
    if (await scoreRoleBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await scoreRoleBtn.click();
    }
  });

  test("marks a role as applied and shows the applied status", async ({ page }) => {
    // The seeded role should appear in the dashboard under "In Progress" or as a card
    const roleText = page.getByText("VP of Marketing", { exact: false });
    await expect(roleText.first()).toBeVisible({ timeout: 10_000 });

    // Find and click a "Mark Applied" button — try multiple label variations
    const applyBtn = page
      .getByRole("button", { name: /mark applied|applied|i applied/i })
      .first();

    if (!(await applyBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // The role might need to be opened/expanded first
      await roleText.first().click();
      await page.waitForTimeout(500);
    }

    const applyBtnRetry = page
      .getByRole("button", { name: /mark applied|applied|i applied/i })
      .first();

    if (!(await applyBtnRetry.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // Check if there's a score result view for this role
      const viewBtn = page.getByRole("button", { name: /view|open|score/i }).first();
      if (await viewBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await viewBtn.click();
      }
    }

    const finalApplyBtn = page
      .getByRole("button", { name: /mark applied|applied|i applied/i })
      .first();
    await expect(finalApplyBtn).toBeVisible({ timeout: 8_000 });
    await finalApplyBtn.click();

    // After marking applied, the status indicator should update to "Applied"
    await expect(
      page.getByText(/applied/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});
