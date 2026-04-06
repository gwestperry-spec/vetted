const https = require("https");
const crypto = require("crypto");

// ─── Fetch Apple's public keys ────────────────────────────────────────────
function fetchApplePublicKeys() {
  return new Promise((resolve, reject) => {
    https.get("https://appleid.apple.com/auth/keys", (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Failed to parse Apple public keys")); }
      });
    }).on("error", reject);
  });
}

// ─── Base64url decode ─────────────────────────────────────────────────────
function base64urlDecode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
  return Buffer.from(padded, "base64");
}

// ─── Decode JWT without verifying (to get header/payload) ────────────────
function decodeJWT(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  return {
    header: JSON.parse(base64urlDecode(parts[0]).toString()),
    payload: JSON.parse(base64urlDecode(parts[1]).toString()),
    signature: parts[2],
    raw: { header: parts[0], payload: parts[1], signature: parts[2] },
  };
}

// ─── Convert JWK to PEM ───────────────────────────────────────────────────
function jwkToPem(jwk) {
  const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
  return key.export({ type: "spki", format: "pem" });
}

// ─── Verify Apple identity token ─────────────────────────────────────────
async function verifyAppleToken(identityToken) {
  const decoded = decodeJWT(identityToken);
  const { kid, alg } = decoded.header;

  if (alg !== "RS256") throw new Error("Unexpected algorithm: " + alg);

  const keysData = await fetchApplePublicKeys();
  const jwk = keysData.keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error("No matching Apple public key found for kid: " + kid);

  const pem = jwkToPem(jwk);
  const signingInput = `${decoded.raw.header}.${decoded.raw.payload}`;
  const signature = base64urlDecode(decoded.raw.signature);

  const verified = crypto.verify(
    "sha256",
    Buffer.from(signingInput),
    { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
    signature
  );

  if (!verified) throw new Error("Apple token signature verification failed");

  const { iss, aud, exp, sub, email, email_verified } = decoded.payload;
  const now = Math.floor(Date.now() / 1000);

  if (iss !== "https://appleid.apple.com") throw new Error("Invalid issuer");
  if (exp < now) throw new Error("Token expired");

  const validAudiences = [
    process.env.APPLE_CLIENT_ID,
    "com.vetted.app",
  ];
  if (!validAudiences.includes(aud)) throw new Error(`Invalid audience: ${aud}`);

  return { sub, email, email_verified };
}

// ─── Allowed origins (mirrors other functions — no wildcard on auth endpoint) ─
const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
];

// ─── Handler ──────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { identityToken, fullName } = JSON.parse(event.body || "{}");
    if (!identityToken) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "identityToken required" }) };
    }

    const userInfo = await verifyAppleToken(identityToken);

    // Build display name — Apple only sends fullName on first sign-in
    const displayName = fullName?.givenName
      ? `${fullName.givenName}${fullName.familyName ? " " + fullName.familyName : ""}`.trim()
      : null;

    // Issue a session token — HMAC-SHA256(sub, VETTED_SECRET).
    // The client includes this on every scoring request; anthropic.js re-derives
    // the HMAC from the client-provided appleId and compares with timingSafeEqual,
    // so a client cannot forge a token for a different user's appleId.
    const sessionToken = crypto
      .createHmac("sha256", (process.env.VETTED_SECRET || "").trim())
      .update(userInfo.sub)
      .digest("hex");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: userInfo.sub,
          email: userInfo.email || null,
          displayName,
        },
        sessionToken,
      }),
    };
  } catch (err) {
    console.error("Apple auth error:", err.message);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Authentication failed", detail: err.message }),
    };
  }
};
