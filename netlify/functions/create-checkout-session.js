const https = require("https");
const crypto = require("crypto");

// ─── Allowed origins ───────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
];

// ─── CORS headers ──────────────────────────────────────────────────────────
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

// ─── Sentry reporting ──────────────────────────────────────────────────────
function reportToSentry(err, context) {
  const dsn = process.env.VITE_SENTRY_DSN;
  if (!dsn) { console.error(`[${context}]`, err.message); return; }
  try {
    const url = new URL(dsn);
    const key = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    const payload = JSON.stringify({
      timestamp: new Date().toISOString().replace("T", " ").split(".")[0],
      platform: "node", level: "error",
      exception: { values: [{ type: err.name || "Error", value: err.message || String(err) }] },
      tags: { location: context },
    });
    const req = https.request({
      hostname: url.hostname,
      path: `/api/${projectId}/store/`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_timestamp=${Math.floor(Date.now() / 1000)}, sentry_key=${key}`,
        "Content-Length": Buffer.byteLength(payload),
      },
    }, () => {});
    req.on("error", () => {});
    req.write(payload);
    req.end();
  } catch { console.error(`[${context}]`, err.message); }
}

// ─── Stripe API helper ─────────────────────────────────────────────────────
// Stripe REST uses form-encoded bodies, not JSON.
function stripeRequest(method, path, params) {
  return new Promise((resolve, reject) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return reject(new Error("STRIPE_SECRET_KEY not configured"));

    const body = params ? new URLSearchParams(params).toString() : "";
    const options = {
      hostname: "api.stripe.com",
      path: `/v1${path}`,
      method,
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── Handler ───────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { tier, appleId, sessionToken, isNative } = body;

  if (!tier || !appleId || !sessionToken) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "tier, appleId, and sessionToken are required" }) };
  }

  if (!["signal", "vantage"].includes(tier)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "tier must be signal or vantage" }) };
  }

  // ── Verify session token (same HMAC pattern as anthropic.js) ─────────────
  const serverSecret = process.env.VETTED_SECRET;
  if (serverSecret) {
    const expectedToken = crypto
      .createHmac("sha256", serverSecret)
      .update(appleId)
      .digest("hex");
    const tokenBuf = Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64));
    const expectedBuf = Buffer.from(expectedToken.padEnd(64, "0").slice(0, 64));
    if (!crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Invalid session" }) };
    }
  }

  // ── Resolve price ID ──────────────────────────────────────────────────────
  const priceId = tier === "signal"
    ? process.env.STRIPE_SIGNAL_PRICE_ID
    : process.env.STRIPE_VANTAGE_PRICE_ID;

  if (!priceId) {
    const err = new Error(`STRIPE_${tier.toUpperCase()}_PRICE_ID not configured`);
    reportToSentry(err, "create_checkout_session");
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Payment configuration error" }) };
  }

  // ── Create Stripe Checkout session ────────────────────────────────────────
  try {
    const params = {
      "mode": "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      // Native iOS: use custom URL scheme so Safari auto-returns to the app.
      // Web: redirect back to the site which the app detects via ?upgrade=success.
      "success_url": isNative ? "vetted://upgrade-success" : "https://tryvettedai.com?upgrade=success",
      "cancel_url": isNative ? "vetted://upgrade-cancelled" : "https://tryvettedai.com?upgrade=cancelled",
      // Store appleId + tier in session metadata so the webhook can identify the user
      "metadata[appleId]": appleId,
      "metadata[tier]": tier,
      // Also store on the subscription itself for future subscription events
      "subscription_data[metadata][appleId]": appleId,
      "subscription_data[metadata][tier]": tier,
    };

    console.log(`[create_checkout] tier=${tier} priceId=${priceId} appleId=${appleId.slice(0,8)}…`);
    const result = await stripeRequest("POST", "/checkout/sessions", params);
    console.log(`[create_checkout] Stripe status=${result.status} error=${JSON.stringify(result.data?.error ?? null)}`);

    if (result.status !== 200) {
      const errMsg = result.data?.error?.message || JSON.stringify(result.data?.error) || "unknown";
      const err = new Error(`Stripe error ${result.status}: ${errMsg}`);
      reportToSentry(err, "create_checkout_session");
      return { statusCode: 502, headers, body: JSON.stringify({ error: errMsg }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: result.data.url }),
    };
  } catch (err) {
    reportToSentry(err, "create_checkout_session");
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal error" }) };
  }
};
