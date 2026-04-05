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
const MAX_BODY_BYTES = 20_000;
const FREE_TIER_LIMIT = 10;

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

// ─── Supabase REST helper ──────────────────────────────────────────────────
// Duplicated from supabase.js — functions can't share modules on Netlify
// without a bundler. Keep in sync if schema changes.
const SUPABASE_URL = process.env.VT_DB_URL;
const SUPABASE_KEY = process.env.VT_DB_KEY;

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
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
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, data: null });
        }
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Tier enforcement — check whether this user may score ─────────────────
// Returns { allowed, tier, scoresUsed, scoresRemaining }
// Does NOT increment — caller increments only after Anthropic succeeds.
async function checkScoreLimit(appleId) {
  const res = await supabaseRequest(
    "GET",
    `/profiles?apple_id=eq.${encodeURIComponent(appleId)}&select=tier,scores_used,scores_reset_date&limit=1`
  );
  const profile = res.data?.[0];

  // No profile yet (edge case: user signed in but hasn't completed onboarding).
  // Allow the score — profile will be created when they save.
  if (!profile) return { allowed: true, tier: "free", scoresUsed: 0, scoresRemaining: FREE_TIER_LIMIT };

  const tier = profile.tier || "free";

  // Paid tiers are always allowed
  if (tier !== "free") {
    return { allowed: true, tier, scoresUsed: profile.scores_used || 0, scoresRemaining: null };
  }

  // Free tier: check monthly reset
  const now = new Date();
  const resetDate = profile.scores_reset_date ? new Date(profile.scores_reset_date) : null;
  let scoresUsed = profile.scores_used || 0;

  if (!resetDate || now >= resetDate) {
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await supabaseRequest("PATCH", `/profiles?apple_id=eq.${encodeURIComponent(appleId)}`, {
      scores_used: 0,
      scores_reset_date: nextReset.toISOString().split("T")[0],
    });
    scoresUsed = 0;
  }

  const allowed = scoresUsed < FREE_TIER_LIMIT;
  return { allowed, tier, scoresUsed, scoresRemaining: FREE_TIER_LIMIT - scoresUsed };
}

// ─── Tier enforcement — increment after confirmed success ─────────────────
async function incrementScoreCount(appleId) {
  const res = await supabaseRequest(
    "GET",
    `/profiles?apple_id=eq.${encodeURIComponent(appleId)}&select=scores_used&limit=1`
  );
  const current = res.data?.[0]?.scores_used || 0;
  await supabaseRequest("PATCH", `/profiles?apple_id=eq.${encodeURIComponent(appleId)}`, {
    scores_used: current + 1,
  });
}

// ─── Anthropic proxy ───────────────────────────────────────────────────────
function proxyToAnthropic(safeBody, origin) {
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
}

// ─── Handler ───────────────────────────────────────────────────────────────
exports.handler = async function (event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";

  // ── Preflight ──────────────────────────────────────────────────────────
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }

  // ── Method guard ───────────────────────────────────────────────────────
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // ── Origin validation ──────────────────────────────────────────────────
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    console.warn("Blocked request from unauthorized origin:", origin);
    return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
  }

  // ── Secret token validation ────────────────────────────────────────────
  const clientToken = event.headers?.["x-vetted-token"] || event.headers?.["X-Vetted-Token"] || "";
  const serverSecret = process.env.VETTED_SECRET || "";
  if (serverSecret && !crypto.timingSafeEqual(
    Buffer.from(clientToken.padEnd(64, "0").slice(0, 64)),
    Buffer.from(serverSecret.padEnd(64, "0").slice(0, 64))
  )) {
    console.warn("Blocked request with invalid secret token");
    return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
  }

  // ── IP rate limiting ───────────────────────────────────────────────────
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

  // ── Request size guard ─────────────────────────────────────────────────
  const bodyStr = event.body || "";
  if (Buffer.byteLength(bodyStr) > MAX_BODY_BYTES) {
    return { statusCode: 413, headers: corsHeaders(origin), body: JSON.stringify({ error: "Request too large" }) };
  }

  // ── Parse body ─────────────────────────────────────────────────────────
  let parsedBody;
  try {
    parsedBody = JSON.parse(bodyStr);
  } catch {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { messages, appleId } = parsedBody;

  // ── Require authentication ─────────────────────────────────────────────
  if (!appleId || typeof appleId !== "string" || appleId.length > 256) {
    return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Authentication required" }) };
  }

  // ── Server-side tier enforcement ───────────────────────────────────────
  let tierCheck;
  try {
    tierCheck = await checkScoreLimit(appleId);
  } catch (err) {
    // Supabase unreachable — fail open with a warning so a transient DB
    // outage doesn't block paying users. Log for monitoring.
    console.error("Tier check failed, proceeding:", err.message);
    tierCheck = { allowed: true, tier: "unknown" };
  }

  if (!tierCheck.allowed) {
    console.log(`Score limit reached for ${appleId}: ${tierCheck.scoresUsed}/${FREE_TIER_LIMIT}`);
    return {
      statusCode: 429,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        error: "Free tier limit reached",
        scoresUsed: tierCheck.scoresUsed,
        scoresRemaining: 0,
        limitReached: true,
      }),
    };
  }

  // ── Strip model/system overrides, proxy to Anthropic ──────────────────
  const safeBody = JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: parsedBody.max_tokens || 2000,
    messages: messages || [],
  });

  const result = await proxyToAnthropic(safeBody, origin);

  // ── Increment score count only on success ──────────────────────────────
  if (result.statusCode === 200 && tierCheck.tier === "free") {
    incrementScoreCount(appleId).catch(err =>
      console.error("Failed to increment score count:", err.message)
    );
  }

  return result;
};
