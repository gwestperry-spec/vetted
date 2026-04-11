import { useState } from "react";
import { ENDPOINTS } from "../config.js";
import { handleError } from "../handleError.js";

// ─── MarketPulseCard (Vantage #8) ─────────────────────────────────────────
// Shows BLS salary benchmark + Claude market intelligence brief for the
// user's current title (or any scored role / custom title). Vantage only.
export default function MarketPulseCard({ t, profile, authUser, userTier, opportunities }) {
  const profileTitle = profile.currentTitle || (profile.targetRoles?.[0]) || "";

  const [data, setData]               = useState(null);   // { min, max, median, source, occupationTitle, geo? }
  const [insights, setInsights]       = useState("");     // Claude market brief (parsed JSON object)
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [open, setOpen]               = useState(false);
  const [searchTitle, setSearchTitle] = useState(profileTitle);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom]   = useState(false);

  const isVantage = userTier === "vantage" || userTier === "vantage_lifetime";

  // Unique scored role titles from opportunities (deduplicated, non-empty)
  const scoredTitles = Array.from(
    new Set(
      (opportunities || [])
        .map(o => o.role_title || o.roleTitle || "")
        .filter(Boolean)
    )
  );

  // When a chip or custom title is selected, reset previous results
  function selectTitle(title) {
    if (title === searchTitle) return;
    setSearchTitle(title);
    setData(null);
    setInsights("");
    setError("");
    setOpen(false);
  }

  const titleToLookup = searchTitle || profileTitle;

  async function fetchMarketPulse() {
    if (!titleToLookup) { setError(t.marketNoData); setOpen(true); return; }
    if (loading) return;

    setLoading(true);
    setError("");
    setOpen(true);

    const secret = authUser?.sessionToken || "";

    // ── Step 1: salary lookup (critical — abort on failure) ────────────────
    let salaryJson;
    try {
      console.log("[MarketPulse] fetching salary for:", titleToLookup);
      const salaryRes = await fetch(ENDPOINTS.salaryLookup, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Vetted-Token": secret },
        body: JSON.stringify({
          title: titleToLookup,
          appleId: authUser?.id,
          sessionToken: authUser?.sessionToken || "",
          location: profile.locationPrefs?.[0] || "",
        }),
      });
      salaryJson = await salaryRes.json();
      console.log("[MarketPulse] salary response:", JSON.stringify(salaryJson));
    } catch (salaryErr) {
      handleError(salaryErr, "market_pulse_salary");
      console.error("[MarketPulse] salary fetch error:", salaryErr);
      setError(t.marketNoData);
      setLoading(false);
      return;
    }

    if (salaryJson.error || !salaryJson.median) {
      console.log("[MarketPulse] no salary data — error:", salaryJson.error, "median:", salaryJson.median);
      setError(t.marketNoData);
      setLoading(false);
      return;
    }

    console.log("[MarketPulse] salary OK — median:", salaryJson.median);
    setData(salaryJson);

    // ── Step 2: Claude market intelligence brief (non-critical — graceful skip) ──
    try {
      const prompt = `You are a labor market analyst. Write a concise, factual market intelligence brief for a senior professional considering roles as: ${titleToLookup}.

Context:
- Current market salary benchmark: $${salaryJson.min?.toLocaleString()}–$${salaryJson.max?.toLocaleString()} (median $${salaryJson.median?.toLocaleString()})
- Source: ${salaryJson.source}
- Occupation match: ${salaryJson.occupationTitle}

Candidate background: ${profile.background || "Senior executive"}
Target industries: ${(profile.targetIndustries || []).join(", ") || "Not specified"}

Respond ONLY with valid JSON (no markdown):
{
  "demand_outlook": "2–3 sentences on current hiring demand and trajectory for this role type. Be specific about trends.",
  "in_demand_skills": "2–3 skills currently commanding premium compensation for this title.",
  "timing_intel": "1–2 sentences on whether now is a strong or weak moment to be in market for this role type.",
  "comp_context": "1–2 sentences on how the salary range compares to broader market and what drives the top of the range."
}`;

      const claudeController = new AbortController();
      const claudeTimeoutId = setTimeout(() => claudeController.abort(), 25000);

      const claudeRes = await fetch(ENDPOINTS.anthropic, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Vetted-Token": secret },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          appleId: authUser?.id,
          sessionToken: authUser?.sessionToken || "",
        }),
        signal: claudeController.signal,
      });

      clearTimeout(claudeTimeoutId);

      if (claudeRes.ok) {
        const claudeData = await claudeRes.json();
        const text = claudeData.content?.map(b => (typeof b.text === "string" ? b.text : "")).join("") || "";
        try {
          const raw = JSON.parse(text.replace(/```json|```/g, "").trim());
          setInsights(raw);
        } catch { /* salary data already visible — insights parse fail is silent */ }
      }
    } catch (claudeErr) {
      // Claude is supplementary — salary data already displayed. Log but don't error.
      handleError(claudeErr, "market_pulse_claude");
      console.warn("[MarketPulse] Claude step failed (non-fatal):", claudeErr?.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isVantage) return null;

  return (
    <div style={{
      background: "#fff", border: "1.5px solid var(--border)", borderRadius: "var(--r)",
      boxShadow: "var(--shadow)", padding: "20px 24px", marginBottom: 20,
    }}>
      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: "var(--font-data)", fontSize: 16, fontWeight: 700 }}>{t.marketPulse}</span>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700,
              letterSpacing: ".1em", textTransform: "uppercase",
              background: "var(--gold)", color: "#fff", padding: "2px 7px", borderRadius: 20,
            }}>Vantage</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            {titleToLookup ? `Salary & market intel for "${titleToLookup}"` : t.marketPulseSubtitle}
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={open && (data || error) ? () => setOpen(false) : fetchMarketPulse}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          {loading
            ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} aria-hidden="true" /> {t.marketPulseLoading}</>
            : open && (data || error) ? "Hide" : t.getMarketPulse}
        </button>
      </div>

      {/* ── Role search toolbar ───────────────────────────────────────────── */}
      <div style={{ marginTop: 14 }}>
        {/* Chip strip: wraps instead of scrolling horizontally */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6,
          marginBottom: scoredTitles.length > 0 || showCustom ? 10 : 0,
          boxSizing: "border-box", width: "100%",
        }}>
          {/* Profile title chip */}
          {profileTitle && (
            <button
              onClick={() => { setShowCustom(false); setCustomInput(""); selectTitle(profileTitle); }}
              style={{
                fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
                letterSpacing: ".08em", textTransform: "uppercase",
                padding: "4px 10px", borderRadius: 20, border: "1.5px solid",
                borderColor: searchTitle === profileTitle && !showCustom ? "var(--success)" : "var(--border)",
                background:  searchTitle === profileTitle && !showCustom ? "var(--success)" : "transparent",
                color:       searchTitle === profileTitle && !showCustom ? "#fff" : "var(--muted)",
                cursor: "pointer", transition: "all .15s",
              }}
            >
              {profileTitle}
            </button>
          )}

          {/* Scored opportunity chips */}
          {scoredTitles.filter(rt => rt !== profileTitle).map(title => (
            <button
              key={title}
              onClick={() => { setShowCustom(false); setCustomInput(""); selectTitle(title); }}
              style={{
                fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
                letterSpacing: ".08em", textTransform: "uppercase",
                padding: "4px 10px", borderRadius: 20, border: "1.5px solid",
                borderColor: searchTitle === title && !showCustom ? "var(--success)" : "var(--border)",
                background:  searchTitle === title && !showCustom ? "var(--success)" : "transparent",
                color:       searchTitle === title && !showCustom ? "#fff" : "var(--muted)",
                cursor: "pointer", transition: "all .15s",
                maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {title}
            </button>
          ))}

          {/* + Custom role chip */}
          <button
            onClick={() => { setShowCustom(true); }}
            style={{
              fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
              letterSpacing: ".08em", textTransform: "uppercase",
              padding: "4px 10px", borderRadius: 20, border: "1.5px dashed",
              borderColor: showCustom ? "var(--success)" : "var(--border)",
              background: "transparent",
              color: showCustom ? "var(--success)" : "var(--muted)",
              cursor: "pointer", transition: "all .15s",
            }}
          >
            + Custom Role
          </button>
        </div>

        {/* Custom text input */}
        {showCustom && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder="e.g. VP of Operations"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && customInput.trim()) {
                  selectTitle(customInput.trim());
                }
              }}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "var(--r)",
                border: "1.5px solid var(--border)", fontSize: 13,
                fontFamily: "var(--font-data)",
                outline: "none", background: "var(--cream)",
              }}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { if (customInput.trim()) selectTitle(customInput.trim()); }}
              disabled={!customInput.trim()}
            >
              Search
            </button>
          </div>
        )}
      </div>

      {/* ── Content panel ─────────────────────────────────────────────────── */}
      {open && (
        <div style={{ marginTop: 20 }}>
          {error && (
            <div style={{ background: "var(--warn-bg)", color: "var(--gold)", padding: "10px 14px", borderRadius: 4, fontSize: 13 }}>
              {error}
            </div>
          )}

          {loading && !data && (
            <div aria-label="Loading market data" role="status" style={{ marginTop: 4 }}>
              {/* Salary block skeleton */}
              <div style={{ background: "var(--cream)", borderRadius: "var(--r)", padding: "14px 16px", marginBottom: 16 }}>
                <div className="skeleton-box" style={{ width: 72, height: 9, marginBottom: 10 }} />
                <div className="skeleton-box" style={{ width: 130, height: 26, marginBottom: 8 }} />
                <div className="skeleton-box" style={{ width: 180, height: 9 }} />
              </div>
              {/* Source tag skeleton */}
              <div className="skeleton-box" style={{ width: 110, height: 9, marginBottom: 16 }} />
              {/* Insights skeleton — 4 lines */}
              <div className="skeleton-box" style={{ width: "100%", height: 9, marginBottom: 7 }} />
              <div className="skeleton-box" style={{ width: "88%",  height: 9, marginBottom: 7 }} />
              <div className="skeleton-box" style={{ width: "94%",  height: 9, marginBottom: 7 }} />
              <div className="skeleton-box" style={{ width: "76%",  height: 9 }} />
            </div>
          )}

          {data && (
            <>
              {/* Salary range */}
              <div style={{ background: "var(--cream)", borderRadius: "var(--r)", padding: "14px 16px", marginBottom: 16 }}>
                <p style={{
                  fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".15em",
                  textTransform: "uppercase", color: "var(--muted)", marginBottom: 8, fontWeight: 700,
                }}>{t.marketRange}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-data)", fontSize: 28, fontWeight: 700, color: "var(--success)" }}>
                    ${data.median?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>median</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>
                  Range: ${data.min?.toLocaleString()} – ${data.max?.toLocaleString()}
                </p>
                <p style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-data)", marginTop: 4 }}>
                  {t.marketSalarySource || "Source"}: {data.source} · {data.occupationTitle}
                </p>
                {/* BLS geographic salary if available */}
                {data.geo && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <p style={{
                      fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".12em",
                      textTransform: "uppercase", color: "var(--muted)", marginBottom: 4, fontWeight: 700,
                    }}>
                      {data.geo.location ? `${data.geo.location} Market` : "State-Level Market"}
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-data)", fontSize: 22, fontWeight: 700, color: "var(--gold)" }}>
                        ${data.geo.median?.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>median · {data.geo.source}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Range: ${data.geo.min?.toLocaleString()} – ${data.geo.max?.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Claude market insights */}
              {insights && (
                <div style={{ display: "grid", gap: 12 }}>
                  {[
                    { key: "demand_outlook",   label: t.marketDemand,                icon: "📈" },
                    { key: "comp_context",      label: `${t.marketRange} Context`,    icon: "💰" },
                    { key: "in_demand_skills",  label: "In-Demand Skills",            icon: "⚡" },
                    { key: "timing_intel",      label: "Timing",                      icon: "🕐" },
                  ].map(({ key, label, icon }) => insights[key] ? (
                    <div key={key} style={{ borderLeft: "3px solid var(--border)", paddingLeft: 12 }}>
                      <p style={{
                        fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700,
                        letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4,
                      }}>
                        {icon} {label}
                      </p>
                      <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink)" }}>{insights[key]}</p>
                    </div>
                  ) : null)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
