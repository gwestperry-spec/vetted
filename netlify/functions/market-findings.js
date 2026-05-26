// ─── market-findings — Live findings card-list via Perplexity Sonar ──────────
// Powers the "Live findings" section of the Build-30 MarketPulseV2 surface.
// Queries Sonar against the user's target roles, industries, and locations
// for recent comp shifts, hiring waves, benchmarks, and supply moves.
//
// Request body:
//   {
//     targetRoles:       string[]  (e.g. ["VP Ops", "Head of GTM Ops"])
//     targetIndustries:  string[]  (e.g. ["B2B SaaS", "DevTools"])
//     locations:         string[]  (e.g. ["Remote", "NYC"])
//     lang:              string    (e.g. "en")
//     appleId, sessionToken
//   }
//
// Response:
//   { findings: [
//       { source: "ROBERT HALF" | "PERPLEXITY · SONAR" | "BLS · SOII",
//         tag:    "COMP" | "HIRING" | "BENCHMARK" | "SUPPLY",
//         age:    "3D AGO" | "2W AGO" | …,
//         h:      string  (headline; <= 90 chars)
//         b:      string  (body; 1–2 sentences) },
//       … 3–5 items
//   ] }

const https  = require("https");
const crypto = require("crypto");
const { sanitizePromptField, sanitizeStringArray, MAX_LENGTHS } = require("./sanitizePromptField");

// ── In-memory IP rate limiting ────────────────────────────────────────────
const IP_RATE_MAP = new Map();
const WINDOW_MS   = 60 * 1000;
const MAX_CALLS   = 6; // tighter than market-pulse — heavier downstream cost

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = IP_RATE_MAP.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > WINDOW_MS) {
    IP_RATE_MAP.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= MAX_CALLS) return true;
  entry.count++;
  IP_RATE_MAP.set(ip, entry);
  return false;
}

const LANG_NAMES = {
  en: "English", es: "Spanish", zh: "Chinese",
  fr: "French",  ar: "Arabic",  vi: "Vietnamese", pt: "Portuguese",
};

const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "https://vettedai.netlify.app",
  "https://app.vetted.ai",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin":  allowed,
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type":                  "application/json",
  };
}

// ── Tag normalization ─────────────────────────────────────────────────────
// Map free-text Sonar tag values into the four canonical tags the UI knows
// how to tint. Anything unrecognized falls back to COMP.
function normalizeTag(t) {
  const v = String(t || "").trim().toUpperCase();
  if (["COMP", "HIRING", "BENCHMARK", "SUPPLY"].includes(v)) return v;
  if (v.includes("COMP") || v.includes("SALARY") || v.includes("PAY")) return "COMP";
  if (v.includes("HIRING") || v.includes("ROLES") || v.includes("OPEN"))  return "HIRING";
  if (v.includes("BENCH") || v.includes("MEDIAN"))                       return "BENCHMARK";
  if (v.includes("SUPPLY") || v.includes("LAYOFF") || v.includes("COMPETITION")) return "SUPPLY";
  return "COMP";
}

// Normalize source labels to the three brand-display variants used by the UI.
function normalizeSource(s) {
  const v = String(s || "").trim().toUpperCase();
  if (v.includes("ROBERT HALF"))          return "ROBERT HALF";
  if (v.includes("BLS"))                  return "BLS · SOII";
  if (v.includes("PERPLEXITY") || v.includes("SONAR")) return "PERPLEXITY · SONAR";
  // Default to Sonar for free-form web findings.
  return "PERPLEXITY · SONAR";
}

// "3D AGO" / "2W AGO" / "5MO AGO" — accept ISO strings too.
function normalizeAge(a) {
  const v = String(a || "").trim().toUpperCase();
  if (/^\d+(D|W|MO|H)\s*AGO$/.test(v)) return v;
  // Try parsing as ISO date.
  const parsed = Date.parse(a);
  if (!Number.isNaN(parsed)) {
    const days = Math.max(0, Math.round((Date.now() - parsed) / (24 * 3600 * 1000)));
    if (days < 1)  return "TODAY";
    if (days < 7)  return `${days}D AGO`;
    if (days < 30) return `${Math.round(days / 7)}W AGO`;
    return `${Math.round(days / 30)}MO AGO`;
  }
  return v || "RECENT";
}

// Truncate strings to keep cards readable.
function clip(s, max) {
  const t = String(s || "").trim();
  return t.length > max ? t.slice(0, max - 1).trim() + "…" : t;
}

