import { useState } from "react";
import { exportOpportunityPdf } from "../utils/exportPdf.js";
import { ENDPOINTS } from "../config.js";
import { handleError } from "../utils/handleError.js";
import CoachMark from "./CoachMark.jsx";

// ── Verdict hero palette — identical to RoleCard ──────────────────────────
const VERDICT_THEME = {
  pursue:  { heroBg: "#1A3A1A", heroText: "#FFFFFF", border: "#3A7A3A", subText: "rgba(255,255,255,0.82)" },
  monitor: { heroBg: "#4A3000", heroText: "#FFFFFF", border: "#B8A030", subText: "rgba(255,255,255,0.82)" },
  pass:    { heroBg: "#4A0000", heroText: "#FFFFFF", border: "#C05050", subText: "rgba(255,255,255,0.82)" },
};

function getTheme(rec) {
  return VERDICT_THEME[rec] || VERDICT_THEME.monitor;
}

const WEIGHT_OPTIONS = [
  { value: 0.5, label: "Minor" },
  { value: 1.0, label: "Standard" },
  { value: 1.2, label: "Relevant" },
  { value: 1.3, label: "Important" },
  { value: 1.5, label: "Critical" },
  { value: 2.0, label: "Critical +" },
];

const COACHING_SECTIONS = [
  { key: "interview_prep",    label: "Interview Prep",     icon: "💬" },
  { key: "positioning_angle", label: "How to Position",    icon: "🎯" },
  { key: "negotiation",       label: "Negotiation",        icon: "💰" },
  { key: "go_no_go",          label: "Coaching Verdict",   icon: "⚖️" },
];

// ── Truncate text to N words ──────────────────────────────────────────────
function truncateWords(text, maxWords) {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

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
  { key: "applied",      tKey: "stageApplied",   label: "Applied" },
  { key: "phone_screen", tKey: "stagePhone",      label: "Phone" },
  { key: "interview",    tKey: "stageInterview",  label: "Interview" },
  { key: "final_round",  tKey: "stageFinal",      label: "Final" },
];

const OUTCOMES = [
  { key: "offer",    tKey: "outcomeOffer",     label: "Offer",    heroBg: "#1A3A1A" },
  { key: "rejected", tKey: "outcomeRejected",  label: "Rejected", heroBg: "#4A0000" },
  { key: "withdrew", tKey: "outcomeWithdrew",  label: "Withdrew", heroBg: "#2A2A2A" },
];

// ── Tab definitions ───────────────────────────────────────────────────────
const TABS = [
  { key: "insights", tKey: "tabInsights", label: "INSIGHTS" },
  { key: "filters",  tKey: "tabFilters",  label: "FILTERS" },
  { key: "coach",    tKey: "tabCoach",    label: "COACH" },
  { key: "status",   tKey: "tabStatus",   label: "STATUS" },
];

