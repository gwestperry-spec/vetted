const https = require("https");
const crypto = require("crypto");

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

// ─── Supabase REST helper ──────────────────────────────────────────────────
// Duplicated from supabase.js — functions can't share modules on Netlify
// without a bundler. Keep in sync if schema changes.
function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const SUPABASE_URL = process.env.VT_DB_URL;
    const SUPABASE_KEY = process.env.VT_DB_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return reject(new Error("Supabase credentials not configured"));
    }
    const url = new URL(`${SUPABASE_URL}/rest/v1${path}`);
    const bodyStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=representation",
        ...(bodyStr && { "Content-Length": Buffer.byteLength(bodyStr) }),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, data: null }); }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Stripe webhook signature verification ────────────────────────────────
// Implements the Stripe-Signature header verification algorithm exactly.
// https://stripe.com/docs/webhooks/signatures
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return !secret; // pass through if secret not yet configured

  const parts = {};
  for (const part of sigHeader.split(",")) {
    const eq = part.indexOf("=");
    if (eq > 0) parts[part.slice(0, eq)] = part.slice(eq + 1);
  }

  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

  // Reject replays older than 5 minutes
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - parseInt(timestamp, 10)) > 300) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  // Constant-time compare to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false; // buffers different length → invalid
  }
}

// ─── Update Supabase tier ─────────────────────────────────────────────────
async function setUserTier(appleId, tier) {
  const result = await supabaseRequest(
    "PATCH",
    `/profiles?apple_id=eq.${encodeURIComponent(appleId)}`,
    { tier }
  );
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Supabase PATCH failed with status ${result.status}`);
  }
  return result;
}

// ─── Handler ───────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  // Stripe only sends POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // ── Get raw body (Netlify may base64-encode binary payloads) ─────────────
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body || "";

  // ── Verify Stripe signature ───────────────────────────────────────────────
  const sigHeader = event.headers?.["stripe-signature"] || event.headers?.["Stripe-Signature"] || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
    console.error("[stripe_webhook] Signature verification failed");
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid signature" }) };
  }

  // ── Parse event ───────────────────────────────────────────────────────────
  let stripeEvent;
  try {
    stripeEvent = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const eventType = stripeEvent?.type;
  console.log(`[stripe_webhook] Received event: ${eventType}`);

  // ── Handle checkout.session.completed ─────────────────────────────────────
  // This fires when a user successfully completes a Stripe Checkout session.
  if (eventType === "checkout.session.completed") {
    const session = stripeEvent.data?.object;
    const appleId = session?.metadata?.appleId;
    const tier = session?.metadata?.tier;

    if (!appleId || !tier) {
      const err = new Error(`Missing metadata in checkout.session.completed — appleId: ${appleId}, tier: ${tier}`);
      reportToSentry(err, "stripe_webhook");
      // Still return 200 so Stripe doesn't retry — this is a data issue, not transient
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    if (!["signal", "vantage"].includes(tier)) {
      const err = new Error(`Unexpected tier value in webhook metadata: ${tier}`);
      reportToSentry(err, "stripe_webhook");
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    try {
      await setUserTier(appleId, tier);
      console.log(`[stripe_webhook] Set tier=${tier} for appleId=${appleId.slice(0, 8)}…`);
    } catch (err) {
      reportToSentry(err, "stripe_webhook_set_tier");
      // Return 500 so Stripe retries the webhook (transient DB failure)
      return { statusCode: 500, body: JSON.stringify({ error: "Failed to update tier" }) };
    }
  }

  // ── Acknowledge all other event types without error ───────────────────────
  // Stripe requires a 200 response to prevent retries for events we don't handle.
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
