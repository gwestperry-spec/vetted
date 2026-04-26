// ─── fetch-jd — Extract job description from any URL via Perplexity Sonar ─────
// Called when a user pastes a URL (LinkedIn, Indeed, any board) into the
// unified input strip. Returns extracted JD text for Claude to score.

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

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Perplexity not configured" }) };
  }

  // ── Call Perplexity Sonar ──────────────────────────────────────────────────
  const isLinkedIn = (url) => /linkedin\.com\/jobs/i.test(url);

  try {
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
          content: isLinkedIn(safeUrl)
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
      console.error("[fetch_jd] Perplexity error", result.status, JSON.stringify(result.data?.error));
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not reach Perplexity" }) };
    }

    const text = result.data?.choices?.[0]?.message?.content?.trim() || "";

    if (!text || text === "FETCH_FAILED" || text.length < 80) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ error: "Could not extract a job description from this URL. Please paste the text directly." }),
      };
    }

    console.log(`[fetch_jd] extracted ${text.length} chars from ${safeUrl.slice(0, 60)}`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jd: text.slice(0, 12000) }),
    };

  } catch (err) {
    console.error("[fetch_jd]", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal error" }) };
  }
};
