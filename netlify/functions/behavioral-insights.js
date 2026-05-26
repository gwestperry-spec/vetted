// ── behavioral-insights.js ───────────────────────────────────────────────
// Aggregates a single user's scored roles into the four cards rendered by
// the Behavioral Insights pod on Workspace:
//
//   1. Floor Margin    — avg pursue comp vs stated floor + count below
//   2. Filter Signal   — avg score per filter; flag lowest + count dragged
//   3. Preference Drift — % of pursues outside stated location/comp prefs
//   4. Synthesis        — scored this week, in pursue, pursue rate vs 4wk
//
// POST body: { appleId, sessionToken }
// Response shape:
//   {
//     eligible: boolean,                 // false if < 5 scored roles
//     floorMargin: { avgPursueComp, compFloor, belowFloorCount, pursueTotal, currency }
//                 | null,
//     filterSignal: { filters: [{id, name, avgScore}], laggingId, draggedCount }
//                 | null,
//     preferenceDrift: { driftPct, location: {stated, revealed}, comp: {stated, revealed} }
//                 | null,
//     synthesis: { scoredThisWeek, inPursueNow, pursueRatePct, pursueRateAvgPct }
//                 | null,
//   }
//
// Uses raw fetch against Supabase PostgREST — same pattern as the rest of
// the codebase (per Error 131 lesson, never use @supabase/supabase-js).

import crypto from "crypto";

const SB_URL = process.env.VT_DB_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.VT_DB_KEY || process.env.SUPABASE_SERVICE_KEY;

const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",
  "https://tryvettedai.com",
  "https://vettedai.netlify.app",
  "https://app.vetted.ai",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
];

const MIN_ROLES_FOR_INSIGHTS = 5;

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

async function sbGet(path) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`sbGet ${path} → ${res.status}`);
  return res.json();
}

// ─── Aggregation helpers ────────────────────────────────────────────────

function parseCompFromSnapshot(role) {
  // Source: role.framework_snapshot.filter_scores includes a comp filter if
  // the user has one. We also pull from role-level comp fields if present.
  // Fall back to null if no signal.
  const fs = role?.framework_snapshot;
  if (!fs) return null;
  // Pursued comp is the listed range midpoint if available; otherwise the
  // user's stated target. For v1 we use role.posted_comp_mid where set.
  if (typeof role.posted_comp_mid === "number") return role.posted_comp_mid;
  return null;
}

function inPursueStatus(role) {
  return role.status === "pursue" || role.framework_snapshot?.recommendation === "pursue";
}

function buildFloorMargin(roles, profile) {
  const compFloor = parseFloat(profile?.compensation_min || 0);
  if (!compFloor) return null;

  const pursued = roles.filter(inPursueStatus);
  if (pursued.length === 0) return null;

  const withComp = pursued
    .map((r) => parseCompFromSnapshot(r))
    .filter((n) => typeof n === "number" && !Number.isNaN(n));

  if (withComp.length === 0) {
    // No comp data on pursues; show floor only with zero margin
    return {
      avgPursueComp: compFloor,
      compFloor,
      belowFloorCount: 0,
      pursueTotal: pursued.length,
      currency: profile?.currency || "USD",
    };
  }

  const avg = withComp.reduce((a, b) => a + b, 0) / withComp.length;
  const below = withComp.filter((c) => c < compFloor).length;

  return {
    avgPursueComp: avg,
    compFloor,
    belowFloorCount: below,
    pursueTotal: pursued.length,
    currency: profile?.currency || "USD",
  };
}

function buildFilterSignal(roles, filters) {
  // Aggregate avg score per filter across last 30 days of scored roles
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = roles.filter((r) => new Date(r.created_at).getTime() > cutoff);
  if (recent.length === 0 || !filters?.length) return null;

  const sums = new Map();   // filter_id → { sum, count }
  for (const role of recent) {
    const fs = role?.framework_snapshot?.filter_scores || [];
    for (const item of fs) {
      const cur = sums.get(item.filter_id) || { sum: 0, count: 0 };
      cur.sum += Number(item.score) || 0;
      cur.count += 1;
      sums.set(item.filter_id, cur);
    }
  }

  const enriched = filters.slice(0, 10).map((f) => {
    const agg = sums.get(f.id);
    const avgScore = agg && agg.count > 0 ? agg.sum / agg.count : 0;
    return {
      id: f.id,
      name: typeof f.name === "object" ? (f.name.en || Object.values(f.name)[0]) : f.name,
      avgScore,
    };
  });

  if (enriched.every((f) => f.avgScore === 0)) return null;

  // Lagging filter = lowest avg
  const lagging = enriched.reduce((a, b) => (a.avgScore < b.avgScore ? a : b));

  // Dragged count = roles where this filter scored below 3.0 AND the role
  // was a Pursue or Monitor. Proxy for "this filter dragged the role down."
  let dragged = 0;
  for (const role of recent) {
    if (role.framework_snapshot?.recommendation === "pass") continue;
    const item = (role.framework_snapshot?.filter_scores || []).find(
      (i) => i.filter_id === lagging.id
    );
    if (item && Number(item.score) < 3.0) dragged += 1;
  }

  return {
    filters: enriched,
    laggingId: lagging.id,
    draggedCount: dragged,
  };
}

