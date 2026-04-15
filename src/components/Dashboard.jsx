import { useState, useRef } from "react";
import { resolveLang } from "../utils/langUtils.js";
import MarketPulseCard from "./MarketPulse.jsx";
import { ScoringProgress as ScoringProgressComponent } from "./VQLoadingScreen.jsx";

// ─── URL sanitization (matches OpportunityForm) ────────────────────────────
const MAX_JD = 12000;
const MAX_URL = 2048;
function sanitizeUrl(value) {
  const trimmed = (value || "").trim().slice(0, MAX_URL);
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" ||
      host.startsWith("192.168.") || host.startsWith("10.") ||
      host.startsWith("172.16.") || host.endsWith(".internal") ||
      host === "metadata.google.internal"
    ) return "";
    return trimmed;
  } catch { return ""; }
}

// ─── Application status config ─────────────────────────────────────────────
export const STAGE_ORDER = ["applied", "phone_screen", "interview", "final_round"];
export const STAGE_LABELS = {
  applied:      "Applied",
  phone_screen: "Phone Screen",
  interview:    "Interview",
  final_round:  "Final Round",
  offer:        "Offer Extended",
  rejected:     "Rejected",
  withdrew:     "Withdrew",
};
const STAGE_STYLE = {
  applied:      { bg: "#DFF0DF", color: "#27500A" },
  phone_screen: { bg: "#E8F4FF", color: "#0C447C" },
  interview:    { bg: "#FFF0E0", color: "#7A3A00" },
  final_round:  { bg: "#E8EEF8", color: "#3A4A8A" },
  offer:        { bg: "#D0EED0", color: "#1A4A1A" },
  rejected:     { bg: "#F8ECEC", color: "#C05050" },
  withdrew:     { bg: "#F0F4F0", color: "#8A9A8A" },
};

// ─── Guide slides ──────────────────────────────────────────────────────────
const GUIDE_SLIDES = [
  {
    icon: "◎",
    title: "Score Any Role",
    body: "Paste a job description — or a URL — into the box below. Vetted reads it against your personal filter framework and returns a Vetted Quotient (VQ) score in seconds.",
  },
  {
    icon: "⊟",
    title: "Your Filters Are the Engine",
    body: "Every score is driven by the criteria you built: things like compensation, scope, culture, or access to leadership. Each filter is weighted by what matters most to you — not what a job board thinks matters.",
  },
  {
    icon: "3.8",
    title: "Reading Your Score",
    body: "Scores run 1–5. Pursue means the role clears your threshold. Monitor means it's close — worth watching. Pass means it doesn't meet your standard. Your threshold is yours to set.",
    mono: true,
  },
  {
    icon: "→",
    title: "In Progress",
    body: "When you apply to a role, tap Mark Applied on its card. It moves into In Progress, where you can track it through Phone Screen, Interview, Final Round, and beyond.",
  },
  {
    icon: "↑",
    title: "Previously Scored",
    body: "Every role you've ever scored lives here, sorted by VQ. Tap any card to revisit the full breakdown — strengths, gaps, narrative bridge, and coaching notes.",
  },
];