// ── Application Status ────────────────────────────────────────────────────
function ApplicationStatus({ status, onUpdateStatus, canVantage, onUpgrade, t, opp, profile, authUser, onBack, onRemove }) {
  const isTerminal = ["offer", "rejected", "withdrew"].includes(status);
  const activeFunnelIdx = FUNNEL_STAGES.findIndex(s => s.key === status);

  return (
    <div style={{ padding: "16px 16px 40px" }}>
      {/* Stage progress */}
      <p style={{
        fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".15em",
        textTransform: "uppercase", color: "#4A6A4A", marginBottom: 10,
      }}>{t?.labelApplicationStage || "Application Stage"}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0, border: "1px solid #D8E8D8", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
        {FUNNEL_STAGES.map((stage, i) => {
          const isPast    = !isTerminal && activeFunnelIdx > i;
          const isCurrent = !isTerminal && activeFunnelIdx === i;
          return (
            <button
              key={stage.key}
              onClick={() => onUpdateStatus?.(stage.key)}
              aria-pressed={isCurrent}
              style={{
                padding: "11px 4px", border: "none",
                borderRight: i < FUNNEL_STAGES.length - 1 ? "1px solid #D8E8D8" : "none",
                background: isCurrent ? "#1A3A1A" : isPast ? "#EAF3DE" : "transparent",
                color: isCurrent ? "#fff" : isPast ? "#27500A" : "#4A6A4A",
                fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 700,
                letterSpacing: ".06em", textTransform: "uppercase",
                cursor: "pointer", transition: "all .15s", textAlign: "center",
                minHeight: 44,
              }}
            >
              {isCurrent || isPast ? (isPast ? "✓ " : "") : ""}{t?.[stage.tKey] || stage.label}
            </button>
          );
        })}
      </div>

      {/* Outcomes */}
      <p style={{
        fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".15em",
        textTransform: "uppercase", color: "#4A6A4A", marginBottom: 8,
      }}>{t?.labelOutcome || "Outcome"}</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {OUTCOMES.map(outcome => {
          const isActive = status === outcome.key;
          return (
            <button
              key={outcome.key}
              onClick={() => onUpdateStatus?.(outcome.key)}
              aria-pressed={isActive}
              style={{
                flex: 1, padding: "10px 8px",
                borderRadius: 6, border: "1px solid",
                borderColor: isActive ? "transparent" : "#D8E8D8",
                background: isActive ? outcome.heroBg : "transparent",
                color: isActive ? "#fff" : "#4A6A4A",
                fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 700,
                letterSpacing: ".08em", textTransform: "uppercase",
                cursor: "pointer", transition: "all .15s", minHeight: 44,
              }}
            >
              {t?.[outcome.tKey] || outcome.label}
            </button>
          );
        })}
      </div>

      {/* Vantage priority support */}
      {canVantage && (
        <div style={{
          background: "#F8FAF8", border: "1px solid #D8E8D8",
          borderLeft: "3px solid #B8A030",
          borderRadius: 8, padding: "14px 16px", marginBottom: 20,
        }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".15em",
            textTransform: "uppercase", color: "#4A6A4A", marginBottom: 6,
          }}>VANTAGE · PRIORITY SUPPORT</p>
          <p style={{ fontFamily: "var(--font-prose)", fontSize: 12, color: "#1A2E1A", lineHeight: 1.6, marginBottom: 10 }}>
            {t.prioritySupportDesc || "Direct line to the Vetted team. We respond within 4 business hours."}
          </p>
          <a
            href={`mailto:support@tryvettedai.com?subject=${encodeURIComponent(`[Priority Support] ${authUser?.displayName || "Vantage User"} — ${opp.role_title} at ${opp.company}`)}&body=${encodeURIComponent(`Hi Vetted Team,\n\nI'm reviewing: ${opp.role_title} at ${opp.company} (VQ Score: ${opp.overall_score.toFixed(1)} / ${opp.recommendation})\n\nI need help with:\n\n`)}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
              fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: ".08em",
              textTransform: "uppercase", color: "#27500A",
              border: "1px solid #C8DDB8", borderRadius: 6, padding: "9px 14px",
            }}
          >
            ✉ {t.contactSupport || "Contact Support"}
          </a>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {canVantage ? (
          <button
            onClick={() => exportOpportunityPdf(opp, profile, t)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: ".1em",
              textTransform: "uppercase", color: "#1A2E1A",
              background: "#F0F4F0", border: "1px solid #D8E8D8",
              borderRadius: 6, padding: "12px 16px", cursor: "pointer",
              minHeight: 44,
            }}
          >
            ↓ {t?.pdfExportBtn || "Export PDF"}
          </button>
        ) : (
          <button
            onClick={() => onUpgrade?.(t?.paywallCompare || "Export a full PDF breakdown of this role. Vantage feature.")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: ".1em",
              textTransform: "uppercase", color: "#4A6A4A",
              background: "#F0F4F0", border: "1px solid #D8E8D8",
              borderRadius: 6, padding: "12px 16px", cursor: "pointer", opacity: 0.7,
              minHeight: 44,
            }}
          >
            🔒 Export PDF
          </button>
        )}
        <button
          onClick={onRemove}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: ".1em",
            textTransform: "uppercase", color: "#7A3A3A",
            background: "transparent", border: "1px solid #E0C8C8",
            borderRadius: 6, padding: "12px 16px", cursor: "pointer",
            minHeight: 44,
          }}
        >
          {t.removeOpp || "Remove This Role"}
        </button>
      </div>
    </div>
  );
}

