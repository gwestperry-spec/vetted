import { useState } from "react";
import { ENDPOINTS } from "../config.js";
import { handleError } from "../utils/handleError.js";

// ─── Currency constants ───────────────────────────────────────────────────────
const FX_RATES = {
  USD: 1.00, GBP: 0.79, EUR: 0.92, CAD: 1.36, AUD: 1.53,
  CNY: 7.24, SGD: 1.34, INR: 83.50, AED: 3.67, BRL: 4.97, MXN: 17.20,
};

const CURRENCY_SYMBOLS = {
  USD: "$", GBP: "£", EUR: "€", CAD: "CA$", AUD: "A$",
  CNY: "¥", SGD: "S$", INR: "₹", AED: "AED", BRL: "R$", MXN: "$",
};

const CURRENCY_NAMES = {
  USD: "US Dollar", GBP: "British Pound", EUR: "Euro",
  CAD: "Canadian Dollar", AUD: "Australian Dollar",
  CNY: "Chinese Yuan", SGD: "Singapore Dollar",
  INR: "Indian Rupee", AED: "UAE Dirham",
  BRL: "Brazilian Real", MXN: "Mexican Peso",
};

const SUPPORTED_CURRENCIES = ["USD","GBP","EUR","CAD","AUD","CNY","SGD","INR","AED","BRL","MXN"];

// Convert a value in $K (USD base) to display currency k-equivalent.
// INR and CNY are shown in their natural large-number k form.
function convertK(valueUSD_k, toCurrency) {
  const rate = FX_RATES[toCurrency] || 1;
  return valueUSD_k * rate;
}

function fmtK(valueK, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const rounded = Math.round(valueK);
  // INR: show in lakhs (1L = 100k)
  if (currency === "INR") {
    const lakhs = (valueK / 100).toFixed(1);
    return `${sym}${lakhs}L`;
  }
  return `${sym}${rounded}k`;
}

