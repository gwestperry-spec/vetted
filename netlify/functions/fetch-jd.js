// ─── fetch-jd — Extract job description from any URL ─────────────────────────
// Tier-1: Perplexity Sonar (cheap, web-indexed, fails on auth-walled pages
//         like most LinkedIn JDs).
// Tier-2: ScrapingBee with JS render + premium proxy (residential IPs,
//         handles auth/login walls, ~$0.005/call). Only fired if Tier-1
//         returns FETCH_FAILED, an empty body, or <80 chars.
//
// Every attempt is logged to the Supabase `fetch_jd_log` table for
// observability (see /dashboard).

const https  = require("https");
const crypto = require("crypto");

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

function sanitizeUrl(value) {
  const trimmed = (value || "").trim().slice(0, 2048);
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" ||
      host.startsWith("192.168.") || host.startsWith("10.") ||
      host.startsWith("172.16.") || host.endsWith(".internal") ||
      host === "metadata.google.internal"
    ) return "";
    return trimmed;
  } catch { return ""; }
}

function urlHost(value) {
  try { return new URL(value).hostname.toLowerCase(); } catch { return null; }
}

// ─── observability — Supabase fetch_jd_log ───────────────────────────────────
// Fire-and-forget; failure to log never blocks the user response.
function logAttempt({ host, provider, success, durationMs, errorCode }) {
  const SB_URL = process.env.VT_DB_URL;
  const SB_KEY = process.env.VT_DB_KEY;
  if (!SB_URL || !SB_KEY) return;
  try {
    const body = JSON.stringify({
      url_host: host || null,
      provider,
      success: !!success,
      duration_ms: Number.isFinite(durationMs) ? Math.round(durationMs) : null,
      error_code: errorCode || null,
    });
    const u = new URL("/rest/v1/fetch_jd_log", SB_URL);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => { res.on("data", () => {}); res.on("end", () => {}); }
    );
    req.on("error", () => {});
    req.write(body);
    req.end();
  } catch { /* never throw */ }
}

// ─── Tier 1: Perplexity Sonar ────────────────────────────────────────────────
async function tryPerplexity(safeUrl, isLinkedIn) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { ok: false, error: "no_api_key" };

  const payload = JSON.stringify({
    model: "sonar",
    messages: [
      {
        role: "system",
        content:
          "You are a job description extractor. Your job is to find and return the complete job posting content — job title, company name, location, responsibilities, qualifications, compensation if listed, and reporting structure. Return ONLY the raw job description text with no commentary, no preamble, and no markdown formatting. If you cannot find a real job posting, respond with exactly: FETCH_FAILED",
      },
      {
        role: "user",
        content: isLinkedIn
          ? `Find and extract the full job description posted at this LinkedIn URL: ${safeUrl}. Search for the job posting content including title, company, responsibilities, and qualifications.`
          : `Extract the job description from this URL: ${safeUrl}`,
      },
    ],
    max_tokens: 4000,
    temperature: 0,
  });

  const result = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.perplexity.ai",
        path: "/chat/completions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

  if (result.status !== 200) {
    return { ok: false, error: `http_${result.status}` };
  }
  const text = result.data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text || text === "FETCH_FAILED" || text.length < 80) {
    return { ok: false, error: "fetch_failed_or_short", text };
  }
  return { ok: true, text };
}

