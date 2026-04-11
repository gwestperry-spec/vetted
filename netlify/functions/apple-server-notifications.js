const https = require("https");
const crypto = require("crypto");

// ─── Apple Root CA G3 — pinned fingerprint ────────────────────────────────
// Shared with verify-apple-iap.js — both files verify StoreKit 2 JWS tokens.
const APPLE_ROOT_CA_G3_FINGERPRINT =
  "63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:8F:F9:D3"
  .replace(/:/g, "").toLowerCase();

const BUNDLE_ID = "com.vettedai.app";

// ─── Product → tier mapping (mirrors verify-apple-iap.js) ─────────────────
const PRODUCT_TIER_MAP = {
  "com.vettedai.app.signal.monthly":  { tier: "signal",  lifetime: false },
  "com.vettedai.app.vantage.monthly": { tier: "vantage", lifetime: false },
  "com.vettedai.app.signal.lifetime": { tier: "signal",  lifetime: true  },
  "com.vettedai.app.vantage.lifetime":{ tier: "vantage", lifetime: true  },
};

// ─── Notification types that grant / revoke access ─────────────────────────
// SUBSCRIBED / DID_RENEW → grant tier
// EXPIRED / DID_FAIL_TO_RENEW / GRACE_PERIOD_EXPIRED → downgrade to free
// CANCEL / REFUND → downgrade to free immediately
// REVOKE → downgrade to free (family sharing revoked)
const GRANT_TYPES   = new Set(["SUBSCRIBED", "DID_RENEW", "OFFER_REDEEMED"]);
const REVOKE_TYPES  = new Set([
  "EXPIRED", "DID_FAIL_TO_RENEW", "GRACE_PERIOD_EXPIRED", "CANCEL", "REFUND", "REVOKE",
]);

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
function supabaseRequest(method, path, body, preferHeader = "return=representation") {
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
        "Prefer": preferHeader,
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

// ─── Idempotency check ────────────────────────────────────────────────────
// Supabase table: notification_log (notificationUUID text PRIMARY KEY, processed_at timestamptz)
// If we've already processed this UUID, skip silently (Apple retries for 24 h).
async function isAlreadyProcessed(notificationUUID) {
  const res = await supabaseRequest(
    "GET",
    `/notification_log?notification_uuid=eq.${encodeURIComponent(notificationUUID)}&select=notification_uuid&limit=1`
  );
  return Array.isArray(res.data) && res.data.length > 0;
}

async function markProcessed(notificationUUID) {
  await supabaseRequest(
    "POST",
    "/notification_log?on_conflict=notification_uuid",
    { notification_uuid: notificationUUID, processed_at: new Date().toISOString() },
    "resolution=merge-duplicates,return=minimal"
  );
}

// ─── Decode and verify StoreKit 2 signed payload (JWS) ────────────────────
// Identical verification logic to verify-apple-iap.js:
//   1. ECDSA ES256 signature using leaf public key
//   2. Leaf issuer === intermediate subject
//   3. Intermediate issuer === root subject
//   4. Root fingerprint pinned to Apple Root CA G3
function decodeAndVerifyJWS(jws) {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWS: expected 3 parts");

  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  if (header.alg !== "ES256") throw new Error(`Unexpected JWS algorithm: ${header.alg}`);
  if (!Array.isArray(header.x5c) || header.x5c.length < 3) {
    throw new Error(`JWS x5c chain too short: expected 3 certs, got ${header.x5c?.length ?? 0}`);
  }

  const leafCert         = new crypto.X509Certificate(Buffer.from(header.x5c[0], "base64"));
  const intermediateCert = new crypto.X509Certificate(Buffer.from(header.x5c[1], "base64"));
  const rootCert         = new crypto.X509Certificate(Buffer.from(header.x5c[2], "base64"));

  // Step 1: ECDSA signature
  const signedData = `${parts[0]}.${parts[1]}`;
  const signature  = Buffer.from(parts[2], "base64url");
  const verifier   = crypto.createVerify("SHA256");
  verifier.update(signedData);
  if (!verifier.verify(leafCert.publicKey, signature)) {
    throw new Error("JWS signature verification failed");
  }

  // Step 2: leaf.issuer === intermediate.subject
  if (leafCert.issuer !== intermediateCert.subject) {
    throw new Error(`Certificate chain broken: leaf issuer does not match intermediate subject`);
  }

  // Step 3: intermediate.issuer === root.subject
  if (intermediateCert.issuer !== rootCert.subject) {
    throw new Error(`Certificate chain broken: intermediate issuer does not match root subject`);
  }

  // Step 4: root fingerprint pinned
  const rootFingerprint = rootCert.fingerprint256.replace(/:/g, "").toLowerCase();
  if (rootFingerprint !== APPLE_ROOT_CA_G3_FINGERPRINT) {
    throw new Error(`Root CA fingerprint mismatch: expected Apple Root CA G3`);
  }

  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}

// ─── Tier management ──────────────────────────────────────────────────────
async function grantTier(appleId, tier, lifetime) {
  const patch = lifetime ? { tier, lifetime: true } : { tier };
  const res = await supabaseRequest(
    "PATCH",
    `/profiles?apple_id=eq.${encodeURIComponent(appleId)}`,
    patch
  );
  if (res.status < 200 || res.status >= 300) throw new Error(`Supabase PATCH failed: ${res.status}`);
  if (Array.isArray(res.data) && res.data.length === 0) {
    // No matching row — upsert
    const ups = await supabaseRequest(
      "POST",
      "/profiles?on_conflict=apple_id",
      { apple_id: appleId, ...patch },
      "resolution=merge-duplicates,return=representation"
    );
    if (ups.status < 200 || ups.status >= 300) throw new Error(`Supabase upsert failed: ${ups.status}`);
  }
  console.log(`[apple_notif] ✓ GRANTED tier=${tier} lifetime=${lifetime} for appleId=${appleId.slice(0, 8)}…`);
}

async function revokeTier(appleId) {
  const res = await supabaseRequest(
    "PATCH",
    `/profiles?apple_id=eq.${encodeURIComponent(appleId)}`,
    { tier: "free" }
  );
  if (res.status < 200 || res.status >= 300) throw new Error(`Supabase PATCH failed: ${res.status}`);
  console.log(`[apple_notif] ✓ REVOKED tier → free for appleId=${appleId.slice(0, 8)}…`);
}

// ─── Handler ───────────────────────────────────────────────────────────────
// Apple calls this endpoint with a signed App Store Server Notification (ASSN).
// The body is a JSON object with a signedPayload (JWS) at top level.
// No authentication header from Apple — security is the JWS signature itself.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // ── Parse outer payload ────────────────────────────────────────────────────
  let outer;
  try {
    outer = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { signedPayload } = outer;
  if (!signedPayload || typeof signedPayload !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing signedPayload" }) };
  }

  // ── Verify and decode outer JWS (notification envelope) ───────────────────
  let notifPayload;
  try {
    notifPayload = decodeAndVerifyJWS(signedPayload);
  } catch (err) {
    console.error("[apple_notif] Outer JWS verification failed:", err.message);
    reportToSentry(err, "apple_notif_outer_jws");
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid notification" }) };
  }

  const { notificationUUID, notificationType, subtype, data } = notifPayload;

  console.log(`[apple_notif] type=${notificationType} subtype=${subtype} uuid=${notificationUUID}`);

  // ── Idempotency guard ─────────────────────────────────────────────────────
  try {
    const already = await isAlreadyProcessed(notificationUUID);
    if (already) {
      console.log(`[apple_notif] already processed uuid=${notificationUUID} — 200 OK`);
      return { statusCode: 200, body: JSON.stringify({ ok: true, idempotent: true }) };
    }
  } catch (err) {
    // If we can't check idempotency, process anyway — better to re-grant than to ignore.
    reportToSentry(err, "apple_notif_idempotency_check");
  }

  // ── Verify and decode inner transaction JWS ───────────────────────────────
  const signedTransactionInfo = data?.signedTransactionInfo;
  if (!signedTransactionInfo) {
    // Some notification types (TEST) have no transaction — ACK and move on.
    console.log(`[apple_notif] no signedTransactionInfo — type=${notificationType}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  let txPayload;
  try {
    txPayload = decodeAndVerifyJWS(signedTransactionInfo);
  } catch (err) {
    console.error("[apple_notif] Transaction JWS verification failed:", err.message);
    reportToSentry(err, "apple_notif_tx_jws");
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid transaction" }) };
  }

  const { bundleId, productId, appAccountToken: appleId } = txPayload;

  // ── Validate bundleId ─────────────────────────────────────────────────────
  if (bundleId !== BUNDLE_ID) {
    console.error(`[apple_notif] bundleId mismatch: got ${bundleId}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }; // ACK to prevent retries
  }

  // ── Validate productId ────────────────────────────────────────────────────
  const mapping = PRODUCT_TIER_MAP[productId];
  if (!mapping && GRANT_TYPES.has(notificationType)) {
    console.error(`[apple_notif] Unknown productId: ${productId}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  // ── Resolve appleId ───────────────────────────────────────────────────────
  // appAccountToken is the UUID we set when the user initiates the purchase —
  // it maps back to apple_id in our profiles table.
  if (!appleId) {
    console.error(`[apple_notif] Missing appAccountToken — cannot identify user`);
    reportToSentry(new Error("Missing appAccountToken in transaction"), "apple_notif_no_user");
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  // ── Apply tier change ─────────────────────────────────────────────────────
  try {
    if (GRANT_TYPES.has(notificationType)) {
      await grantTier(appleId, mapping.tier, mapping.lifetime);
    } else if (REVOKE_TYPES.has(notificationType)) {
      await revokeTier(appleId);
    } else {
      // Informational types (PRICE_INCREASE, etc.) — no action needed.
      console.log(`[apple_notif] informational type=${notificationType} — no tier change`);
    }
  } catch (err) {
    reportToSentry(err, "apple_notif_tier_change");
    // Return 500 so Apple retries. Do NOT mark as processed.
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to update tier" }) };
  }

  // ── Mark as processed ─────────────────────────────────────────────────────
  try {
    await markProcessed(notificationUUID);
  } catch (err) {
    // Non-fatal — idempotency log failure doesn't block the response.
    reportToSentry(err, "apple_notif_mark_processed");
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
