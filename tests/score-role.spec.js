/**
 * P9 — Test 2: Score a role
 *
 * Uses the shared auth storage state (injected in auth.setup.js).
 * Mocks the Anthropic scoring endpoint so the test is deterministic and
 * does not consume API credits.
 */

import { test, expect } from "@playwright/test";

// Minimal valid VQ score JSON — matches the shape parseResult() expects
const MOCK_SCORE_RESPONSE = {
  role_title: "Director of Revenue Operations",
  company: "Acme Corp",
  overall_score: 4.2,
  recommendation: "pursue",
  recommendation_rationale: "Strong P&L ownership with clear success metrics.",
  filter_scores: [
    { filter_id: "pl_ownership",       filter_name: "Financial Accountability", score: 5, rationale: "Named P&L owner." },
    { filter_id: "reporting_structure", filter_name: "Access to Leadership",    score: 4, rationale: "Reports to CRO." },
    { filter_id: "metric_specificity",  filter_name: "Clear Success Measures",  score: 4, rationale: "ARR targets stated." },
    { filter_id: "scope_language",      filter_name: "Organizational Impact",   score: 4, rationale: "Cross-functional." },
    { filter_id: "title_gap",           filter_name: "Role Integrity",          score: 4, rationale: "Title matches scope." },
  ],
  strengths: ["Named P&L ownership", "Direct CRO reporting line"],
  gaps: ["Equity details not disclosed"],
  narrative_bridge: "Strong fit for a revenue-focused operator.",
  honest_fit_summary: "Title delivers what it promises. Pursue.",
};

const SAMPLE_JD = `
Director of Revenue Operations — Acme Corp

We are seeking a Director of Revenue Operations to own our $50M ARR go-to-market
engine. You will report directly to the CRO and have named P&L accountability
for our mid-market and enterprise segments.

Success is measured by: ARR growth, pipeline velocity, and win rate improvements.
This is an enterprise-wide, cross-functional leadership role.
`;

test.describe("Score a role", () => {
  test.beforeEach(async ({ page }) => {
    // ── Mock all Netlify function endpoints ─────────────────────────────────
    // Supabase load — return minimal empty profile so auth restore succeeds
    await page.route("**/.netlify/functions/supabase**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { profile: { display_name: "Test User", tier: "free", threshold: 3.5 }, filters: [], opportunities: [] },
        }),
      });
    });

    // Streaming endpoint — force 500 so the app falls back to buffered path.
    // Must use a function matcher to avoid the trailing glob on "anthropic**"
    // accidentally matching "anthropic-stream" as well.
    await page.route(
      (url) => url.pathname.endsWith("/anthropic-stream") || url.pathname.includes("/anthropic-stream."),
      (route) => route.fulfill({ status: 500, body: "stream unavailable" })
    );

    // Buffered endpoint — exact path match so it never captures the stream URL.
    await page.route(
      (url) => url.pathname.endsWith("/anthropic"),
      (route) => route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ content: [{ text: JSON.stringify(MOCK_SCORE_RESPONSE) }] }),
      })
    );

    // Behavioral intelligence — fire and forget, mock as no-op
    await page.route("**/.netlify/functions/behavioral-intelligence**", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    // Save opportunity — no-op
    await page.route("**/.netlify/functions/supabase*saveOpportunity*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/");
  });

  // Helper — navigates from workspace to the scoring form.
  // The workspace is now the default home screen; the textarea lives in the
  // scoring form (dashboard step) reached via "Score a Role".
  async function goToScoringForm(page) {
    await expect(page.locator("text=VETTED").first()).toBeVisible({ timeout: 15_000 });
    // If we're on workspace, click "+ Score a Role" to navigate to the form
    const scoreRoleBtn = page.getByRole("button", { name: /score a role/i }).first();
    if (await scoreRoleBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await scoreRoleBtn.click();
    }
  }

  test("pastes a JD and receives a VQ score", async ({ page }) => {
    await goToScoringForm(page);

    // Find the unified JD / URL input textarea
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    // Type the sample JD
    await textarea.fill(SAMPLE_JD.trim());

    // Click the Score / Analyze button
    const scoreBtn = page.getByRole("button", { name: /score|analyze/i }).first();
    await expect(scoreBtn).toBeEnabled({ timeout: 5_000 });
    await scoreBtn.click();

    // The VQ score result should appear with the mocked role title
    await expect(
      page.getByText("Director of Revenue Operations", { exact: false })
    ).toBeVisible({ timeout: 20_000 });

    // Confirm the numeric score is rendered somewhere on screen
    await expect(page.getByText(/4\.2|4\.1|4\.3/)).toBeVisible({ timeout: 10_000 });
  });

  test("shows an error when the API is unavailable", async ({ page }) => {
    // Override both endpoints to simulate a total outage
    await page.route("**/.netlify/functions/anthropic**", (route) => {
      route.fulfill({ status: 503, body: "Service unavailable" });
    });

    await goToScoringForm(page);

    const textarea = page.locator("textarea").first();
    await textarea.fill("Senior Product Manager — Stealth Startup");

    const scoreBtn = page.getByRole("button", { name: /score|analyze/i }).first();
    await scoreBtn.click();

    // App should display an error message — not crash
    await expect(page.locator("text=/error|failed|try again/i").first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
