// ── notify-test.js ────────────────────────────────────────────────────────
// Diagnostic endpoint. Sends one test push to every device registered for
// the calling user. Returns a structured report of what worked and what
// didn't, so we can pinpoint exactly where the notification pipeline
// breaks: device-registration, Supabase read, APNs config, or APNs send.
//
// POST body: { appleId, sessionToken }
// Response:  { stages: {...}, devices: [...], summary: "..." }

import apn from "apn";

const SB_URL = process.env.VT_DB_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.VT_DB_KEY || process.env.SUPABASE_SERVICE_KEY;

const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "capacitor://localhost",   // iOS Capacitor WebView
  "http://localhost:5173",   // Local dev (Vite)
  "http://localhost:3000",   // Local dev alt
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function jsonResponse(payload, status, origin) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(origin) });
}

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`sbGet ${path} → ${res.status}`);
  return res.json();
}

export default async function handler(req) {
  const origin = req.headers.get("origin") || "";

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  const stages = {
    env_supabase: false,
    env_apns: false,
    user_authenticated: false,
    devices_found: 0,
    apns_sent: 0,
    apns_failed: 0,
  };
  const devices = [];

  // ── Stage 1: Supabase env ─────────────────────────────────────────────
  if (!SB_URL || !SB_KEY) {
    return jsonResponse({
      stages,
      devices,
      summary: "❌ Supabase env vars missing (VT_DB_URL / VT_DB_KEY). Set them in Netlify before retrying.",
    }, 503, origin);
  }
  stages.env_supabase = true;

  // ── Stage 2: APNs env ─────────────────────────────────────────────────
  const { APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID } = process.env;
  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID || !APNS_BUNDLE_ID) {
    return jsonResponse({
      stages,
      devices,
      summary: `❌ APNs env vars missing. Required: APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID. Set all four in Netlify, then retry. Missing: ${[
        !APNS_KEY && "APNS_KEY",
        !APNS_KEY_ID && "APNS_KEY_ID",
        !APNS_TEAM_ID && "APNS_TEAM_ID",
        !APNS_BUNDLE_ID && "APNS_BUNDLE_ID",
      ].filter(Boolean).join(", ")}`,
    }, 503, origin);
  }
  stages.env_apns = true;

  // ── Stage 3: parse body + session ─────────────────────────────────────
  let body;
  try { body = await req.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, origin); }

  const { appleId, sessionToken } = body || {};
  if (!appleId || !sessionToken) {
    return jsonResponse({
      stages,
      summary: "❌ Missing appleId or sessionToken. Frontend must include both.",
    }, 400, origin);
  }
  stages.user_authenticated = true;

  // ── Stage 4: look up device tokens ────────────────────────────────────
  // Schema: register-device.js writes to user_devices (apple_id, token, platform).
  let rows;
  try {
    rows = await sbGet(`/user_devices?select=token,platform,created_at,last_seen_at&apple_id=eq.${encodeURIComponent(appleId)}`);
  } catch (err) {
    return jsonResponse({
      stages,
      summary: `❌ Supabase device lookup failed: ${err.message}. Possible causes: 'user_devices' table missing, wrong VT_DB_URL, or service-role key lacks read access.`,
    }, 500, origin);
  }

  stages.devices_found = rows.length;
  if (rows.length === 0) {
    return jsonResponse({
      stages,
      devices,
      summary: "❌ No devices registered for this user. The iOS app's register-device call hasn't succeeded yet. Common causes: (1) push permission was denied at the OS prompt, (2) register-device function silently failed (check logs), (3) you signed in on this device before the env var fix shipped — sign out and back in to re-register.",
    }, 200, origin);
  }

  // ── Stage 5: fire test push to every registered device ───────────────
  const provider = new apn.Provider({
    token: { key: APNS_KEY, keyId: APNS_KEY_ID, teamId: APNS_TEAM_ID },
    production: true,
  });

  for (const row of rows) {
    const note = new apn.Notification();
    note.expiry  = Math.floor(Date.now() / 1000) + 600;
    note.sound   = "default";
    note.alert   = {
      title: "Vetted notifications are working ✓",
      body:  "Diagnostic ping. You'll start receiving real nudges as your workspace fills up.",
    };
    note.payload = { kind: "diagnostic" };
    note.topic   = APNS_BUNDLE_ID;

    try {
      const result = await provider.send(note, row.token);
      const sent   = result.sent?.length || 0;
      const failed = result.failed || [];
      if (sent > 0) stages.apns_sent += sent;
      if (failed.length) {
        stages.apns_failed += failed.length;
        devices.push({
          token_tail: row.token.slice(-8),
          platform:   row.platform,
          status:     "failed",
          reason:     failed[0]?.response?.reason || "unknown",
        });
      } else {
        devices.push({
          token_tail: row.token.slice(-8),
          platform:   row.platform,
          status:     "sent",
        });
      }
    } catch (err) {
      stages.apns_failed += 1;
      devices.push({
        token_tail: row.token.slice(-8),
        platform:   row.platform,
        status:     "error",
        reason:     err.message,
      });
    }
  }

  provider.shutdown();

  // ── Stage 6: summarize ───────────────────────────────────────────────
  let summary;
  if (stages.apns_sent > 0 && stages.apns_failed === 0) {
    summary = `✅ All ${stages.apns_sent} push(es) delivered. Check your device — a notification titled "Vetted notifications are working ✓" should be on the lock screen within seconds.`;
  } else if (stages.apns_sent > 0) {
    summary = `⚠️ Partial — ${stages.apns_sent} sent, ${stages.apns_failed} failed. See devices[] for per-token reasons. Common failure reasons: BadDeviceToken (token expired — user needs to sign out / in), Unregistered (user disabled notifications in iOS Settings).`;
  } else {
    summary = `❌ All ${stages.apns_failed} push(es) failed at APNs. Most common cause: APNS_KEY contents are wrong (newlines stripped, wrong file pasted) or the bundle ID mismatch. See devices[] for the exact APNs error reason.`;
  }

  return jsonResponse({ stages, devices, summary }, 200, origin);
}