function buildPreferenceDrift(roles, profile) {
  const pursued = roles.filter(inPursueStatus);
  if (pursued.length === 0) return null;

  // Location drift
  const statedLocs = (profile?.location_prefs || [])
    .map((s) => String(s).toLowerCase().trim())
    .filter(Boolean);
  let outsideLocCount = 0;
  if (statedLocs.length > 0) {
    for (const r of pursued) {
      const loc = String(r.location || "").toLowerCase();
      const hit = statedLocs.some((s) => loc.includes(s));
      if (!hit) outsideLocCount += 1;
    }
  }

  const driftPct = statedLocs.length > 0 ? (outsideLocCount / pursued.length) * 100 : 0;

  // Comp drift — avg pursue comp vs stated floor
  const compFloor = parseFloat(profile?.compensation_min || 0);
  const withComp = pursued
    .map((r) => parseCompFromSnapshot(r))
    .filter((n) => typeof n === "number" && !Number.isNaN(n));
  const avgComp = withComp.length > 0
    ? withComp.reduce((a, b) => a + b, 0) / withComp.length
    : null;

  const symbol = (profile?.currency || "USD") === "EUR" ? "€"
              : (profile?.currency || "USD") === "GBP" ? "£" : "$";

  return {
    driftPct,
    location: {
      stated: statedLocs.length > 0
        ? statedLocs.map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase())).join(" · ")
        : null,
      revealed: outsideLocCount > 0
        ? `${outsideLocCount} of ${pursued.length} pursues outside`
        : "Aligned with stated",
    },
    comp: {
      stated: compFloor > 0
        ? `${symbol}${Math.round(compFloor / 1000)}K floor`
        : null,
      revealed: avgComp != null
        ? `${symbol}${Math.round(avgComp / 1000)}K avg pursued`
        : "No comp data on pursues",
    },
  };
}

function buildSynthesis(roles) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const inWeek = (r, weeksAgo) => {
    const t = new Date(r.created_at).getTime();
    return t > now - (weeksAgo + 1) * 7 * dayMs && t <= now - weeksAgo * 7 * dayMs;
  };

  const week0 = roles.filter((r) => inWeek(r, 0));
  const scoredThisWeek = week0.length;
  const inPursueNow = roles.filter(inPursueStatus).length;

  const pursueRate = (arr) => {
    if (arr.length === 0) return 0;
    const p = arr.filter(inPursueStatus).length;
    return (p / arr.length) * 100;
  };
  const thisWeekRate = pursueRate(week0);

  // Prior 4 weeks (excluding current week)
  let prior = [];
  for (let w = 1; w <= 4; w++) {
    const bucket = roles.filter((r) => inWeek(r, w));
    if (bucket.length > 0) prior.push(pursueRate(bucket));
  }
  const priorAvg = prior.length > 0 ? prior.reduce((a, b) => a + b, 0) / prior.length : null;

  return {
    scoredThisWeek,
    inPursueNow,
    pursueRatePct: thisWeekRate,
    pursueRateAvgPct: priorAvg,
  };
}

// ─── Handler ────────────────────────────────────────────────────────────

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
  if (!SB_URL || !SB_KEY) {
    console.error("[behavioral-insights] missing Supabase env vars");
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 503, headers });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers }); }

  const { appleId, sessionToken, filters: clientFilters } = body || {};

  // ── Session auth (mandatory) ────────────────────────────────────────────
  // Previously only checked !appleId. Returns sensitive behavioral data
  // (comp floor margins, location prefs, role patterns) — anyone with a
  // leaked/guessed appleId could pull this PII for any user. See ERROR_LOG 178.
  const serverSecret = process.env.VETTED_SECRET;
  if (!serverSecret) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers });
  }
  if (!appleId || !sessionToken) {
    return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers });
  }
  const expected = crypto.createHmac("sha256", serverSecret).update(appleId).digest("hex");
  const tokBuf   = Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64));
  const expBuf   = Buffer.from(expected.padEnd(64, "0").slice(0, 64));
  if (!crypto.timingSafeEqual(tokBuf, expBuf)) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 403, headers });
  }

  try {
    // Profile (for floor, prefs, currency)
    const profileRows = await sbGet(
      `/profiles?select=compensation_min,location_prefs,currency&apple_id=eq.${encodeURIComponent(appleId)}&limit=1`
    );
    const profile = profileRows[0] || {};

    // Scored roles last 90 days (covers Synthesis 4-week + everything else)
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const roles = await sbGet(
      `/workspace_roles?select=role_id,vq_score,status,location,framework_snapshot,created_at,updated_at,applied_at,posted_comp_mid&apple_id=eq.${encodeURIComponent(appleId)}&created_at=gte.${cutoff90}&vq_score=not.is.null&order=created_at.desc`
    );

    const eligible = roles.length >= MIN_ROLES_FOR_INSIGHTS;
    if (!eligible) {
      return new Response(JSON.stringify({ eligible: false }), { status: 200, headers });
    }

    const result = {
      eligible: true,
      floorMargin:      buildFloorMargin(roles, profile),
      filterSignal:     buildFilterSignal(roles, clientFilters || []),
      preferenceDrift:  buildPreferenceDrift(roles, profile),
      synthesis:        buildSynthesis(roles),
    };

    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (err) {
    console.error("[behavioral-insights] error:", err.message);
    return new Response(JSON.stringify({ error: "Aggregation failed", detail: err.message }), { status: 500, headers });
  }
}