// ─── Date formatter → "MON · APR 14 · 2026" ───────────────────────────────
function formatDashDate() {
  const d = new Date();
  const days   = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()} · ${d.getFullYear()}`;
}

// ─── Score color helper ────────────────────────────────────────────────────
function scoreColor(score, onDark = false) {
  if (score >= 4.0) return onDark ? "#7AB87A" : "#3A7A3A";
  if (score >= 3.0) return "#B8A030";
  return "#C05050";
}

// ─── Verdict pill styles ───────────────────────────────────────────────────
function verdictPill(recommendation, onDark = false) {
  if (recommendation === "pursue") {
    return onDark
      ? { bg: "#C8E8C0", color: "#1A4A10" }
      : { bg: "#EAF3DE", color: "#27500A" };
  }
  if (recommendation === "monitor") {
    return onDark
      ? { bg: "rgba(212,168,64,0.25)", color: "#F0D090" }
      : { bg: "#FAEEDA", color: "#633806" };
  }
  // pass
  return onDark
    ? { bg: "rgba(192,80,80,0.25)", color: "#F0A0A0" }
    : { bg: "#F8ECEC", color: "#C05050" };
}

// ─── Section label ─────────────────────────────────────────────────────────
function SectionLabel({ children, count }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".12em",
      color: "#8A9A8A", textTransform: "uppercase", marginBottom: 10,
    }}>
      {children}
      <div style={{ flex: 1, height: 0.5, background: "#D8E8D8" }} />
      {count != null && (
        <span style={{ fontFamily: "var(--font-data)", fontSize: 9, color: "#8A9A8A" }}>{count}</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard({
  t, profile, filters, lang, opportunities, loading, scoringPhase, error,
  onScore, onViewOpp, onEditFilters, userTier, authUser, onCompare,
  devTierOverride, onDevUnlock, behavioralInsight, setBehavioralInsight,
  onMarkApplied, onUpdateStatus, onDismissInsight, onActedOnInsight,
}) {
  const fn = (field) => resolveLang(field, lang);
  const isVantage = userTier === "vantage" || userTier === "vantage_lifetime";

  // ── Dev unlock: 7-tap on VETTED wordmark ──────────────────────────────────
  const devTapRef      = useRef(0);
  const devTapTimerRef = useRef(null);
  function handleDevTap() {
    devTapRef.current += 1;
    clearTimeout(devTapTimerRef.current);
    devTapTimerRef.current = setTimeout(() => { devTapRef.current = 0; }, 1500);
    if (devTapRef.current >= 7) { devTapRef.current = 0; onDevUnlock?.(); }
  }

  // ── Guide ─────────────────────────────────────────────────────────────────
  const [showGuide, setShowGuide] = useState(() => {
    try { return !localStorage.getItem("vetted_guide_seen"); } catch { return false; }
  });
  const [guideStep, setGuideStep] = useState(0);
  function openGuide()  { setGuideStep(0); setShowGuide(true); }
  function closeGuide() {
    setShowGuide(false);
    try { localStorage.setItem("vetted_guide_seen", "1"); } catch {}
  }
  function guideNext() {
    if (guideStep < GUIDE_SLIDES.length - 1) setGuideStep(s => s + 1);
    else closeGuide();
  }
  function guidePrev() { if (guideStep > 0) setGuideStep(s => s - 1); }

  // ── Compare mode ──────────────────────────────────────────────────────────
  const [compareMode, setCompareMode]               = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState(new Set());

  function toggleCompareSelect(oppId) {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(oppId)) { next.delete(oppId); }
      else if (next.size < 2) { next.add(oppId); }
      return next;
    });
  }
  function launchCompare() {
    const [idA, idB] = [...selectedForCompare];
    const oppA = opportunities.find(o => o.id === idA);
    const oppB = opportunities.find(o => o.id === idB);
    if (oppA && oppB) onCompare(oppA, oppB);
  }
  function exitCompareMode() { setCompareMode(false); setSelectedForCompare(new Set()); }

  // ── Carousel ──────────────────────────────────────────────────────────────
  const [carouselIdx,  setCarouselIdx]  = useState(0);
  const carouselStartX                  = useRef(0);
  const sorted        = [...opportunities].sort((a, b) => b.overall_score - a.overall_score);
  const CAROUSEL_MAX  = Math.min(sorted.length, 5);
  const carouselItems = sorted.slice(0, CAROUSEL_MAX);

  function carouselGo(dir) {
    setCarouselIdx(i => Math.max(0, Math.min(carouselItems.length - 1, i + dir)));
  }
  function onCarouselTouchStart(e) { carouselStartX.current = e.touches[0].clientX; }
  function onCarouselTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - carouselStartX.current;
    if (Math.abs(dx) > 30) carouselGo(dx < 0 ? 1 : -1);
  }
  function onCarouselMouseDown(e) { carouselStartX.current = e.clientX; }
  function onCarouselMouseUp(e) {
    const dx = e.clientX - carouselStartX.current;
    if (Math.abs(dx) > 20) carouselGo(dx < 0 ? 1 : -1);
  }

  // ── IN PROGRESS status editing ────────────────────────────────────────────
  const [editingStatusId, setEditingStatusId] = useState(null);

  // ── Input strip ───────────────────────────────────────────────────────────
  const [inputMode,  setInputMode]  = useState(null); // null | "paste" | "url"
  const [jd,         setJd]         = useState("");
  const [urlVal,     setUrlVal]     = useState("");
  const [fetching,   setFetching]   = useState(false);
  const [fetchError, setFetchError] = useState("");

  async function handleUrlFetch() {
    const safeUrl = sanitizeUrl(urlVal);
    if (!safeUrl) { setFetchError(t.urlFetchError); return; }
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(safeUrl)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.contents) throw new Error();
      const stripped = data.contents
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
      if (stripped.length < 100) throw new Error();
      setJd(stripped);
      setInputMode("paste");
    } catch {
      setFetchError(t.urlFetchError);
    } finally {
      setFetching(false);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const topScore   = sorted[0]?.overall_score;
  const inProgress = opportunities
    .filter(o => o.applied_at)
    .sort((a, b) => new Date(b.status_updated_at || b.applied_at) - new Date(a.status_updated_at || a.applied_at));
  const prevScored = sorted.filter(o => !o.applied_at);

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <main id="main-content" aria-label={t.submitTitle}>

      {/* ── White surface header ──────────────────────────────────────────── */}
      <div style={{ background: "#FAFAF8", borderBottom: "0.5px solid #D8E8D8" }}>
        {/* VETTED wordmark row */}
        <div style={{
          padding: "14px 20px 10px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              onClick={handleDevTap}
              style={{
                fontFamily: "var(--font-data)", fontSize: 13, fontWeight: 500,
                letterSpacing: ".14em", color: "#1A2E1A",
                userSelect: "none", cursor: "default",
              }}
            >VETTED</span>
            {devTierOverride && (
              <span style={{
                fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
                letterSpacing: ".1em", textTransform: "uppercase",
                background: "#e74c3c", color: "#fff",
                padding: "1px 6px", borderRadius: 20,
              }}>DEV</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".08em",
              color: "#8A9A8A", textTransform: "uppercase",
            }}>{formatDashDate()}</span>
            <button
              onClick={openGuide}
              aria-label="Open dashboard guide"
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "#F0F4F0", border: "1px solid #D8E8D8",
                color: "#8A9A8A", fontSize: 12, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >?</button>
          </div>
        </div>

        {/* Headline + stats band */}
        <div style={{ padding: "0 20px 16px" }}>
          {opportunities.length > 0 ? (
            <>
              <p style={{
                fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".12em",
                color: "#8A9A8A", textTransform: "uppercase", marginBottom: 4,
              }}>
                {profile.name ? `YOUR SEARCH · ${profile.name.split(" ")[0].toUpperCase()}` : "YOUR SEARCH"}
              </p>
              <h1 style={{
                fontFamily: "var(--font-prose)", fontSize: 22, fontWeight: 500,
                color: "#1A2E1A", lineHeight: 1.15, marginBottom: 12,
              }}>
                {topScore != null
                  ? <>Top match<br />scored {topScore.toFixed(1)}.</>
                  : <>Your search<br />is live.</>}
              </h1>
            </>
          ) : (
            <>
              <p style={{
                fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".12em",
                color: "#8A9A8A", textTransform: "uppercase", marginBottom: 4,
              }}>
                {profile.name ? `WELCOME · ${profile.name.split(" ")[0].toUpperCase()}` : "WELCOME"}
              </p>
              <h1 style={{
                fontFamily: "var(--font-prose)", fontSize: 22, fontWeight: 500,
                color: "#1A2E1A", lineHeight: 1.15, marginBottom: 12,
              }}>
                Score your<br />first role.
              </h1>
            </>
          )}

          {/* 3 stat tiles */}
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1, background: "#F0F4F0", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 18, fontWeight: 500,
                color: inProgress.length > 0 ? "#3A7A3A" : "#1A2E1A", lineHeight: 1,
              }}>{inProgress.length}</div>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 8, letterSpacing: ".08em",
                color: "#8A9A8A", marginTop: 3, textTransform: "uppercase",
              }}>IN PROGRESS</div>
            </div>
            <div style={{ flex: 1, background: "#F0F4F0", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 18, fontWeight: 500,
                color: "#1A2E1A", lineHeight: 1,
              }}>{opportunities.length}</div>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 8, letterSpacing: ".08em",
                color: "#8A9A8A", marginTop: 3, textTransform: "uppercase",
              }}>SCORED</div>
            </div>
            <div style={{ flex: 1, background: "#F0F4F0", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 18, fontWeight: 500,
                color: "#B8A030", lineHeight: 1,
              }}>{profile.threshold ?? "—"}</div>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 8, letterSpacing: ".08em",
                color: "#8A9A8A", marginTop: 3, textTransform: "uppercase",
              }}>THRESHOLD</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar: compare / edit filters ──────────────────────────────── */}
      <div style={{
        background: "#FAFAF8", borderBottom: "0.5px solid #D8E8D8",
        padding: "8px 20px", display: "flex", gap: 8, alignItems: "center",
      }}>
        {isVantage && opportunities.length >= 2 && (
          compareMode ? (
            <button
              className="btn btn-sm"
              onClick={exitCompareMode}
              style={{
                fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: ".06em",
                background: "transparent", color: "#8A9A8A",
                border: "1px solid #D8E8D8", borderRadius: 20, padding: "5px 12px",
              }}
            >{t.compareCancel}</button>
          ) : (
            <button
              className="btn btn-sm"
              onClick={() => setCompareMode(true)}
              style={{
                fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: ".06em",
                background: "transparent", color: "#3A5A3A",
                border: "1px solid #D8E8D8", borderRadius: 20, padding: "5px 12px",
              }}
            >⇄ {t.compareMode}</button>
          )
        )}
        <button
          className="btn btn-sm"
          onClick={onEditFilters}
          style={{
            fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: ".06em",
            background: "transparent", color: "#3A5A3A",
            border: "1px solid #D8E8D8", borderRadius: 20, padding: "5px 12px",
          }}
        >{t.editFilters}</button>
      </div>

      {/* ── Compare instruction banner ────────────────────────────────────── */}
      {compareMode && (
        <div style={{
          background: "#F0F4F0", borderBottom: "0.5px solid #D8E8D8",
          padding: "10px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#1A2E1A" }}>
            {selectedForCompare.size === 2 ? "Ready to compare." : t.compareSelect}
            {" "}<span style={{ color: "#8A9A8A", fontSize: 12 }}>({selectedForCompare.size}/2)</span>
          </p>
          <button
            className="btn btn-primary btn-sm"
            disabled={selectedForCompare.size !== 2}
            onClick={launchCompare}
            style={{ fontFamily: "var(--font-data)", fontSize: 11 }}
          >{t.compareMode} →</button>
        </div>
      )}

      {/* ── Market Pulse — Vantage only ───────────────────────────────────── */}
      <div style={{ padding: "0 16px" }}>
        <MarketPulseCard t={t} profile={profile} authUser={authUser} userTier={userTier} opportunities={opportunities} />
      </div>

      {/* ── Behavioral insight ────────────────────────────────────────────── */}
      {behavioralInsight && (
        <div style={{
          margin: "0 16px 16px",
          background: "#fff",
          border: "1px solid #D8E8D8",
          borderLeft: "3px solid #3A7A3A",
          borderRadius: "0 10px 10px 0",
          padding: "14px 16px",
        }}>
          <div style={{
            fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 700,
            color: "#8A9A8A", letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 8,
          }}>INTELLIGENCE</div>
          <p style={{
            fontFamily: "var(--font-prose)", fontSize: 13, color: "#1A2E1A",
            lineHeight: 1.65, marginBottom: 12,
          }}>{behavioralInsight.insight_text}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onDismissInsight?.(behavioralInsight.id)}
              style={{
                fontFamily: "var(--font-data)", fontSize: 11, color: "#8A9A8A",
                background: "transparent", border: "1px solid #D8E8D8",
                borderRadius: 20, padding: "5px 14px", cursor: "pointer",
              }}
            >Dismiss</button>
            <button
              onClick={() => onActedOnInsight?.(behavioralInsight.id)}
              style={{
                fontFamily: "var(--font-data)", fontSize: 11, color: "#3A5A3A",
                background: "#E0F0E0", border: "1px solid #C8E0C8",
                borderRadius: 20, padding: "5px 14px", cursor: "pointer",
              }}
            >Got it</button>
          </div>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 32px", background: "#FAFAF8" }}>

        {/* Scoring progress */}
        {loading && <ScoringProgressComponent phase={scoringPhase} />}

        {/* ── TOP MATCHES carousel ────────────────────────────────────────── */}
        {!loading && carouselItems.length > 0 && (
          <section aria-labelledby="carousel-heading" style={{ marginBottom: 24 }}>
            <h2 className="sr-only" id="carousel-heading">Top Matches</h2>
            <SectionLabel>TOP MATCHES</SectionLabel>

            <div
              style={{ overflow: "hidden", borderRadius: 12, cursor: "grab", userSelect: "none" }}
              onTouchStart={onCarouselTouchStart}
              onTouchEnd={onCarouselTouchEnd}
              onMouseDown={onCarouselMouseDown}
              onMouseUp={onCarouselMouseUp}
              aria-roledescription="carousel"
            >
              <div style={{
                display: "flex",
                transform: `translateX(-${carouselIdx * 100}%)`,
                transition: "transform 0.3s ease",
              }}>
                {carouselItems.map((opp, idx) => {
                  const isHero    = idx === 0;
                  const vp        = verdictPill(opp.recommendation, isHero);
                  const sc        = scoreColor(opp.overall_score, isHero);
                  const isApplied = !!opp.applied_at;
                  const status    = opp.application_status || "applied";
                  const { bg: sBg, color: sColor } = STAGE_STYLE[status] || STAGE_STYLE.applied;
                  const isSelected = selectedForCompare.has(opp.id);
                  const isDisabled = compareMode && selectedForCompare.size === 2 && !isSelected;

                  if (isHero) {
                    return (
                      <div key={opp.id} style={{
                        minWidth: "100%", flexShrink: 0,
                        background: "#1A2E1A", borderRadius: 12, padding: "16px 18px",
                        opacity: isDisabled ? 0.5 : 1,
                      }}>
                        <button
                          onClick={() => compareMode ? toggleCompareSelect(opp.id) : onViewOpp(opp)}
                          aria-label={`${opp.role_title} at ${opp.company}. Score ${opp.overall_score.toFixed(1)}. ${opp.recommendation}.${isApplied ? " Applied." : ""}`}
                          style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                        >
                          <div style={{
                            fontFamily: "var(--font-data)", fontSize: 9,
                            letterSpacing: ".12em", color: "#4A7A4A", marginBottom: 5, textTransform: "uppercase",
                          }}>
                            {opp.recommendation?.toUpperCase()} · {opp.company?.toUpperCase()}
                          </div>
                          <div style={{
                            fontFamily: "var(--font-prose)", fontSize: 16,
                            fontWeight: 500, color: "#E8F0E8", lineHeight: 1.2, marginBottom: 3,
                          }}>{opp.role_title}</div>
                          <div style={{
                            fontFamily: "var(--font-data)", fontSize: 11, color: "#5A8A5A", marginBottom: 14,
                          }}>{opp.company}</div>
                          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                            <span style={{
                              fontFamily: "var(--font-data)", fontSize: 36,
                              fontWeight: 500, color: "#E8F0E8", lineHeight: 1,
                            }}>{opp.overall_score.toFixed(1)}</span>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                              <span style={{
                                fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 500,
                                letterSpacing: ".1em", textTransform: "uppercase",
                                background: vp.bg, color: vp.color,
                                padding: "4px 14px", borderRadius: 20,
                              }}>{opp.recommendation?.toUpperCase()}</span>
                              {isApplied && (
                                <span style={{
                                  fontFamily: "var(--font-data)", fontSize: 9,
                                  background: "#253C25", color: "#5A8A5A",
                                  padding: "2px 10px", borderRadius: 20,
                                }}>{STAGE_LABELS[status]}</span>
                              )}
                              {compareMode && (
                                <div style={{
                                  width: 18, height: 18, borderRadius: 4,
                                  border: `2px solid ${isSelected ? "#E8F0E8" : "#4A7A4A"}`,
                                  background: isSelected ? "#E8F0E8" : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                  {isSelected && <span style={{ color: "#1A2E1A", fontSize: 11, fontWeight: 700 }}>✓</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  }

                  // Alt cards (idx >= 1)
                  return (
                    <div key={opp.id} style={{
                      minWidth: "100%", flexShrink: 0,
                      background: "#F0F4F0", border: "0.5px solid #D8E8D8",
                      borderRadius: 12, padding: "16px 18px",
                      opacity: isDisabled ? 0.5 : 1,
                    }}>
                      <button
                        onClick={() => compareMode ? toggleCompareSelect(opp.id) : onViewOpp(opp)}
                        aria-label={`${opp.role_title} at ${opp.company}. Score ${opp.overall_score.toFixed(1)}. ${opp.recommendation}.${isApplied ? " Applied." : ""}`}
                        style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      >
                        <div style={{
                          fontFamily: "var(--font-data)", fontSize: 9,
                          letterSpacing: ".12em", color: "#8A9A8A", marginBottom: 5, textTransform: "uppercase",
                        }}>
                          {opp.recommendation?.toUpperCase()} · {opp.company?.toUpperCase()}
                        </div>
                        <div style={{
                          fontFamily: "var(--font-prose)", fontSize: 15,
                          fontWeight: 500, color: "#1A2E1A", lineHeight: 1.2, marginBottom: 3,
                        }}>{opp.role_title}</div>
                        <div style={{
                          fontFamily: "var(--font-data)", fontSize: 11, color: "#8A9A8A", marginBottom: 14,
                        }}>{opp.company}</div>
                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                          <span style={{
                            fontFamily: "var(--font-data)", fontSize: 32,
                            fontWeight: 500, color: sc, lineHeight: 1,
                          }}>{opp.overall_score.toFixed(1)}</span>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                            <span style={{
                              fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 500,
                              letterSpacing: ".1em", textTransform: "uppercase",
                              background: vp.bg, color: vp.color,
                              padding: "4px 14px", borderRadius: 20,
                            }}>{opp.recommendation?.toUpperCase()}</span>
                            {isApplied && (
                              <span style={{
                                fontFamily: "var(--font-data)", fontSize: 9,
                                background: sBg, color: sColor,
                                padding: "2px 10px", borderRadius: 20,
                              }}>{STAGE_LABELS[status]}</span>
                            )}
                            {compareMode && (
                              <div style={{
                                width: 18, height: 18, borderRadius: 4,
                                border: `2px solid ${isSelected ? "#1A2E1A" : "#D8E8D8"}`,
                                background: isSelected ? "#1A2E1A" : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {isSelected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dot indicators */}
            {carouselItems.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
                {carouselItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCarouselIdx(i)}
                    aria-label={`Go to match ${i + 1}`}
                    style={{
                      width: i === carouselIdx ? 20 : 6, height: 6, borderRadius: 3,
                      background: i === carouselIdx ? "#3A7A3A" : "#D8E8D8",
                      border: "none", cursor: "pointer", padding: 0,
                      transition: "all 0.25s ease",
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── IN PROGRESS grouped pipeline list ───────────────────────────── */}
        {inProgress.length > 0 && (
          <section aria-labelledby="inprogress-heading" style={{ marginBottom: 24 }}>
            <h2 className="sr-only" id="inprogress-heading">In Progress</h2>
            <SectionLabel count={inProgress.length}>IN PROGRESS</SectionLabel>

            <div style={{ background: "#F0F4F0", borderRadius: 10, overflow: "hidden" }}>
              {inProgress.map((opp, i) => {
                const status      = opp.application_status || "applied";
                const stageIdx    = STAGE_ORDER.indexOf(status);
                const isTerminal  = !STAGE_ORDER.includes(status);
                const isFinalRound = status === "final_round";
                const nextStage   = (!isTerminal && stageIdx < STAGE_ORDER.length - 1)
                  ? STAGE_ORDER[stageIdx + 1] : null;
                const { bg, color } = STAGE_STYLE[status] || STAGE_STYLE.applied;
                const isEditing   = editingStatusId === opp.id;
                const sc          = scoreColor(opp.overall_score, false);

                return (
                  <div
                    key={opp.id}
                    style={{ borderBottom: i < inProgress.length - 1 ? "0.5px solid #D8E8D8" : "none" }}
                  >
                    {/* Compact pip row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <button
                          onClick={() => onViewOpp(opp)}
                          aria-label={`View ${opp.role_title} at ${opp.company}`}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", width: "100%" }}
                        >
                          <div style={{
                            fontFamily: "var(--font-prose)", fontSize: 13, fontWeight: 500,
                            color: "#1A2E1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>{opp.role_title}</div>
                          <div style={{
                            fontFamily: "var(--font-data)", fontSize: 10, color: "#8A9A8A", marginTop: 1,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>{opp.company}</div>
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                        <span style={{
                          fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 500,
                          letterSpacing: ".08em", textTransform: "uppercase",
                          background: bg, color, borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap",
                        }}>{STAGE_LABELS[status]}</span>
                        <span style={{ fontFamily: "var(--font-data)", fontSize: 11, color: sc }}>
                          {opp.overall_score.toFixed(1)}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingStatusId(isEditing ? null : opp.id)}
                        aria-label={isEditing ? "Close status editor" : "Edit status"}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#8A9A8A", fontSize: 14, lineHeight: 1,
                          minWidth: 36, minHeight: 36,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}
                      >{isEditing ? "✕" : "✎"}</button>
                    </div>

                    {/* Expanded status management */}
                    {isEditing && (
                      <div style={{ padding: "0 14px 12px" }}>
                        {!isTerminal && (
                          <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
                            {STAGE_ORDER.map((s, i) => (
                              <div key={s} style={{
                                height: 3, flex: 1, borderRadius: 2,
                                background: i <= stageIdx ? "#3A7A3A" : "#D8E8D8",
                                transition: "background 0.3s",
                              }} />
                            ))}
                          </div>
                        )}
                        <div style={{
                          background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 8,
                          border: "0.5px solid #D8E8D8",
                        }}>
                          <div style={{
                            fontFamily: "var(--font-data)", fontSize: 9, color: "#8A9A8A",
                            letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8,
                          }}>Set status</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {Object.entries(STAGE_LABELS).map(([key, label]) => (
                              <button
                                key={key}
                                onClick={() => { onUpdateStatus(opp.id, key); setEditingStatusId(null); }}
                                aria-pressed={status === key}
                                style={{
                                  fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                                  background: status === key ? (STAGE_STYLE[key]?.bg || "#E0F0E0") : "#F0F4F0",
                                  color: status === key ? (STAGE_STYLE[key]?.color || "#2A5A2A") : "#5A6A5A",
                                  border: `0.5px solid ${status === key ? "transparent" : "#D8E8D8"}`,
                                  borderRadius: 20, padding: "4px 12px", cursor: "pointer",
                                  fontWeight: status === key ? 600 : 400,
                                  minHeight: 36, display: "inline-flex", alignItems: "center",
                                }}
                              >{label}</button>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {nextStage && !isFinalRound && (
                            <button
                              onClick={() => { onUpdateStatus(opp.id, nextStage); setEditingStatusId(null); }}
                              aria-label={`Move to ${STAGE_LABELS[nextStage]}`}
                              style={{
                                fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                                background: "#1A2E1A", color: "#E8F0E8", border: "none",
                                borderRadius: 20, padding: "4px 14px", cursor: "pointer",
                                minHeight: 36, display: "inline-flex", alignItems: "center",
                              }}>→ {STAGE_LABELS[nextStage]}</button>
                          )}
                          {isFinalRound && (
                            <>
                              <button
                                onClick={() => { onUpdateStatus(opp.id, "offer"); setEditingStatusId(null); }}
                                style={{
                                  fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                                  background: "#1A2E1A", color: "#E8F0E8", border: "none",
                                  borderRadius: 20, padding: "4px 14px", cursor: "pointer",
                                  minHeight: 36, display: "inline-flex", alignItems: "center",
                                }}>✓ Offer Extended</button>
                              <button
                                onClick={() => { onUpdateStatus(opp.id, "rejected"); setEditingStatusId(null); }}
                                style={{
                                  fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                                  background: "#F8ECEC", color: "#C05050", border: "1px solid #E8D0D0",
                                  borderRadius: 20, padding: "4px 14px", cursor: "pointer",
                                  minHeight: 36, display: "inline-flex", alignItems: "center",
                                }}>✕ Rejected</button>
                            </>
                          )}
                          {!isTerminal && (
                            <button
                              onClick={() => { onUpdateStatus(opp.id, "withdrew"); setEditingStatusId(null); }}
                              style={{
                                fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                                background: "transparent", color: "#8A9A8A",
                                border: "0.5px solid #D8E8D8",
                                borderRadius: 20, padding: "4px 14px", cursor: "pointer",
                                minHeight: 36, display: "inline-flex", alignItems: "center",
                              }}>Withdrew</button>
                          )}
                          {!isTerminal && !isFinalRound && stageIdx >= 1 && (
                            <button
                              onClick={() => { onUpdateStatus(opp.id, "rejected"); setEditingStatusId(null); }}
                              style={{
                                fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                                background: "transparent", color: "#C05050",
                                border: "0.5px solid #E8D0D0",
                                borderRadius: 20, padding: "4px 14px", cursor: "pointer",
                                minHeight: 36, display: "inline-flex", alignItems: "center",
                              }}>✕ Rejected</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Previously Scored (non-applied) ─────────────────────────────── */}
        {prevScored.length > 0 && (
          <section aria-labelledby="prev-heading" style={{ marginBottom: 24 }}>
            <h2 className="sr-only" id="prev-heading">{t.prevScored}</h2>
            <SectionLabel count={prevScored.length}>
              {t.prevScored?.toUpperCase() || "PREVIOUSLY SCORED"}
            </SectionLabel>
            <div role="list">
              {prevScored.map((opp) => {
                const isSelected = selectedForCompare.has(opp.id);
                const isDisabled = compareMode && selectedForCompare.size === 2 && !isSelected;
                const sc = scoreColor(opp.overall_score);

                return (
                  <div key={opp.id} style={{ position: "relative", marginBottom: 8 }}>
                    <button
                      className="opp-card"
                      role="listitem"
                      onClick={() => compareMode ? toggleCompareSelect(opp.id) : onViewOpp(opp)}
                      aria-label={`${opp.role_title} at ${opp.company}. Score ${opp.overall_score.toFixed(1)}. ${opp.recommendation}.`}
                      style={{
                        marginBottom: 0,
                        ...(compareMode ? {
                          borderColor: isSelected ? "var(--ink)" : "var(--border)",
                          borderWidth: isSelected ? 2 : 1.5,
                          opacity: isDisabled ? 0.5 : 1,
                          background: isSelected ? "var(--cream)" : "#fff",
                        } : {}),
                      }}
                    >
                      <div className="opp-card-left">
                        <div className="opp-title">{opp.role_title}</div>
                        <div className="opp-company">{opp.company}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {compareMode && (
                          <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            border: `2px solid ${isSelected ? "var(--ink)" : "var(--border)"}`,
                            background: isSelected ? "var(--ink)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {isSelected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>
                        )}
                        <span style={{
                          fontFamily: "var(--font-data)", fontSize: 18, fontWeight: 500,
                          color: sc, letterSpacing: "-.01em",
                        }} aria-hidden="true">
                          {opp.overall_score.toFixed(1)}
                        </span>
                      </div>
                    </button>
                    {!compareMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkApplied?.(opp.id, new Date().toISOString());
                        }}
                        aria-label={`Mark ${opp.role_title} as applied`}
                        style={{
                          fontFamily: "var(--font-data)", fontSize: 11,
                          color: "#8A9A8A", background: "transparent",
                          border: "1px solid #D8E8D8", borderRadius: 20,
                          padding: "3px 10px", cursor: "pointer",
                          display: "inline-flex", alignItems: "center",
                          minHeight: 36, marginTop: 4,
                          marginLeft: "auto", marginRight: 0,
                          width: "fit-content",
                        }}
                      >Mark Applied</button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {opportunities.length === 0 && !loading && (
          <div className="empty-state" aria-live="polite" style={{ marginBottom: 24 }}>
            <div aria-hidden="true" className="empty-state-icon">◎</div>
            <p>{t.emptyState}</p>
          </div>
        )}

        {/* ── Input strip ──────────────────────────────────────────────────── */}
        {!loading && (
          <div style={{
            background: "#F0F4F0", border: "0.5px solid #D8E8D8", borderRadius: 12, padding: "14px 16px",
          }}>
            {inputMode === null && (
              <>
                <p style={{
                  fontFamily: "var(--font-prose)", fontSize: 13, color: "#8A9A8A",
                  lineHeight: 1.5, marginBottom: 10,
                }}>Paste a job description or URL to score against your framework.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setInputMode("paste")}
                    style={{
                      flex: 1, background: "#1A2E1A", color: "#E8F0E8",
                      fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 500,
                      letterSpacing: ".08em", border: "none", borderRadius: 8,
                      padding: "11px 14px", cursor: "pointer", textAlign: "center",
                    }}
                  >PASTE JD</button>
                  <button
                    onClick={() => setInputMode("url")}
                    style={{
                      background: "#fff", color: "#8A9A8A",
                      fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 500,
                      letterSpacing: ".08em", border: "0.5px solid #D8E8D8",
                      borderRadius: 8, padding: "11px 16px", cursor: "pointer",
                    }}
                  >URL</button>
                </div>
              </>
            )}

            {inputMode === "paste" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{
                    fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".12em",
                    color: "#8A9A8A", textTransform: "uppercase",
                  }}>PASTE JOB DESCRIPTION</span>
                  <button
                    onClick={() => { setInputMode(null); setJd(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#8A9A8A", fontSize: 16, lineHeight: 1, padding: 4 }}
                  >✕</button>
                </div>
                <textarea
                  value={jd}
                  onChange={e => setJd(e.target.value)}
                  placeholder={t.placeholderJD}
                  maxLength={MAX_JD}
                  style={{
                    width: "100%", minHeight: 160, padding: "10px 12px",
                    borderRadius: 8, border: "0.5px solid #D8E8D8",
                    background: "#fff", color: "#1A2E1A", WebkitTextFillColor: "#1A2E1A", fontSize: 13, fontFamily: "var(--font-prose)",
                    resize: "vertical", outline: "none", boxSizing: "border-box",
                  }}
                />
                {error && (
                  <div role="alert" style={{
                    background: "#FEF2F2", color: "#C05050",
                    fontSize: 13, borderRadius: 6, padding: "8px 12px", marginTop: 8,
                  }}>{error}</div>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => onScore(jd)}
                  disabled={!jd.trim()}
                  style={{ marginTop: 10, width: "100%", fontFamily: "var(--font-data)", letterSpacing: ".08em" }}
                >{t.btnScore}</button>
              </>
            )}

            {inputMode === "url" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{
                    fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".12em",
                    color: "#8A9A8A", textTransform: "uppercase",
                  }}>FETCH FROM URL</span>
                  <button
                    onClick={() => { setInputMode(null); setUrlVal(""); setFetchError(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#8A9A8A", fontSize: 16, lineHeight: 1, padding: 4 }}
                  >✕</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="url"
                    value={urlVal}
                    onChange={e => setUrlVal(e.target.value)}
                    placeholder="https://"
                    maxLength={MAX_URL}
                    style={{
                      flex: 1, padding: "10px 12px", borderRadius: 8,
                      border: "0.5px solid #D8E8D8", background: "#fff",
                      fontSize: 13, fontFamily: "var(--font-prose)", outline: "none",
                    }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleUrlFetch}
                    disabled={!urlVal.trim() || fetching}
                    aria-busy={fetching}
                  >{fetching ? t.btnFetching : t.btnFetch}</button>
                </div>
                {fetchError && (
                  <div role="alert" style={{
                    background: "#FEF2F2", color: "#C05050",
                    fontSize: 13, borderRadius: 6, padding: "8px 12px", marginTop: 8,
                  }}>{fetchError}</div>
                )}
                <p style={{ fontSize: 11, color: "#8A9A8A", marginTop: 6 }}>{t.urlNote}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Dashboard Guide overlay ─────────────────────────────────────── */}
      {showGuide && (() => {
        const slide  = GUIDE_SLIDES[guideStep];
        const isLast = guideStep === GUIDE_SLIDES.length - 1;
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard guide"
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(10,20,10,0.7)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              padding: "0 0 env(safe-area-inset-bottom, 0)",
            }}
            onClick={e => { if (e.target === e.currentTarget) closeGuide(); }}
          >
            <div style={{
              background: "#FAFAF8", borderRadius: "16px 16px 0 0",
              width: "100%", maxWidth: 480,
              padding: "28px 24px 36px",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <span style={{
                  fontFamily: "var(--font-data)", fontSize: 11,
                  letterSpacing: ".18em", textTransform: "uppercase", color: "#8A9A8A",
                }}>{guideStep + 1} of {GUIDE_SLIDES.length}</span>
                <button onClick={closeGuide} aria-label="Close guide" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A9A8A", fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
              </div>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{
                  fontFamily: slide.mono ? "var(--font-data)" : "var(--font-prose)",
                  fontSize: slide.mono ? 36 : 40, fontWeight: 700,
                  color: "#1A2E1A", marginBottom: 16, lineHeight: 1,
                }}>{slide.icon}</div>
                <h3 style={{
                  fontFamily: "var(--font-prose)", fontSize: 20, fontWeight: 700,
                  color: "#1A2E1A", marginBottom: 12,
                }}>{slide.title}</h3>
                <p style={{
                  fontFamily: "var(--font-prose)", fontSize: 15, color: "#5A6A5A",
                  lineHeight: 1.7, maxWidth: 320, margin: "0 auto",
                }}>{slide.body}</p>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
                {GUIDE_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setGuideStep(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    style={{
                      width: i === guideStep ? 20 : 8, height: 8, borderRadius: 4,
                      background: i === guideStep ? "#1A2E1A" : "#D8E8D8",
                      border: "none", cursor: "pointer", padding: 0,
                      transition: "all 0.25s ease",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {guideStep > 0 && (
                  <button
                    onClick={guidePrev}
                    style={{
                      flex: 1, minHeight: 48, borderRadius: 10,
                      background: "#F0F4F0", color: "#1A2E1A",
                      border: "1px solid #D8E8D8", fontSize: 15, fontWeight: 500,
                      fontFamily: "var(--font-prose)", cursor: "pointer",
                    }}
                  >← Back</button>
                )}
                <button
                  onClick={guideNext}
                  style={{
                    flex: 2, minHeight: 48, borderRadius: 10,
                    background: "#1A2E1A", color: "#E8F0E8",
                    border: "none", fontSize: 15, fontWeight: 500,
                    fontFamily: "var(--font-prose)", cursor: "pointer",
                  }}
                >{isLast ? "Got it" : "Next →"}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
