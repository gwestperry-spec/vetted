import { useState, useRef } from "react";
import { exportOpportunityPdf } from "../utils/exportPdf.js";
import { ENDPOINTS } from "../config.js";
import { handleError } from "../handleError.js";

const WEIGHT_OPTIONS = [
  { value: 0.5, label: "Minor" },
  { value: 1.0, label: "Standard" },
  { value: 1.2, label: "Relevant" },
  { value: 1.3, label: "Important" },
  { value: 1.5, label: "Critical" },
  { value: 2.0, label: "Critical +" },
];

const COACHING_SECTIONS = [
  { key: "interview_prep",    label: "Interview Preparation",    icon: "💬" },
  { key: "positioning_angle", label: "How to Position Yourself", icon: "🎯" },
  { key: "negotiation",       label: "Negotiation Leverage",     icon: "⚖️" },
  { key: "go_no_go",          label: "Coaching Verdict",         icon: "📋" },
];

const COACHING_STYLES = {
  conservative: {
    label: "Advisor",
    description: "Honest counsel — protect optionality, surface real risks",
    instruction: `Coaching style: ADVISOR.
You are acting as a trusted advisor whose job is to protect the candidate's long-term career capital.
- Frame the candidate's positioning carefully and protect their current reputation.
- Highlight risks and gaps honestly; suggest they address weaknesses before engaging.
- Interview prep should focus on honest, measured answers — no overreach.
- Negotiation advice should be realistic and grounded; don't overestimate leverage.
- Verdict should prioritize fit, stability, and informed decision-making over speed.`,
  },
  assertive: {
    label: "Advocate",
    description: "Argue their strongest case — compress the timeline",
    instruction: `Coaching style: ADVOCATE.
You are acting as a fierce advocate whose job is to help the candidate win this specific opportunity.
- Frame the candidate's background at its highest credible interpretation.
- Minimise gaps in language — reframe them as growth opportunities or learning edges.
- Interview prep should coach them to lead with strengths and redirect gap questions confidently.
- Negotiation advice should identify every angle of leverage and coach them to use it.
- Verdict should lean toward action and controlled risk if the upside is real.`,
  },
};

function isVantage(tier) {
  return tier === "vantage" || tier === "vantage_lifetime";
}

const LANG_NAMES = {
  en: "English", es: "Spanish", zh: "Chinese (Simplified)",
  fr: "French",  ar: "Arabic",  vi: "Vietnamese",
};

// ─── Application Status Tracker ──────────────────────────────────────────────
const FUNNEL_STAGES = [
  { key: "applied",      label: "Applied" },
  { key: "phone_screen", label: "Phone Screen" },
  { key: "interview",    label: "Interview" },
  { key: "final_round",  label: "Final Round" },
];

const OUTCOMES = [
  { key: "offer",    label: "Offer",    color: "var(--success)" },
  { key: "rejected", label: "Rejected", color: "var(--accent)" },
  { key: "withdrew", label: "Withdrew", color: "var(--muted)" },
];

