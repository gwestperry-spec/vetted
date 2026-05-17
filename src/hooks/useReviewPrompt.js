// ── useReviewPrompt.js ────────────────────────────────────────────────────
// Asks iOS to show the App Store review prompt at high-quality moments.
// Apple silently caps to 3 prompts per user per 365 days, so we don't need
// to track frequency ourselves — we just need to pick GOOD moments so the
// user is more likely to rate 5 stars.
//
// Trigger conditions (all must be true):
//   1. Total VQ scores >= 3 (proves real engagement)
//   2. Most recent verdict was "pursue" OR "monitor" (positive moment)
//   3. Has used the app across at least 2 distinct calendar days
//   4. Haven't been prompted in the last 14 days (defense in depth above
//      Apple's own throttle — keeps users who dismissed feeling un-nagged)
//   5. Result screen has been visible for ≥3 seconds (they're reading,
//      not bouncing)
//
// Anti-patterns we avoid:
//   - Prompting after "pass" verdicts (negative emotion)
//   - Prompting on first launch
//   - Prompting on error states

import { useEffect } from "react";

const STORAGE_KEYS = {
  scoreCount:     "vetted_review_score_count",
  lastPromptAt:   "vetted_review_last_prompt_at",
  firstSeenAt:    "vetted_review_first_seen_at",
};

const MIN_SCORES        = 3;
const MIN_DAYS_USED     = 2;
const DWELL_MS          = 3000;
const COOLDOWN_DAYS     = 14;
const COOLDOWN_MS       = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function read(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, String(value)); } catch {}
}

export function recordScoreCompleted() {
  const current = parseInt(read(STORAGE_KEYS.scoreCount, "0"), 10) || 0;
  write(STORAGE_KEYS.scoreCount, current + 1);
  if (!read(STORAGE_KEYS.firstSeenAt)) {
    write(STORAGE_KEYS.firstSeenAt, Date.now());
  }
}

function daysSinceFirstSeen() {
  const first = parseInt(read(STORAGE_KEYS.firstSeenAt, "0"), 10) || 0;
  if (!first) return 0;
  return Math.floor((Date.now() - first) / (24 * 60 * 60 * 1000));
}

function eligibleForPrompt(recommendation) {
  const isPositive = recommendation === "pursue" || recommendation === "monitor";
  if (!isPositive) return false;

  const scores = parseInt(read(STORAGE_KEYS.scoreCount, "0"), 10) || 0;
  if (scores < MIN_SCORES) return false;

  // At least 2 distinct days since first use (rough proxy for "real" user)
  if (daysSinceFirstSeen() < MIN_DAYS_USED - 1) return false;

  const lastPrompt = parseInt(read(STORAGE_KEYS.lastPromptAt, "0"), 10) || 0;
  if (lastPrompt && (Date.now() - lastPrompt) < COOLDOWN_MS) return false;

  return true;
}

async function triggerNativePrompt() {
  if (!window?.Capacitor?.isNativePlatform?.()) return { shown: false, reason: "not_native" };
  try {
    const result = await window.Capacitor.Plugins.StoreKitPlugin.requestReview();
    write(STORAGE_KEYS.lastPromptAt, Date.now());
    return result;
  } catch (err) {
    console.warn("[review-prompt] requestReview failed:", err);
    return { shown: false, reason: "exception", error: err?.message };
  }
}

// Hook that watches the current result and fires the prompt at the right moment.
// Pass in the result's `recommendation` and a boolean `visible` (true when the
// result screen is on-screen). The hook handles dwell + eligibility itself.
export function useReviewPrompt({ recommendation, visible }) {
  useEffect(() => {
    if (!visible || !recommendation) return;
    if (!eligibleForPrompt(recommendation)) return;

    const timer = setTimeout(() => {
      triggerNativePrompt().then((result) => {
        if (result?.shown) console.log("[review-prompt] prompt shown");
      });
    }, DWELL_MS);

    return () => clearTimeout(timer);
  }, [recommendation, visible]);
}
