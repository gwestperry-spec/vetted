import https from "https";
import crypto from "crypto";

// ─── Allowed origins ───────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
];

const MAX_BODY_BYTES = 20_000;
const FREE_TIER_LIMIT = 10;

// ─── CORS headers (no Content-Type — streaming response sets its own) ──────
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonHeaders(origin) {
  return { ...corsHeaders(origin), "Content-Type": "application/json" };
}

// ─── IP rate limiting ──────────────────────────────────────────────────────
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
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, data: null }); }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Tier enforcement ──────────────────────────────────────────────────────
async function checkScoreLimit(appleId) {
  const res = await supabaseRequest(
    "GET",
    `/profiles?apple_id=eq.${encodeURIComponent(appleId)}&select=tier,scores_used,scores_reset_date&limit=1`
  );
  const profile = res.data?.[0];
  if (!profile) return { allowed: true, tier: "free", scoresUsed: 0 };

  const tier = profile.tier || "free";
  if (tier !== "free") return { allowed: true, tier, scoresUsed: profile.scores_used || 0 };

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

  return { allowed: scoresUsed < FREE_TIER_LIMIT, tier, scoresUsed };
}

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

// ─── Pipe Anthropic SSE stream → client ReadableStream ────────────────────
// Returns a Web API ReadableStream that emits raw Anthropic SSE chunks.
// The client parses content_block_delta events to extract text tokens.
function createAnthropicStream(safeBody) {
  return new ReadableStream({
    start(controller) {
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
        // Forward a non-200 status as a synthetic SSE error event so the
        // client can surface it rather than silently hanging.
        if (res.statusCode !== 200) {
          let errBody = "";
          res.on("data", (c) => { errBody += c; });
          res.on("end", () => {
            const msg = `event: error\ndata: ${JSON.stringify({ status: res.statusCode, body: errBody })}\n\n`;
            controller.enqueue(Buffer.from(msg));
            controller.close();
          });
          return;
        }

        res.on("data", (chunk) => {
          try { controller.enqueue(chunk); }
          catch { /* controller already closed */ }
        });

        res.on("end", () => {
          try { controller.close(); }
          catch { /* already closed */ }
        });

        res.on("error", (err) => {
          try { controller.error(err); }
          catch { /* already errored */ }
        });
      });

      req.on("error", (err) => {
        try { controller.error(err); }
        catch { /* already errored */ }
      });

      req.write(safeBody);
      req.end();
    },
  });
}

// ─── Handler ───────────────────────────────────────────────────────────────
// Netlify Functions v2 ESM: first argument is a Web Fetch API Request object.
// Do NOT use event.body / event.httpMethod / event.headers — those are v1.
export default async function handler(req) {
  // req.headers is a Headers object — use .get() not bracket notation
  const origin = req.headers.get("origin") || req.headers.get("Origin") || "";

  // ── Preflight ──────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: jsonHeaders(origin),
    });
  }

  // ── Origin validation ──────────────────────────────────────────────────
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: jsonHeaders(origin),
    });
  }

  // ── IP rate limiting ───────────────────────────────────────────────────
  const ip =
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("client-ip") ||
    "unknown";

  if (!checkIpRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait before scoring again." }), {
      status: 429, headers: { ...jsonHeaders(origin), "Retry-After": "60" },
    });
  }

  // ── Request size guard ─────────────────────────────────────────────────
  // req.text() reads the body once — store it before parsing
  let bodyStr;
  try {
    bodyStr = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: "Failed to read request body" }), {
      status: 400, headers: jsonHeaders(origin),
    });
  }

  if (Buffer.byteLength(bodyStr) > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "Request too large" }), {
      status: 413, headers: jsonHeaders(origin),
    });
  }

  // ── Parse body ─────────────────────────────────────────────────────────
  let parsedBody;
  try {
    parsedBody = JSON.parse(bodyStr);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: jsonHeaders(origin),
    });
  }

  const { messages, appleId, sessionToken } = parsedBody;

  if (!appleId || typeof appleId !== "string" || appleId.length > 256 ||
      !sessionToken || typeof sessionToken !== "string") {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 403, headers: jsonHeaders(origin),
    });
  }

  // ── Session token verification ─────────────────────────────────────────
  const serverSecret = process.env.VETTED_SECRET || "";
  if (serverSecret) {
    const expectedToken = crypto
      .createHmac("sha256", serverSecret)
      .update(appleId)
      .digest("hex");
    const tokenBuf    = Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64));
    const expectedBuf = Buffer.from(expectedToken.padEnd(64, "0").slice(0, 64));
    if (!crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 403, headers: jsonHeaders(origin),
      });
    }
  }

  // ── Tier enforcement ───────────────────────────────────────────────────
  let tierCheck;
  try {
    tierCheck = await checkScoreLimit(appleId);
  } catch (err) {
    reportToSentry(err, "anthropic_stream_tier_check");
    tierCheck = { allowed: true, tier: "unknown" };
  }

  if (!tierCheck.allowed) {
    return new Response(JSON.stringify({
      error: "Free tier limit reached",
      scoresUsed: tierCheck.scoresUsed,
      scoresRemaining: 0,
      limitReached: true,
    }), { status: 429, headers: jsonHeaders(origin) });
  }

  // ── Build Anthropic streaming request body ─────────────────────────────
  const safeBody = JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: parsedBody.max_tokens || 4096,
    stream: true,
    messages: messages || [],
  });

  // ── Increment score count (optimistic — stream is about to start) ──────
  // Free tier only. If the stream fails mid-way the API call still fired.
  if (tierCheck.tier === "free") {
    incrementScoreCount(appleId).catch((err) =>
      reportToSentry(err, "anthropic_stream_increment")
    );
  }

  // ── Return streaming response ──────────────────────────────────────────
  const stream = createAnthropicStream(safeBody);

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no", // disable nginx buffering when proxied
    },
  });
}
