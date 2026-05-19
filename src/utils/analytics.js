// ─── Analytics wrapper ────────────────────────────────────────────────────────
// Thin layer over PostHog. All event calls go through here so we can:
//   • swap providers without touching call sites
//   • gate on consent / env
//   • enrich every event with common properties
//
// PostHog key comes from VITE_POSTHOG_KEY (public, safe in client bundle).
// If the key is absent (local dev without .env.local), all calls are no-ops.

import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY;
// Route through Netlify reverse proxy (/ph/*) so requests are same-origin.
// This satisfies the CSP connect-src 'self' rule and avoids CORS on internal-j.posthog.com.
// VITE_POSTHOG_HOST can override (e.g. for EU region: https://eu.i.posthog.com).
const HOST = import.meta.env.VITE_POSTHOG_HOST || "/ph";

let initialized = false;

/** Call once at app boot (main.jsx). */
export function initAnalytics() {
  if (!KEY) {
    // Visible in all environments — if this appears in the production console,
    // the env var is missing from Netlify dashboard.
    // Fix: Netlify Dashboard → Site configuration → Environment variables
    //      → Add VITE_POSTHOG_KEY = phc_... (your project API key)
    //      → Trigger a new deploy so Vite embeds it into the bundle.
    console.warn(
      "[analytics] VITE_POSTHOG_KEY is not set — analytics disabled.\n" +
      "To fix: add VITE_POSTHOG_KEY to Netlify env vars and redeploy."
    );
    return;
  }

  posthog.init(KEY, {
    api_host: HOST,
    // Disable autocapture to keep event list intentional
    autocapture: false,
    // Don't capture pageviews automatically — we fire them manually
    capture_pageview: false,
    // Respect DNT and our own opt-out flag
    respect_dnt: true,
    // Session recording off by default; enable in PostHog project settings if needed
    disable_session_recording: true,
    // Force fetch/XHR instead of navigator.sendBeacon.
    // sendBeacon bypasses the Netlify proxy and hits internal-j.posthog.com directly,
    // which is blocked by CSP. All requests must go through /ph/* to stay same-origin.
    disable_sendbeacon: true,
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        ph.opt_out_capturing(); // never send events in local dev
        console.info("[analytics] DEV mode — PostHog capturing disabled.");
      } else {
        console.info("[analytics] PostHog initialized. Host:", HOST, "Key prefix:", KEY.slice(0, 8) + "…");
      }
    },
  });

  initialized = true;
}

// ─── Identity ─────────────────────────────────────────────────────────────────

/**
 * Identify a user. Call after successful sign-in.
 * @param {string} hashedId  — SHA-256 of apple_id (never raw PII)
 * @param {object} [props]   — optional traits
 */
export function identifyUser(hashedId, props = {}) {
  if (!initialized) return;
  posthog.identify(hashedId, props);
}

/** Reset identity on sign-out. */
export function resetIdentity() {
  if (!initialized) return;
  posthog.reset();
}

// ─── Core event emitter ───────────────────────────────────────────────────────

/**
 * Emit a named event with optional properties.
 * Always safe to call — no-ops when PostHog is not initialized.
 */
export function track(event, props = {}) {
  if (!initialized) return;
  posthog.capture(event, {
    ...props,
    app_version: import.meta.env.VITE_APP_VERSION || "unknown",
    platform: "web",
  });
}

// ─── Typed event helpers (Week 1 proof-gap events) ───────────────────────────

/** Fired after Apple Sign-In completes and session is established. */
export function trackUserSignedIn({ method = "apple" } = {}) {
  track("user_signed_in", { method });
}

/**
 * Fired when the user taps "Score This Role" and the request leaves the client.
 * @param {{ filterCount: number, hasResume: boolean, language: string }} props
 */
export function trackScoreSubmitted({ filterCount, hasResume, language }) {
  track("score_submitted", { filter_count: filterCount, has_resume: hasResume, language });
}

