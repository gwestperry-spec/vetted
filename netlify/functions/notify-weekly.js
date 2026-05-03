// ── notify-weekly.js ──────────────────────────────────────────────────────
// Scheduled function — runs every Sunday at 15:00 UTC (11am ET / 8am PT).
// Sends a weekly digest to every active user who has at least one scored role.
//
// Digest content (all from workspace_roles):
//   - Roles scored this week
//   - Best VQ score this week (if any)
//   - Total roles in-flight (pursue + monitor, not archived)
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY
//   APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID

import apn from "apn";
import { getCopy } from "./notif-copy.js";

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`sbGet ${path} → ${res.status}`);
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

function makeProvider() {
  return new apn.Provider({
    token: { key: process.env.APNS_KEY, keyId: process.env.APNS_KEY_ID, teamId: process.env.APNS_TEAM_ID },
    production: true,
  });
}

async function alreadySentThisWeek(appleId, type) {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const rows = await sbGet(
    `/user_notification_log?apple_id=eq.${encodeURIComponent(appleId)}&type=eq.${type}&sent_at=gte.${encodeURIComponent(since)}&limit=1`
  );
  return rows.length > 0;
}

export default async function handler(req, context) {
  const now = new Date();
  console.log("[notify-weekly] firing at", now.toISOString());

  // Get all distinct users with device tokens opted into digest
  const devices = await sbGet(
    `/user_devices?notif_digest=eq.true&select=apple_id,token,lang`
  );

  // Group tokens + lang by user
  const userTokens = {};
  const userLang   = {};
  for (const d of devices) {
    if (!userTokens[d.apple_id]) userTokens[d.apple_id] = [];
    userTokens[d.apple_id].push(d.token);
    if (!userLang[d.apple_id]) userLang[d.apple_id] = d.lang || "en";
  }

  const users = Object.keys(userTokens);
  console.log(`[notify-weekly] ${users.length} opted-in user(s)`);

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const provider = makeProvider();
  let totalSent = 0;

  for (const appleId of users) {
    try {
      if (await alreadySentThisWeek(appleId, "weekly_digest")) continue;

      // Roles scored this week
      const newRoles = await sbGet(
        `/workspace_roles?apple_id=eq.${encodeURIComponent(appleId)}&created_at=gte.${encodeURIComponent(weekAgo)}&status=neq.queued&select=vq_score,status&limit=50`
      );

      // Only send if they scored at least one role this week
      if (!newRoles.length) continue;

      // Active roles in-flight (pursue + monitor, not archived)
      const activeRoles = await sbGet(
        `/workspace_roles?apple_id=eq.${encodeURIComponent(appleId)}&status=in.(pursue,monitor)&select=vq_score&limit=200`
      );

      const scored    = newRoles.length;
      const bestScore = newRoles.reduce((max, r) => Math.max(max, Number(r.vq_score) || 0), 0);
      const inFlight  = activeRoles.length;

      // Build localized copy
      const copy       = getCopy(userLang[appleId] || "en");
      const scoredLine = copy.weeklyScored(scored);
      const bestLine   = bestScore >= 3.5 ? copy.weeklyBestLine(bestScore.toFixed(1)) : "";
      const flightLine = inFlight > 0 ? copy.weeklyActive(inFlight) : copy.weeklyNone;

      const note = new apn.Notification();
      note.expiry  = Math.floor(Date.now() / 1000) + 86400;
      note.sound   = "default";
      note.alert   = {
        title: copy.weeklyTitle(bestLine),
        body:  copy.weeklyBody(scoredLine, flightLine),
      };
      note.payload = { type: "weekly_digest" };
      note.topic   = process.env.APNS_BUNDLE_ID;

      const tokens = userTokens[appleId];
      const result = await provider.send(note, tokens);
      if (result.sent?.length) {
        await sbInsert("user_notification_log", { apple_id: appleId, type: "weekly_digest", context: null });
        totalSent += result.sent.length;
      }
    } catch (err) {
      console.error(`[notify-weekly] error for ${appleId}:`, err.message);
    }
  }

  provider.shutdown();
  console.log(`[notify-weekly] done — total sent: ${totalSent}`);
  return new Response(JSON.stringify({ sent: totalSent }), { status: 200 });
}
