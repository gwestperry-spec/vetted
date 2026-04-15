import { useState } from "react";
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

// ─── B2 Side Panel Icons ───────────────────────────────────────────────────────
function IconScore({ active }) {
  const c = active ? "#3A7A3A" : "#8A9A8A";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.5"/>
      <line x1="10" y1="10" x2="10" y2="5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="10" x2="13" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconInsights({ active }) {
  const fill = active ? "#3A7A3A" : "#8A9A8A";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="16" height="14" rx="2" fill={fill}/>
      <line x1="5" y1="8" x2="15" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="12" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconFilters({ active }) {
  const c = active ? "#3A7A3A" : "#8A9A8A";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <line x1="3" y1="6" x2="17" y2="6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="10" x2="15" y2="10" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7" y1="14" x2="13" y2="14" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconCoach({ active }) {
  const c = active ? "#3A7A3A" : "#8A9A8A";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 4C3 3.45 3.45 3 4 3H16C16.55 3 17 3.45 17 4V12C17 12.55 16.55 13 16 13H8.5L4.5 17V13H4C3.45 13 3 12.55 3 12V4Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCompare({ active }) {
  const c = active ? "#3A7A3A" : "#8A9A8A";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="7" height="12" rx="1.5" stroke={c} strokeWidth="1.5"/>
      <rect x="11" y="4" width="7" height="12" rx="1.5" stroke={c} strokeWidth="1.5"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { key: "score",    label: "SCORE",    Icon: IconScore },
  { key: "insights", label: "INSIGHTS", Icon: IconInsights },
  { key: "filters",  label: "FILTERS",  Icon: IconFilters },
  { key: "coach",    label: "COACH",    Icon: IconCoach },
  { key: "compare",  label: "COMPARE",  Icon: IconCompare },
];

// ─── Application Status Tracker ───────────────────────────────────────────────
function ApplicationStatusTracker({ status, onUpdateStatus }) {
  const isTerminal = ["offer", "rejected", "withdrew"].includes(status);
  const activeFunnelIdx = FUNNEL_STAGES.findIndex(s => s.key === status);

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <p style={{
        fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".15em",
        textTransform: "uppercase", color: "#1A2E1A", marginBottom: 12, fontWeight: 700,
      }}>
        Application Status
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {FUNNEL_STAGES.map((stage, i) => {
          const isPast    = !isTerminal && activeFunnelIdx > i;
          const isCurrent = !isTerminal && activeFunnelIdx === i;
          return (
            <button
              key={stage.key}
              onClick={() => onUpdateStatus?.(stage.key)}
              aria-pressed={isCurrent}
              style={{
                flex: 1, padding: "7px 4px", borderRadius: 6, border: "1.5px solid",
                borderColor: (isCurrent || isPast) ? "var(--success)" : "var(--border)",
                background: isCurrent ? "var(--success)" : isPast ? "rgba(26,46,26,0.07)" : "transparent",
                color: isCurrent ? "#fff" : isPast ? "var(--success)" : "var(--muted)",
                fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
                letterSpacing: ".04em", textTransform: "uppercase",
                cursor: "pointer", transition: "all .15s", textAlign: "center", lineHeight: 1.3,
                minHeight: 44,
              }}
            >
              {stage.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {OUTCOMES.map(outcome => {
          const isActive = status === outcome.key;
          return (
            <button
              key={outcome.key}
              onClick={() => onUpdateStatus?.(outcome.key)}
              aria-pressed={isActive}
              style={{
                padding: "4px 12px", borderRadius: 20, border: "1.5px solid",
                borderColor: isActive ? outcome.color : "var(--border)",
                background: isActive ? outcome.color : "transparent",
                color: isActive ? "#fff" : "var(--muted)",
                fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
                letterSpacing: ".06em", textTransform: "uppercase",
                cursor: "pointer", transition: "all .15s", minHeight: 44,
                display: "inline-flex", alignItems: "center",
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

// ─── Insights Section — stacked narrative flow ────────────────────────────────
function InsightsSection({ opp, t }) {
  const SECTION_DEFS = [
    {
      key: "rec",
      label: t.recRationale || "RECOMMENDATION RATIONALE",
      text: opp.recommendation_rationale,
      isList: false,
      isGap: false,
    },
    {
      key: "honest",
      label: t.honestFit || "HONEST FIT ASSESSMENT",
      text: opp.honest_fit_summary,
      isList: false,
      isGap: false,
    },
    {
      key: "strengths",
      label: t.strengths || "WHERE YOU ARE STRONG",
      list: opp.strengths,
      isList: true,
      isGap: false,
    },
    {
      key: "gaps",
      label: t.gaps || "REAL GAPS",
      list: opp.gaps,
      isList: true,
      isGap: true,
    },
    {
      key: "bridge",
      label: t.narrativeBridge || "NARRATIVE BRIDGE",
      text: opp.narrative_bridge,
      isList: false,
      isGap: false,
    },
  ].filter(s => s.isList ? (s.list?.length > 0) : !!s.text);

  if (!SECTION_DEFS.length) return (
    <div style={{ padding: 16, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
      No insights available.
    </div>
  );

  return (
    <div style={{ padding: "14px 14px 32px" }}>
      {SECTION_DEFS.map((sec, i) => (
        <div key={sec.key} style={{ marginBottom: i < SECTION_DEFS.length - 1 ? 14 : 0 }}>
          {/* Label row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 8, letterSpacing: "0.10em",
              color: "#8A9A8A", textTransform: "uppercase", whiteSpace: "nowrap",
            }}>
              {sec.label}
            </span>
            <div style={{ flex: 1, height: "0.5px", background: "#D8E8D8" }} />
          </div>
          {/* Body */}
          {sec.isList ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {sec.list.map((item, idx) => (
                <li key={idx} style={{
                  display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6,
                  fontFamily: "var(--font-prose)", fontSize: 12, lineHeight: 1.65,
                  color: sec.isGap ? "#7A3A3A" : "#2A3A2A",
                }}>
                  <span style={{
                    color: sec.isGap ? "#C05050" : "#3A7A3A",
                    flexShrink: 0, marginTop: 1, fontWeight: 700,
                  }}>
                    {sec.isGap ? "△" : "✓"}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{
              fontFamily: "var(--font-prose)", fontSize: 12, fontWeight: 400,
              lineHeight: 1.65, color: "#2A3A2A", margin: 0,
            }}>
              {sec.text}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Filters Section — stacked visual bars ────────────────────────────────────
function FiltersSection({ filterScores }) {
  if (!filterScores?.length) return (
    <div style={{ padding: 16, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
      No filter scores available.
    </div>
  );

  return (
    <div style={{ padding: "12px 12px 32px" }}>
      {filterScores.map((fs, i) => {
        const barColor = fs.score < 2.5 ? "#C05050" : fs.score <= 3.5 ? "#B8A030" : "#3A7A3A";
        return (
          <div key={i} style={{
            background: "#F0F4F0", borderRadius: 10, padding: "10px 12px", marginBottom: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{
                fontFamily: "var(--font-data)", fontSize: 8, letterSpacing: "0.07em",
                color: "#3A5A3A", textTransform: "uppercase", flex: 1, marginRight: 8,
              }}>
                {fs.filter_name}
                {fs.weight && fs.weight !== 1.0 && (
                  <span style={{ color: "#8A9A8A", marginLeft: 6 }}>
                    · {WEIGHT_OPTIONS.find(w => w.value === fs.weight)?.label || `${fs.weight}×`}
                  </span>
                )}
              </span>
              <span style={{ fontFamily: "var(--font-data)", fontSize: 12, fontWeight: 500, color: barColor, flexShrink: 0 }}>
                {fs.score}
              </span>
            </div>
            <div style={{ height: 4, background: "#D8E8D8", borderRadius: 2, overflow: "hidden", marginBottom: fs.rationale ? 6 : 0 }}>
              <div style={{
                height: "100%", width: `${(fs.score / 5) * 100}%`,
                background: barColor, borderRadius: 2, transition: "width 0.3s",
              }} />
            </div>
            {fs.rationale && (
              <p style={{
                fontFamily: "var(--font-prose)", fontSize: 11, lineHeight: 1.6,
                color: "#5A6A5A", margin: 0,
              }}>
                {fs.rationale}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ScoreResult ───────────────────────────────────────────────────────────────
export default function ScoreResult({ t, lang, opp, profile, onBack, onRemove, onUpdateStatus, userTier, authUser, onUpgrade }) {
  if (!opp) return null;

  const [activeSection, setActiveSection] = useState("score");
  const [localStatus, setLocalStatus] = useState(opp.application_status || "applied");
  const [coachingCache, setCoachingCache] = useState({});
  const [coachingStyle, setCoachingStyle] = useState("conservative");
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingError, setCoachingError] = useState("");
  const [coachingOpen, setCoachingOpen] = useState(false);

  const sc = opp.overall_score >= 4 ? "high" : opp.overall_score >= profile.threshold ? "mid" : "low";
  const canVantage = isVantage(userTier);
  const coaching = coachingCache[coachingStyle] || null;

  function handleStatusUpdate(newStatus) {
    setLocalStatus(newStatus);
    onUpdateStatus?.(opp.id, newStatus);
  }

  function handleStyleChange(style) {
    setCoachingStyle(style);
    setCoachingError("");
    if (coachingCache[style]) setCoachingOpen(true);
  }

  async function fetchCoaching() {
    if (!canVantage) { onUpgrade?.(); return; }
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

  const insightCount = [
    opp.recommendation_rationale,
    opp.honest_fit_summary,
    opp.strengths?.length > 0,
    opp.gaps?.length > 0,
    opp.narrative_bridge,
  ].filter(Boolean).length;

  const sectionDescriptor = {
    score:    "Status",
    insights: `${insightCount} section${insightCount !== 1 ? "s" : ""}`,
    filters:  `${(opp.filter_scores || []).length} filters`,
    coach:    canVantage ? "Advisor · Advocate" : "Vantage",
    compare:  "Dashboard",
  };

  return (
    <main
      id="main-content"
      aria-label={opp.role_title}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - max(env(safe-area-inset-top,44px),44px) - 80px)",
        margin: "0 -16px",
      }}
    >
      {/* Back link */}
      <button
        className="back-link"
        onClick={onBack}
        style={{ margin: "0 16px 6px", alignSelf: "flex-start" }}
      >
        {t.backDash}
      </button>

      {/* ── Score block — pinned, does not scroll ─────────────────────────── */}
      <div style={{ padding: "10px 16px 10px", flexShrink: 0, background: "var(--paper)" }}>
        <p style={{
          fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".15em",
          textTransform: "uppercase", color: "#5A6A5A", marginBottom: 4,
        }}>
          {opp.company}
        </p>
        <h1 style={{
          fontFamily: "var(--font-prose)", fontSize: 20, fontWeight: 700,
          color: "#1A2E1A", marginBottom: 10, lineHeight: 1.2,
        }}>
          {opp.role_title}
        </h1>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div
            className={`big-score ${sc}`}
            aria-label={`${t.weightedScore}: ${opp.overall_score.toFixed(1)}`}
            style={{ fontSize: 52, lineHeight: 1 }}
          >
            {opp.overall_score.toFixed(1)}
          </div>
          <span className={`recommendation-badge rec-${opp.recommendation}`}>
            {t[opp.recommendation] || opp.recommendation}
          </span>
        </div>
        <p style={{
          fontFamily: "var(--font-data)", fontSize: 9, color: "#8A9A8A",
          letterSpacing: "0.06em", marginTop: 6,
        }}>
          {t.threshold}: {profile.threshold} — {opp.overall_score >= profile.threshold ? t.aboveThreshold : t.belowThreshold}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: "0.5px", background: "#D8E8D8", flexShrink: 0 }} />

      {/* ── B2 Side panel + content area ──────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: "60vh" }}>

        {/* Side panel */}
        <nav
          aria-label="Result sections"
          style={{
            width: 76, background: "#F0F4F0", borderRight: "0.5px solid #D8E8D8",
            display: "flex", flexDirection: "column", gap: 2,
            paddingTop: 8, paddingBottom: 8,
            flexShrink: 0, overflowY: "auto",
          }}
        >
          {NAV_ITEMS.map(({ key, label, Icon }) => {
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                aria-pressed={isActive}
                aria-label={label}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "10px 6px", cursor: "pointer", width: "100%",
                  border: "none",
                  borderLeft: isActive ? "2px solid #3A7A3A" : "2px solid transparent",
                  background: isActive ? "#FAFAF8" : "transparent",
                  transition: "all 0.15s", minHeight: 44, justifyContent: "center",
                }}
              >
                <Icon active={isActive} />
                <span style={{
                  fontFamily: "var(--font-data)", fontSize: 6, letterSpacing: "0.07em",
                  color: isActive ? "#1A2E1A" : "#8A9A8A",
                  fontWeight: isActive ? 500 : 400,
                  marginTop: 4, textAlign: "center", lineHeight: 1.2,
                }}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <div style={{
          flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch",
          minWidth: 0, display: "flex", flexDirection: "column",
        }}>

          {/* Section header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px 8px", borderBottom: "0.5px solid #D8E8D8",
            flexShrink: 0, background: "var(--paper)", position: "sticky", top: 0, zIndex: 1,
          }}>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em",
              color: "#1A2E1A", fontWeight: 500, textTransform: "uppercase",
            }}>
              {NAV_ITEMS.find(i => i.key === activeSection)?.label}
            </span>
            <span style={{ fontFamily: "var(--font-data)", fontSize: 8, color: "#8A9A8A" }}>
              {sectionDescriptor[activeSection]}
            </span>
          </div>

          {/* ── SCORE section ─────────────────────────────────────────────── */}
          {activeSection === "score" && (
            <div style={{ padding: 14 }}>
              <ApplicationStatusTracker status={localStatus} onUpdateStatus={handleStatusUpdate} />

              {canVantage && (
                <section style={{
                  marginTop: 16, padding: "14px 16px", background: "#fff",
                  border: "1px solid var(--border)", borderLeft: "3px solid var(--gold)",
                  borderRadius: "var(--r)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{
                        fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700,
                        letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4,
                        color: "#1A2E1A", display: "flex", alignItems: "center", gap: 6,
                      }}>
                        {t.prioritySupport || "Priority Support"}
                        <span style={{ background: "var(--gold)", color: "#fff", padding: "1px 6px", borderRadius: 20, fontSize: 10 }}>Vantage</span>
                      </h2>
                      <p style={{ fontSize: 11, color: "#5A6A5A", lineHeight: 1.5 }}>
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

              <div className="btn-actions" style={{ justifyContent: "space-between", marginTop: 16 }}>
                <button className="btn btn-secondary btn-sm" onClick={onBack}>{t.backDash}</button>
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
            </div>
          )}

          {/* ── INSIGHTS section ──────────────────────────────────────────── */}
          {activeSection === "insights" && <InsightsSection opp={opp} t={t} />}

          {/* ── FILTERS section ───────────────────────────────────────────── */}
          {activeSection === "filters" && <FiltersSection filterScores={opp.filter_scores || []} t={t} />}

          {/* ── COACH section ─────────────────────────────────────────────── */}
          {activeSection === "coach" && (
            <div style={{ padding: 14 }}>
              {/* Style toggle — Vantage only */}
              {canVantage && (
                <div role="group" aria-label="Coaching style" style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: 14 }}>
                  {Object.entries(COACHING_STYLES).map(([key, style]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleStyleChange(key)}
                      aria-pressed={coachingStyle === key}
                      style={{
                        flex: 1, padding: "8px 14px", minHeight: 44,
                        fontSize: 12, fontWeight: 600, fontFamily: "inherit",
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

              {canVantage && coachingOpen && coaching && (
                <p style={{ fontSize: 11, color: "#5A6A5A", fontFamily: "var(--font-data)", letterSpacing: ".05em", marginBottom: 16 }}>
                  {COACHING_STYLES[coachingStyle].description}
                </p>
              )}

              {!canVantage && (
                <p style={{ fontSize: 12, color: "#5A6A5A", lineHeight: 1.5, marginBottom: 14 }}>
                  Personalized interview prep, positioning strategy, and negotiation leverage.{" "}
                  <button
                    onClick={() => onUpgrade?.()}
                    style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0, textDecoration: "underline" }}
                  >
                    Upgrade to Vantage
                  </button>
                </p>
              )}

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
                          <h3 style={{ fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#1A2E1A" }}>
                            {sectionLabels[section.key]}
                          </h3>
                        </div>
                        <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--ink)", whiteSpace: "pre-line" }}>
                          {coaching[section.key]}
                        </p>
                      </div>
                    );
                  })}
                  {coaching && !coachingLoading && (
                    <p style={{ fontSize: 11, color: "#5A6A5A", marginTop: 8 }}>
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
            </div>
          )}

          {/* ── COMPARE section ───────────────────────────────────────────── */}
          {activeSection === "compare" && (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 14, color: "var(--muted)" }} aria-hidden="true">⇄</div>
              <p style={{ fontFamily: "var(--font-prose)", fontSize: 12, lineHeight: 1.65, color: "var(--muted)", maxWidth: 220, margin: "0 auto 20px" }}>
                Return to the dashboard to select two roles for side-by-side comparison.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={onBack}>{t.backDash}</button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
