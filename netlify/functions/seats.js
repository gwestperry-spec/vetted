// ─── Seats endpoint ────────────────────────────────────────────────────────
// Reached via: /api/seats?tier=<tier_id>
//
// Nothing in the Vetted app calls this — the endpoint exists solely to return
// a clean 200 and silence 404 noise from browser extensions (Honey, Capital
// One Shopping, etc.) that probe /api/seats on any subscription-priced site.
//
// If you ever want real seat-count tracking for "Limited Seats" founding-member
// tiers, query a Supabase count here and return { available, total }.

exports.handler = async () => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify({ available: null, total: null }),
});
