const https = require("https");
const crypto = require("crypto");

// ─── parse-resume ─────────────────────────────────────────────────────────────
// Receives extracted resume text from the client, sends to Claude, returns
// structured profile JSON. Text extraction (PDF/TXT) happens client-side so
// this function never handles raw binary file data.

const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
];

const MAX_TEXT_BYTES = 40_000; // ~30k chars — enough for any resume

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

exports.handler = async function (event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
  }

  // ── Auth: shared-secret header check removed (was exposed in client bundle).
  // Per-user session token validation (HMAC of appleId) below is the auth layer.
  const serverSecret = process.env.VETTED_SECRET || "";

  // ── Parse body ──────────────────────────────────────────────────────────────
  let parsed;
  try { parsed = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { resumeText, appleId, sessionToken } = parsed;

  if (!appleId || !sessionToken || !resumeText) {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "Missing required fields" }) };
  }

  // ── Session token verification ───────────────────────────────────────────────
  if (serverSecret) {
    const expected = crypto.createHmac("sha256", serverSecret).update(appleId).digest("hex");
    if (!crypto.timingSafeEqual(
      Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64)),
      Buffer.from(expected.padEnd(64, "0").slice(0, 64))
    )) {
      return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Invalid session" }) };
    }
  }

  // ── Truncate to safe size ────────────────────────────────────────────────────
  const safeText = resumeText.slice(0, MAX_TEXT_BYTES);

  // ── Call Claude ──────────────────────────────────────────────────────────────
  const prompt = `Extract career profile information from the resume text below and return ONLY valid JSON with no markdown, no explanation.

Return exactly this shape (use empty string "" for missing fields, empty array [] for missing lists):
{
  "name": "",
  "currentTitle": "",
  "background": "",
  "careerGoal": "",
  "targetRoles": [],
  "targetIndustries": [],
  "compensationMin": "",
  "compensationTarget": "",
  "locationPrefs": [],
  "hardConstraints": ""
}

Rules:
- "background": 2–4 sentence summary of experience, seniority, and domain expertise
- "careerGoal": infer from trajectory if not explicit (e.g. "Path to COO/CEO in operations or supply chain")
- "targetRoles": 2–4 role titles that fit their background
- "targetIndustries": industries from their experience
- "compensationMin" / "compensationTarget": numbers only, no $ or commas (e.g. "180000"). Leave empty if not in resume.
- "locationPrefs": cities or regions mentioned; empty if remote/not specified
- "hardConstraints": any explicit constraints (relocation refusal, visa requirements, etc.)

RESUME:
${safeText}`;

  let anthropicRes;
  try {
    anthropicRes = await callAnthropic({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    console.error("Anthropic error:", err.message);
    return { statusCode: 502, headers: corsHeaders(origin), body: JSON.stringify({ error: "AI service unavailable" }) };
  }

  if (anthropicRes.status !== 200) {
    return { statusCode: 502, headers: corsHeaders(origin), body: JSON.stringify({ error: "AI parsing failed" }) };
  }

  // ── Parse Claude's response ──────────────────────────────────────────────────
  try {
    const data = JSON.parse(anthropicRes.body);
    const text = data.content?.map(b => (typeof b.text === "string" ? b.text : "")).join("") || "";
    const profile = JSON.parse(text.replace(/```json|```/g, "").trim());
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ profile }) };
  } catch (err) {
    console.error("Parse error:", err.message);
    return { statusCode: 422, headers: corsHeaders(origin), body: JSON.stringify({ error: "Could not parse resume structure" }) };
  }
};
