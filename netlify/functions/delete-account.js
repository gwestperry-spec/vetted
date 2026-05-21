// ── delete-account.js ─────────────────────────────────────────────────────
// Permanent account deletion. Required by App Store Guideline 5.1.1(v).
//
// POST body: { appleId, sessionToken }
//
// Verifies the session token via HMAC, then cascades a DELETE across every
// apple_id-keyed table. Returns 200 with a per-table tally on success.
//
// Tables deleted (in this order to respect any FK dependencies):
//   1.  behavioral_insights        — derived patterns
//   2.  workspace_reminders        — orphaned, B30 cleanup, but still drop
//   3.  workspace_roles            — every scored role
//   4.  filter_frameworks          — user's filter framework
//   5.  user_notification_log      — push dedup log
//   6.  user_devices               — APNs tokens (revokes push)
//   7.  opportunities              — legacy pre-Build-29 table
//   8.  profiles                   — root identity row (deleted last)
//
// We deliberately do NOT delete from fetch_jd_log — it's per-request
// observability with no apple_id column. Anonymous diagnostic data only.
//
// The user's Apple Sign in identity is not under our control — Apple
// retains the opaque user ID at their end. On next sign-in with the
// same Apple ID, a fresh `profiles` row is created via apple-auth.js.

import crypto from "crypto";

const SB_URL = process.env.VT_DB_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.VT_DB_KEY || process.env.SUPABASE_SERVICE_KEY;

const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "https://vettedai.netlify.app",
  "https://app.vetted.ai",
  "capacitor://localhost",
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

async function sbDelete(path) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    method: "DELETE",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Prefer: "return=representation",
    },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "");
    throw new Error(`DELETE ${path} → ${res.status} ${body.slice(0, 200)}`);
  }
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows.length : 0;
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
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 503, headers });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers }); }

  const { appleId, sessionToken } = body || {};
  if (!appleId || typeof appleId !== "string" || appleId.length > 256) {
    return new Response(JSON.stringify({ error: "Missing or invalid appleId" }), { status: 400, headers });
  }
  if (!sessionToken || typeof sessionToken !== "string") {
    return new Response(JSON.stringify({ error: "Missing sessionToken" }), { status: 400, headers });
  }

  // ── Verify session token (HMAC-SHA256 over appleId, timing-safe compare) ──
  const serverSecret = process.env.VETTED_SECRET;
  if (!serverSecret) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 503, headers });
  }
  const expectedToken = crypto.createHmac("sha256", serverSecret).update(appleId).digest("hex");
  const tokenBuf = Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64));
  const expectedBuf = Buffer.from(expectedToken.padEnd(64, "0").slice(0, 64));
  if (!crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 403, headers });
  }

  // ── Cascade delete ───────────────────────────────────────────────────────
  // Each table deleted in its own try/catch so one schema drift doesn't
  // strand the user mid-flow. We surface per-table counts + per-table
  // errors so ops + the user can see exactly what was wiped.
  const idEnc = encodeURIComponent(appleId);
  const tables = [
    { name: "behavioral_insights",  path: `/behavioral_insights?apple_id=eq.${idEnc}` },
    { name: "workspace_reminders",  path: `/workspace_reminders?apple_id=eq.${idEnc}` },
    { name: "workspace_roles",      path: `/workspace_roles?apple_id=eq.${idEnc}` },
    { name: "filter_frameworks",    path: `/filter_frameworks?apple_id=eq.${idEnc}` },
    { name: "user_notification_log",path: `/user_notification_log?apple_id=eq.${idEnc}` },
    { name: "user_devices",         path: `/user_devices?apple_id=eq.${idEnc}` },
    { name: "opportunities",        path: `/opportunities?apple_id=eq.${idEnc}` },
    { name: "profiles",             path: `/profiles?apple_id=eq.${idEnc}` },
  ];

  const deleted = {};
  const errors = [];
  for (const { name, path } of tables) {
    try {
      deleted[name] = await sbDelete(path);
    } catch (err) {
      console.error(`[delete-account] ${name} failed for ${appleId.slice(-8)}:`, err.message);
      errors.push({ table: name, error: err.message });
      deleted[name] = -1;
    }
  }

  // Log the deletion (intentionally minimal — last-8 of apple_id only,
  // no other PII; this is for ops, not for restoration).
  console.log(`[delete-account] completed for …${appleId.slice(-8)} · deleted:`, deleted, `errors:`, errors.length);

  // ── Response ─────────────────────────────────────────────────────────────
  // If `profiles` was deleted successfully, the account is effectively gone
  // even if a downstream table errored. Surface partial-failure info but
  // return 200 so the client can complete the sign-out + localStorage wipe.
  return new Response(JSON.stringify({ ok: true, deleted, errors }), { status: 200, headers });
}
