// ── cover-letter.js ──────────────────────────────────────────────────────
// Generates one opinionated cover-letter draft for the score-result Coach
// pill's Draft cover letter action. Single style — no A/B/C picker. Each
// regenerate call rerolls the same prompt with a fresh seed so the user
// gets variation without choosing a tone.
//
// POST body:
//   {
//     appleId, sessionToken,
//     role:    { title, company, verdict },
//     context: { strengths[], gaps[], narrative_bridge, honest_fit },
//     profile: { background, careerGoal },
//   }
// Response: { draft: string }
//
// Internal-only; CORS allows capacitor://localhost for the iOS WebView.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "https://vettedai.netlify.app",
  "https://app.vetted.ai",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsBase(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Vetted-Token",
  };
}
function jsonHeaders(origin) {
  return { ...corsBase(origin), "Content-Type": "application/json" };
}

export default async function handler(req) {
  const origin = req.headers.get("origin") || "";
  const headers = jsonHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsBase(origin) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 503, headers });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers }); }

  const { role = {}, context = {}, profile = {} } = body || {};

  // The single opinionated style — recognition-first, no fluff, ~140–180 words.
  // Lands the value proposition in the first sentence; uses one bridge line to
  // tie background to the role; closes with a concrete next step.
  const systemPrompt = `You are an executive career coach drafting cover letters
for senior professionals. Constraints:

- Open with one sentence of recognition — name the role and what stands out
  about it. No "I am writing to apply for…" phrasing.
- One paragraph (3–4 sentences) framing the candidate's background as the
  same operating model the role requires. Lead with the strongest signal.
- One short paragraph addressing the most material transfer challenge head-on,
  without softening. Confidence is the move.
- One closing sentence that proposes a specific next step (a conversation,
  a question, a shared connection — not a generic "I'd love to discuss").
- 140–180 words total. Editorial, not breathless. Serif-tone.
- Never use these phrases: "I'm passionate about", "thrilled to apply",
  "perfect fit", "rockstar", "10x", "synergy", "track record".`;

  const userPrompt = `Draft the cover letter.

ROLE
- Title: ${role.title || "Unknown role"}
- Company: ${role.company || "Unknown company"}
- Verdict: ${role.verdict || "monitor"}

CANDIDATE CONTEXT
- Strongest signals: ${(context.strengths || []).join("; ") || "none"}
- Material gaps: ${(context.gaps || []).join("; ") || "none"}
- Narrative bridge: ${context.narrative_bridge || "n/a"}
- Honest fit summary: ${context.honest_fit || "n/a"}

CANDIDATE BACKGROUND
- Background: ${profile.background || "n/a"}
- Stated career goal: ${profile.careerGoal || "n/a"}

Return ONLY the cover letter text — no preamble, no markdown, no signature.`;

  // Retry on transient errors (429 rate limit, 5xx server / overload).
  // Anthropic emits 529 ("Overloaded") under traffic spikes — a single
  // short retry usually clears it without burdening the user with the
  // raw status code.
  const RETRIABLE = new Set([429, 500, 502, 503, 504, 529]);
  const MAX_ATTEMPTS = 3;
  let lastStatus = 0;
  let lastDetail = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const apiRes = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Match the model used by other functions in this app
          // (anthropic.js, anthropic-stream.mjs, etc.). The previous
          // "claude-sonnet-4-5" alias was unrecognized by the API and
          // surfaced as a 401 to the client.
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          temperature: 0.7,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        const draft = data?.content?.[0]?.text?.trim() || "";
        if (!draft) {
          return new Response(JSON.stringify({ error: "Empty response from model" }), { status: 502, headers });
        }
        return new Response(JSON.stringify({ draft }), { status: 200, headers });
      }

      lastStatus = apiRes.status;
      lastDetail = (await apiRes.text().catch(() => "")).slice(0, 200);
      if (!RETRIABLE.has(apiRes.status) || attempt === MAX_ATTEMPTS - 1) break;
      // Backoff: 800ms → 1800ms → (stop). Linear is fine at this scale.
      await new Promise(r => setTimeout(r, 800 + attempt * 1000));
    } catch (err) {
      lastStatus = 0;
      lastDetail = err?.message || "network error";
      if (attempt === MAX_ATTEMPTS - 1) break;
      await new Promise(r => setTimeout(r, 800 + attempt * 1000));
    }
  }

  // Map common upstream failures to user-friendly messages. The
  // raw status still goes in `detail` for ops visibility.
  let friendly = "Couldn't reach the writer. Try again in a moment.";
  if (lastStatus === 429)                       friendly = "The drafting model is rate-limited. Try again in a moment.";
  else if (lastStatus === 529)                  friendly = "The drafting model is overloaded right now. Try again in a moment.";
  else if (lastStatus >= 500 && lastStatus < 600) friendly = "The drafting model is having a hiccup. Try again in a moment.";
  return new Response(
    JSON.stringify({ error: friendly, detail: `upstream ${lastStatus || "network"}: ${lastDetail}` }),
    { status: 502, headers }
  );
}