// ── Handler ───────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin  = event.headers?.origin || event.headers?.Origin || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { targetRoles, targetIndustries, locations, lang, appleId, sessionToken } = body || {};
  const langName        = LANG_NAMES[lang] || "English";
  const langInstruction = langName !== "English"
    ? ` Respond entirely in ${langName}. All JSON string values must be written in ${langName}.`
    : "";

  // ── Session auth (mandatory) ────────────────────────────────────────────
  // Previously opt-in with a swallow-and-bypass try/catch — see ERROR_LOG 175.
  const serverSecret = process.env.VETTED_SECRET;
  if (!serverSecret) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server misconfigured" }) };
  }
  if (!appleId || !sessionToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Authentication required" }) };
  }
  const expected = crypto.createHmac("sha256", serverSecret).update(appleId).digest("hex");
  const tokBuf   = Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64));
  const expBuf   = Buffer.from(expected.padEnd(64, "0").slice(0, 64));
  if (!crypto.timingSafeEqual(tokBuf, expBuf)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Invalid session" }) };
  }

  // ── IP rate limiting ────────────────────────────────────────────────────
  const clientIp = event.headers?.["x-nf-client-connection-ip"]
    || event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim()
    || "unknown";
  if (checkRateLimit(clientIp)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests. Please wait a moment." }) };
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Perplexity not configured" }) };
  }

  // ── Build prompt — Sonar likes a tight, JSON-only contract ─────────────
  const roles      = sanitizeStringArray(targetRoles,      8, MAX_LENGTHS.short);
  const industries = sanitizeStringArray(targetIndustries, 8, MAX_LENGTHS.short);
  const metros     = sanitizeStringArray(locations,        8, MAX_LENGTHS.short);

  // Even if the client passes nothing, we still surface ambient market
  // findings. Just don't pollute the prompt with empty arrays.
  const rolesText      = roles.length      ? roles.join(", ")      : "senior operations / GTM leadership";
  const industriesText = industries.length ? industries.join(", ") : "B2B SaaS, DevTools, post-IPO tech";
  const metrosText     = metros.length     ? metros.join(", ")     : "NYC, SF, remote";

  const systemPrompt = `You are a labor-market intelligence editor for senior professionals. Always respond with valid JSON only — no markdown fences, no commentary. Use your web search access to ground each finding in current data from the past 3–4 weeks where possible.${langInstruction}`;

  const userPrompt = `Compile 4 short, distinct market findings for a senior candidate targeting:
- Roles: ${rolesText}
- Industries: ${industriesText}
- Metros: ${metrosText}

Each finding must be a real, recent (within ~30 days) signal — a comp shift, hiring move, benchmark update, or supply-side change relevant to this candidate's market. Cite specific companies / sources / numbers where you have them.

Return ONLY valid JSON in this exact shape:
{
  "findings": [
    {
      "tag":    "COMP" | "HIRING" | "BENCHMARK" | "SUPPLY",
      "source": "ROBERT HALF" | "BLS · SOII" | "PERPLEXITY · SONAR",
      "age":    "3D AGO" | "1W AGO" | "2W AGO" | "1MO AGO",
      "h":      "1-sentence headline (<= 80 chars). Sentence case.",
      "b":      "1-2 sentence body. Plain, specific, factual."
    }
  ]
}

Mix the four tags across the four findings — don't return four COMP cards. Aim for one each of COMP, HIRING, BENCHMARK, SUPPLY when possible. The audience is a senior operator who already has context.`;

  const payload = JSON.stringify({
    model: "sonar",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt },
    ],
    max_tokens: 800,
    temperature: 0.25,
    search_recency_filter: "month",
    return_citations: true,
  });

  // ── Call Perplexity Sonar ──────────────────────────────────────────────
  try {
    const result = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.perplexity.ai",
          path: "/chat/completions",
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type":   "application/json",
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
      console.error("[market_findings] Perplexity error", result.status, JSON.stringify(result.data?.error));
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Market findings unavailable" }) };
    }

    const text = result.data?.choices?.[0]?.message?.content?.trim() || "";
    if (!text) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Empty response from Perplexity" }) };
    }

    const cleaned = text.replace(/```json|```/g, "").trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch {
      console.error("[market_findings] JSON parse failed:", cleaned.slice(0, 200));
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not parse findings" }) };
    }

    const rawFindings = Array.isArray(parsed?.findings) ? parsed.findings : [];
    const findings = rawFindings
      .slice(0, 6)
      .map((f) => ({
        tag:    normalizeTag(f?.tag),
        source: normalizeSource(f?.source),
        age:    normalizeAge(f?.age),
        h:      clip(f?.h, 110),
        b:      clip(f?.b, 280),
      }))
      .filter((f) => f.h && f.b);

    if (!findings.length) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "No usable findings" }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ findings }) };
  } catch (err) {
    console.error("[market_findings] fetch failed:", err?.message || err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Findings call failed" }) };
  }
};
