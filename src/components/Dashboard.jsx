import { useState, useRef } from "react";
import { resolveLang } from "../utils/langUtils.js";
import MarketPulseCard from "./MarketPulse.jsx";
import { ScoringProgress as ScoringProgressComponent } from "./VQLoadingScreen.jsx";
import OpportunityForm from "./OpportunityForm.jsx";

// ── Application status config ──────────────────────────────────────────────
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
  applied:      { bg: "#E0F0E0", color: "#2A5A2A" },
  phone_screen: { bg: "#FDF8E8", color: "#7A5A10" },
  interview:    { bg: "#FDF8E8", color: "#7A5A10" },
  final_round:  { bg: "#E8EEF8", color: "#3A4A8A" },
  offer:        { bg: "#D0EED0", color: "#1A4A1A" },
  rejected:     { bg: "#F8ECEC", color: "#C05050" },
  withdrew:     { bg: "#F0F4F0", color: "#8A9A8A" },
};

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
    body: "When you apply to a role, tap Mark Applied on its card. It moves into In Progress, where you can track it through Phone Screen, Interview, Final Round, and beyond. Tap ✎ anytime to correct a status.",
  },
  {
    icon: "↑",
    title: "Previously Scored",
    body: "Every role you've ever scored lives here, sorted by VQ. Tap any card to revisit the full breakdown — strengths, gaps, narrative bridge, and coaching notes.",
  },
];