// ─── CurrencyPicker ───────────────────────────────────────────────────────────
function CurrencyPicker({ current, onSelect, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(26,46,26,0.18)",
        backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
      }} />
      {/* Sheet */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 401,
        background: "var(--paper)",
        borderRadius: "16px 16px 0 0",
        border: "0.5px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 20px)",
        animation: "vt-sheet-up 200ms ease-out",
      }}>
        <style>{`
          @keyframes vt-sheet-up {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>
        <div style={{
          padding: "4px 20px 8px",
          fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--muted)",
        }}>Display Currency</div>
        {SUPPORTED_CURRENCIES.map(code => (
          <button
            key={code}
            onClick={() => { onSelect(code); onClose(); }}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "space-between", padding: "13px 20px",
              background: "transparent", border: "none", cursor: "pointer",
              borderTop: "0.5px solid var(--border)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontFamily: "var(--font-data)", fontSize: 12, fontWeight: 700,
                color: current === code ? "var(--accent)" : "var(--ink)",
                letterSpacing: "0.06em", minWidth: 36,
              }}>{code}</span>
              <span style={{
                fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--ink)",
              }}>{CURRENCY_NAMES[code]}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontFamily: "var(--font-data)", fontSize: 11, color: "var(--muted)",
              }}>{CURRENCY_SYMBOLS[code]}</span>
              {current === code && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="var(--accent)" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// ─── CurrencyPill ─────────────────────────────────────────────────────────────
function CurrencyPill({ currency, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px 3px 8px", borderRadius: 20,
      border: "0.5px solid var(--border)",
      background: "var(--cream)",
      fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.10em", textTransform: "uppercase",
      color: "var(--ink)", cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    }}>
      {currency}
      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
        <path d="M1 2.5L3.5 5L6 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

// ─── Density helpers ──────────────────────────────────────────────────────────
function buildDensityPath(instances, loK, spanK, W, H) {
  const samples = [];
  for (const inst of instances) {
    for (let s = 0; s < 5; s++) {
      samples.push(inst.minK + (inst.maxK - inst.minK) * (s / 4));
    }
    samples.push((inst.minK + inst.maxK) / 2);
  }
  const N = 80, bw = 18;
  const xs = [], ys = [];
  let maxY = 0;
  for (let k = 0; k <= N; k++) {
    const x = loK + (spanK * k / N);
    let y = 0;
    for (const s of samples) {
      const u = (x - s) / bw;
      y += Math.exp(-0.5 * u * u);
    }
    xs.push(x); ys.push(y);
    if (y > maxY) maxY = y;
  }
  if (maxY === 0) return "";
  const pts = xs.map((x, k) => {
    const px = ((x - loK) / spanK * W).toFixed(1);
    const py = (H - (ys[k] / maxY) * H).toFixed(1);
    return [px, py];
  });
  let d = `M${pts[0][0]},${H} L${pts[0][0]},${pts[0][1]}`;
  for (let k = 1; k < pts.length; k++) d += ` L${pts[k][0]},${pts[k][1]}`;
  d += ` L${pts[pts.length - 1][0]},${H} Z`;
  return d;
}

function axisTicks(loK, hiK, stepOverride) {
  const span = hiK - loK;
  const step = stepOverride || (span > 5000 ? 1000 : span > 1000 ? 500 : span > 200 ? 100 : span > 100 ? 50 : 25);
  const out = [];
  for (let v = Math.ceil(loK / step) * step; v <= hiK; v += step) out.push(v);
  return out;
}

function verdictColor(v) {
  if (v === "PURSUE")  return "var(--accent)";
  if (v === "MONITOR") return "var(--gold)";
  if (v === "PASS")    return "#5A6A5A";
  return "var(--accent)";
}

// ─── MpJoyplot ────────────────────────────────────────────────────────────────
function MpJoyplot({ salaryCache, opportunities, profile, currency, displayCurrency }) {
  const cur = displayCurrency || currency || "USD";
  const groups = Object.entries(salaryCache).map(([title, d]) => {
    const matching = (opportunities || []).filter(o =>
      (o.role_title || o.roleTitle || "").toLowerCase() === title.toLowerCase()
    );
    const verdicts = matching.map(o => (o.framework_snapshot?.recommendation || "").toUpperCase());
    const bestVerdict = verdicts.includes("PURSUE") ? "PURSUE"
      : verdicts.includes("MONITOR") ? "MONITOR"
      : matching.length > 0 ? "PASS" : "NEUTRAL";
    // All values stored as USD k; convert to display currency for rendering
    return {
      title,
      instances: [{ minK: convertK(d.min / 1000, cur), maxK: convertK(d.max / 1000, cur) }],
      medianK: convertK(d.median / 1000, cur),
      count: matching.length,
      bestVerdict,
    };
  }).sort((a, b) => b.medianK - a.medianK);

  if (groups.length === 0) return null;

  // profile.compensationTarget is in profile.currency k — convert to display currency
  const profileCurrency = profile.currency || "USD";
  const targetUSD_k = parseFloat(profile.compensationTarget) * (FX_RATES[profileCurrency] ? 1 / FX_RATES[profileCurrency] : 1) || null;
  const targetK = targetUSD_k ? convertK(targetUSD_k, cur) : null;

  const all = groups.flatMap(g => [g.instances[0].minK, g.instances[0].maxK]);
  if (targetK && targetK > 0) all.push(targetK);

  // Choose a round tick step appropriate for the currency magnitude
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const tickStep = rawMax > 5000 ? 1000 : rawMax > 1000 ? 500 : rawMax > 200 ? 100 : 25;
  const loK = Math.floor(rawMin / tickStep) * tickStep - tickStep;
  const hiK = Math.ceil(rawMax / tickStep) * tickStep + tickStep;
  const spanK = hiK - loK;
  const pctX = (nK) => `${((nK - loK) / spanK * 100).toFixed(1)}%`;

  const ROW_H = 48;
  const W     = 360;
  const ticks = axisTicks(loK, hiK, tickStep);
  const totalInstances = groups.reduce((s, g) => s + Math.max(g.count, 1), 0);

  return (
    <div style={{ padding: "0 20px" }}>
      {/* Axis label row */}
      <div style={{ position: "relative", height: 18, marginBottom: 2 }}>
        {ticks.map((tk, i) => (
          <div key={i} style={{
            position: "absolute", left: pctX(tk), transform: "translateX(-50%)",
            fontFamily: "var(--font-data)", fontSize: 9, color: "#8A9A8A",
            letterSpacing: "0.04em", whiteSpace: "nowrap",
          }}>{fmtK(tk, cur)}</div>
        ))}
      </div>

      {/* Shared SVG + label overlay */}
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${groups.length * ROW_H}`}
          width="100%" height={groups.length * ROW_H}
          preserveAspectRatio="none"
          style={{ display: "block", overflow: "visible" }}
        >
          {/* Grid lines */}
          {ticks.map((tk, i) => (
            <line key={i}
              x1={(tk - loK) / spanK * W} x2={(tk - loK) / spanK * W}
              y1={0} y2={groups.length * ROW_H}
              stroke="#D8E8D8" strokeWidth="0.5" strokeDasharray="2 3"
            />
          ))}
          {/* User target comp line */}
          {targetK && targetK >= loK && targetK <= hiK && (
            <line
              x1={(targetK - loK) / spanK * W} x2={(targetK - loK) / spanK * W}
              y1={0} y2={groups.length * ROW_H}
              stroke="var(--ink)" strokeWidth="1"
            />
          )}
          {/* Density curves */}
          {groups.map((g, i) => {
            const color = verdictColor(g.bestVerdict);
            const pathD = buildDensityPath(g.instances, loK, spanK, W, ROW_H);
            return (
              <g key={i} transform={`translate(0, ${i * ROW_H})`}>
                <path d={pathD} fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1" />
              </g>
            );
          })}
        </svg>

        {/* Title + median labels overlaid */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {groups.map((g, i) => {
            const color = verdictColor(g.bestVerdict);
            return (
              <div key={i} style={{
                position: "absolute",
                top: i * ROW_H + 5, left: 0, right: 0,
                display: "flex", justifyContent: "space-between",
                alignItems: "baseline", gap: 8,
              }}>
                <div style={{
                  fontFamily: "var(--font-prose)", fontSize: 13, fontWeight: 500,
                  color: "var(--ink)", lineHeight: 1.1,
                  background: "linear-gradient(to right, rgba(250,250,248,0.95) 68%, rgba(250,250,248,0))",
                  paddingRight: 8, maxWidth: "55%",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{g.title}</div>
                <div style={{
                  fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.08em",
                  color, textTransform: "uppercase",
                  background: "linear-gradient(to left, rgba(250,250,248,0.95) 68%, rgba(250,250,248,0))",
                  paddingLeft: 8, whiteSpace: "nowrap",
                }}>{fmtK(g.medianK, cur)}{g.count > 0 ? ` · ${g.count}` : ""}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 6, paddingTop: 8,
        borderTop: "0.5px solid var(--border)",
        display: "flex", justifyContent: "space-between",
        fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em",
        color: "#8A9A8A", textTransform: "uppercase",
      }}>
        <span>
          {groups.length} {groups.length === 1 ? "TITLE" : "TITLES"} · {totalInstances} {totalInstances === 1 ? "INSTANCE" : "INSTANCES"}
        </span>
        {targetK && targetK > 0 && (
          <span><b style={{ color: "var(--ink)" }}>│</b> YOUR TARGET {fmtK(targetK, cur)}</span>
        )}
      </div>
    </div>
  );
}

// ─── MpChip ───────────────────────────────────────────────────────────────────
function MpChip({ label, active, onClick, dashed, fetched }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 12px", borderRadius: 20,
      border: `${dashed ? "0.5px dashed" : "0.5px solid"} ${active ? "var(--ink)" : "var(--border)"}`,
      background: active ? "var(--ink)" : "transparent",
      color: active ? "#F4F8F0" : "var(--ink)",
      fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 500,
      letterSpacing: "0.08em", textTransform: "uppercase",
      cursor: "pointer", transition: "all 150ms ease",
      maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      position: "relative",
    }}>
      {fetched && !active && (
        <span style={{
          position: "absolute", top: 3, right: 4,
          width: 5, height: 5, borderRadius: "50%",
          background: "var(--accent)", flexShrink: 0,
        }} />
      )}
      {label}
    </button>
  );
}

