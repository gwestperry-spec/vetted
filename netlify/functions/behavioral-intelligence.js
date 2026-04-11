const https = require("https");
const crypto = require("crypto");

// ─── Allowed origins ───────────────────────────────────────────────────────
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
function supabaseRequest(method, path, body, preferHeader = "return=representation") {
  return new Promise((resolve, reject) => {
    const SUPABASE_URL = process.env.VT_DB_URL;
    const SUPABASE_KEY = process.env.VT_DB_KEY;
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
        "Prefer": preferHeader,
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

// ─── Claude API call ───────────────────────────────────────────────────────
function callClaude(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
    if (!ANTHROPIC_KEY) return reject(new Error("ANTHROPIC_KEY not configured"));

    const payload = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            return reject(new Error(`Claude API error ${res.statusCode}: ${parsed.error?.message || data}`));
          }
          const text = parsed.content?.map(b => b.text || "").join("") || "";
          resolve(text.trim());
        } catch (e) {
          reject(new Error(`Claude response parse error: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ─── Pattern detection ────────────────────────────────────────────────────
function detectPattern(opportunities, filterFramework, userProfile, userTier) {
  const now = Date.now();
  const MS_14_DAYS = 14 * 24 * 60 * 60 * 1000;
  const MS_7_DAYS  =  7 * 24 * 60 * 60 * 1000;

  const currentTitle = (userProfile.currentTitle || "").toLowerCase();

  // Sort filters by weight descending to find top-weighted filter
  const sortedFilters = [...filterFramework].sort((a, b) => (b.weight || 1) - (a.weight || 1));
  const topFilter = sortedFilters[0];

  // Pattern 1: framework_drift
  // Any Pursue verdict where the user's top-weighted filter scored <= 2.5
  const driftRoles = opportunities.filter(opp => {
    if (opp.recommendation !== "pursue") return false;
    if (!topFilter) return false;
    const fs = (opp.filter_scores || []).find(
      s => s.filter_id === topFilter.id || s.filter_name === (
        typeof topFilter.name === "string" ? topFilter.name : (topFilter.name?.en || "")
      )
    );
    return fs && fs.score <= 2.5;
  });

  if (driftRoles.length > 0) {
    const topFilterName = typeof topFilter.name === "string"
      ? topFilter.name
      : (topFilter.name?.en || topFilter.id || "top filter");
    return {
      pattern_type: "framework_drift",
      relevantRoles: driftRoles.slice(0, 3).map(o => ({
        role_title: o.role_title,
        company: o.company,
        overall_score: o.overall_score,
        recommendation: o.recommendation,
        topFilterScore: (o.filter_scores || []).find(
          s => s.filter_id === topFilter.id || s.filter_name === topFilterName
        )?.score,
      })),
      topFilterName,
    };
  }

  // Pattern 2: scope_creep
  // Role scored in past 14 days that appears 2+ levels below currentTitle
  const isDirectorPlus = /director|vp|vice president|chief|cxo|ceo|coo|cfo|cto|cmo/.test(currentTitle);
  const isManager = /\bmanager\b/.test(currentTitle) && !isDirectorPlus;

  const recentOpps = opportunities.filter(o => {
    const ts = o.scored_at ? new Date(o.scored_at).getTime() : (o.id && typeof o.id === "number" ? o.id : 0);
    return (now - ts) < MS_14_DAYS;
  });

  const scopeRoles = recentOpps.filter(opp => {
    const roleTitle = (opp.role_title || "").toLowerCase();
    if (isDirectorPlus && /\bmanager\b/.test(roleTitle)) return true;
    if (isManager && /coordinator|specialist/.test(roleTitle)) return true;
    return false;
  });

  if (scopeRoles.length > 0) {
    return {
      pattern_type: "scope_creep",
      relevantRoles: scopeRoles.slice(0, 3).map(o => ({
        role_title: o.role_title,
        company: o.company,
        overall_score: o.overall_score,
      })),
    };
  }

  // Patterns 3-5 are Vantage-only
  if (userTier !== "vantage" && userTier !== "vantage_lifetime") {
    return null;
  }

  // Pattern 3: application_score_misalignment
  // Any role marked applied (has applied_at) with overall_score < threshold
  const misalignedRoles = opportunities.filter(
    o => o.applied_at && o.overall_score < userProfile.threshold
  );

  if (misalignedRoles.length > 0) {
    return {
      pattern_type: "application_score_misalignment",
      relevantRoles: misalignedRoles.slice(0, 3).map(o => ({
        role_title: o.role_title,
        company: o.company,
        overall_score: o.overall_score,
        applied_at: o.applied_at,
      })),
    };
  }

  // Pattern 4: search_stagnation
  // No scores in past 7 days
  const recentAny = opportunities.some(o => {
    const ts = o.scored_at ? new Date(o.scored_at).getTime() : (o.id && typeof o.id === "number" ? o.id : 0);
    return (now - ts) < MS_7_DAYS;
  });

  if (!recentAny && opportunities.length > 0) {
    const lastOpp = opportunities[0]; // already ordered by most recent
    return {
      pattern_type: "search_stagnation",
      relevantRoles: [{
        role_title: lastOpp.role_title,
        company: lastOpp.company,
        scored_at: lastOpp.scored_at,
      }],
    };
  }

  // Pattern 5: positive_momentum
  // Most recently applied role is the user's highest VQ score to date
  const appliedOpps = opportunities.filter(o => o.applied_at).sort((a, b) => {
    return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
  });

  if (appliedOpps.length > 0) {
    const mostRecentApplied = appliedOpps[0];
    const maxScore = Math.max(...opportunities.map(o => o.overall_score || 0));
    if (mostRecentApplied.overall_score >= maxScore) {
      return {
        pattern_type: "positive_momentum",
        relevantRoles: [{
          role_title: mostRecentApplied.role_title,
          company: mostRecentApplied.company,
          overall_score: mostRecentApplied.overall_score,
          applied_at: mostRecentApplied.applied_at,
        }],
      };
    }
  }

  return null;
}

// ─── Handler ───────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";
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

  const { appleId, sessionToken, opportunities = [], filterFramework = [], userProfile = {}, userTier = "signal" } = body;

  if (!appleId || !sessionToken) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "appleId and sessionToken are required" }) };
  }

  // ── Verify session token ──────────────────────────────────────────────────
  const serverSecret = process.env.VETTED_SECRET;
  if (serverSecret) {
    const expectedToken = crypto
      .createHmac("sha256", serverSecret)
      .update(appleId)
      .digest("hex");
    const tokenBuf    = Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64));
    const expectedBuf = Buffer.from(expectedToken.padEnd(64, "0").slice(0, 64));
    if (!crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Invalid session" }) };
    }
  }

  // ── Idempotency: skip if insight was dismissed in the past 24 hours ───────
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dismissedRes = await supabaseRequest(
      "GET",
      `/behavioral_insights?apple_id=eq.${encodeURIComponent(appleId)}&dismissed_at=gte.${encodeURIComponent(since)}&order=dismissed_at.desc&limit=1`
    );
    if (dismissedRes.data && dismissedRes.data.length > 0) {
      console.log(`[behavioral-intelligence] skipping — dismissed within 24h for ${appleId.slice(0, 8)}...`);
      return { statusCode: 200, headers, body: JSON.stringify({ insight: null }) };
    }
  } catch (err) {
    // Non-fatal: if we can't check, proceed anyway
    console.warn("[behavioral-intelligence] idempotency check failed:", err.message);
  }

  // ── Detect pattern ────────────────────────────────────────────────────────
  const detected = detectPattern(opportunities, filterFramework, userProfile, userTier);
  if (!detected) {
    return { statusCode: 200, headers, body: JSON.stringify({ insight: null }) };
  }

  const { pattern_type, relevantRoles, topFilterName } = detected;

  // ── Build top 3 filters string ────────────────────────────────────────────
  const sortedFilters = [...filterFramework].sort((a, b) => (b.weight || 1) - (a.weight || 1));
  const topFilters = sortedFilters.slice(0, 3).map(f => {
    const name = typeof f.name === "string" ? f.name : (f.name?.en || f.id || "filter");
    return `${name} (${f.weight || 1}x)`;
  }).join(", ");

  // ── Call Claude ───────────────────────────────────────────────────────────
  const systemPrompt = `You are a career intelligence advisor embedded in the Vetted app. You have access to a user's recent job evaluation history. Your role is to observe patterns in their behavior — scoring patterns, application behavior, and alignment between their stated priorities and their actual choices — and surface one honest, specific observation. You are not a cheerleader. You are not harsh. You are the advisor who notices what the user might not want to see and says it anyway, with care. Speak directly. Use first person. Reference specific roles or scores by name where possible. Keep your observation to two to three sentences. End with one question or one specific action the user can take.

Tone: You are invested in this person's success. You are not neutral. You notice things. You say them clearly and without softening them into meaninglessness. You do not lecture. You do not congratulate unnecessarily. You speak like a trusted advisor who has been watching this search and has one thing they need to say today.`;

  const userMessage = `Pattern detected: ${pattern_type}
User profile: ${userProfile.currentTitle || "unknown title"}, threshold: ${userProfile.threshold || 3.5}
Relevant data: ${JSON.stringify(relevantRoles)}
Filter framework (top 3 weighted): ${topFilters}${topFilterName ? `\nTop-weighted filter: ${topFilterName}` : ""}

Generate one behavioral insight (2-3 sentences + one question or action).`;

  let insightText;
  try {
    insightText = await callClaude(systemPrompt, userMessage);
  } catch (err) {
    reportToSentry(err, "behavioral_intelligence_claude");
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to generate insight" }) };
  }

  const generated_at = new Date().toISOString();

  // ── Store in Supabase ─────────────────────────────────────────────────────
  try {
    await supabaseRequest("POST", "/behavioral_insights", {
      apple_id: appleId,
      pattern_type,
      insight_text: insightText,
      created_at: generated_at,
      dismissed_at: null,
      acted_on_at: null,
    });
  } catch (err) {
    // Non-fatal: still return the insight even if storage fails
    reportToSentry(err, "behavioral_intelligence_store");
    console.warn("[behavioral-intelligence] failed to store insight:", err.message);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ insight: insightText, pattern_type, generated_at }),
  };
};
