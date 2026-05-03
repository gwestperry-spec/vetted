// ── notify-pipeline.js ────────────────────────────────────────────────────
// Scheduled function — runs daily at 14:00 UTC (10am ET / 7am PT).
// Sends two classes of proactive notifications:
//
//  1. STALENESS  — user hasn't scored a role in 7+ days
//     "Your framework is ready. Don't let the pipeline go cold."
//
//  2. FOLLOW_UP  — role marked Applied 10+ days ago with no status update
//     "[Role] at [Co] — 10 days since you applied. Time to follow up?"
//
// Both use user_notification_log for deduplication so a user never gets
// the same nudge twice within the cooldown window.
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY
//   APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID

import apn from "apn";

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`sbGet ${path} → ${res.status}`);
  return res.json();
}

async function sbRpc(fn, params = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`sbRpc ${fn} → ${res.status}`);
  return res.json();
}

async function sbInsert(table, row) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`sbInsert ${table} → ${res.status}`);
}

// ── APNs helper ──────────────────────────────────────────────────────────────

function makeProvider() {
  return new apn.Provider({
    token: { key: process.env.APNS_KEY, keyId: process.env.APNS_KEY_ID, teamId: process.env.APNS_TEAM_ID },
    production: true,
  });
}

async function sendPush(provider, tokens, title, body, data = {}) {
  if (!tokens.length) return;
  const note = new apn.Notification();
  note.expiry  = Math.floor(Date.now() / 1000) + 86400; // 24h
  note.sound   = "default";
  note.alert   = { title, body };
  note.payload = data;
  note.topic   = process.env.APNS_BUNDLE_ID;
  const result = await provider.send(note, tokens);
  if (result.failed?.length) {
    console.warn("[notify-pipeline] failed tokens:", result.failed.map(f => f.response?.reason));
  }
  return result.sent?.length || 0;
}

// ── Check notification log — was this type+context sent within cooldown? ──────

async function alreadySent(appleId, type, context, cooldownDays) {
  const since = new Date(Date.now() - cooldownDays * 86400_000).toISOString();
  const rows = await sbGet(
    `/user_notification_log?apple_id=eq.${encodeURIComponent(appleId)}&type=eq.${type}&context=eq.${encodeURIComponent(context || "")}&sent_at=gte.${encodeURIComponent(since)}&limit=1`
  );
  return rows.length > 0;
}

async function logSent(appleId, type, context) {
  await sbInsert("user_notification_log", { apple_id: appleId, type, context: context || null });
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, context) {
  const now = new Date().toISOString();
  console.log("[notify-pipeline] firing at", now);

  const provider = makeProvider();
  let totalSent = 0;

  try {
    // ── 1. STALENESS — users who haven't scored in 7+ days ─────────────────
    const staleUsers = await sbRpc("users_not_scored_since", { days_ago: 7 });
    console.log(`[notify-pipeline] ${staleUsers.length} stale user(s)`);

    for (const { apple_id } of staleUsers) {
      try {
        if (await alreadySent(apple_id, "staleness", "", 7)) continue;

        const devices = await sbGet(`/user_devices?apple_id=eq.${encodeURIComponent(apple_id)}&notif_staleness=eq.true&select=token`);
        const tokens = devices.map(d => d.token).filter(Boolean);
        if (!tokens.length) continue;

        const sent = await sendPush(
          provider, tokens,
          "Keep your pipeline moving",
          "Your framework is ready — don't let momentum slip.",
          { type: "staleness" }
        );
        if (sent > 0) {
          await logSent(apple_id, "staleness", "");
          totalSent += sent;
        }
      } catch (err) {
        console.error(`[notify-pipeline] staleness error for ${apple_id}:`, err.message);
      }
    }

    // ── 2. FOLLOW_UP — applied roles with no update in 10+ days ────────────
    const cutoff = new Date(Date.now() - 10 * 86400_000).toISOString();
    const appliedRoles = await sbGet(
      `/workspace_roles?application_status=eq.applied&status_updated_at=lte.${encodeURIComponent(cutoff)}&select=apple_id,role_id,title,company&limit=500`
    );
    console.log(`[notify-pipeline] ${appliedRoles.length} follow-up candidate(s)`);

    for (const role of appliedRoles) {
      const { apple_id, role_id, title, company } = role;
      try {
        if (await alreadySent(apple_id, "follow_up", role_id, 10)) continue;

        const devices = await sbGet(`/user_devices?apple_id=eq.${encodeURIComponent(apple_id)}&notif_follow_up=eq.true&select=token`);
        const tokens = devices.map(d => d.token).filter(Boolean);
        if (!tokens.length) continue;

        const roleLabel = title || "This role";
        const sent = await sendPush(
          provider, tokens,
          `${roleLabel}${company ? ` · ${company}` : ""}`,
          "10 days since you applied — time to follow up?",
          { type: "follow_up", roleId: role_id }
        );
        if (sent > 0) {
          await logSent(apple_id, "follow_up", role_id);
          totalSent += sent;
        }
      } catch (err) {
        console.error(`[notify-pipeline] follow_up error for ${apple_id}/${role_id}:`, err.message);
      }
    }

  } finally {
    provider.shutdown();
  }

  console.log(`[notify-pipeline] done — total sent: ${totalSent}`);
  return new Response(JSON.stringify({ sent: totalSent }), { status: 200 });
}
