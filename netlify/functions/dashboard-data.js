// ─── dashboard-data — internal founder KPI dashboard backend ──────────────────
// Auth: requires X-Dashboard-Password header matching DASHBOARD_PASSWORD env.
// Queries Supabase + Stripe + PostHog in parallel; returns one JSON payload.
// Each provider fails independently — UI shows nulls/labels for missing data.

const https = require("https");

// ─── tiny https helpers ───────────────────────────────────────────────────────
function httpsRequest({ hostname, path, method = "GET", headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const opts = { hostname, path, method, headers };
    if (body) opts.headers["Content-Length"] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null, raw: data, headers: res.headers }); }
        catch { resolve({ status: res.statusCode, data: null, raw: data, headers: res.headers }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── Supabase REST (PostgREST) ───────────────────────────────────────────────
const SB_URL = process.env.VT_DB_URL;
const SB_KEY = process.env.VT_DB_KEY;

async function sbCount(path) {
  if (!SB_URL || !SB_KEY) return null;
  const url = new URL(path, SB_URL);
  const res = await httpsRequest({
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: "HEAD",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: "count=exact", "Range-Unit": "items", Range: "0-0" },
  });
  const cr = res.headers?.["content-range"];
  if (!cr) return null;
  const m = cr.match(/\/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

async function sbSelect(path) {
  if (!SB_URL || !SB_KEY) return null;
  const url = new URL(path, SB_URL);
  const res = await httpsRequest({
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: "GET",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (res.status >= 400) return null;
  return res.data;
}

async function fetchSupabase() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run independent counts in parallel.
  const [
    totalProfiles,
    paidProfiles,
    profilesNew7d,
    profilesActive7d,
    profilesOlderThan7d,
    totalScores,
    scores7d,
    recentOpps,
  ] = await Promise.all([
    sbCount("/rest/v1/profiles?select=apple_id"),
    sbCount("/rest/v1/profiles?select=apple_id&tier=neq.free"),
    sbCount(`/rest/v1/profiles?select=apple_id&created_at=gt.${sevenDaysAgo}`),
    sbCount(`/rest/v1/profiles?select=apple_id&updated_at=gt.${sevenDaysAgo}`),
    sbCount(`/rest/v1/profiles?select=apple_id&created_at=lt.${sevenDaysAgo}`),
    sbCount("/rest/v1/opportunities?select=id"),
    sbCount(`/rest/v1/opportunities?select=id&created_at=gt.${sevenDaysAgo}`),
    sbSelect(`/rest/v1/opportunities?select=apple_id&created_at=gt.${sevenDaysAgo}&limit=10000`),
    // Tier breakdown handled below as separate queries.
  ]);

  // Distinct active scorers in last 7d.
  let activeScorers7d = null;
  let avgScoresPerActiveUser = null;
  if (Array.isArray(recentOpps)) {
    const distinct = new Set(recentOpps.map((r) => r.apple_id).filter(Boolean));
    activeScorers7d = distinct.size;
    if (distinct.size > 0 && typeof scores7d === "number") {
      avgScoresPerActiveUser = +(scores7d / distinct.size).toFixed(2);
    }
  }

  // Profiles with at least one opportunity (first-score rate proxy).
  // Use a distinct apple_id query on opportunities, capped.
  const allScorers = await sbSelect("/rest/v1/opportunities?select=apple_id&limit=20000");
  let profilesWithAtLeastOneScore = null;
  if (Array.isArray(allScorers)) {
    profilesWithAtLeastOneScore = new Set(allScorers.map((r) => r.apple_id).filter(Boolean)).size;
  }

  // Tier breakdown from profiles table.
  const tierFields = ["free", "signal", "vantage", "signal_lifetime", "vantage_lifetime"];
  const tierCounts = {};
  await Promise.all(
    tierFields.map(async (t) => {
      tierCounts[t] = await sbCount(`/rest/v1/profiles?select=apple_id&tier=eq.${t}`);
    })
  );

  return {
    ok: SB_URL && SB_KEY ? true : false,
    totalProfiles,
    paidProfiles,
    profilesNew7d,
    profilesActive7d,
    profilesOlderThan7d,
    totalScores,
    scores7d,
    activeScorers7d,
    avgScoresPerActiveUser,
    profilesWithAtLeastOneScore,
    tierCounts,
    cancelledLast30d: null, // sourced from Stripe
    sevenDaysAgo,
    thirtyDaysAgo,
  };
}

// ─── Stripe ───────────────────────────────────────────────────────────────────
async function stripeGet(path) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const res = await httpsRequest({
    hostname: "api.stripe.com",
    path: `/v1${path}`,
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.status >= 400) return null;
  return res.data;
}

async function fetchStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, reason: "no STRIPE_SECRET_KEY" };

  // Active subscriptions — paginate up to 300 (3 pages).
  let allActive = [];
  let starting_after = null;
  for (let i = 0; i < 3; i++) {
    const qs = `limit=100${starting_after ? `&starting_after=${starting_after}` : ""}`;
    const page = await stripeGet(`/subscriptions?status=active&${qs}`);
    if (!page || !Array.isArray(page.data)) break;
    allActive = allActive.concat(page.data);
    if (!page.has_more) break;
    starting_after = page.data[page.data.length - 1]?.id;
    if (!starting_after) break;
  }

  // Compute MRR — sum of all recurring item amounts (in cents).
  let mrrCents = 0;
  const tierBreakdown = { signal: 0, vantage: 0, other: 0 };
  for (const sub of allActive) {
    for (const item of sub.items?.data || []) {
      const price = item.price;
      if (!price) continue;
      const interval = price.recurring?.interval;
      const qty = item.quantity || 1;
      const amount = price.unit_amount || 0;
      let monthly = 0;
      if (interval === "month") monthly = amount * qty;
      else if (interval === "year") monthly = (amount * qty) / 12;
      mrrCents += monthly;

      if (price.id === process.env.STRIPE_SIGNAL_PRICE_ID) tierBreakdown.signal += 1;
      else if (price.id === process.env.STRIPE_VANTAGE_PRICE_ID) tierBreakdown.vantage += 1;
      else tierBreakdown.other += 1;
    }
  }

  // Cancelled in last 30 days.
  const cutoff = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  let cancelledCount = 0;
  starting_after = null;
  for (let i = 0; i < 3; i++) {
    const qs = `limit=100&status=canceled&${starting_after ? `starting_after=${starting_after}&` : ""}`;
    const page = await stripeGet(`/subscriptions?${qs}`);
    if (!page || !Array.isArray(page.data)) break;
    for (const sub of page.data) {
      if (sub.canceled_at && sub.canceled_at >= cutoff) cancelledCount += 1;
    }
    if (!page.has_more) break;
    starting_after = page.data[page.data.length - 1]?.id;
    if (!starting_after) break;
  }

  return {
    ok: true,
    mrrUsd: +(mrrCents / 100).toFixed(2),
    activeSubscriptions: allActive.length,
    tierBreakdown,
    cancelledLast30d: cancelledCount,
  };
}

// ─── PostHog (graceful skip if not configured) ────────────────────────────────
async function fetchPostHog() {
  const key = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!key || !projectId) return { ok: false, reason: "POSTHOG_API_KEY / POSTHOG_PROJECT_ID not set" };

  const eventsCount = async (event, days = 7) => {
    const after = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const path = `/api/projects/${projectId}/events/?event=${encodeURIComponent(event)}&after=${encodeURIComponent(after)}&limit=1`;
    const res = await httpsRequest({
      hostname: "us.i.posthog.com",
      path,
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.status >= 400) return null;
    return res.data?.results?.length ?? null;
  };

  // Lightweight presence checks; full counts would need /trend/ insights.
  const [pageviews, scoreSubmitted] = await Promise.all([
    eventsCount("$pageview"),
    eventsCount("score_submitted"),
  ]);

  return {
    ok: true,
    sessions7d: pageviews, // approximate (events, not unique sessions)
    scoreSubmitted7d: scoreSubmitted,
    crashFreeRate: null, // requires Sentry or PostHog session-replay setup
  };
}

// ─── handler ──────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const cors = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const provided = event.headers["x-dashboard-password"] || event.headers["X-Dashboard-Password"];
  if (!provided || provided !== process.env.DASHBOARD_PASSWORD) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // Run providers in parallel; each catches its own errors.
  const [supabase, stripe, posthog] = await Promise.all([
    fetchSupabase().catch((e) => ({ ok: false, error: e.message })),
    fetchStripe().catch((e) => ({ ok: false, error: e.message })),
    fetchPostHog().catch((e) => ({ ok: false, error: e.message })),
  ]);

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      generatedAt: new Date().toISOString(),
      supabase,
      stripe,
      posthog,
    }),
  };
};
