// ─── market-pulse — Real-time market intelligence via Perplexity Sonar ────────
// lang is passed from the client so Sonar responds in the user's language.
// Replaces the Claude-based market brief in MarketPulse.jsx.
// Perplexity Sonar has live web access, making demand outlook, skill premiums,
// and timing intelligence current rather than training-data estimates.
//
// Request body: { title, salaryMin, salaryMax, salaryMedian, salarySource,
//                 occupationTitle, background, targetIndustries,
//                 appleId, sessionToken }
// Response: { demand_outlook, in_demand_skills, timing_intel, comp_context }

const https  = require("https");
const crypto = require("crypto");
const { sanitizeTitle }                          = require("./sanitizeTitle");
const { sanitizePromptField, sanitizeStringArray, MAX_LENGTHS } = require("./sanitizePromptField");

// ── In-memory IP rate limiting ─────────────────────────────────────────────
// Limits each IP to MAX_CALLS per WINDOW_MS to prevent token depletion abuse.
const IP_RATE_MAP   = new Map();
const WINDOW_MS     = 60 * 1000;  // 1-minute rolling window
const MAX_CALLS     = 8;          // max 8 requests per IP per minute

function checkRateLimit(ip) {
  const now  = Date.now();
  const entry = IP_RATE_MAP.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > WINDOW_MS) {
    // New window
    IP_RATE_MAP.set(ip, { count: 1, windowStart: now });
    return false; // not limited
  }
  if (entry.count >= MAX_CALLS) return true; // limited
  entry.count++;
  IP_RATE_MAP.set(ip, entry);
  return false;
}

const LANG_NAMES = {
  en: "English", es: "Spanish", zh: "Chinese",
  fr: "French",  ar: "Arabic",  vi: "Vietnamese",
};

// Extract domain from a URL for readable source labels
function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

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
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

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

  const {
    title, salaryMin, salaryMax, salaryMedian, salarySource, occupationTitle,
    background, targetIndustries, lang, appleId, sessionToken,
  } = body;

  const langName    = LANG_NAMES[lang] || "English";
  const langInstruction = langName !== "English"
    ? ` Respond entirely in ${langName}. All JSON string values must be written in ${langName}.`
    : "";

  // ── Session auth ───────────────────────────────────────────────────────────
  const serverSecret = process.env.VETTED_SECRET;
  if (serverSecret && appleId && sessionToken) {
    const expected = crypto.createHmac("sha256", serverSecret).update(appleId).digest("hex");
    const tokBuf   = Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64));
    const expBuf   = Buffer.from(expected.padEnd(64, "0").slice(0, 64));
    if (!crypto.timingSafeEqual(tokBuf, expBuf)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Invalid session" }) };
    }
  }

  if (!title) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "title required" }) };
  }

  // ── Sanitize title — blocks injection, oversize input, and garbage strings ──
  const sanitized = sanitizeTitle(title);
  if (!sanitized.ok) {
    console.warn("[market_pulse] sanitizeTitle rejected:", sanitized.reason, String(title).slice(0, 80));
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid title", reason: sanitized.reason }) };
  }
  const safeTitle = sanitized.title;

  // ── IP rate limiting ────────────────────────────────────────────────────────
  const clientIp = event.headers?.["x-nf-client-connection-ip"]
    || event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim()
    || "unknown";
  if (checkRateLimit(clientIp)) {
    console.warn("[market_pulse] rate limited:", clientIp);
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests. Please wait a moment." }) };
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Perplexity not configured" }) };
  }

  // ── Build prompt ───────────────────────────────────────────────────────────
  // Sanitize all user-controlled fields before embedding in Perplexity prompt
  const safeBackground      = sanitizePromptField(background || "Senior executive", MAX_LENGTHS.long);
  const safeIndustriesArray = sanitizeStringArray(targetIndustries, 10, MAX_LENGTHS.short);
  const industriesText      = safeIndustriesArray.join(", ") || "Not specified";

  const salaryContext = salaryMedian
    ? `BLS benchmark: $${salaryMin?.toLocaleString()}–$${salaryMax?.toLocaleString()} (median $${salaryMedian?.toLocaleString()}), source: ${salarySource}, occupation match: ${occupationTitle}`
    : "No salary benchmark available";

  const userPrompt = `You are a labor market analyst with access to real-time hiring data. Write a concise, factual market intelligence brief for a senior professional considering roles as: ${safeTitle}.

Context:
- ${salaryContext}
- Candidate background: ${safeBackground}
- Target industries: ${industriesText}

Search for current hiring trends, recent demand signals, skill premiums, and market timing for this role type. Use only information from the past 3–6 months where available.

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "demand_outlook": "2–3 sentences on current hiring demand and trajectory. Cite specific trends, recent layoffs or hiring waves, or sector momentum you found.",
  "in_demand_skills": "2–3 skills currently commanding premium compensation for this title based on current postings.",
  "timing_intel": "1–2 sentences on whether now is a strong or weak moment to be in market for this role type, based on current conditions.",
  "comp_context": "1–2 sentences on how the salary range compares to current market and what drives the top of the range right now."
}`;

  const payload = JSON.stringify({
    model: "sonar",
    messages: [
      {
        role: "system",
        content: `You are a precise labor market analyst. Always respond with valid JSON only — no markdown fences, no commentary. Keep inline citation numbers like [1] where they appear. Use your web search access to ground your answer in current data from the past 3–6 months.${langInstruction}`,
      },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 600,
    temperature: 0.2,
    search_recency_filter: "month",
    return_citations: true,
  });

  // ── Call Perplexity Sonar ──────────────────────────────────────────────────
  try {
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
          res.on("data", (chunk) => { data += chunk; });
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
      console.error("[market_pulse] Perplexity error", result.status, JSON.stringify(result.data?.error));
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Market data unavailable" }) };
    }

    const text = result.data?.choices?.[0]?.message?.content?.trim() || "";
    if (!text) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Empty response from Perplexity" }) };
    }

    // Strip any markdown fences if model ignores instruction
    const cleaned = text.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[market_pulse] JSON parse failed:", cleaned.slice(0, 200));
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not parse market data" }) };
    }

    // Extract citations array and annotate with readable domain labels
    const rawCitations = result.data?.citations || [];
    const citations = rawCitations.map((url, i) => ({
      index: i + 1,
      url,
      domain: getDomain(url),
    }));

    console.log(`[market_pulse] OK for title="${safeTitle.slice(0, 40)}" lang=${langName} citations=${citations.length}`);
    return { statusCode: 200, headers, body: JSON.stringify({ ...parsed, citations }) };

  } catch (err) {
    console.error("[market_pulse]", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal error" }) };
  }
};
