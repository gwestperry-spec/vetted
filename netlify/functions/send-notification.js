// ── send-notification.js ──────────────────────────────────────────────────
// Sends APNs push notifications via Apple's HTTP/2 API directly.
//
// Rewritten from the deprecated `apn` library (last updated 2019, known
// issues with modern Node TLS + sandbox endpoint routing). This version
// uses Node's built-in `http2` + `jsonwebtoken` for ES256 JWT signing,
// which is the same path Apple's own Push Notifications Console uses.
//
// POST body:
//   { tokens: string[], title: string, body: string, data?: object, badge?: number }
//
// Required env vars:
//   APNS_KEY       — base64-encoded contents of the .p8 key (or raw PEM)
//   APNS_KEY_ID    — 10-character key ID from Apple Developer portal
//   APNS_TEAM_ID   — 10-character Team ID from Apple Developer portal
//   APNS_BUNDLE_ID — e.g. "com.vettedai.app"
//   APNS_FORCE_SANDBOX (optional) — set to "1" to send via sandbox first.
//                                   Default: production first, sandbox retry.
//
// Internal-only — guarded by VETTED_SECRET.

import http2 from "http2";
import jwt from "jsonwebtoken";

const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "https://vettedai.netlify.app",
  "https://app.vetted.ai",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
];

const APNS_HOSTS = {
  production: "api.push.apple.com",
  sandbox:    "api.sandbox.push.apple.com",
};

// ─── JWT signing ─────────────────────────────────────────────────────────
// APNs requires an ES256-signed JWT in the Authorization header. Tokens
// are valid for up to 60 minutes; we generate fresh per invocation for
// safety since function instances are short-lived anyway.
function makeJwt(pemKey, keyId, teamId) {
  return jwt.sign({}, pemKey, {
    algorithm: "ES256",
    issuer:    teamId,
    keyid:     keyId,
    expiresIn: "30m",
  });
}

// ─── Send one notification to one token over HTTP/2 ──────────────────────
function sendOne({ host, token, bundleId, jwtToken, payload }) {
  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`);
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; client.close(); resolve({ ok: false, reason: "timeout" }); }
    }, 10000);

    client.on("error", (err) => {
      if (!resolved) { resolved = true; clearTimeout(timeout); client.close(); resolve({ ok: false, reason: `client_error:${err.code || err.message}` }); }
    });

    const body = JSON.stringify(payload);
    const req = client.request({
      ":method":            "POST",
      ":path":              `/3/device/${token}`,
      authorization:        `bearer ${jwtToken}`,
      "apns-topic":         bundleId,
      "apns-push-type":     "alert",
      "apns-priority":      "10",
      "content-type":       "application/json",
      "content-length":     Buffer.byteLength(body),
    });

    let status = 0;
    let responseBody = "";

    req.on("response", (headers) => { status = headers[":status"]; });
    req.on("data", (chunk) => { responseBody += chunk; });
    req.on("error", (err) => {
      if (!resolved) { resolved = true; clearTimeout(timeout); client.close(); resolve({ ok: false, reason: `req_error:${err.code || err.message}` }); }
    });
    req.on("end", () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      client.close();
      if (status === 200) {
        resolve({ ok: true });
      } else {
        let reason = `http_${status}`;
        try { reason = JSON.parse(responseBody).reason || reason; } catch {}
        resolve({ ok: false, reason });
      }
    });

    req.write(body);
    req.end();
  });
}

// ─── Send to many tokens with prod→sandbox fallback ─────────────────────
async function sendBatch({ tokens, bundleId, jwtToken, payload, forceSandbox }) {
  const firstHost = forceSandbox ? APNS_HOSTS.sandbox : APNS_HOSTS.production;
  const firstResults = await Promise.all(
    tokens.map((token) => sendOne({ host: firstHost, token, bundleId, jwtToken, payload }))
  );

  const sent = [];
  const failed = [];
  const retryTokens = [];

  firstResults.forEach((res, i) => {
    if (res.ok) {
      sent.push(tokens[i]);
    } else if (!forceSandbox && /BadDeviceToken|BadEnvironmentKeyInToken/.test(res.reason)) {
      retryTokens.push(tokens[i]);
    } else {
      failed.push({ token: tokens[i], reason: res.reason });
    }
  });

  if (retryTokens.length > 0) {
    console.log(`[send-notification] retrying ${retryTokens.length} tokens against sandbox`);
    const retryResults = await Promise.all(
      retryTokens.map((token) => sendOne({ host: APNS_HOSTS.sandbox, token, bundleId, jwtToken, payload }))
    );
    retryResults.forEach((res, i) => {
      if (res.ok) sent.push(retryTokens[i]);
      else failed.push({ token: retryTokens[i], reason: res.reason });
    });
  }

  return { sent, failed };
}

// ─── Handler ─────────────────────────────────────────────────────────────
export default async function handler(req) {
  const origin = req.headers.get("origin") || "";
  const cors = {
    "Access-Control-Allow-Origin":  ALLOWED_ORIGINS.includes(origin) ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const secret = req.headers.get("x-vetted-token") || "";
  if (process.env.VETTED_SECRET && secret !== process.env.VETTED_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } }); }

  const { tokens, title, body: alertBody, data = {}, badge } = body;

  if (!tokens?.length || !title || !alertBody) {
    return new Response(JSON.stringify({ error: "Missing required fields: tokens, title, body" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const { APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID } = process.env;
  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID || !APNS_BUNDLE_ID) {
    console.error("[send-notification] missing APNs env vars");
    return new Response(JSON.stringify({ error: "Push not configured" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
  }

  // Decode key (base64 default; legacy raw PEM still supported)
  const pemKey = APNS_KEY.includes("BEGIN PRIVATE KEY")
    ? APNS_KEY
    : Buffer.from(APNS_KEY, "base64").toString("utf8");

  let jwtToken;
  try {
    jwtToken = makeJwt(pemKey, APNS_KEY_ID, APNS_TEAM_ID);
  } catch (err) {
    console.error("[send-notification] JWT signing failed:", err.message);
    return new Response(JSON.stringify({ error: "JWT signing failed", detail: err.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const payload = {
    aps: {
      alert: { title, body: alertBody },
      sound: "default",
      ...(badge != null ? { badge } : {}),
    },
    ...data,
  };

  const forceSandbox = process.env.APNS_FORCE_SANDBOX === "1";
  const result = await sendBatch({
    tokens,
    bundleId: APNS_BUNDLE_ID,
    jwtToken,
    payload,
    forceSandbox,
  });

  console.log(`[send-notification] result: sent=${result.sent.length} failed=${result.failed.length} forceSandbox=${forceSandbox}`);

  return new Response(JSON.stringify({
    sent: result.sent.length,
    failed: result.failed,
  }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
}
