const https = require("https");
const crypto = require("crypto");

// ─── Server-side IP rate limiting ─────────────────────────────────────────
// Stored in-memory per function instance. Netlify spins up fresh instances
// so this is a best-effort defense — good enough to stop casual abuse.
const IP_RATE_MAP = new Map();
const IP_RATE_WINDOW_MS = 60_000;
const IP_RATE_MAX = 10;

function checkIpRateLimit(ip) {
  const now = Date.now();
  const entry = IP_RATE_MAP.get(ip) || { count: 0, windowStart: now };

  if (now - entry.windowStart > IP_RATE_WINDOW_MS) {
    // Window expired — reset
    IP_RATE_MAP.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= IP_RATE_MAX) return false;

  entry.count++;
  IP_RATE_MAP.set(ip, entry);
  return true;
}

// ─── Allowed origins ───────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "capacitor://localhost",   // iOS Capacitor WebView
  "http://localhost:5173",   // Local dev (Vite)
  "http://localhost:3000",   // Local dev alt
];

// ─── Constants ─────────────────────────────────────────────────────────────
const MAX_BODY_BYTES = 20_000; // ~20KB max request size

// ─── CORS headers helper ───────────────────────────────────────────────────
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

// ─── Handler ───────────────────────────────────────────────────────────────
exports.handler = async function (event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";

  // ── Preflight ────────────────────────────────────────────────────────────
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }

  // ── Method guard ─────────────────────────────────────────────────────────
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // ── Origin validation ────────────────────────────────────────────────────
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    console.warn("Blocked request from unauthorized origin:", origin);
    return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
  }

  // ── Secret token validation ───────────────────────────────────────────────
  const clientToken = event.headers?.["x-vetted-token"] || event.headers?.["X-Vetted-Token"] || "";
  const serverSecret = process.env.VETTED_SECRET || "";
  if (serverSecret && !crypto.timingSafeEqual(
    Buffer.from(clientToken.padEnd(64, "0").slice(0, 64)),
    Buffer.from(serverSecret.padEnd(64, "0").slice(0, 64))
  )) {
    console.warn("Blocked request with invalid secret token");
    return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
  }

  // ── IP rate limiting ──────────────────────────────────────────────────────
  const ip =
    event.headers?.["x-forwarded-for"]?.split(",")[0].trim() ||
    event.headers?.["client-ip"] ||
    "unknown";

  if (!checkIpRateLimit(ip)) {
    console.warn("Rate limit exceeded for IP:", ip);
    return {
      statusCode: 429,
      headers: { ...corsHeaders(origin), "Retry-After": "60" },
      body: JSON.stringify({ error: "Too many requests. Please wait before scoring again." }),
    };
  }

  // ── Request size guard ────────────────────────────────────────────────────
  const bodyStr = event.body || "";
  if (Buffer.byteLength(bodyStr) > MAX_BODY_BYTES) {
    return { statusCode: 413, headers: corsHeaders(origin), body: JSON.stringify({ error: "Request too large" }) };
  }

  // ── Validate body is parseable JSON ──────────────────────────────────────
  let parsedBody;
  try {
    parsedBody = JSON.parse(bodyStr);
  } catch {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  // ── Strip any attempt to override the model or inject system prompts ──────
  const safeBody = JSON.stringify({
model: "claude-haiku-4-5-20251001",
    max_tokens: parsedBody.max_tokens || 2000,
    messages: parsedBody.messages || [],
  });

  // ── Proxy to Anthropic ────────────────────────────────────────────────────
  return new Promise((resolve) => {
    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(safeBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode || 200,
          headers: corsHeaders(origin),
          body: data,
        });
      });
    });

    req.on("error", (error) => {
      console.error("Anthropic proxy error:", error.message);
      resolve({
        statusCode: 500,
        headers: corsHeaders(origin),
        body: JSON.stringify({ error: error.message }),
      });
    });

    req.write(safeBody);
    req.end();
  });
};
