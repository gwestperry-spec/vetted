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
// Manual implementation of Stripe's constructEvent verification algorithm.
// https://stripe.com/docs/webhooks/signatures
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!secret) return true; // secret not yet configured — pass through (setup phase only)
  if (!sigHeader) return false;

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

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false; // buffers different length — definitely invalid
  }
}

// ─── Resolve tier from Stripe price ID ───────────────────────────────────
function tierFromPriceId(priceId) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_SIGNAL_PRICE_ID) return "signal";
  if (priceId === process.env.STRIPE_VANTAGE_PRICE_ID) return "vantage";
  return null;
}

// ─── Supabase tier write ──────────────────────────────────────────────────
async function setUserTier(appleId, tier) {
  console.log(`[stripe_webhook] setUserTier appleId=${appleId.slice(0, 8)}… tier=${tier}`);

  const result = await supabaseRequest(
    "PATCH",
    `/profiles?apple_id=eq.${encodeURIComponent(appleId)}`,
    { tier }
  );

  console.log(`[stripe_webhook] PATCH status=${result.status} rows=${Array.isArray(result.data) ? result.data.length : "?"}`);

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Supabase PATCH failed with status ${result.status}: ${JSON.stringify(result.data)}`);
  }

  // Supabase returns [] when no rows matched the filter — treat as an error
  // so it surfaces in Sentry rather than silently succeeding with no DB change.
  if (Array.isArray(result.data) && result.data.length === 0) {
    throw new Error(`No profile found for appleId=${appleId.slice(0, 8)}… — PATCH matched 0 rows`);
  }

  console.log(`[stripe_webhook] ✓ tier=${tier} confirmed for appleId=${appleId.slice(0, 8)}…`);
}

// ─── Event processing — runs after 200 is returned to Stripe ─────────────
async function processEvent(stripeEvent) {
  const type = stripeEvent.type;
  const obj = stripeEvent.data?.object;

  // ── checkout.session.completed ───────────────────────────────────────────
  // Fires when a user completes a Stripe Checkout session (new subscription).
  if (type === "checkout.session.completed") {
    const appleId = obj?.metadata?.appleId;
    const tier = obj?.metadata?.tier;

    console.log(`[stripe_webhook] checkout.session.completed metadata appleId=${appleId?.slice(0,8) ?? "MISSING"} tier=${tier ?? "MISSING"}`);

    if (!appleId) throw new Error("checkout.session.completed: missing metadata.appleId");
    if (!tier || !["signal", "vantage"].includes(tier)) {
      throw new Error(`checkout.session.completed: invalid tier "${tier}"`);
    }
    await setUserTier(appleId, tier);
    return;
  }

  // ── customer.subscription.updated ────────────────────────────────────────
  // Fires on plan change, renewal, status change (active → past_due, etc).
  if (type === "customer.subscription.updated") {
    const appleId = obj?.metadata?.appleId;
    if (!appleId) throw new Error("subscription.updated: missing metadata.appleId");

    const status = obj?.status;
    const priceId = obj?.items?.data?.[0]?.price?.id;

    if (status === "active" || status === "trialing") {
      const tier = tierFromPriceId(priceId);
      if (!tier) throw new Error(`subscription.updated: unrecognised price ID "${priceId}"`);
      await setUserTier(appleId, tier);
    } else if (status === "canceled" || status === "unpaid") {
      // Status has lapsed — demote to free immediately
      await setUserTier(appleId, "free");
    }
    // past_due and other transient states: leave tier as-is, let Stripe retry billing
    return;
  }

  // ── customer.subscription.deleted ────────────────────────────────────────
  // Fires when a subscription is fully cancelled (at period end or immediately).
  if (type === "customer.subscription.deleted") {
    const appleId = obj?.metadata?.appleId;
    if (!appleId) throw new Error("subscription.deleted: missing metadata.appleId");
    await setUserTier(appleId, "free");
    return;
  }

  // All other event types acknowledged silently — no processing needed.
  console.log(`[stripe_webhook] Unhandled event type "${type}" — acknowledged`);
}

// ─── Handler ───────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // ── Raw body (Netlify may base64-encode binary payloads) ──────────────────
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body || "";

  // ── Verify Stripe-Signature ───────────────────────────────────────────────
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

  console.log(`[stripe_webhook] Received: ${stripeEvent?.type}`);

  // ── Process event synchronously before returning 200 ─────────────────────
  // setImmediate() is not reliable in serverless — the execution context is
  // frozen after the response is sent, so queued callbacks never run.
  // Supabase PATCH takes ~200ms; well within Stripe's 30-second timeout.
  try {
    await processEvent(stripeEvent);
  } catch (err) {
    reportToSentry(err, `stripe_webhook_${stripeEvent?.type}`);
    // Still return 200 — Stripe must not retry this event. The error is in
    // Sentry. A 5xx would cause Stripe to retry, potentially double-billing.
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