// ─── MarketPulseCard ──────────────────────────────────────────────────────────
export default function MarketPulseCard({ t, profile, authUser, userTier, opportunities, currency,
  salaryCache: externalSalaryCache, setSalaryCache: setExternalSalaryCache,
  insightsCache: externalInsightsCache, setInsightsCache: setExternalInsightsCache,
  citationsCache: externalCitationsCache, setCitationsCache: setExternalCitationsCache,
}) {
  const cur = currency || profile.currency || "USD";
  const profileTitle = profile.currentTitle || (profile.targetRoles?.[0]) || "";

  // Internal fallback state (used when not lifted to parent)
  const [internalSalaryCache,    setInternalSalaryCache]    = useState({});
  const [internalInsightsCache,  setInternalInsightsCache]  = useState({});
  const [internalCitationsCache, setInternalCitationsCache] = useState({});

  const salaryCache    = externalSalaryCache    ?? internalSalaryCache;
  const setSalaryCache = setExternalSalaryCache ?? setInternalSalaryCache;
  const insightsCache  = externalInsightsCache  ?? internalInsightsCache;
  const setInsightsCache  = setExternalInsightsCache  ?? setInternalInsightsCache;
  const citationsCache = externalCitationsCache ?? internalCitationsCache;
  const setCitationsCache = setExternalCitationsCache ?? setInternalCitationsCache;
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [searchTitle, setSearchTitle]       = useState(profileTitle);
  const [searchInput, setSearchInput]       = useState("");
  const [searchFocused, setSearchFocused]   = useState(false);
  const [showSources, setShowSources]       = useState(false);
  const [searchError, setSearchError]       = useState("");
  const [displayCurrency, setDisplayCurrency] = useState(cur);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const isVantage = userTier === "vantage" || userTier === "vantage_lifetime";
  const scoredTitles = Array.from(
    new Set((opportunities || []).map(o => o.role_title || o.roleTitle || "").filter(Boolean))
  );

  const hasCacheData   = Object.keys(salaryCache).length > 0;
  const titleToLookup  = searchTitle || profileTitle;
  const alreadyFetched = !!salaryCache[titleToLookup];
  const currentInsights  = insightsCache[titleToLookup] || null;
  const currentCitations = citationsCache[titleToLookup] || [];

  function validateTitle(value) {
    const v = value.trim();
    if (v.length < 2)   return t.marketCustomTooShort   || "Please enter a job title.";
    if (v.length > 120) return t.marketCustomTooLong    || "Title must be under 120 characters.";
    if (!/[a-zA-ZÀ-ɏ一-鿿؀-ۿ]/.test(v))
      return t.marketCustomNoLetters || "Title must contain letters.";
    return "";
  }

  function selectTitle(title) {
    setSearchTitle(title);
    setSearchInput("");
    setSearchFocused(false);
    setError("");
    setShowSources(false);
    setSearchError("");
  }

  function commitSearch() {
    const v = searchInput.trim();
    if (!v) return;
    const err = validateTitle(v);
    if (err) { setSearchError(err); return; }
    selectTitle(v);
  }

  // Suggestions: profile title first, then scored titles, filtered by current input
  const allSuggestions = Array.from(new Set(
    [profileTitle, ...scoredTitles].filter(Boolean)
  ));
  const filteredSuggestions = searchInput.trim()
    ? allSuggestions.filter(t => t.toLowerCase().includes(searchInput.toLowerCase()))
    : allSuggestions;

  function renderWithCitations(text) {
    if (!text) return null;
    return text.split(/(\[\d+(?:,\s*\d+)*\])/g).map((part, i) => {
      const match = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
      if (match) return <sup key={i} style={{ fontSize: 8, color: "var(--muted)", marginLeft: 1 }}>{match[1]}</sup>;
      return part;
    });
  }

  async function fetchMarketPulse() {
    if (!titleToLookup) { setError(t.marketNoData); return; }
    if (alreadyFetched || loading) return;
    setLoading(true); setError("");

    const secret = authUser?.sessionToken || "";

    let salaryJson;
    try {
      const res = await fetch(ENDPOINTS.salaryLookup, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Vetted-Token": secret },
        body: JSON.stringify({
          title: titleToLookup, appleId: authUser?.id,
          sessionToken: authUser?.sessionToken || "",
          location: profile.locationPrefs?.[0] || "",
          currency: cur, country: profile.country || "us",
        }),
      });
      salaryJson = await res.json();
    } catch (err) {
      handleError(err, "market_pulse_salary");
      setError(t.marketNoData); setLoading(false); return;
    }

    if (salaryJson.error || !salaryJson.median) {
      setError(t.marketNoData); setLoading(false); return;
    }
    setSalaryCache(prev => ({ ...prev, [titleToLookup]: salaryJson }));

    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 25000);
      const sonarRes = await fetch(ENDPOINTS.marketPulse, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Vetted-Token": secret },
        body: JSON.stringify({
          title: titleToLookup,
          salaryMin: salaryJson.min, salaryMax: salaryJson.max, salaryMedian: salaryJson.median,
          salarySource: salaryJson.source, occupationTitle: salaryJson.occupationTitle,
          background: profile.background || "",
          targetIndustries: profile.targetIndustries || [],
          lang: t?.lang || "en",
          currency: cur, country: profile.country || "us",
          appleId: authUser?.id, sessionToken: authUser?.sessionToken || "",
        }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (sonarRes.ok) {
        const raw = await sonarRes.json();
        if (raw.demand_outlook || raw.in_demand_skills || raw.timing_intel || raw.comp_context) {
          const { citations: cite = [], ...fields } = raw;
          setInsightsCache(prev => ({ ...prev, [titleToLookup]: fields }));
          setCitationsCache(prev => ({ ...prev, [titleToLookup]: cite }));
        }
      }
    } catch (err) {
      handleError(err, "market_pulse_sonar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" aria-label="Market pulse" style={{ background: "var(--paper)", minHeight: "100%" }}>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 20px 0" }}>
        <div style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink)", textTransform: "uppercase" }}>
          VETTED
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isVantage && (
            <CurrencyPill currency={displayCurrency} onClick={() => setShowCurrencyPicker(true)} />
          )}
          {isVantage && (
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 700,
              letterSpacing: ".10em", textTransform: "uppercase",
              background: "var(--gold)", color: "#fff", padding: "2px 8px", borderRadius: 20,
            }}>Vantage</span>
          )}
        </div>
      </header>

      {showCurrencyPicker && (
        <CurrencyPicker
          current={displayCurrency}
          onSelect={setDisplayCurrency}
          onClose={() => setShowCurrencyPicker(false)}
        />
      )}

      {/* Title block */}
      <div style={{ padding: "14px 20px 20px" }}>
        <p style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
          MARKET PULSE
        </p>
        <h1 style={{ fontFamily: "var(--font-prose)", fontSize: 26, fontWeight: 500, color: "var(--ink)", lineHeight: 1.18, margin: 0, letterSpacing: "-0.005em" }}>
          {t.marketPulse || "Compensation intelligence."}
        </h1>
        <p style={{ margin: "10px 0 0", fontFamily: "var(--font-prose)", fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
          {t.marketPulseSubtitle || "Salary benchmarks and market intelligence for your target roles."}
        </p>
      </div>

      {!isVantage ? (
        <div style={{ margin: "0 20px", padding: "24px 20px", background: "var(--cream)", borderRadius: 12 }}>
          <p style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.16em", color: "var(--gold)", textTransform: "uppercase", fontWeight: 500, marginBottom: 10 }}>
            VANTAGE FEATURE
          </p>
          <h3 style={{ fontFamily: "var(--font-prose)", fontSize: 19, fontWeight: 500, color: "var(--ink)", margin: 0, lineHeight: 1.25 }}>
            {t.marketVantageGate || "Unlock salary benchmarks and live market intelligence."}
          </h3>
          <p style={{ margin: "10px 0 18px", fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--muted)", lineHeight: 1.55 }}>
            {t.marketVantageGateSub || "Compare your target comp against live market data. See demand trends, in-demand skills, and timing intel for any role."}
          </p>
          <button style={{
            minHeight: 48, padding: "0 22px", borderRadius: 999,
            background: "var(--ink)", color: "#F4F8F0",
            fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.16em", textTransform: "uppercase",
            border: "none", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 10,
          }}>
            UPGRADE TO VANTAGE
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : (
        <div style={{ paddingBottom: 110 }}>

          {/* Role search bar */}
          <div style={{ padding: "0 20px 16px", position: "relative" }}>
            <div style={{ position: "relative" }}>
              {/* Active title badge inside input */}
              <div style={{
                display: "flex", alignItems: "center",
                border: `1px solid ${searchFocused ? "var(--ink)" : "var(--border)"}`,
                borderRadius: 12, background: "var(--cream)",
                transition: "border-color 150ms ease", overflow: "hidden",
              }}>
                {searchTitle && !searchInput && (
                  <span style={{
                    position: "absolute", left: 14, pointerEvents: "none",
                    fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--ink)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    maxWidth: "calc(100% - 80px)",
                  }}>{searchTitle}</span>
                )}
                <input
                  type="text"
                  placeholder={searchTitle ? "" : (t.marketCustomPlaceholder || "Search roles…")}
                  value={searchInput}
                  maxLength={120}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  onChange={e => { setSearchInput(e.target.value); setSearchError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") commitSearch(); }}
                  style={{
                    flex: 1, padding: "12px 14px", background: "transparent",
                    border: "none", outline: "none",
                    fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--ink)",
                    caretColor: "var(--ink)",
                  }}
                />
                {/* Fetched dot indicator for current title */}
                {salaryCache[searchTitle] && !searchInput && (
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%", background: "var(--accent)",
                    flexShrink: 0, marginRight: 14,
                  }} />
                )}
              </div>

              {/* Dropdown suggestions */}
              {searchFocused && filteredSuggestions.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: "var(--paper)", border: "1px solid var(--border)",
                  borderRadius: 12, zIndex: 50, overflow: "hidden",
                  boxShadow: "0 4px 16px rgba(26,46,26,0.10)",
                }}>
                  {filteredSuggestions.map(title => (
                    <button
                      key={title}
                      onMouseDown={() => selectTitle(title)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        background: title === searchTitle ? "var(--cream)" : "transparent",
                        border: "none", borderBottom: "0.5px solid var(--border)",
                        cursor: "pointer", textAlign: "left",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <span style={{
                        fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--ink)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{title}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {salaryCache[title] && (
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                        )}
                        {title === searchTitle && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                  {/* Any-role option when typing */}
                  {searchInput.trim() && !filteredSuggestions.includes(searchInput.trim()) && (
                    <button
                      onMouseDown={commitSearch}
                      style={{
                        width: "100%", padding: "12px 14px",
                        background: "transparent", border: "none",
                        cursor: "pointer", textAlign: "left",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <span style={{
                        fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: "0.10em",
                        textTransform: "uppercase", color: "var(--muted)",
                      }}>Search "{searchInput.trim()}"</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {searchError && (
              <p style={{ fontSize: 11, color: "var(--warn, #c0392b)", margin: "6px 0 0", paddingLeft: 2 }}>
                {searchError}
              </p>
            )}

            {/* Fetched titles row — compact chips below search, only when cache has data */}
            {hasCacheData && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                {Object.keys(salaryCache).map(title => (
                  <MpChip
                    key={title} label={title}
                    active={searchTitle === title}
                    fetched
                    onClick={() => selectTitle(title)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Hairline */}
          <div style={{ height: "0.5px", background: "var(--border)", margin: "0 0 20px" }} />

          {/* Error */}
          {error && (
            <div style={{ margin: "0 20px 24px", background: "var(--warn-bg)", color: "var(--gold)", padding: "12px 16px", borderRadius: 10, fontSize: 13, fontFamily: "var(--font-prose)" }}>
              {error}
            </div>
          )}

          {/* Joyplot — shown when any title has been fetched */}
          {hasCacheData && (
            <div style={{ marginBottom: 24 }}>
              <MpJoyplot
                salaryCache={salaryCache}
                opportunities={opportunities}
                profile={profile}
                currency={cur}
                displayCurrency={displayCurrency}
              />
              {displayCurrency !== cur && (
                <p style={{
                  fontFamily: "var(--font-data)", fontSize: 8, letterSpacing: "0.10em",
                  textTransform: "uppercase", color: "var(--muted)",
                  margin: "4px 20px 0", textAlign: "right",
                }}>≈ converted from {cur}</p>
              )}

              {/* Header row: current title label + reset */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0" }}>
                <p style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>
                  {titleToLookup?.toUpperCase()}
                </p>
                <button
                  onClick={() => { setSalaryCache({}); setInsightsCache({}); setCitationsCache({}); setError(""); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em",
                    textTransform: "uppercase", color: "var(--muted)", padding: 0,
                  }}
                >{t.marketHide || "RESET"}</button>
              </div>
            </div>
          )}

          {/* CTA — fetch the current title if not yet done */}
          {!alreadyFetched && !loading && (
            <div style={{ padding: "0 20px 24px" }}>
              <button
                onClick={fetchMarketPulse}
                disabled={!titleToLookup}
                style={{
                  width: "100%", padding: "20px 18px", borderRadius: 14,
                  background: titleToLookup ? "var(--ink)" : "#C8D4C5",
                  border: "none", cursor: titleToLookup ? "pointer" : "not-allowed",
                  color: "#F4F8F0",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.16em", color: "rgba(244,248,240,0.6)", textTransform: "uppercase", marginBottom: 6 }}>
                    {titleToLookup ? titleToLookup.toUpperCase() : "SELECT A TITLE ABOVE"}
                  </div>
                  <div style={{ fontFamily: "var(--font-prose)", fontSize: 18, letterSpacing: "-0.005em" }}>
                    {hasCacheData ? (t.marketAddTitle || "Add to chart") : (t.getMarketPulse || "Get Market Pulse")}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9H15" stroke="#F4F8F0" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M10 4L15 9L10 14" stroke="#F4F8F0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div style={{ padding: "0 20px 24px" }} aria-label="Loading" role="status">
              <div className="skeleton-box" style={{ width: "60%", height: 11, marginBottom: 12 }} />
              <div className="skeleton-box" style={{ width: "100%", height: 40, marginBottom: 16 }} />
              <div className="skeleton-box" style={{ width: "80%", height: 9, marginBottom: 8 }} />
              <div className="skeleton-box" style={{ width: "90%", height: 9, marginBottom: 8 }} />
              <div className="skeleton-box" style={{ width: "70%", height: 9 }} />
            </div>
          )}

          {/* Perplexity insights for the current title */}
          {alreadyFetched && currentInsights && (
            <div style={{ padding: "0 20px" }}>
              <div style={{ display: "grid", gap: 16 }}>
                {[
                  { key: "demand_outlook",   label: t.marketDemand },
                  { key: "comp_context",     label: `${t.marketRange || "Range"} Context` },
                  { key: "in_demand_skills", label: t.marketInDemandSkills || "In-Demand Skills" },
                  { key: "timing_intel",     label: t.marketTiming || "Timing" },
                ].map(({ key, label }) => currentInsights[key] ? (
                  <div key={key} style={{ borderLeft: "2px solid var(--border)", paddingLeft: 14 }}>
                    <p style={{ fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
                      {label}
                    </p>
                    <p style={{ fontFamily: "var(--font-prose)", fontSize: 14, lineHeight: 1.65, color: "var(--ink)", margin: 0 }}>
                      {renderWithCitations(currentInsights[key])}
                    </p>
                  </div>
                ) : null)}
              </div>

              {/* Sources */}
              {currentCitations.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "0.5px solid var(--border)" }}>
                  <button onClick={() => setShowSources(s => !s)} style={{
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: "var(--muted)", display: "flex", alignItems: "center", gap: 5,
                  }}>
                    {t.marketSources || "Sources"} {showSources ? "▲" : "▼"}
                  </button>
                  {showSources && (
                    <ol style={{ margin: "8px 0 0", padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {currentCitations.map(({ index, url, domain }) => (
                        <li key={index} style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
                          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                            {domain}
                          </a>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              {/* Source attribution */}
              {salaryCache[titleToLookup] && (
                <p style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: "#8A9A8A", marginTop: 20, paddingBottom: 4 }}>
                  {t.marketSalarySource || "Source"}: {salaryCache[titleToLookup].source} · {salaryCache[titleToLookup].occupationTitle}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