/**
 * Fired when a score result is fully rendered (stream complete + parsed).
 * @param {{ overallScore: number, recommendation: string, durationMs: number, filterCount: number }} props
 */
export function trackScoreCompleted({ overallScore, recommendation, durationMs, filterCount }) {
  track("score_completed", {
    overall_score: overallScore,
    recommendation,
    duration_ms: durationMs,
    filter_count: filterCount,
  });
}

/**
 * Fired when scoring fails (network error, parse error, or non-2xx response).
 * @param {{ errorType: string, statusCode?: number }} props
 */
export function trackScoreFailed({ errorType, statusCode }) {
  track("score_failed", { error_type: errorType, status_code: statusCode });
}

/**
 * Fired when the SSE stream times out and the client falls back to a polling/REST call.
 * @param {{ durationMs: number }} props
 */
export function trackStreamFallbackTriggered({ durationMs }) {
  track("stream_fallback_triggered", { duration_ms: durationMs });
}

/**
 * Fired when the paywall modal is shown.
 * @param {{ trigger: string }} props  — e.g. "score_limit", "export_pdf", "coaching"
 */
export function trackPaywallShown({ trigger }) {
  track("paywall_shown", { trigger });
}

/**
 * Fired when a user taps a subscription CTA inside the paywall.
 * @param {{ plan: string }} props  — e.g. "monthly", "lifetime"
 */
export function trackPaywallCtaTapped({ plan }) {
  track("paywall_cta_tapped", { plan });
}

/**
 * Fired when the coaching panel is opened (any coaching tab).
 * @param {{ source: string }} props  — "score_result" | "dashboard"
 */
export function trackCoachingOpened({ source }) {
  track("coaching_opened", { source });
}

/**
 * Fired when a coaching message is sent.
 * @param {{ messageIndex: number }} props
 */
export function trackCoachingMessageSent({ messageIndex }) {
  track("coaching_message_sent", { message_index: messageIndex });
}

export default { initAnalytics, identifyUser, resetIdentity, track };

// ─── Firebase Analytics bridge ────────────────────────────────────────────
// Build 30 added Firebase Analytics alongside the existing PostHog layer.
// Lazy-loads @capacitor-firebase/analytics so the web bundle (vite dev /
// netlify preview) doesn't break when the native plugin isn't available.
// Every call no-ops silently off-platform.

import { Capacitor as _Capacitor } from "@capacitor/core";

let _firebase = null;
async function _getFirebase() {
  if (_firebase) return _firebase;
  if (!_Capacitor?.isNativePlatform?.()) return null;
  try {
    const mod = await import("@capacitor-firebase/analytics");
    _firebase = mod.FirebaseAnalytics;
    return _firebase;
  } catch {
    return null;
  }
}

/** Log a custom event to Firebase Analytics (GA4). */
export async function logEvent(name, params = {}) {
  const fb = await _getFirebase();
  if (!fb) return;
  try { await fb.logEvent({ name, params }); }
  catch (err) { console.warn("[analytics/firebase] logEvent failed:", err?.message || err); }
}

/** Bind a user id to GA4 events (anonymous opaque id). */
export async function setUserId(userId) {
  const fb = await _getFirebase();
  if (!fb) return;
  try { await fb.setUserId({ userId: userId || null }); }
  catch (err) { console.warn("[analytics/firebase] setUserId failed:", err?.message || err); }
}

/** Set a user-scoped property (tier, lang, country, etc.). */
export async function setUserProperty(key, value) {
  const fb = await _getFirebase();
  if (!fb) return;
  try { await fb.setUserProperty({ key, value: value == null ? "" : String(value) }); }
  catch (err) { console.warn("[analytics/firebase] setUserProperty failed:", err?.message || err); }
}

/** Convenience: emit a screen_view to GA4 for tab/screen transitions. */
export async function logScreen(name) {
  return logEvent("screen_view", { screen_name: name, screen_class: "Vetted" });
}
