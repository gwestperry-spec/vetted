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
import { getCopy } from "./notif-copy.js";

const SB_URL = process.env.VT_DB_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.VT_DB_KEY || process.env.SUPABASE_SERVICE_KEY;

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
    token: {
      key: (process.env.APNS_KEY || "").includes("BEGIN PRIVATE KEY")
        ? process.env.APNS_KEY
        : Buffer.from(process.env.APNS_KEY || "", "base64").toString("utf8"),
      keyId: process.env.APNS_KEY_ID,
      teamId: process.env.APNS_TEAM_ID,
    },
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
  const stageErrors = [];

  try {
    // ── 1. STALENESS — users who haven't scored in 7+ days ─────────────────
    // Wrap each stage in its own try/catch so a missing Postgres RPC
    // (or any other systemic failure) in one stage doesn't take down
    // the entire run. Previously a throw here returned a raw 502 to
    // any caller — including the Netlify scheduler — silently breaking
    // all three notification types this function powers.
    let staleUsers = [];
    try {
      staleUsers = await sbRpc("users_not_scored_since", { days_ago: 7 });
      console.log(`[notify-pipeline] ${staleUsers.length} stale user(s)`);
    } catch (err) {
      console.error("[notify-pipeline] STAGE staleness RPC failed:", err?.message);
      stageErrors.push({ stage: "staleness", error: err?.message });
    }

    for (const { apple_id } of staleUsers) {
      try {
        if (await alreadySent(apple_id, "staleness", "", 7)) continue;

        const devices = await sbGet(`/user_devices?apple_id=eq.${encodeURIComponent(apple_id)}&notif_staleness=eq.true&select=token,lang`);
        const tokens = devices.map(d => d.token).filter(Boolean);
        if (!tokens.length) continue;

        const copy = getCopy(devices[0]?.lang || "en");
        const sent = await sendPush(
          provider, tokens,
          copy.staleTitle,
          copy.staleBody,
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
    let appliedRoles = [];
    try {
      appliedRoles = await sbGet(
        `/workspace_roles?application_status=eq.applied&status_updated_at=lte.${encodeURIComponent(cutoff)}&select=apple_id,role_id,title,company&limit=500`
      );
      console.log(`[notify-pipeline] ${appliedRoles.length} follow-up candidate(s)`);
    } catch (err) {
      console.error("[notify-pipeline] STAGE follow_up query failed:", err?.message);
      stageErrors.push({ stage: "follow_up", error: err?.message });
    }

    for (const role of appliedRoles) {
      const { apple_id, role_id, title, company } = role;
      try {
        if (await alreadySent(apple_id, "follow_up", role_id, 10)) continue;

        const devices = await sbGet(`/user_devices?apple_id=eq.${encodeURIComponent(apple_id)}&notif_follow_up=eq.true&select=token,lang`);
        const tokens = devices.map(d => d.token).filter(Boolean);
        if (!tokens.length) continue;

        const copy      = getCopy(devices[0]?.lang || "en");
        const roleLabel = title || "This role";
        const sent = await sendPush(
          provider, tokens,
          `${roleLabel}${company ? ` · ${company}` : ""}`,
          copy.followUpBody,
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

    // ── 3. TIMELINE — milestone nudges based on user's stated landing window ──
    // Milestones by timeline value (days since search start):
    //   asap / 30days : 7, 15, 25
    //   quarter       : 30, 60, 80
    //   6months       : 60, 120, 160
    //   yearout       : 90, 180, 270
    // "yearplus" is excluded — no deadline, no pressure nudges.

    const TIMELINE_MILESTONES = {
      asap:     [7, 15, 25],
      "30days": [7, 15, 25],
      quarter:  [30, 60, 80],
      "6months":[60, 120, 160],
      yearout:  [90, 180, 270],
    };

    const TIMELINE_WINDOWS = {
      asap: 30, "30days": 30, quarter: 90, "6months": 180, yearout: 365,
    };

    // Fetch users who have a timeline set and have device tokens opted in
    let timelineUsers = [];
    try {
      const timelineDevices = await sbGet(
        `/user_devices?notif_timeline=eq.true&select=apple_id`
      );
      timelineUsers = [...new Set(timelineDevices.map(d => d.apple_id))];
      console.log(`[notify-pipeline] ${timelineUsers.length} timeline user(s) to check`);
    } catch (err) {
      console.error("[notify-pipeline] STAGE timeline query failed:", err?.message);
      stageErrors.push({ stage: "timeline", error: err?.message });
    }

    for (const apple_id of timelineUsers) {
      try {
        // Get profile timeline + oldest workspace role (search start proxy)
        const [profiles, oldestRole] = await Promise.all([
          sbGet(`/profiles?apple_id=eq.${encodeURIComponent(apple_id)}&select=timeline&limit=1`),
          sbGet(`/workspace_roles?apple_id=eq.${encodeURIComponent(apple_id)}&status=neq.queued&order=created_at.asc&select=created_at&limit=1`),
        ]);

        const timeline = profiles[0]?.timeline;
        const milestones = TIMELINE_MILESTONES[timeline];
        if (!milestones || !oldestRole.length) continue;

        const searchStart = new Date(oldestRole[0].created_at);
        const daysSinceStart = Math.floor((Date.now() - searchStart.getTime()) / 86400_000);
        const windowDays = TIMELINE_WINDOWS[timeline];
        const pctThrough = Math.round((daysSinceStart / windowDays) * 100);

        // Find which milestone we're at (within ±1 day)
        const hitMilestone = milestones.find(m => Math.abs(daysSinceStart - m) <= 1);
        if (!hitMilestone) continue;

        const milestoneKey = `${timeline}_${hitMilestone}`;
        if (await alreadySent(apple_id, "timeline", milestoneKey, 3)) continue;

        const devices = await sbGet(`/user_devices?apple_id=eq.${encodeURIComponent(apple_id)}&notif_timeline=eq.true&select=token,lang`);
        const tokens = devices.map(d => d.token).filter(Boolean);
        if (!tokens.length) continue;

        const copy = getCopy(devices[0]?.lang || "en");

        // Count how many roles scored + applied
        const [scoredRoles, appliedRoles2] = await Promise.all([
          sbGet(`/workspace_roles?apple_id=eq.${encodeURIComponent(apple_id)}&status=neq.queued&select=vq_score&limit=200`),
          sbGet(`/workspace_roles?apple_id=eq.${encodeURIComponent(apple_id)}&application_status=eq.applied&select=role_id&limit=200`),
        ]);

        const daysLeft = Math.max(0, windowDays - daysSinceStart);
        const body = appliedRoles2.length > 0
          ? copy.timelineBodyApplied(scoredRoles.length, appliedRoles2.length, daysLeft)
          : copy.timelineBodyNoApps(scoredRoles.length, pctThrough);

        const sent = await sendPush(
          provider, tokens,
          copy.timelineTitle(hitMilestone),
          body,
          { type: "timeline", milestone: hitMilestone }
        );
        if (sent > 0) {
          await logSent(apple_id, "timeline", milestoneKey);
          totalSent += sent;
        }
      } catch (err) {
        console.error(`[notify-pipeline] timeline error for ${apple_id}:`, err.message);
      }
    }

  } catch (err) {
    // Outer catch — any throw from one of the for-loop bodies or a
    // helper. Without this the function returned a raw 502 to Netlify
    // and the scheduler treated the run as a complete failure, so even
    // stages that would have worked never got their second chance on
    // the next cron tick.
    console.error("[notify-pipeline] fatal:", err?.stack || err?.message || err);
    stageErrors.push({ stage: "outer", error: err?.message || String(err) });
  } finally {
    try { provider.shutdown(); } catch { /* already shut down */ }
  }

  console.log(`[notify-pipeline] done — total sent: ${totalSent} · stageErrors: ${stageErrors.length}`);
  return new Response(JSON.stringify({ sent: totalSent, stageErrors }), { status: 200 });
}