function ApplicationStatusTracker({ status, onUpdateStatus }) {
  const isTerminal = ["offer", "rejected", "withdrew"].includes(status);
  const activeFunnelIdx = FUNNEL_STAGES.findIndex(s => s.key === status);

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <p style={{
        fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".15em",
        textTransform: "uppercase", color: "var(--muted)", marginBottom: 12, fontWeight: 700,
      }}>
        Application Status
      </p>

      {/* Funnel stage pills */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {FUNNEL_STAGES.map((stage, i) => {
          const isPast    = !isTerminal && activeFunnelIdx > i;
          const isCurrent = !isTerminal && activeFunnelIdx === i;
          return (
            <button
              key={stage.key}
              onClick={() => onUpdateStatus?.(stage.key)}
              style={{
                flex: 1, padding: "7px 4px", borderRadius: 6, border: "1.5px solid",
                borderColor: (isCurrent || isPast) ? "var(--success)" : "var(--border)",
                background: isCurrent ? "var(--success)" : isPast ? "rgba(26,46,26,0.07)" : "transparent",
                color: isCurrent ? "#fff" : isPast ? "var(--success)" : "var(--muted)",
                fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
                letterSpacing: ".04em", textTransform: "uppercase",
                cursor: "pointer", transition: "all .15s", textAlign: "center", lineHeight: 1.3,
              }}
            >
              {stage.label}
            </button>
          );
        })}
      </div>

      {/* Terminal outcome chips */}
      <div style={{ display: "flex", gap: 6 }}>
        {OUTCOMES.map(outcome => {
          const isActive = status === outcome.key;
          return (
            <button
              key={outcome.key}
              onClick={() => onUpdateStatus?.(outcome.key)}
              style={{
                padding: "4px 12px", borderRadius: 20, border: "1.5px solid",
                borderColor: isActive ? outcome.color : "var(--border)",
                background: isActive ? outcome.color : "transparent",
                color: isActive ? "#fff" : "var(--muted)",
                fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
                letterSpacing: ".06em", textTransform: "uppercase",
                cursor: "pointer", transition: "all .15s",
              }}
            >
              {outcome.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section Carousel — VQ insight panels ────────────────────────────────────
function SectionCarousel({ opp, t }) {
  const sections = [
    opp.recommendation_rationale && {
      key: "summary",
      label: t.recRationale || "Summary",
      icon: "◎",
      color: "var(--accent)",
      content: <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--ink)" }}>{opp.recommendation_rationale}</p>,
    },
    opp.honest_fit_summary && {
      key: "honest",
      label: t.honestFit || "Honest Assessment",
      icon: "⚖",
      color: "var(--gold)",
      content: <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--ink)" }}>{opp.honest_fit_summary}</p>,
    },
    (opp.strengths?.length > 0) && {
      key: "strengths",
      label: t.strengths || "Where You're Strong",
      icon: "↑",
      color: "var(--success)",
      content: (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {opp.strengths.map((s, i) => (
            <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingBottom: 10, fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>
              <span style={{ color: "var(--success)", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
              {s}
            </li>
          ))}
        </ul>
      ),
    },
    (opp.gaps?.length > 0) && {
      key: "gaps",
      label: t.gaps || "Real Gaps",
      icon: "↓",
      color: "var(--accent)",
      content: (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {opp.gaps.map((g, i) => (
            <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingBottom: 10, fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>
              <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>△</span>
              {g}
            </li>
          ))}
        </ul>
      ),
    },
    opp.narrative_bridge && {
      key: "bridge",
      label: t.narrativeBridge || "Your Narrative",
      icon: "→",
      color: "var(--muted)",
      content: <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--ink)" }}>{opp.narrative_bridge}</p>,
    },
  ].filter(Boolean);

  const [idx, setIdx] = useState(0);
  const touchStartX = useRef(null);
  const total = sections.length;
  if (!total) return null;

  const sec = sections[idx];

  function prev() { setIdx(i => Math.max(0, i - 1)); }
  function next() { setIdx(i => Math.min(total - 1, i + 1)); }
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -44) next();
    else if (dx > 44) prev();
    touchStartX.current = null;
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Tab strip — wraps to 2 rows on small screens, never scrolls horizontally */}
      <div style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
        {sections.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setIdx(i)}
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              padding: "10px 10px",
              fontSize: 10, fontWeight: 600,
              fontFamily: "var(--font-data)",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              border: "none",
              borderBottom: i === idx ? `2px solid ${s.color}` : "2px solid transparent",
              background: "transparent",
              color: i === idx ? s.color : "var(--muted)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: "all .15s",
              textAlign: "center",
            }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ padding: "22px 20px", minHeight: 160 }}
        aria-live="polite"
        aria-label={sec.label}
      >
        {sec.content}
      </div>

      {/* Swipe nav row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 14px" }}>
        <button
          onClick={prev} disabled={idx === 0}
          aria-label="Previous section"
          style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.25 : 0.6, fontSize: 18, padding: "4px 8px", minHeight: 36 }}
        >‹</button>
        <span style={{ fontFamily: "var(--font-data)", fontSize: 11, color: "var(--muted)", letterSpacing: ".1em" }}>
          {idx + 1} / {total}  ·  SWIPE OR TAP
        </span>
        <button
          onClick={next} disabled={idx === total - 1}
          aria-label="Next section"
          style={{ background: "none", border: "none", cursor: idx === total - 1 ? "default" : "pointer", opacity: idx === total - 1 ? 0.25 : 0.6, fontSize: 18, padding: "4px 8px", minHeight: 36 }}
        >›</button>
      </div>
    </div>
  );
}

// ─── Filter Carousel ──────────────────────────────────────────────────────────
function FilterCarousel({ filterScores, t }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef(null);
  const total = filterScores.length;
  if (!total) return null;

  const fs = filterScores[idx];
  const filled = Math.round(fs.score);
  const col = fs.score >= 4 ? "var(--success)" : fs.score >= 3 ? "var(--gold)" : "var(--accent)";

  function prev() { setIdx(i => Math.max(0, i - 1)); }
  function next() { setIdx(i => Math.min(total - 1, i + 1)); }

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -44) next();
    else if (dx > 44) prev();
    touchStartX.current = null;
  }

  return (
    <section aria-labelledby="filter-bd-heading">
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 id="filter-bd-heading" className="section-label" style={{ marginBottom: 0 }}>{t.filterBreakdown}</h2>
        <span style={{ fontFamily: "var(--font-data)", fontSize: 11, color: "var(--muted)", letterSpacing: ".08em" }}>
          {idx + 1} / {total}
        </span>
      </div>

      {/* Card */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          background: "#fff",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "24px 22px",
          userSelect: "none",
          minHeight: 200,
          position: "relative",
        }}
      >
        {/* Filter name + weight */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 18 }}>
          <h3 style={{ fontFamily: "var(--font-prose)", fontSize: 18, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>
            {fs.filter_name}
          </h3>
          {fs.weight && fs.weight !== 1.0 && (
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700,
              letterSpacing: ".1em", textTransform: "uppercase",
              background: "var(--cream)", color: "var(--muted)",
              padding: "3px 8px", borderRadius: 20, flexShrink: 0, marginTop: 3,
            }}>
              {WEIGHT_OPTIONS.find(w => w.value === fs.weight)?.label || `${fs.weight}×`}
            </span>
          )}
        </div>

        {/* Score */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <span style={{ fontFamily: "var(--font-data)", fontSize: 38, fontWeight: 500, color: col, lineHeight: 1 }}>
            {fs.score}
          </span>
          <div>
            <div style={{ display: "flex", gap: 5, marginBottom: 6 }} aria-hidden="true">
              {[1,2,3,4,5].map(n => (
                <div key={n} style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: n <= filled
                    ? (fs.score >= 4 ? "var(--gold)" : col)
                    : "var(--border)",
                  transition: "background .2s",
                }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-data)" }}>out of 5</span>
          </div>
        </div>

        {/* Bar */}
        <div style={{ height: 6, background: "var(--border)", borderRadius: 3, marginBottom: 18, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(fs.score / 5) * 100}%`, background: col, borderRadius: 3, transition: "width .3s" }} />
        </div>

        {/* Rationale */}
        <p style={{ fontSize: 13, lineHeight: 1.75, color: "var(--ink)", margin: 0 }}>
          {fs.rationale}
        </p>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <button
          onClick={prev} disabled={idx === 0}
          aria-label="Previous filter"
          style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: "var(--r)", padding: "6px 14px", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1, fontSize: 16, minWidth: 40, minHeight: 36 }}
        >‹</button>

        {/* Dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }} role="tablist" aria-label="Filter navigation">
          {filterScores.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === idx}
              aria-label={`Filter ${i + 1}`}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 20 : 7, height: 7,
                borderRadius: 4,
                background: i === idx ? "var(--accent)" : "var(--border)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all .2s",
              }}
            />
          ))}
        </div>

        <button
          onClick={next} disabled={idx === total - 1}
          aria-label="Next filter"
          style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: "var(--r)", padding: "6px 14px", cursor: idx === total - 1 ? "default" : "pointer", opacity: idx === total - 1 ? 0.3 : 1, fontSize: 16, minWidth: 40, minHeight: 36 }}
        >›</button>
      </div>
    </section>
  );
}

export default function ScoreResult({ t, lang, opp, profile, onBack, onRemove, onUpdateStatus, userTier, authUser, onUpgrade }) {
  if (!opp) return null;

  // Local status state — gives immediate UI feedback; parent persists async
  const [localStatus, setLocalStatus] = useState(opp.application_status || "applied");

  function handleStatusUpdate(newStatus) {
    setLocalStatus(newStatus);
    onUpdateStatus?.(opp.id, newStatus);
  }

  // Cache coaching per style so switching doesn't re-fetch unnecessarily
  const [coachingCache, setCoachingCache] = useState({});
  const [coachingStyle, setCoachingStyle] = useState("conservative");
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingError, setCoachingError] = useState("");
  const [coachingOpen, setCoachingOpen] = useState(false);

  const sc = opp.overall_score >= 4 ? "high" : opp.overall_score >= profile.threshold ? "mid" : "low";
  const canVantage = isVantage(userTier);
  const coaching = coachingCache[coachingStyle] || null;

  function handleStyleChange(style) {
    setCoachingStyle(style);
    setCoachingError("");
    // If we already have a cached result for this style, show it immediately
    if (coachingCache[style]) {
      setCoachingOpen(true);
    }
  }

  async function fetchCoaching() {
    if (!canVantage) { onUpgrade?.(); return; }
    // Already cached for this style — just open
    if (coachingCache[coachingStyle]) { setCoachingOpen(true); return; }
    if (coachingLoading) return;

    setCoachingLoading(true);
    setCoachingError("");
    setCoachingOpen(true);

    try {
      const profileSummary = [
        profile.name             && `Name: ${profile.name}`,
        profile.currentTitle     && `Title: ${profile.currentTitle}`,
        profile.background       && `Background: ${profile.background}`,
        profile.careerGoal       && `Career Goal: ${profile.careerGoal}`,
        profile.targetRoles?.length      && `Target Roles: ${profile.targetRoles.join(", ")}`,
        profile.targetIndustries?.length && `Industries: ${profile.targetIndustries.join(", ")}`,
        profile.compensationMin  && `Comp Min: $${profile.compensationMin}`,
        profile.hardConstraints  && `Constraints: ${profile.hardConstraints}`,
      ].filter(Boolean).join("\n");

      const filterSummary = (opp.filter_scores || [])
        .map(fs => `- ${fs.filter_name}: ${fs.score}/5 — ${fs.rationale}`)
        .join("\n");

      const styleConfig = COACHING_STYLES[coachingStyle];
      const langName = LANG_NAMES[lang] || "English";

      const prompt = `You are an executive career coach reviewing a job opportunity assessment for a senior professional.

Respond entirely in ${langName}. All JSON values must be written in ${langName}.

${styleConfig.instruction}

CANDIDATE PROFILE:
${profileSummary}

OPPORTUNITY: ${opp.role_title} at ${opp.company}
VQ SCORE: ${opp.overall_score.toFixed(1)}/5 (${opp.recommendation})
RECOMMENDATION RATIONALE: ${opp.recommendation_rationale}
HONEST FIT: ${opp.honest_fit_summary}

FILTER SCORES:
${filterSummary}

STRENGTHS: ${(opp.strengths || []).join("; ")}
GAPS: ${(opp.gaps || []).join("; ")}

Respond ONLY with valid JSON (no markdown) in exactly this shape:
{
  "interview_prep": "3–4 specific interview questions they will likely face based on their gaps, with a brief coaching note on how to answer each. Apply the coaching style above.",
  "positioning_angle": "In 2–3 sentences, exactly how they should frame their background and trajectory for this specific role. Reference their actual experience. Apply the coaching style above.",
  "negotiation": "What specific factors give them negotiation leverage here — and what doesn't. Apply the coaching style to how forcefully they should use it.",
  "go_no_go": "A direct coaching verdict consistent with the coaching style: pursue, approach cautiously, or pass? Why, in 2–3 sentences. Reference the score and their career goal."
}`;

      const res = await fetch(ENDPOINTS.anthropic, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Vetted-Token": authUser?.sessionToken || "" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          appleId: authUser?.id,
          sessionToken: authUser?.sessionToken || "",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const text = data.content?.map(b => (typeof b.text === "string" ? b.text : "")).join("") || "";
      const raw = JSON.parse(text.replace(/```json|```/g, "").trim());

      setCoachingCache(prev => ({
        ...prev,
        [coachingStyle]: {
          interview_prep:    String(raw.interview_prep    || ""),
          positioning_angle: String(raw.positioning_angle || ""),
          negotiation:       String(raw.negotiation       || ""),
          go_no_go:          String(raw.go_no_go          || ""),
        },
      }));
    } catch (err) {
      handleError(err, "coaching_prompts");
      setCoachingError("Coaching failed to load. Please try again.");
    } finally {
      setCoachingLoading(false);
    }
  }

  return (
    <main id="main-content" aria-label={opp.role_title}>
      <button className="back-link" onClick={onBack}>{t.backDash}</button>
      <article aria-labelledby="result-title">
        <div className="card">
          <p style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{opp.company}</p>
          <h1 className="card-title" id="result-title" style={{ fontSize: 26, color: "#1A2E1A" }}>{opp.role_title}</h1>
          <div className="overall-score-display">
            <div className={`big-score ${sc}`} aria-label={`${t.weightedScore}: ${opp.overall_score.toFixed(1)}`}>{opp.overall_score.toFixed(1)}</div>
            <div className="score-meta">
              <p className="score-meta-label">{t.weightedScore}</p>
              <span className={`recommendation-badge rec-${opp.recommendation}`}>{t[opp.recommendation] || opp.recommendation}</span>
              <p className="threshold-note">{t.threshold}: {profile.threshold} — {opp.overall_score >= profile.threshold ? t.aboveThreshold : t.belowThreshold}</p>
            </div>
          </div>
        </div>

        <ApplicationStatusTracker status={localStatus} onUpdateStatus={handleStatusUpdate} />

        <SectionCarousel opp={opp} t={t} />

        <div className="card">
          <FilterCarousel filterScores={opp.filter_scores || []} t={t} />
        </div>


        {/* ── Career Coaching (Vantage) ───────────────────────────────────── */}
        <section className="card" aria-labelledby="coaching-heading">
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 id="coaching-heading" className="card-title" style={{ fontSize: 16, marginBottom: 0, color: "#1A2E1A" }}>Career Coaching</h2>
              {!canVantage && (
                <span style={{ fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", background: "var(--gold)", color: "#fff", padding: "2px 7px", borderRadius: 20 }}>Vantage</span>
              )}
            </div>

            {/* Style toggle — only shown for Vantage users */}
            {canVantage && (
              <div role="group" aria-label="Coaching style" style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden", flexShrink: 0 }}>
                {Object.entries(COACHING_STYLES).map(([key, style]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleStyleChange(key)}
                    aria-pressed={coachingStyle === key}
                    style={{
                      padding: "6px 14px",
                      minHeight: 34,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      border: "none",
                      borderRight: key === "conservative" ? "1px solid var(--border)" : "none",
                      cursor: "pointer",
                      background: coachingStyle === key ? "var(--ink)" : "transparent",
                      color: coachingStyle === key ? "#fff" : "var(--muted)",
                      transition: "all .15s",
                    }}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Style description — shows current mode when open */}
          {canVantage && coachingOpen && coaching && (
            <p style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-data)", letterSpacing: ".05em", marginBottom: 16 }}>
              {COACHING_STYLES[coachingStyle].description}
            </p>
          )}

          {/* Upsell for non-Vantage */}
          {!canVantage && (
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
              Personalized interview prep, positioning strategy, and negotiation leverage.{" "}
              <button onClick={() => onUpgrade?.()} style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0, textDecoration: "underline" }}>
                Upgrade to Vantage
              </button>
            </p>
          )}

          {/* Get Coaching / Hide button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={canVantage ? fetchCoaching : () => onUpgrade?.()}
            disabled={coachingLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: coachingOpen ? 20 : 0 }}
          >
            {coachingLoading ? (
              <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} aria-hidden="true" /> Analyzing…</>
            ) : coaching && coachingOpen ? "Hide Coaching" : canVantage ? "Get Coaching" : "🔒 Get Coaching"}
          </button>

          {coachingOpen && (
            <>
              {coachingError && (
                <div role="alert" style={{ background: "var(--pass-bg)", color: "var(--pass)", padding: "10px 14px", borderRadius: 4, fontSize: 13, marginBottom: 16 }}>
                  {coachingError}
                </div>
              )}

              {coachingLoading && !coaching && (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-data)", fontSize: 11, color: "var(--muted)", letterSpacing: ".1em" }}>
                    Generating {coachingStyle === "conservative" ? "advisor" : "advocate"} coaching…
                  </div>
                </div>
              )}

              {coaching && COACHING_SECTIONS.map((section, i) => {
                const sectionLabels = {
                  interview_prep:    t.coachingInterviewPrep || section.label,
                  positioning_angle: t.coachingPositioning   || section.label,
                  negotiation:       t.coachingNegotiation   || section.label,
                  go_no_go:          t.coachingVerdict        || section.label,
                };
                return (
                <div key={section.key} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < COACHING_SECTIONS.length - 1 ? "1px solid var(--cream)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span aria-hidden="true" style={{ fontSize: 16 }}>{section.icon}</span>
                    <h3 style={{ fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--muted)" }}>
                      {sectionLabels[section.key]}
                    </h3>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--ink)", whiteSpace: "pre-line" }}>
                    {coaching[section.key]}
                  </p>
                </div>
              ); })}

              {/* Re-generate with other style nudge */}
              {coaching && !coachingLoading && (
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                  Want a different perspective?{" "}
                  <button
                    onClick={() => {
                      const other = coachingStyle === "conservative" ? "assertive" : "conservative";
                      handleStyleChange(other);
                    }}
                    style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: 0, textDecoration: "underline" }}
                  >
                    Switch to {coachingStyle === "conservative" ? "Advocate" : "Advisor"}
                  </button>
                </p>
              )}
            </>
          )}
        </section>

        {/* ── Priority Support (Vantage #7) ──────────────────────────────────── */}
        {canVantage && (
          <section className="card" aria-labelledby="support-heading" style={{ borderLeft: "3px solid var(--gold)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 id="support-heading" className="card-title" style={{ fontSize: 15, marginBottom: 4, color: "#1A2E1A", display: "flex", alignItems: "center", gap: 8 }}>
                  {t.prioritySupport || "Priority Support"}
                  <span style={{ fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", background: "var(--gold)", color: "#fff", padding: "2px 7px", borderRadius: 20 }}>Vantage</span>
                </h2>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                  {t.prioritySupportDesc || "Direct line to the Vetted team. We respond within 4 business hours."}
                </p>
              </div>
              <a
                href={`mailto:support@tryvettedai.com?subject=${encodeURIComponent(`[Priority Support] ${authUser?.displayName || "Vantage User"} — ${opp.role_title} at ${opp.company}`)}&body=${encodeURIComponent(`Hi Vetted Team,\n\nI'm reviewing: ${opp.role_title} at ${opp.company} (VQ Score: ${opp.overall_score.toFixed(1)} / ${opp.recommendation})\n\nI need help with:\n\n`)}`}
                className="btn btn-secondary btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", flexShrink: 0 }}
              >
                ✉ {t.contactSupport || "Contact Support"}
              </a>
            </div>
          </section>
        )}

        <div className="btn-actions" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-secondary" onClick={onBack}>{t.backDash}</button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {canVantage ? (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => exportOpportunityPdf(opp, profile)}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span aria-hidden="true">↓</span> Export PDF
              </button>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onUpgrade?.()}
                style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.7 }}
                title="Vantage feature"
              >
                <span aria-hidden="true">🔒</span> Export PDF
              </button>
            )}
            <button className="btn btn-danger btn-sm" onClick={onRemove}>{t.removeOpp}</button>
          </div>
        </div>
      </article>
    </main>
  );
}