// ── Insights ──────────────────────────────────────────────────────────────
function InsightsSection({ opp, t }) {
  const SECTION_DEFS = [
    { key: "rec",      label: t.recRationale    || "RECOMMENDATION RATIONALE", text: opp.recommendation_rationale, isList: false, isGap: false },
    { key: "honest",   label: t.honestFit        || "HONEST FIT",               text: opp.honest_fit_summary,       isList: false, isGap: false },
    { key: "strengths",label: t.strengths        || "WHERE YOU ARE STRONG",     list: opp.strengths,                isList: true,  isGap: false },
    { key: "gaps",     label: t.gaps             || "REAL GAPS",                list: opp.gaps,                     isList: true,  isGap: true  },
    { key: "bridge",   label: t.narrativeBridge  || "NARRATIVE BRIDGE",         text: opp.narrative_bridge,         isList: false, isGap: false },
  ].filter(s => s.isList ? (s.list?.length > 0) : !!s.text);

  if (!SECTION_DEFS.length) return (
    <div style={{ padding: 32, textAlign: "center", color: "#4A6A4A", fontFamily: "var(--font-data)", fontSize: 12 }}>
      No insights available.
    </div>
  );

  return (
    <div style={{ padding: "16px 16px 40px" }}>
      {SECTION_DEFS.map((sec, i) => (
        <div key={sec.key} style={{ marginBottom: i < SECTION_DEFS.length - 1 ? 20 : 0 }}>
          {/* Section divider label */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 8, letterSpacing: ".14em",
              color: sec.isGap ? "#7A3A3A" : "#27500A",
              textTransform: "uppercase", whiteSpace: "nowrap", fontWeight: 700,
            }}>
              {sec.label}
            </span>
            <div style={{ flex: 1, height: 0.5, background: sec.isGap ? "#E0C8C8" : "#C8DDB8" }} />
          </div>
          {/* Body */}
          {sec.isList ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {sec.list.map((item, idx) => (
                <li key={idx} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  marginBottom: 8, padding: "10px 12px",
                  background: sec.isGap ? "#FDF5F5" : "#F6FAF0",
                  borderRadius: 6,
                  borderLeft: `2px solid ${sec.isGap ? "#C05050" : "#3A7A3A"}`,
                }}>
                  <span style={{
                    color: sec.isGap ? "#C05050" : "#3A7A3A",
                    flexShrink: 0, fontWeight: 700, fontSize: 13, lineHeight: 1.5,
                  }}>
                    {sec.isGap ? "△" : "✓"}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-prose)", fontSize: 13, lineHeight: 1.65,
                    color: sec.isGap ? "#5A2A2A" : "#1A3A1A",
                  }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{
              fontFamily: "var(--font-prose)", fontSize: 13, fontWeight: 400,
              lineHeight: 1.7, color: "#1A2E1A", margin: 0,
              padding: "12px 14px",
              background: "#F8FAF8", borderRadius: 6,
            }}>
              {sec.text}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Weight label helper ───────────────────────────────────────────────────
function resolveWeightLabel(value, t) {
  const map = {
    0.5: t?.weightMinor        || "Minor",
    1.0: t?.weightStandard     || "Standard",
    1.2: t?.weightRelevant     || "Relevant",
    1.3: t?.weightImportant    || "Important",
    1.5: t?.weightCritical     || "Critical",
    2.0: t?.weightCriticalPlus || "Critical +",
  };
  return map[value] ?? `${value}×`;
}

// ── Filters ───────────────────────────────────────────────────────────────
function FiltersSection({ filterScores, t }) {
  if (!filterScores?.length) return (
    <div style={{ padding: 32, textAlign: "center", color: "#4A6A4A", fontFamily: "var(--font-data)", fontSize: 12 }}>
      No filter scores available.
    </div>
  );

  // Sort: lowest scores first so gaps surface immediately
  const sorted = [...filterScores].sort((a, b) => a.score - b.score);

  return (
    <div style={{ padding: "16px 16px 40px" }}>
      {sorted.map((fs, i) => {
        const barColor = fs.score < 2.5 ? "#C05050" : fs.score <= 3.5 ? "#B8A030" : "#3A7A3A";
        const bgColor  = fs.score < 2.5 ? "#FDF5F5" : fs.score <= 3.5 ? "#FAFAE8" : "#F6FAF0";
        const borderColor = fs.score < 2.5 ? "#E0C8C8" : fs.score <= 3.5 ? "#D8C870" : "#C8DDB8";
        return (
          <div key={i} style={{
            background: bgColor,
            borderRadius: 8,
            border: `1px solid ${borderColor}`,
            borderLeft: `3px solid ${barColor}`,
            padding: "12px 14px",
            marginBottom: 8,
          }}>
            {/* Name + score row */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{
                fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".09em",
                color: "#1A2E1A", textTransform: "uppercase", flex: 1, marginRight: 10,
                fontWeight: 700,
              }}>
                {fs.filter_name}
                {fs.weight && fs.weight !== 1.0 && (
                  <span style={{ color: "#4A6A4A", marginLeft: 6, fontWeight: 400 }}>
                    · {resolveWeightLabel(fs.weight, t)}
                  </span>
                )}
              </span>
              <span style={{
                fontFamily: "var(--font-data)", fontSize: 20, fontWeight: 700,
                color: barColor, flexShrink: 0, lineHeight: 1,
              }}>
                {fs.score}
              </span>
            </div>
            {/* Bar */}
            <div style={{ height: 3, background: "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden", marginBottom: fs.rationale ? 8 : 0 }}>
              <div style={{
                height: "100%", width: `${(fs.score / 5) * 100}%`,
                background: barColor, borderRadius: 2, transition: "width 0.4s ease",
              }} />
            </div>
            {/* Rationale */}
            {fs.rationale && (
              <p style={{
                fontFamily: "var(--font-prose)", fontSize: 12, lineHeight: 1.65,
                color: "#1A2E1A", margin: 0,
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

// ── Coach ─────────────────────────────────────────────────────────────────
function CoachSection({ opp, profile, lang, userTier, authUser, onUpgrade, t }) {
  const canVantage = isVantage(userTier);
  const [coachingCache, setCoachingCache]   = useState({});
  const [coachingStyle, setCoachingStyle]   = useState("conservative");
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingError, setCoachingError]   = useState("");
  const [coachingOpen, setCoachingOpen]     = useState(false);

  const coaching = coachingCache[coachingStyle] || null;

  function handleStyleChange(style) {
    setCoachingStyle(style);
    setCoachingError("");
    if (coachingCache[style]) setCoachingOpen(true);
  }

  async function fetchCoaching() {
    if (!canVantage) { onUpgrade?.(t?.paywallCompare || "Unlock personalized coaching. Vantage feature."); return; }
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

      const prompt = `You are an executive career coach. Be brief — write like a trusted advisor in a 15-minute meeting, not a report. Each section must be 60 words or fewer.

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

Respond ONLY with valid JSON (no markdown). Each value must be 60 words or fewer — lead with the most important point, no padding. Shape:
{
  "interview_prep": "2 likely hard questions they'll face and one-line coaching note for each. Be specific to their gaps.",
  "positioning_angle": "Exactly how to frame their background for this role in 2 sentences. Reference real experience.",
  "negotiation": "Their strongest leverage point and one risk. Be direct — apply the coaching style.",
  "go_no_go": "Pursue, cautious, or pass — and one-sentence reason. Reference the VQ score and career goal."
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
    <div style={{ padding: "16px 16px 40px" }}>
      {/* Gate copy for non-Vantage */}
      {!canVantage && (
        <div style={{
          background: "#F8FAF8", border: "1px solid #D8E8D8",
          borderLeft: "3px solid #B8A030",
          borderRadius: 8, padding: "14px 16px", marginBottom: 16,
        }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".15em",
            textTransform: "uppercase", color: "#4A6A4A", marginBottom: 6,
          }}>{t?.vantageFeatureLabel || "Vantage Feature"}</p>
          <p style={{ fontFamily: "var(--font-prose)", fontSize: 13, color: "#1A2E1A", lineHeight: 1.65, marginBottom: 0 }}>
            {t?.coachingGateDesc || "Personalized interview prep, positioning strategy, and negotiation leverage — tailored to this exact role and your profile."}
          </p>
        </div>
      )}

      {/* Style toggle — Vantage only */}
      {canVantage && (
        <div role="group" aria-label="Coaching style" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          border: "1px solid #D8E8D8", borderRadius: 8, overflow: "hidden", marginBottom: 14,
        }}>
          {Object.entries(COACHING_STYLES).map(([key, style], i) => (
            <button
              key={key}
              type="button"
              onClick={() => handleStyleChange(key)}
              aria-pressed={coachingStyle === key}
              style={{
                padding: "12px 10px", minHeight: 48,
                fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
                letterSpacing: ".08em", textTransform: "uppercase",
                border: "none",
                borderRight: i === 0 ? "1px solid #D8E8D8" : "none",
                cursor: "pointer",
                background: coachingStyle === key ? "#1A3A1A" : "transparent",
                color: coachingStyle === key ? "#fff" : "#4A6A4A",
                transition: "all .15s",
              }}
            >
              <span style={{ display: "block", marginBottom: 2 }}>
                {key === "conservative" ? (t?.coachingStyleAdvisor || style.label) : (t?.coachingStyleAdvocate || style.label)}
              </span>
              <span style={{
                fontFamily: "var(--font-prose)", fontSize: 10, fontWeight: 400,
                letterSpacing: 0, textTransform: "none",
                color: coachingStyle === key ? "rgba(255,255,255,0.6)" : "#4A6A4A",
              }}>
                {key === "conservative" ? (t?.coachingStyleAdvisorDesc || style.description) : (t?.coachingStyleAdvocateDesc || style.description)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Get Coaching / Upgrade CTA */}
      <button
        onClick={canVantage ? fetchCoaching : () => onUpgrade?.(t?.paywallCompare || "Unlock coaching. Vantage feature.")}
        disabled={coachingLoading}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 700,
          letterSpacing: ".1em", textTransform: "uppercase",
          color: canVantage ? "#fff" : "#4A6A4A",
          background: canVantage ? "#1A3A1A" : "#F0F4F0",
          border: canVantage ? "none" : "1px solid #D8E8D8",
          borderRadius: 8, padding: "14px 16px",
          cursor: coachingLoading ? "wait" : "pointer",
          minHeight: 48, marginBottom: coachingOpen ? 20 : 0,
          opacity: coachingLoading ? 0.7 : 1,
          transition: "opacity .15s",
        }}
      >
        {coachingLoading ? (
          <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderColor: "#fff", borderTopColor: "transparent" }} aria-hidden="true" /> {t?.coachingGenerating || "Generating…"}</>
        ) : coaching && coachingOpen
          ? (t?.btnHideCoaching || "Hide Coaching")
          : canVantage ? (t?.btnGenerateCoaching || "Generate Coaching") : "🔒 Upgrade to Vantage"}
      </button>

      {/* Error */}
      {coachingError && (
        <div role="alert" style={{
          background: "#FDF5F5", color: "#7A3A3A", padding: "10px 14px",
          borderRadius: 6, fontSize: 12, fontFamily: "var(--font-prose)", marginTop: 12,
        }}>
          {coachingError}
        </div>
      )}

      {/* Coaching content */}
      {coachingOpen && coaching && (
        <div style={{ marginTop: 20 }}>
          {COACHING_SECTIONS.map((section, i) => {
            const sectionLabels = {
              interview_prep:    t.coachingInterviewPrep || section.label,
              positioning_angle: t.coachingPositioning   || section.label,
              negotiation:       t.coachingNegotiation   || section.label,
              go_no_go:          t.coachingVerdict        || section.label,
            };
            const isVerdict = section.key === "go_no_go";
            const displayText = coaching[section.key] || "";
            return (
              <div key={section.key} style={{
                marginBottom: 10,
                background: isVerdict ? "#F0F4F0" : "#F8FAF8",
                border: isVerdict ? "1px solid #C8DDB8" : "1px solid #EBF2EB",
                borderLeft: isVerdict ? "3px solid #3A7A3A" : "3px solid #C8DDB8",
                borderRadius: 8,
                overflow: "hidden",
              }}>
                {/* Section header row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px 8px",
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                }}>
                  <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
                    {section.icon}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".14em",
                    color: "#27500A", textTransform: "uppercase", fontWeight: 700,
                  }}>
                    {sectionLabels[section.key]}
                  </span>
                </div>
                {/* Content */}
                <p style={{
                  fontFamily: "var(--font-prose)", fontSize: 13, lineHeight: 1.65,
                  color: "#1A2E1A", margin: 0,
                  padding: "10px 14px 12px",
                  whiteSpace: "pre-line",
                }}>
                  {displayText}
                </p>
              </div>
            );
          })}

          {!coachingLoading && (
            <p style={{ fontSize: 11, color: "#4A6A4A", fontFamily: "var(--font-data)", letterSpacing: ".04em", marginTop: 4 }}>
              Want a different lens?{" "}
              <button
                onClick={() => {
                  const other = coachingStyle === "conservative" ? "assertive" : "conservative";
                  handleStyleChange(other);
                }}
                style={{
                  background: "none", border: "none",
                  color: "#27500A", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, padding: 0,
                  textDecoration: "underline", letterSpacing: ".04em",
                }}
              >
                Switch to {coachingStyle === "conservative" ? "Advocate" : "Advisor"}
              </button>
            </p>
          )}
        </div>
      )}

      {/* Loading placeholder */}
      {coachingOpen && coachingLoading && !coaching && (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--font-data)", fontSize: 10, color: "#4A6A4A",
            letterSpacing: ".12em", textTransform: "uppercase",
          }}>
            Generating {coachingStyle === "conservative" ? "advisor" : "advocate"} coaching…
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function ScoreResult({ t, lang, opp, profile, onBack, onRemove, onUpdateStatus, userTier, authUser, onUpgrade }) {
  if (!opp) return null;

  // Default to INSIGHTS — the most valuable content
  const [activeTab, setActiveTab]     = useState("insights");
  const [localStatus, setLocalStatus] = useState(opp.application_status || "applied");

  const rec   = opp.recommendation || "monitor";
  const theme = getTheme(rec);
  const score = Number(opp.overall_score).toFixed(1);
  const canVantage = isVantage(userTier);

  const verdictLabel = {
    pursue:  t?.pursue  || "PURSUE",
    monitor: t?.monitor || "MONITOR",
    pass:    t?.pass    || "PASS",
  }[rec]?.toUpperCase() || rec.toUpperCase();

  function handleStatusUpdate(newStatus) {
    setLocalStatus(newStatus);
    onUpdateStatus?.(opp.id, newStatus);
  }

  return (
    <main
      id="main-content"
      aria-label={opp.role_title}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - max(env(safe-area-inset-top,44px),44px) - 80px)",
        margin: "0 -16px",
        background: "var(--paper)",
      }}
    >
      {/* ── VERDICT HERO BLOCK ────────────────────────────────────────────── */}
      <div style={{
        background: theme.heroBg,
        borderLeft: `4px solid ${theme.border}`,
        padding: "14px 20px 18px",
        flexShrink: 0,
        position: "relative",
      }}>
        {/* Back link — top left */}
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.82)",
            fontWeight: 600,
            padding: "0 0 12px 0",
            display: "block",
          }}
        >
          {t?.backWorkspace || "← Your Workspace"}
        </button>

        {/* Company */}
        <p style={{
          fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 600,
          letterSpacing: ".16em", textTransform: "uppercase",
          color: theme.subText, marginBottom: 3,
        }}>
          {opp.company || "—"}
        </p>

        {/* Role title — display serif */}
        <h1 style={{
          fontFamily: "var(--font-display)", fontStyle: "normal", fontSize: 17, fontWeight: 700,
          color: theme.heroText, lineHeight: 1.25, marginBottom: 16,
        }}>
          {opp.role_title || "Untitled Role"}
        </h1>

        {/* Score + verdict row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {/* Large score */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 700,
              letterSpacing: ".16em", textTransform: "uppercase",
              color: theme.subText, marginBottom: 2,
            }}>VQ SCORE</span>
            <span style={{
              fontFamily: "var(--font-display)", fontStyle: "normal", fontSize: 56, fontWeight: 700,
              color: theme.heroText, lineHeight: 1,
            }}>
              {score}
            </span>
          </div>

          {/* Verdict + threshold — display serif, right-aligned, vertically centered */}
          <div style={{ textAlign: "right" }}>
            <span style={{
              fontFamily: "var(--font-display)", fontStyle: "normal", fontSize: 26, fontWeight: 700,
              color: theme.heroText, lineHeight: 1, display: "block",
              marginBottom: 8,
            }}>
              {verdictLabel}
            </span>
            <span style={{
              fontFamily: "var(--font-display)", fontStyle: "normal", fontSize: 13, fontWeight: 700,
              color: theme.heroText, lineHeight: 1, display: "block",
              marginBottom: 3,
            }}>
              {profile.threshold}
            </span>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 600,
              color: theme.subText, letterSpacing: ".1em",
              textTransform: "uppercase", display: "block",
            }}>
              Threshold · {opp.overall_score >= profile.threshold ? "Above" : "Below"}
            </span>
          </div>
        </div>
      </div>

      {/* ── HORIZONTAL TAB BAR ───────────────────────────────────────────── */}
      <nav
        aria-label="Result sections"
        style={{
          display: "flex",
          borderBottom: "1px solid #D8E8D8",
          background: "var(--paper)",
          flexShrink: 0,
        }}
      >
        {TABS.map(({ key, tKey, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              aria-pressed={isActive}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "13px 4px",
                fontFamily: "var(--font-data)", fontSize: 9,
                letterSpacing: ".12em", textTransform: "uppercase",
                fontWeight: isActive ? 700 : 400,
                color: isActive ? "#1A2E1A" : "#4A6A4A",
                background: "none", border: "none",
                borderBottom: isActive ? "2px solid #3A7A3A" : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer", transition: "all .15s",
                minHeight: 44,
              }}
            >
              {t?.[tKey] || label}
            </button>
          );
        })}
      </nav>

      {/* ── CONTENT AREA ─────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch",
        minHeight: 0,
      }}>
        {activeTab === "insights" && (
          <div style={{ padding: "16px 16px 0" }}>
            <CoachMark
              storageKey="vetted_cm_scorecard"
              title={t?.cmScorecardTitle}
              body={t?.cmScorecardBody}
              dir={t?.dir}
            />
          </div>
        )}
        {activeTab === "insights" && <InsightsSection opp={opp} t={t} />}
        {activeTab === "filters"  && <FiltersSection filterScores={opp.filter_scores || []} t={t} />}

        {activeTab === "coach"    && (
          <CoachSection
            opp={opp} profile={profile} lang={lang}
            userTier={userTier} authUser={authUser}
            onUpgrade={onUpgrade} t={t}
          />
        )}
        {activeTab === "status"   && (
          <ApplicationStatus
            status={localStatus}
            onUpdateStatus={handleStatusUpdate}
            canVantage={canVantage}
            onUpgrade={onUpgrade}
            t={t} opp={opp} profile={profile}
            authUser={authUser} onBack={onBack} onRemove={onRemove}
          />
        )}
      </div>
    </main>
  );
}
