// ── register-device.js ────────────────────────────────────────────────────
// Stores or refreshes a device push token for a user.
//
// POST body:
//   { appleId: string, sessionToken: string, token: string, platform: "ios" }
//
// Upserts into user_devices table (keyed on appleId + token).
//
// Uses raw fetch to Supabase PostgREST — same pattern as dashboard-data.js,
// workspace-sweep.js, fetch-jd.js. Avoids depending on @supabase/supabase-js
// which Netlify's function bundler doesn't pick up in this context.

const SB_URL = process.env.VT_DB_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.VT_DB_KEY || process.env.SUPABASE_SERVICE_KEY;

const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "https://vettedai.netlify.app",
  "https://app.vetted.ai",
  "capacitor://localhost",   // iOS Capacitor WebView
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsBase(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
  };
}

function jsonHeaders(origin) {
  return { ...corsBase(origin), "Content-Type": "application/json" };
}

async function sbRequest(path, { method = "GET", body, prefer } = {}) {
  const url = `${SB_URL}/rest/v1${path}`;
  const headers = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

export default async function handler(req) {
  const origin = req.headers.get("origin") || "";
  const headers = jsonHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsBase(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers });
  }

  if (!SB_URL || !SB_KEY) {
    console.error("[register-device] missing Supabase env vars");
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 503, headers });
  }

  let payload;
  try { payload = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers }); }

  const { appleId, sessionToken, token, platform = "ios", lang, prefs = {}, langUpdateOnly = false } = payload || {};

  if (!appleId) {
    return new Response(JSON.stringify({ error: "Missing appleId" }), { status: 400, headers });
  }

  // ── Lang-only update: patch all this user's device rows ───────────────
  if (langUpdateOnly && lang) {
    const res = await sbRequest(
      `/user_devices?apple_id=eq.${encodeURIComponent(appleId)}`,
      {
        method: "PATCH",
        body: { lang, updated_at: new Date().toISOString() },
        prefer: "return=minimal",
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[register-device] lang update error:", res.status, text);
      return new Response(JSON.stringify({ error: "Failed to update lang" }), { status: 500, headers });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers });
  }

  // ── Upsert via PostgREST: POST with Prefer=resolution=merge-duplicates ──
  // and on_conflict=apple_id,token tells PostgREST to update on conflict
  // instead of inserting a duplicate row.
  const row = {
    apple_id:        appleId,
    token,
    platform,
    lang:            lang || "en",
    notif_reminders: prefs.reminders ?? true,
    notif_follow_up: prefs.followUp  ?? true,
    notif_staleness: prefs.staleness ?? true,
    notif_timeline:  prefs.timeline  ?? true,
    notif_digest:    prefs.digest    ?? true,
    updated_at:      new Date().toISOString(),
  };

  const res = await sbRequest(
    `/user_devices?on_conflict=apple_id,token`,
    {
      method: "POST",
      body: row,
      prefer: "resolution=merge-duplicates,return=minimal",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[register-device] supabase error:", res.status, text);
    return new Response(JSON.stringify({ error: "Failed to register device" }), { status: 500, headers });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
