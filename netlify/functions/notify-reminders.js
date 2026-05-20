// ── notify-reminders.js ───────────────────────────────────────────────────
// Scheduled function — runs every hour.
// Finds workspace reminders that are due, sends an APNs push to the user's
// device(s), then stamps push_sent_at so they never fire twice.
//
// Query logic:
//   remind_at  <= now            — due
//   completed  = false           — not already marked done by the user
//   push_sent_at IS NULL         — not already pushed
//
// Required env vars (same as send-notification.js):
//   SUPABASE_URL, SUPABASE_SERVICE_KEY
//   APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID

import apn from "apn";
import { getCopy } from "./notif-copy.js";

const SB_URL = process.env.VT_DB_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.VT_DB_KEY || process.env.SUPABASE_SERVICE_KEY;

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    headers: {
      apikey:        SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}`);
  return res.json();
}

async function sbPatch(path, body) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    method: "PATCH",
    headers: {
      apikey:        SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer:        "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${path} → ${res.status}`);
}

function makeProvider() {
  return new apn.Provider({
    token: {
      key:    (process.env.APNS_KEY || "").includes("BEGIN PRIVATE KEY")
                ? process.env.APNS_KEY
                : Buffer.from(process.env.APNS_KEY || "", "base64").toString("utf8"),
      keyId:  process.env.APNS_KEY_ID,
      teamId: process.env.APNS_TEAM_ID,
    },
    production: true,
  });
}

export default async function handler(req, context) {
  const now = new Date().toISOString();
  console.log("[notify-reminders] firing at", now);
  let sent = 0;
  let failed = 0;
  const stageErrors = [];
  let provider = null;

  try {
    // ── 1. Fetch due reminders with role info ────────────────────────────────
    let reminders = [];
    try {
      reminders = await sbGet(
        `/workspace_reminders?completed=eq.false&push_sent_at=is.null&remind_at=lte.${encodeURIComponent(now)}&select=id,apple_id,label,workspace_role_id,workspace_roles(title,company,role_id)&limit=200`
      );
    } catch (err) {
      console.error("[notify-reminders] STAGE fetch failed:", err?.message);
      stageErrors.push({ stage: "fetch", error: err?.message });
    }

    if (!reminders.length) {
      console.log("[notify-reminders] no due reminders");
      return new Response(JSON.stringify({ sent: 0, failed: 0, stageErrors }), { status: 200 });
    }

    console.log(`[notify-reminders] ${reminders.length} due reminder(s)`);

    // ── 2. Build provider once, reuse for all sends ──────────────────────────
    provider = makeProvider();

  for (const reminder of reminders) {
    try {
      const appleId = reminder.apple_id;
      const role    = reminder.workspace_roles;
      const roleId  = role?.role_id || null;
      const title   = role?.title   || "Role";
      const company = role?.company || "";

      // ── 3. Get device tokens for this user ─────────────────────────────
      const devices = await sbGet(
        `/user_devices?apple_id=eq.${encodeURIComponent(appleId)}&notif_reminders=eq.true&select=token,lang`
      );
      const tokens = devices.map(d => d.token).filter(Boolean);
      const lang   = devices[0]?.lang || "en";
      const copy   = getCopy(lang);
      if (!tokens.length) {
        console.log(`[notify-reminders] no devices for ${appleId} — skipping`);
        // Still stamp push_sent_at so we don't retry infinitely for users without tokens
        await sbPatch(
          `/workspace_reminders?id=eq.${encodeURIComponent(reminder.id)}`,
          { push_sent_at: now }
        );
        continue;
      }

      // ── 4. Build notification ───────────────────────────────────────────
      const note = new apn.Notification();
      note.expiry  = Math.floor(Date.now() / 1000) + 3600;
      note.sound   = "default";
      note.alert   = {
        title: `📅 ${title}${company ? ` · ${company}` : ""}`,
        body:  reminder.label || copy.reminderFallback,
      };
      note.payload = { roleId, type: "reminder", reminderId: reminder.id };
      note.topic   = process.env.APNS_BUNDLE_ID;

      // ── 5. Send ─────────────────────────────────────────────────────────
      const result = await provider.send(note, tokens);
      const failedTokens = result.failed || [];
      if (failedTokens.length) {
        console.warn(`[notify-reminders] failed tokens for reminder ${reminder.id}:`, failedTokens.map(f => f.response?.reason));
      }

      // ── 6. Stamp push_sent_at regardless (sent or no valid tokens) ──────
      await sbPatch(
        `/workspace_reminders?id=eq.${encodeURIComponent(reminder.id)}`,
        { push_sent_at: now }
      );

      sent++;
    } catch (err) {
      console.error(`[notify-reminders] error on reminder ${reminder.id}:`, err.message);
      failed++;
    }
  }

  } catch (err) {
    console.error("[notify-reminders] fatal:", err?.stack || err?.message || err);
    stageErrors.push({ stage: "outer", error: err?.message || String(err) });
  } finally {
    try { provider?.shutdown(); } catch { /* already shut down */ }
  }
  console.log(`[notify-reminders] done — sent: ${sent}, failed: ${failed}, stageErrors: ${stageErrors.length}`);
  return new Response(JSON.stringify({ sent, failed, stageErrors }), { status: 200 });
}
