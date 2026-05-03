// ── send-notification.js ──────────────────────────────────────────────────
// Sends an APNs push notification to one or more device tokens.
//
// POST body:
//   { tokens: string[], title: string, body: string, data?: object, badge?: number }
//
// Required env vars:
//   APNS_KEY       — contents of the .p8 key file (with newlines preserved)
//   APNS_KEY_ID    — 10-character key ID from Apple Developer portal
//   APNS_TEAM_ID   — 10-character Team ID from Apple Developer portal
//   APNS_BUNDLE_ID — e.g. "com.vettedai.app"
//
// Internal-only — guarded by VETTED_SECRET.

import apn from "apn";

const ALLOWED_ORIGINS = [
  "https://vettedai.netlify.app",
  "https://app.vetted.ai",
  "http://localhost:5173",
];

export default async function handler(req, context) {
  const origin = req.headers.get("origin") || "";

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "null",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Origin gate
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  // Internal secret guard
  const secret = req.headers.get("x-vetted-token") || "";
  if (process.env.VETTED_SECRET && secret !== process.env.VETTED_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { tokens, title, body, data = {}, badge } = await req.json();

  if (!tokens?.length || !title || !body) {
    return new Response(JSON.stringify({ error: "Missing required fields: tokens, title, body" }), { status: 400 });
  }

  const {
    APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID,
  } = process.env;

  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID || !APNS_BUNDLE_ID) {
    console.error("[send-notification] Missing APNs env vars");
    return new Response(JSON.stringify({ error: "Push not configured" }), { status: 503 });
  }

  const provider = new apn.Provider({
    token: {
      key:      APNS_KEY,
      keyId:    APNS_KEY_ID,
      teamId:   APNS_TEAM_ID,
    },
    production: true,
  });

  const note = new apn.Notification();
  note.expiry    = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  note.badge     = badge ?? undefined;
  note.sound     = "default";
  note.alert     = { title, body };
  note.payload   = data;
  note.topic     = APNS_BUNDLE_ID;

  try {
    const result = await provider.send(note, tokens);
    provider.shutdown();

    const failed = result.failed?.map(f => ({ token: f.device, reason: f.response?.reason })) || [];
    if (failed.length) console.warn("[send-notification] failed tokens:", failed);

    return new Response(JSON.stringify({
      sent: result.sent?.length || 0,
      failed,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    provider.shutdown();
    console.error("[send-notification] APNs error:", err);
    return new Response(JSON.stringify({ error: "Failed to send notification" }), { status: 500 });
  }
}
