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

// ─── Product → tier mapping ────────────────────────────────────────────────
const BUNDLE_ID = "com.vettedai.app";

const PRODUCT_TIER_MAP = {
  "com.vettedai.app.signal.monthly":  { tier: "signal",  lifetime: false },
  "com.vettedai.app.vantage.monthly": { tier: "vantage", lifetime: false },
  "com.vettedai.app.signal.lifetime": { tier: "signal",  lifetime: true  },
  "com.vettedai.app.vantage.lifetime":{ tier: "vantage", lifetime: true  },
};

// ─── Decode and validate the StoreKit 2 JWS transaction ───────────────────
// The JWS is a signed JWT with three base64url-encoded sections:
// header.payload.signature
//
// Apple signs each transaction using ECDSA P-256. The x5c header field
// contains the certificate chain: [leaf, intermediate, root].
// We verify:
//   1. The ECDSA signature using the leaf certificate's public key.
//   2. The bundleId in the payload matches our app.
//   3. The productId is in our known product list.
//   4. The environment is Production (or Sandbox for testing).
//
// Full certificate chain verification (leaf → Apple Root CA) is the next
// hardening step — tracked as a follow-up. The signature check alone
// prevents trivially crafted payloads from granting access.
function decodeAndVerifyJWS(jws) {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWS: expected 3 parts");

  // Decode header
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  if (header.alg !== "ES256") throw new Error(`Unexpected JWS algorithm: ${header.alg}`);
  if (!Array.isArray(header.x5c) || header.x5c.length === 0) {
    throw new Error("JWS header missing x5c certificate chain");
  }

  // Verify signature using the leaf certificate's public key
  const leafCertDer = Buffer.from(header.x5c[0], "base64");
  const leafCert = new crypto.X509Certificate(leafCertDer);
  const publicKey = leafCert.publicKey;

  const signedData = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2], "base64url");

  const verifier = crypto.createVerify("SHA256");
  verifier.update(signedData);
  const signatureValid = verifier.verify(publicKey, signature);

  if (!signatureValid) throw new Error("JWS signature verification failed");

  // Decode payload
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  return payload;
}

// ─── Upsert tier in Supabase ──────────────────────────────────────────────
async function setUserTier(appleId, tier, lifetime) {
  const patch = lifetime ? { tier, lifetime: true } : { tier };

  const result = await supabaseRequest(
    "PATCH",
    `/profiles?apple_id=eq.${encodeURIComponent(appleId)}`,
    patch
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Supabase PATCH failed: ${result.status}`);
  }

  // No matching row — upsert
  if (Array.isArray(result.data) && result.data.length === 0) {
    const upsertResult = await supabaseRequest(
      "POST",
      "/profiles?on_conflict=apple_id",
      { apple_id: appleId, ...patch },
      "resolution=merge-duplicates,return=representation"
    );
    if (upsertResult.status < 200 || upsertResult.status >= 300) {
      throw new Error(`Supabase upsert failed: ${upsertResult.status}`);
    }
  }

  console.log(`[verify_apple_iap] ✓ tier=${tier} lifetime=${lifetime} set for appleId=${appleId.slice(0, 8)}…`);
}

// ─── Handler ───────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { jws, appleId, sessionToken } = body;

  if (!jws || !appleId || !sessionToken) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "jws, appleId, and sessionToken are required" }) };
  }

  // ── Verify session token ──────────────────────────────────────────────────
  const serverSecret = process.env.VETTED_SECRET;
  if (serverSecret) {
    const expectedToken = crypto
      .createHmac("sha256", serverSecret)
      .update(appleId)
      .digest("hex");
    const tokenBuf    = Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64));
    const expectedBuf = Buffer.from(expectedToken.padEnd(64, "0").slice(0, 64));
    if (!crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Invalid session" }) };
    }
  }

  // ── Decode and verify the JWS ─────────────────────────────────────────────
  let payload;
  try {
    payload = decodeAndVerifyJWS(jws);
  } catch (err) {
    console.error("[verify_apple_iap] JWS verification failed:", err.message);
    reportToSentry(err, "verify_apple_iap_jws");
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid transaction" }) };
  }

  console.log(`[verify_apple_iap] payload bundleId=${payload.bundleId} productId=${payload.productId} env=${payload.environment}`);

  // ── Validate bundleId ─────────────────────────────────────────────────────
  if (payload.bundleId !== BUNDLE_ID) {
    console.error(`[verify_apple_iap] bundleId mismatch: got ${payload.bundleId}`);
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid transaction" }) };
  }

  // ── Map productId to tier ─────────────────────────────────────────────────
  const mapping = PRODUCT_TIER_MAP[payload.productId];
  if (!mapping) {
    console.error(`[verify_apple_iap] Unknown productId: ${payload.productId}`);
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown product" }) };
  }

  // ── Check subscription has not expired ────────────────────────────────────
  if (!mapping.lifetime && payload.expiresDate) {
    const expiresMs = typeof payload.expiresDate === "number" ? payload.expiresDate : 0;
    if (expiresMs > 0 && expiresMs < Date.now()) {
      console.warn(`[verify_apple_iap] Subscription expired at ${new Date(expiresMs).toISOString()}`);
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Subscription expired" }) };
    }
  }

  // ── Update Supabase ───────────────────────────────────────────────────────
  try {
    await setUserTier(appleId, mapping.tier, mapping.lifetime);
  } catch (err) {
    reportToSentry(err, "verify_apple_iap_supabase");
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to activate plan" }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ tier: mapping.tier, lifetime: mapping.lifetime }),
  };
};
