const https = require("https");

// ─── Supabase REST client (no SDK — pure https) ───────────────────────────
const SUPABASE_URL = process.env.VT_DB_URL;
const SUPABASE_KEY = process.env.VT_DB_KEY;

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
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

// ─── CORS headers ─────────────────────────────────────────────────────────
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

// ─── Operations ───────────────────────────────────────────────────────────

// Load full user state on sign-in
async function loadUserData(appleId) {
  const [profileRes, filtersRes, oppsRes] = await Promise.all([
    supabaseRequest("GET", `/profiles?apple_id=eq.${encodeURIComponent(appleId)}&limit=1`),
    supabaseRequest("GET", `/filter_frameworks?apple_id=eq.${encodeURIComponent(appleId)}&order=sort_order.asc`),
    supabaseRequest("GET", `/opportunities?apple_id=eq.${encodeURIComponent(appleId)}&order=scored_at.desc&limit=50`),
  ]);

  const profile = profileRes.data?.[0] || null;
  const filters = filtersRes.data || [];
  const opportunities = oppsRes.data || [];

  return { profile, filters, opportunities };
}

// Upsert profile (create or update)
async function saveProfile(appleId, profileData) {
  const row = {
    apple_id: appleId,
    email: profileData.email || null,
    display_name: profileData.displayName || null,
    current_title: profileData.currentTitle || null,
    background: profileData.background || null,
    career_goal: profileData.careerGoal || null,
    target_roles: profileData.targetRoles || [],
    target_industries: profileData.targetIndustries || [],
    compensation_min: profileData.compensationMin ? parseInt(profileData.compensationMin) : null,
    compensation_target: profileData.compensationTarget ? parseInt(profileData.compensationTarget) : null,
    location_prefs: profileData.locationPrefs || [],
    hard_constraints: profileData.hardConstraints || null,
    threshold: profileData.threshold || 3.5,
    lang: profileData.lang || "en",
  };

  return supabaseRequest(
    "POST",
    "/profiles?on_conflict=apple_id",
    row
  );
}

// Save full filter framework (replace all filters for user)
async function saveFilters(appleId, filters) {
  // Delete existing filters first
  await supabaseRequest("DELETE", `/filter_frameworks?apple_id=eq.${encodeURIComponent(appleId)}`);

  if (!filters.length) return { status: 200, data: [] };

  const rows = filters.map((f, idx) => ({
    apple_id: appleId,
    filter_id: f.id,
    name: typeof f.name === "string" ? { en: f.name } : f.name,
    description: typeof f.description === "string" ? { en: f.description } : f.description,
    weight: f.weight || 1.0,
    is_core: f.isCore || false,
    sort_order: idx,
  }));

  return supabaseRequest("POST", "/filter_frameworks", rows);
}

// Save a single scored opportunity
async function saveOpportunity(appleId, opp) {
  const row = {
    apple_id: appleId,
    role_title: opp.role_title,
    company: opp.company,
    overall_score: opp.overall_score,
    recommendation: opp.recommendation,
    recommendation_rationale: opp.recommendation_rationale || null,
    filter_scores: opp.filter_scores || [],
    strengths: opp.strengths || [],
    gaps: opp.gaps || [],
    narrative_bridge: opp.narrative_bridge || null,
    honest_fit_summary: opp.honest_fit_summary || null,
    jd: opp.jd || null,
  };

  return supabaseRequest("POST", "/opportunities", row);
}

// Delete a single opportunity
async function deleteOpportunity(appleId, oppId) {
  return supabaseRequest(
    "DELETE",
    `/opportunities?apple_id=eq.${encodeURIComponent(appleId)}&id=eq.${encodeURIComponent(oppId)}`
  );
}

// ─── Handler ──────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Secret token validation
  const clientToken = event.headers?.["x-vetted-token"] || event.headers?.["X-Vetted-Token"] || "";
  const serverSecret = process.env.VETTED_SECRET || "";
  const crypto = require("crypto");
  if (serverSecret && !crypto.timingSafeEqual(
    Buffer.from(clientToken.padEnd(64, "0").slice(0, 64)),
    Buffer.from(serverSecret.padEnd(64, "0").slice(0, 64))
  )) {
    return { statusCode: 403, headers: corsHeaders(origin), body: JSON.stringify({ error: "Forbidden" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { action, appleId } = body;

  if (!action || !appleId) {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: "action and appleId required" }) };
  }

  try {
    let result;

    switch (action) {
      case "load":
        result = await loadUserData(appleId);
        break;

      case "saveProfile":
        result = await saveProfile(appleId, body.profile);
        break;

      case "saveFilters":
        result = await saveFilters(appleId, body.filters);
        break;

      case "saveOpportunity":
        result = await saveOpportunity(appleId, body.opportunity);
        break;

      case "deleteOpportunity":
        result = await deleteOpportunity(appleId, body.opportunityId);
        break;

      default:
        return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({ success: true, data: result?.data || result }),
    };

  } catch (err) {
    console.error("Supabase function error:", err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: err.message }),
    };
  }
};