export default function Dashboard({ t, profile, filters, lang, opportunities, loading, scoringPhase, error, onScore, onViewOpp, onEditFilters, userTier, authUser, onCompare, devTierOverride, onDevUnlock, behavioralInsight, setBehavioralInsight, onMarkApplied, onUpdateStatus, onDismissInsight, onActedOnInsight }) {
  const fn = (field) => resolveLang(field, lang);
  const isVantage = userTier === "vantage" || userTier === "vantage_lifetime";
  const [editingStatusId, setEditingStatusId] = useState(null); // which IN PROGRESS card has picker open

  // ── Dev unlock: 7-tap counter on profile name ────────────────────────────
  const devTapRef = useRef(0);
  const devTapTimerRef = useRef(null);
  function handleDevTap() {
    devTapRef.current += 1;
    clearTimeout(devTapTimerRef.current);
    devTapTimerRef.current = setTimeout(() => { devTapRef.current = 0; }, 1500);
    if (devTapRef.current >= 7) {
      devTapRef.current = 0;
      onDevUnlock?.();
    }
  }

  const [showGuide, setShowGuide] = useState(() => {
    try { return !localStorage.getItem("vetted_guide_seen"); }
    catch { return false; }
  });
  const [guideStep, setGuideStep] = useState(0);

  function openGuide() { setGuideStep(0); setShowGuide(true); }
  function closeGuide() {
    setShowGuide(false);
    try { localStorage.setItem("vetted_guide_seen", "1"); } catch {}
  }
  function guideNext() {
    if (guideStep < GUIDE_SLIDES.length - 1) setGuideStep(s => s + 1);
    else closeGuide();
  }
  function guidePrev() { if (guideStep > 0) setGuideStep(s => s - 1); }

  // ── Compare mode state ─────────────────────────────────────────────────────
  const [compareMode, setCompareMode]           = useState(false);
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
    if (oppA && oppB) { onCompare(oppA, oppB); }
  }

  function exitCompareMode() {
    setCompareMode(false);
    setSelectedForCompare(new Set());
  }

  const sorted = [...opportunities].sort((a, b) => b.overall_score - a.overall_score);

  return (
    <main id="main-content" aria-label={t.submitTitle}>
      {/* ── Profile header card ──────────────────────────────────────────── */}
      <div
        onClick={handleDevTap}
        style={{
          background: "#1A2E1A", borderRadius: 12, padding: "20px 24px",
          marginBottom: 20, display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          userSelect: "none", cursor: "default",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {profile.name && (
              <span style={{
                fontFamily: "var(--font-prose)",
                fontSize: 20, fontWeight: 700, color: "#E8F0E8",
              }}>
                {profile.name}
              </span>
            )}
            {devTierOverride && (
              <span style={{
                fontFamily: "var(--font-data)",
                fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase",
                background: "#e74c3c", color: "#fff",
                padding: "2px 6px", borderRadius: 20, flexShrink: 0,
              }}>
                DEV
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#7AB87A", marginTop: 4, fontFamily: "var(--font-data)", letterSpacing: "0.04em" }}>
            {filters.length} {t.dashboardSubtitle} {profile.threshold} · {opportunities.length} {t.dashboardScored}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {isVantage && opportunities.length >= 2 && !compareMode && (
            <button
              className="btn btn-sm"
              onClick={() => setCompareMode(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.1)", color: "#E8F0E8", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8 }}
            >
              ⇄ {t.compareMode}
            </button>
          )}
          {compareMode && (
            <button
              className="btn btn-sm"
              onClick={exitCompareMode}
              style={{ background: "rgba(255,255,255,0.1)", color: "#E8F0E8", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8 }}
            >{t.compareCancel}</button>
          )}
          <button
            className="btn btn-sm"
            onClick={onEditFilters}
            style={{ background: "rgba(255,255,255,0.1)", color: "#E8F0E8", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8 }}
          >{t.editFilters}</button>
          {/* Guide button — always visible, all tiers */}
          <button
            onClick={openGuide}
            aria-label="Open dashboard guide"
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
              color: "#E8F0E8", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >?</button>
        </div>
      </div>

      {/* Compare mode instruction banner */}
      {compareMode && (
        <div style={{
          background: "var(--cream)", border: "1px solid var(--border)", borderRadius: "var(--r)",
          padding: "12px 16px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <p style={{ fontSize: 13, fontWeight: 500 }}>
            {selectedForCompare.size === 2 ? "Ready to compare. " : t.compareSelect + " "}
            <span style={{ color: "var(--muted)", fontSize: 12 }}>({selectedForCompare.size}/2 selected)</span>
          </p>
          <button
            className="btn btn-primary btn-sm"
            disabled={selectedForCompare.size !== 2}
            onClick={launchCompare}
          >
            {t.compareMode} →
          </button>
        </div>
      )}

      {/* Market Pulse card — Vantage only */}
      <MarketPulseCard t={t} profile={profile} authUser={authUser} userTier={userTier} opportunities={opportunities} />

      {loading ? (
        <ScoringProgressComponent phase={scoringPhase} />
      ) : (
        <OpportunityForm t={t} onScore={onScore} loading={loading} error={error} />
      )}

      {/* Behavioral insight card */}
      {behavioralInsight && (
        <div style={{
          background: "#fff",
          border: "1px solid #D8E8D8",
          borderLeft: "3px solid #3A7A3A",
          borderRadius: "0 10px 10px 0",
          padding: "14px 16px",
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: "var(--font-data)",
            fontSize: 11,
            fontWeight: 700,
            color: "#8A9A8A",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}>
            INTELLIGENCE
          </div>
          <p style={{
            fontFamily: "var(--font-prose)",
            fontSize: 13,
            color: "#1A2E1A",
            lineHeight: 1.65,
            marginBottom: 12,
          }}>
            {behavioralInsight.insight_text}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onDismissInsight?.(behavioralInsight.id)}
              style={{
                fontFamily: "var(--font-data)",
                fontSize: 11,
                color: "#8A9A8A",
                background: "transparent",
                border: "1px solid #D8E8D8",
                borderRadius: 20,
                padding: "5px 14px",
                cursor: "pointer",
              }}
            >Dismiss</button>
            <button
              onClick={() => onActedOnInsight?.(behavioralInsight.id)}
              style={{
                fontFamily: "var(--font-data)",
                fontSize: 11,
                color: "#3A5A3A",
                background: "#E0F0E0",
                border: "1px solid #C8E0C8",
                borderRadius: 20,
                padding: "5px 14px",
                cursor: "pointer",
              }}
            >Got it</button>
          </div>
        </div>
      )}

      {/* ── IN PROGRESS — applied roles with funnel status ── */}
      {opportunities.some(o => o.applied_at) && (
        <section aria-labelledby="inprogress-heading" style={{ marginTop: 32 }}>
          <div className="section-label" aria-hidden="true">In Progress</div>
          <h2 className="sr-only" id="inprogress-heading">In Progress</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {opportunities
              .filter(o => o.applied_at)
              .sort((a, b) => new Date(b.status_updated_at || b.applied_at) - new Date(a.status_updated_at || a.applied_at))
              .map(opp => {
                const status = opp.application_status || "applied";
                const stageIdx = STAGE_ORDER.indexOf(status);
                const isTerminal = !STAGE_ORDER.includes(status);
                const isFinalRound = status === "final_round";
                const nextStage = (!isTerminal && stageIdx < STAGE_ORDER.length - 1)
                  ? STAGE_ORDER[stageIdx + 1] : null;
                const { bg, color } = STAGE_STYLE[status] || STAGE_STYLE.applied;
                const isEditing = editingStatusId === opp.id;

                return (
                  <div key={opp.id} style={{
                    background: "#fff", border: "1px solid #D8E8D8",
                    borderRadius: 10, padding: "14px 16px",
                  }}>
                    {/* Top row — title + status pill + edit toggle */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <button
                          onClick={() => onViewOpp(opp)}
                          aria-label={`View ${opp.role_title} at ${opp.company}`}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", width: "100%" }}
                        >
                          <div style={{ fontFamily: "var(--font-prose)", fontSize: 15, fontWeight: 600, color: "#1A2E1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{opp.role_title}</div>
                          <div style={{ fontFamily: "var(--font-data)", fontSize: 11, color: "#8A9A8A", marginTop: 2 }}>{opp.company}</div>
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", background: bg, color, borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" }}>
                          {STAGE_LABELS[status]}
                        </span>
                        {/* Edit toggle — always visible, fixes accidental selections */}
                        <button
                          onClick={() => setEditingStatusId(isEditing ? null : opp.id)}
                          aria-label={isEditing ? "Close status editor" : "Edit status"}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#8A9A8A", fontSize: 14, lineHeight: 1, padding: "2px 4px" }}
                        >{isEditing ? "✕" : "✎"}</button>
                      </div>
                    </div>

                    {/* Inline status picker — shown when editing */}
                    {isEditing && (
                      <div style={{ background: "#F0F4F0", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                        <div style={{ fontFamily: "var(--font-data)", fontSize: 11, color: "#8A9A8A", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>Set status</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Object.entries(STAGE_LABELS).map(([key, label]) => (
                            <button
                              key={key}
                              onClick={() => { onUpdateStatus(opp.id, key); setEditingStatusId(null); }}
                              aria-pressed={status === key}
                              style={{
                                fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                                background: status === key ? (STAGE_STYLE[key]?.bg || "#E0F0E0") : "#fff",
                                color: status === key ? (STAGE_STYLE[key]?.color || "#2A5A2A") : "#5A6A5A",
                                border: `1px solid ${status === key ? "transparent" : "#D8E8D8"}`,
                                borderRadius: 20, padding: "4px 12px", cursor: "pointer",
                                fontWeight: status === key ? 600 : 400,
                              }}
                            >{label}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stage stepper dots — hidden while editing */}
                    {!isTerminal && !isEditing && (
                      <div style={{ display: "flex", gap: 4, marginBottom: 10, alignItems: "center" }}>
                        {STAGE_ORDER.map((s, i) => (
                          <div key={s} style={{
                            height: 4, flex: 1, borderRadius: 2,
                            background: i <= stageIdx ? "#3A7A3A" : "#E0E8E0",
                            transition: "background 0.3s",
                          }} />
                        ))}
                      </div>
                    )}

                    {/* Action row — hidden while editing */}
                    {!isEditing && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {nextStage && !isFinalRound && (
                          <button
                            onClick={() => onUpdateStatus(opp.id, nextStage)}
                            aria-label={`Move to ${STAGE_LABELS[nextStage]}`}
                            style={{
                              fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                              background: "#1A2E1A", color: "#E8F0E8", border: "none",
                              borderRadius: 20, padding: "4px 12px", cursor: "pointer",
                            }}>→ {STAGE_LABELS[nextStage]}</button>
                        )}
                        {isFinalRound && (
                          <>
                            <button
                              onClick={() => onUpdateStatus(opp.id, "offer")}
                              aria-label="Mark as Offer Extended"
                              style={{
                                fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                                background: "#1A2E1A", color: "#E8F0E8", border: "none",
                                borderRadius: 20, padding: "4px 12px", cursor: "pointer",
                              }}>✓ Offer Extended</button>
                            <button
                              onClick={() => onUpdateStatus(opp.id, "rejected")}
                              aria-label="Mark as Rejected"
                              style={{
                                fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                                background: "#F8ECEC", color: "#C05050", border: "1px solid #E8D0D0",
                                borderRadius: 20, padding: "4px 12px", cursor: "pointer",
                              }}>✕ Rejected</button>
                          </>
                        )}
                        {!isTerminal && (
                          <button
                            onClick={() => onUpdateStatus(opp.id, "withdrew")}
                            aria-label="Mark as Withdrew"
                            style={{
                              fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                              background: "transparent", color: "#8A9A8A", border: "1px solid #D8E8D8",
                              borderRadius: 20, padding: "4px 12px", cursor: "pointer",
                            }}>Withdrew</button>
                        )}
                        {!isTerminal && !isFinalRound && stageIdx >= 1 && (
                          <button
                            onClick={() => onUpdateStatus(opp.id, "rejected")}
                            aria-label="Mark as Rejected"
                            style={{
                              fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".06em",
                              background: "transparent", color: "#C05050", border: "1px solid #E8D0D0",
                              borderRadius: 20, padding: "4px 12px", cursor: "pointer",
                            }}>✕ Rejected</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {opportunities.length > 0 && (
        <section aria-labelledby="prev-heading" style={{ marginTop: 32 }}>
          <div className="section-label" aria-hidden="true">{t.prevScored}</div>
          <h2 className="sr-only" id="prev-heading">{t.prevScored}</h2>
          <p className="threshold-label">{t.threshold}: {profile.threshold}</p>
          <div role="list">
            {sorted.map((opp, idx) => {
              const isSelected = selectedForCompare.has(opp.id);
              const isDisabled = compareMode && selectedForCompare.size === 2 && !isSelected;
              const isApplied = !!opp.applied_at;
              const isHero = idx === 0 && !compareMode && sorted.length > 0;

              return (
                <div key={opp.id} style={{ position: "relative", marginBottom: isHero ? 16 : 12 }}>
                  <button
                    className="opp-card"
                    role="listitem"
                    onClick={() => compareMode ? toggleCompareSelect(opp.id) : onViewOpp(opp)}
                    aria-label={`${opp.role_title} at ${opp.company}. Score ${opp.overall_score.toFixed(1)} out of 5. Recommendation: ${opp.recommendation}.`}
                    style={{
                      marginBottom: 0,
                      ...(isHero ? {
                        background: "#1A2E1A",
                        border: "1px solid #2D4A2D",
                        borderRadius: 12,
                        padding: "22px 24px",
                      } : {}),
                      ...(compareMode ? {
                        borderColor: isSelected ? "var(--ink)" : isDisabled ? "var(--border)" : "var(--border)",
                        borderWidth: isSelected ? 2 : 1.5,
                        opacity: isDisabled ? 0.5 : 1,
                        background: isSelected ? "var(--cream)" : "#fff",
                      } : {}),
                    }}
                  >
                    <div className="opp-card-left">
                      {isHero && (
                        <div style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "#7AB87A", marginBottom: 6 }}>
                          Top Match
                        </div>
                      )}
                      <div className="opp-title" style={isHero ? { color: "#E8F0E8" } : {}}>{opp.role_title}</div>
                      <div className="opp-company" style={isHero ? { color: "#7AB87A" } : {}}>{opp.company}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 1, minWidth: 0 }}>
                      {compareMode && (
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? "var(--ink)" : "var(--border)"}`,
                          background: isSelected ? "var(--ink)" : "transparent", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {isSelected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                        </div>
                      )}
                      <span
                        className={isHero ? "" : `score-badge ${opp.overall_score >= 4 ? "score-high" : opp.overall_score >= profile.threshold ? "score-mid" : "score-low"}`}
                        style={isHero ? {
                          fontFamily: "var(--font-data)", fontWeight: 600, fontSize: 22,
                          color: "#E8F0E8", letterSpacing: "-.02em",
                        } : {}}
                        aria-hidden="true"
                      >{opp.overall_score.toFixed(1)}</span>
                    </div>
                  </button>
                  {!compareMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isApplied) {
                          const appliedAt = new Date().toISOString();
                          onMarkApplied?.(opp.id, appliedAt);
                        }
                      }}
                      aria-label={isApplied ? `${opp.role_title} marked as applied` : `Mark ${opp.role_title} as applied`}
                      style={{
                        fontFamily: "var(--font-data)",
                        fontSize: 11,
                        color: isApplied
                          ? (isHero ? "#7AB87A" : "#3A7A3A")
                          : (isHero ? "#5A8A5A" : "#8A9A8A"),
                        background: isApplied
                          ? (isHero ? "rgba(122,184,122,0.15)" : "#E0F0E0")
                          : "transparent",
                        border: isApplied
                          ? "none"
                          : `1px solid ${isHero ? "#2D4A2D" : "#D8E8D8"}`,
                        borderRadius: 20,
                        padding: "3px 10px",
                        cursor: isApplied ? "default" : "pointer",
                        display: "block",
                        marginTop: 4,
                        marginLeft: "auto",
                        marginRight: 0,
                        width: "fit-content",
                      }}
                    >
                      {isApplied ? "✓ Applied" : "Mark Applied"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      {opportunities.length === 0 && !loading && (
        <div className="empty-state" aria-live="polite">
          <div aria-hidden="true" className="empty-state-icon">◎</div>
          <p>{t.emptyState}</p>
        </div>
      )}

      {/* ── Dashboard Guide overlay ── */}
      {showGuide && (() => {
        const slide = GUIDE_SLIDES[guideStep];
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
            onClick={(e) => { if (e.target === e.currentTarget) closeGuide(); }}
          >
            <div style={{
              background: "#FAFAF8", borderRadius: "16px 16px 0 0",
              width: "100%", maxWidth: 480,
              padding: "28px 24px 36px",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
            }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <span style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#8A9A8A" }}>
                  {guideStep + 1} of {GUIDE_SLIDES.length}
                </span>
                <button onClick={closeGuide} aria-label="Close guide" style={{ background: "none", border: "none", cursor: "pointer", color: "#8A9A8A", fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
              </div>

              {/* Slide content */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{
                  fontFamily: slide.mono ? "var(--font-data)" : "var(--font-prose)",
                  fontSize: slide.mono ? 36 : 40,
                  fontWeight: 700,
                  color: "#1A2E1A",
                  marginBottom: 16,
                  lineHeight: 1,
                }}>{slide.icon}</div>
                <h3 style={{
                  fontFamily: "var(--font-prose)",
                  fontSize: 20, fontWeight: 700, color: "#1A2E1A",
                  marginBottom: 12,
                }}>{slide.title}</h3>
                <p style={{
                  fontFamily: "var(--font-prose)",
                  fontSize: 15, color: "#5A6A5A", lineHeight: 1.7,
                  maxWidth: 320, margin: "0 auto",
                }}>{slide.body}</p>
              </div>

              {/* Progress dots */}
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

              {/* Nav buttons */}
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
