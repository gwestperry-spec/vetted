import { useState } from "react";
import { ENDPOINTS } from "../config.js";
import { handleError } from "../utils/handleError.js";

// ─── MarketPulseCard (Vantage #8) ─────────────────────────────────────────
// Shows BLS salary benchmark + Perplexity Sonar market intelligence brief
// for the user's current title (or any scored role / custom title). Vantage only.
export default function MarketPulseCard({ t, profile, authUser, userTier, opportunities }) {
  const profileTitle = profile.currentTitle || (profile.targetRoles?.[0]) || "";

  const [data, setData]               = useState(null);   // { min, max, median, source, occupationTitle, geo? }
  const [insights, setInsights]       = useState(null);   // Perplexity market brief (parsed JSON object)
  const [citations, setCitations]     = useState([]);     // [{ index, url, domain }]
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [open, setOpen]               = useState(false);
  const [searchTitle, setSearchTitle] = useState(profileTitle);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom]   = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [customError, setCustomError] = useState("");

  const isVantage = userTier === "vantage" || userTier === "vantage_lifetime";

  // Unique scored role titles from opportunities (deduplicated, non-empty)
  const scoredTitles = Array.from(
    new Set(
      (opportunities || [])
        .map(o => o.role_title || o.roleTitle || "")
        .filter(Boolean)
    )
  );

  // Client-side title guard — mirrors backend sanitizeTitle logic
  function validateCustomInput(value) {
    const v = value.trim();
    if (v.length < 2) return t.marketCustomTooShort || "Please enter a job title.";
    if (v.length > 120) return t.marketCustomTooLong || "Title must be under 120 characters.";
    if (!/[a-zA-Z\u00C0-\u024F\u4E00-\u9FFF\u0600-\u06FF]/.test(v))
      return t.marketCustomNoLetters || "Title must contain letters.";
    return "";
  }

  // When a chip or custom title is selected, reset previous results
  function selectTitle(title) {
    if (title === searchTitle) return;
    setSearchTitle(title);
    setData(null);
    setInsights(null);
    setCitations([]);
    setError("");
    setOpen(false);
    setShowSources(false);
  }

  // Render text with inline [1] citation markers as superscripts
  function renderWithCitations(text) {
    if (!text) return null;
    const parts = text.split(/(\[\d+(?:,\s*\d+)*\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
      if (match) {
        return (
          <sup key={i} style={{ fontSize: 8, color: "var(--muted)", marginLeft: 1, letterSpacing: 0 }}>
            {match[1]}
          </sup>
        );
      }
      return part;
    });
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
    } catch (salaryErr) {
      handleError(salaryErr, "market_pulse_salary");
      setError(t.marketNoData);
      setLoading(false);
      return;
    }

    if (salaryJson.error || !salaryJson.median) {
      setError(t.marketNoData);
      setLoading(false);
      return;
    }

    setData(salaryJson);

    // ── Step 2: Perplexity Sonar market intelligence brief (non-critical — graceful skip) ──
    try {
      const sonarController = new AbortController();
      const sonarTimeoutId  = setTimeout(() => sonarController.abort(), 25000);

      const sonarRes = await fetch(ENDPOINTS.marketPulse, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Vetted-Token": secret },
        body: JSON.stringify({
          title: titleToLookup,
          salaryMin:       salaryJson.min,
          salaryMax:       salaryJson.max,
          salaryMedian:    salaryJson.median,
          salarySource:    salaryJson.source,
          occupationTitle: salaryJson.occupationTitle,
          background:      profile.background || "",
          targetIndustries: profile.targetIndustries || [],
          lang:            t?.lang || "en",
          appleId:         authUser?.id,
          sessionToken:    authUser?.sessionToken || "",
        }),
        signal: sonarController.signal,
      });

      clearTimeout(sonarTimeoutId);

      if (sonarRes.ok) {
        const raw = await sonarRes.json();
        if (raw.demand_outlook || raw.in_demand_skills || raw.timing_intel || raw.comp_context) {
          const { citations: cite = [], ...insightFields } = raw;
          setInsights(insightFields);
          setCitations(cite);
        }
      }
    } catch (sonarErr) {
      // Perplexity is supplementary — salary data already displayed.
      handleError(sonarErr, "market_pulse_sonar");
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
            {titleToLookup ? `${t.marketSalaryFor || "Salary & market intel for"} "${titleToLookup}"` : t.marketPulseSubtitle}
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
            : open && (data || error) ? (t.marketHide || "Hide") : t.getMarketPulse}
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
              onClick={() => { setShowCustom(false); setCustomInput(""); setCustomError(""); selectTitle(profileTitle); }}
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
              onClick={() => { setShowCustom(false); setCustomInput(""); setCustomError(""); selectTitle(title); }}
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
            {t.marketCustomRole || "+ Custom Role"}
          </button>
        </div>

        {/* Custom text input */}
        {showCustom && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder={t.marketCustomPlaceholder || "e.g. VP of Operations"}
                value={customInput}
                maxLength={120}
                onChange={e => { setCustomInput(e.target.value); setCustomError(""); }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const err = validateCustomInput(customInput);
                    if (err) { setCustomError(err); return; }
                    selectTitle(customInput.trim());
                  }
                }}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: "var(--r)",
                  border: `1.5px solid ${customError ? "var(--warn)" : "var(--border)"}`,
                  fontSize: 13, fontFamily: "var(--font-data)",
                  outline: "none", background: "var(--cream)",
                }}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const err = validateCustomInput(customInput);
                  if (err) { setCustomError(err); return; }
                  selectTitle(customInput.trim());
                }}
                disabled={!customInput.trim()}
              >
                {t.marketSearch || "Search"}
              </button>
            </div>
            {customError && (
              <p style={{ fontSize: 11, color: "var(--warn, #c0392b)", margin: "0 0 2px", paddingLeft: 2 }}>
                {customError}
              </p>
            )}
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
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{t.marketMedian || "median"}</span>
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
                      {data.geo.location ? `${data.geo.location} ${t.marketGeoSuffix || "Market"}` : (t.marketStateLevel || "State-Level Market")}
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

              {/* Perplexity Sonar market insights */}
              {insights && (
                <>
                  <div style={{ display: "grid", gap: 12 }}>
                    {[
                      { key: "demand_outlook",  label: t.marketDemand,                           icon: "📈" },
                      { key: "comp_context",    label: `${t.marketRange} Context`,               icon: "💰" },
                      { key: "in_demand_skills", label: t.marketInDemandSkills || "In-Demand Skills", icon: "⚡" },
                      { key: "timing_intel",    label: t.marketTiming || "Timing",               icon: "🕐" },
                    ].map(({ key, label, icon }) => insights[key] ? (
                      <div key={key} style={{ borderLeft: "3px solid var(--border)", paddingLeft: 12 }}>
                        <p style={{
                          fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700,
                          letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4,
                        }}>
                          {icon} {label}
                        </p>
                        <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink)" }}>
                          {renderWithCitations(insights[key])}
                        </p>
                      </div>
                    ) : null)}
                  </div>

                  {/* Sources strip */}
                  {citations.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                      <button
                        onClick={() => setShowSources(s => !s)}
                        style={{
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
                          letterSpacing: ".12em", textTransform: "uppercase",
                          color: "var(--muted)", display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        {t.marketSources || "Sources"} {showSources ? "▲" : "▼"}
                      </button>
                      {showSources && (
                        <ol style={{ margin: "8px 0 0", padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                          {citations.map(({ index, url, domain }) => (
                            <li key={index} style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "var(--accent)", textDecoration: "none" }}
                              >
                                {domain}
                              </a>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
