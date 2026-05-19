// ── analytics.js ──────────────────────────────────────────────────────────
// Thin wrapper around @capacitor-firebase/analytics so the rest of the app
// can log events without caring about platform availability or import
// boilerplate. On web (vite dev / netlify preview) Firebase isn't wired,
// so every call no-ops silently.

import { Capacitor } from "@capacitor/core";

let _analytics = null;
async function getAnalytics() {
  if (_analytics) return _analytics;
  if (!Capacitor?.isNativePlatform?.()) return null;
  try {
    const mod = await import("@capacitor-firebase/analytics");
    _analytics = mod.FirebaseAnalytics;
    return _analytics;
  } catch {
    return null;
  }
}

export async function logEvent(name, params = {}) {
  const a = await getAnalytics();
  if (!a) return;
  try { await a.logEvent({ name, params }); }
  catch (err) { console.warn("[analytics] logEvent failed:", err?.message || err); }
}

export async function setUserId(userId) {
  const a = await getAnalytics();
  if (!a) return;
  try { await a.setUserId({ userId: userId || null }); }
  catch (err) { console.warn("[analytics] setUserId failed:", err?.message || err); }
}

export async function setUserProperty(key, value) {
  const a = await getAnalytics();
  if (!a) return;
  try { await a.setUserProperty({ key, value: value == null ? "" : String(value) }); }
  catch (err) { console.warn("[analytics] setUserProperty failed:", err?.message || err); }
}

export async function logScreen(name) {
  return logEvent("screen_view", { screen_name: name, screen_class: "Vetted" });
}