// ─── Tier 2: ScrapingBee (JS render + premium proxy) ─────────────────────────
async function tryScrapingBee(safeUrl) {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) return { ok: false, error: "no_api_key" };

  // Minimum-viable request: let ScrapingBee return raw HTML, strip tags
  // below. Earlier attempts to use extract_rules + block_resources returned
  // 400 (parameter validation issue with that combination on the free tier).
  const params = new URLSearchParams({
    api_key: apiKey,
    url: safeUrl,
    render_js: "true",
    premium_proxy: "true",
  });

  const result = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "app.scrapingbee.com",
        path: `/api/v1/?${params.toString()}`,
        method: "GET",
        headers: { Accept: "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          resolve({ status: res.statusCode, raw: data });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });

  if (result.status !== 200) {
    return { ok: false, error: `http_${result.status}` };
  }
  let text = "";
  try {
    const parsed = JSON.parse(result.raw);
    text = [parsed.title, parsed.body].filter(Boolean).join("\n\n").trim();
  } catch {
    // ScrapingBee returned raw HTML/text rather than JSON — strip tags as a fallback.
    text = (result.raw || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (!text || text.length < 80) {
    return { ok: false, error: "short_response" };
  }
  return { ok: true, text };
}

// ─── handler ──────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin  = event.headers?.origin || event.headers?.Origin || "";
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

  const { url, appleId, sessionToken } = body;

  // ── Session auth ───────────────────────────────────────────────────────────
  const serverSecret = process.env.VETTED_SECRET;
  if (serverSecret && appleId && sessionToken) {
    const expected = crypto.createHmac("sha256", serverSecret).update(appleId).digest("hex");
    const tokBuf = Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64));
    const expBuf = Buffer.from(expected.padEnd(64, "0").slice(0, 64));
    if (!crypto.timingSafeEqual(tokBuf, expBuf)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Invalid session" }) };
    }
  }

  // ── Validate URL ───────────────────────────────────────────────────────────
  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid URL" }) };
  }
  const host = urlHost(safeUrl);
  const isLinkedIn = /linkedin\.com\/jobs/i.test(safeUrl);

  // ── Tier 1: Perplexity ─────────────────────────────────────────────────────
  const t1Start = Date.now();
  let perplexityResult;
  try {
    perplexityResult = await tryPerplexity(safeUrl, isLinkedIn);
  } catch (e) {
    perplexityResult = { ok: false, error: `exception_${e.message?.slice(0, 40) || "unknown"}` };
  }
  const t1Duration = Date.now() - t1Start;
  logAttempt({
    host,
    provider: "perplexity",
    success: perplexityResult.ok,
    durationMs: t1Duration,
    errorCode: perplexityResult.ok ? null : perplexityResult.error,
  });

  if (perplexityResult.ok) {
    console.log(`[fetch_jd] perplexity ok ${perplexityResult.text.length} chars, ${t1Duration}ms`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jd: perplexityResult.text.slice(0, 12000), provider: "perplexity" }),
    };
  }

  // ── Tier 2: ScrapingBee ────────────────────────────────────────────────────
  const t2Start = Date.now();
  let scrapingBeeResult;
  try {
    scrapingBeeResult = await tryScrapingBee(safeUrl);
  } catch (e) {
    scrapingBeeResult = { ok: false, error: `exception_${e.message?.slice(0, 40) || "unknown"}` };
  }
  const t2Duration = Date.now() - t2Start;
  logAttempt({
    host,
    provider: "scrapingbee",
    success: scrapingBeeResult.ok,
    durationMs: t2Duration,
    errorCode: scrapingBeeResult.ok ? null : scrapingBeeResult.error,
  });

  if (scrapingBeeResult.ok) {
    console.log(`[fetch_jd] scrapingbee ok ${scrapingBeeResult.text.length} chars, ${t2Duration}ms (perplexity=${perplexityResult.error})`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jd: scrapingBeeResult.text.slice(0, 12000), provider: "scrapingbee" }),
    };
  }

  // ── Both failed — clear, actionable error ─────────────────────────────────
  console.warn(`[fetch_jd] both providers failed perplexity=${perplexityResult.error} scrapingbee=${scrapingBeeResult.error}`);
  const linkedInHint = isLinkedIn
    ? " LinkedIn often blocks automated fetching — please paste the JD text directly, or use Share → Vetted from the LinkedIn app."
    : " Please paste the text directly.";
  return {
    statusCode: 422,
    headers,
    body: JSON.stringify({
      error: "Could not extract a job description from this URL." + linkedInHint,
    }),
  };
};
