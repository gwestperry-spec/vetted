// ─── workspace-sweep — clean up stuck "Scoring…" rows ─────────────────────────
// Deletes rows from workspace_roles where:
//   - status ∈ (queued, scoring, in_progress, pending)
//   - created_at < now() - 5 minutes
//   - vq_score IS NULL                ← belt-and-suspenders: never delete a
//                                       row that successfully scored.
//
// Runs on a cron schedule (hourly) and can also be invoked manually via
// HTTP POST with the X-Vetted-Sweep-Secret header set to VETTED_SECRET.
//
// Idempotent — deleting already-gone rows is a no-op. Logs the count.

const https = require("https");

const STALE_STATUSES = ["queued", "scoring", "in_progress", "pending"];
const STALE_MIN_AGE_MINUTES = 5;

async function deleteStaleRows() {
  const SB_URL = process.env.VT_DB_URL;
  const SB_KEY = process.env.VT_DB_KEY;
  if (!SB_URL || !SB_KEY) return { error: "supabase_not_configured", deleted: 0 };

  const cutoff = new Date(Date.now() - STALE_MIN_AGE_MINUTES * 60 * 1000).toISOString();
  const path = `/rest/v1/workspace_roles?status=in.(${STALE_STATUSES.join(",")})&created_at=lt.${encodeURIComponent(cutoff)}&vq_score=is.null`;

  const u = new URL(path, SB_URL);
  const res = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "DELETE",
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          Prefer: "return=representation",
        },
      },
      (r) => {
        let data = "";
        r.on("data", (c) => { data += c; });
        r.on("end", () => {
          try { resolve({ status: r.statusCode, data: data ? JSON.parse(data) : [] }); }
          catch { resolve({ status: r.statusCode, data: [] }); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });

  if (res.status >= 400) {
    return { error: `supabase_${res.status}`, deleted: 0 };
  }
  const rows = Array.isArray(res.data) ? res.data : [];
  return { deleted: rows.length, sampleApples: rows.slice(0, 3).map((r) => r.apple_id) };
}

exports.handler = async (event) => {
  // Differentiate scheduled invocation vs manual HTTP.
  const isScheduled =
    event.headers?.["x-nf-event-source"] === "scheduled" ||
    event.type === "scheduled" ||
    event.eventName === "scheduled";

  const provided =
    event.headers?.["x-vetted-sweep-secret"] ||
    event.headers?.["X-Vetted-Sweep-Secret"];
  // Prefer a dedicated WORKSPACE_SWEEP_SECRET so the master VETTED_SECRET
  // (used for iOS session HMAC validation) isn't reused for this surface.
  // Falls back to VETTED_SECRET for backward compatibility during rollout
  // — once WORKSPACE_SWEEP_SECRET is set in Netlify env, the fallback path
  // is never reached and can eventually be removed.
  const expectedSecret = process.env.WORKSPACE_SWEEP_SECRET || process.env.VETTED_SECRET;
  const manualOk = provided && expectedSecret && provided === expectedSecret;

  if (!isScheduled && !manualOk) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const source = isScheduled ? "scheduled" : "manual";
  let result;
  try {
    result = await deleteStaleRows();
  } catch (err) {
    // The promise rejection path inside deleteStaleRows (DNS error,
    // connection refused, etc.) would otherwise reach Netlify's
    // runtime and surface as 502. Catch + structured 200 so the
    // scheduler keeps firing and the error is observable to ops.
    console.error("[workspace_sweep] fatal:", err?.stack || err?.message || err);
    result = { deleted: 0, error: err?.message || String(err) };
  }
  console.log(`[workspace_sweep] source=${source} deleted=${result.deleted} error=${result.error || "none"}`);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source,
      deleted: result.deleted,
      error: result.error || null,
      cutoff_minutes: STALE_MIN_AGE_MINUTES,
    }),
  };
};
