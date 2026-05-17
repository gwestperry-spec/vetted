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

  // APNS_KEY is stored base64-encoded (no PEM newlines, no leading dashes
  // that confuse env var setters). Decode to get the raw .p8 PEM contents
  // that `apn` expects. Backward compat: if value still contains PEM
  // headers (legacy direct paste), use as-is.
  const apnsKeyPem = APNS_KEY.includes("BEGIN PRIVATE KEY")
    ? APNS_KEY
    : Buffer.from(APNS_KEY, "base64").toString("utf8");

  // Try production gateway first, then retry rejected tokens against sandbox.
  // Sandbox tokens come from Xcode dev builds (aps-environment=development)
  // and only accept the sandbox APNs endpoint. Production tokens come from
  // App Store/TestFlight builds (aps-environment=production). We don't know
  // which is which from the token itself, so we try prod and fall back.
  function makeProvider(prod) {
    return new apn.Provider({
      token: { key: apnsKeyPem, keyId: APNS_KEY_ID, teamId: APNS_TEAM_ID },
      production: prod,
    });
  }

  const note = new apn.Notification();
  note.expiry    = Math.floor(Date.now() / 1000) + 3600;
  note.badge     = badge ?? undefined;
  note.sound     = "default";
  note.alert     = { title, body };
  note.payload   = data;
  note.topic     = APNS_BUNDLE_ID;

  try {
    const prodProvider = makeProvider(true);
    let result = await prodProvider.send(note, tokens);
    prodProvider.shutdown();

    // Retry BadDeviceToken failures against sandbox
    // APNs uses several reasons for dev/prod token mismatch:
    // - BadDeviceToken: token format invalid or for wrong env
    // - BadEnvironmentKeyInToken: token's environment portion mismatches the gateway
    const sandboxRetryReasons = new Set(["BadDeviceToken", "BadEnvironmentKeyInToken"]);
    const sandboxRetryTokens = (result.failed || [])
      .filter((f) => sandboxRetryReasons.has(f.response?.reason))
      .map((f) => f.device);

    if (sandboxRetryTokens.length > 0) {
      console.log(`[send-notification] retrying ${sandboxRetryTokens.length} tokens against sandbox`);
      const sandboxProvider = makeProvider(false);
      const sandboxResult = await sandboxProvider.send(note, sandboxRetryTokens);
      sandboxProvider.shutdown();
      // Merge: anything sent via sandbox moves from prod-failed to sent
      const sandboxSent = new Set((sandboxResult.sent || []).map((s) => s.device));
      const stillFailed = (result.failed || []).filter((f) => !sandboxSent.has(f.device));
      const newSent = [...(result.sent || []), ...(sandboxResult.sent || [])];
      const sandboxFailed = sandboxResult.failed || [];
      // Use sandbox failure reason if we tried both
      const mergedFailed = [
        ...stillFailed.filter((f) => !sandboxRetryReasons.has(f.response?.reason)),
        ...sandboxFailed,
      ];
      result = { sent: newSent, failed: mergedFailed };
    }

    const failed = result.failed?.map(f => ({ token: f.device, reason: f.response?.reason })) || [];
    if (failed.length) console.warn("[send-notification] failed tokens:", failed);

    return new Response(JSON.stringify({
      sent: result.sent?.length || 0,
      failed,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[send-notification] APNs error:", err);
    return new Response(JSON.stringify({ error: "Failed to send notification" }), { status: 500 });
  }
}
