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

export default function ScoreResult({ t, lang, opp, profile, onBack, onRemove, userTier, authUser, onUpgrade }) {
  if (!opp) return null;

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
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{opp.company}</p>
          <h1 className="card-title" id="result-title" style={{ fontSize: 26 }}>{opp.role_title}</h1>
          <div className="overall-score-display">
            <div className={`big-score ${sc}`} aria-label={`${t.weightedScore}: ${opp.overall_score.toFixed(1)}`}>{opp.overall_score.toFixed(1)}</div>
            <div className="score-meta">
              <p className="score-meta-label">{t.weightedScore}</p>
              <span className={`recommendation-badge rec-${opp.recommendation}`}>{t[opp.recommendation] || opp.recommendation}</span>
              <p className="threshold-note">{t.threshold}: {profile.threshold} — {opp.overall_score >= profile.threshold ? t.aboveThreshold : t.belowThreshold}</p>
            </div>
          </div>
          {opp.recommendation_rationale && (
            <div className="narrative-box" role="note"><strong>{t.recRationale}</strong>{opp.recommendation_rationale}</div>
          )}
          {opp.honest_fit_summary && (
            <div className="narrative-box" style={{ borderLeftColor: "var(--gold)" }} role="note"><strong>{t.honestFit}</strong>{opp.honest_fit_summary}</div>
          )}
        </div>

        <div className="fit-grid">
          <section className="fit-box fit-strength" aria-labelledby="str-heading">
            <h2 id="str-heading"><strong>{t.strengths}</strong></h2>
            <ul>{(opp.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
          <section className="fit-box fit-gap" aria-labelledby="gap-heading">
            <h2 id="gap-heading"><strong>{t.gaps}</strong></h2>
            <ul>{(opp.gaps || []).map((g, i) => <li key={i}>{g}</li>)}</ul>
          </section>
        </div>

        <section className="card" aria-labelledby="filter-bd-heading">
          <h2 id="filter-bd-heading" className="section-label">{t.filterBreakdown}</h2>
          {(opp.filter_scores || []).map(fs => {
            const filled = Math.round(fs.score);
            const col = fs.score >= 4 ? "var(--success)" : fs.score >= 3 ? "var(--gold)" : "var(--accent)";
            return (
              <div key={fs.filter_id} className="filter-row">
                <div className="filter-header">
                  <span className="filter-name" id={`fn-${fs.filter_id}`}>{fs.filter_name}</span>
                  <div className="filter-score-dots" aria-hidden="true">
                    {[1,2,3,4,5].map(n => <div key={n} className={`dot ${n <= filled ? (fs.score >= 4 ? "gold" : "filled") : ""}`} />)}
                  </div>
                  <span className="filter-score-num" style={{ color: col }} aria-label={`${t.scoreLabel}: ${fs.score} ${t.outOf}`}>{fs.score}/5</span>
                  {fs.weight && fs.weight !== 1.0 && (
                    <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace" }}>
                      {WEIGHT_OPTIONS.find(w => w.value === fs.weight)?.label || `${fs.weight}×`}
                    </span>
                  )}
                </div>
                <div className="score-bar-wrap" role="progressbar" aria-valuenow={fs.score} aria-valuemin={1} aria-valuemax={5} aria-labelledby={`fn-${fs.filter_id}`}>
                  <div className="score-bar-fill" style={{ width: `${(fs.score / 5) * 100}%`, background: col }} />
                </div>
                <p className="filter-rationale">{fs.rationale}</p>
              </div>
            );
          })}
        </section>

        {opp.narrative_bridge && (
          <section className="card" aria-labelledby="bridge-heading">
            <h2 id="bridge-heading" className="card-title" style={{ fontSize: 16 }}>{t.narrativeBridge}</h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>{opp.narrative_bridge}</p>
          </section>
        )}

        {/* ── Career Coaching (Vantage) ───────────────────────────────────── */}
        <section className="card" aria-labelledby="coaching-heading">
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 id="coaching-heading" className="card-title" style={{ fontSize: 16, marginBottom: 0 }}>Career Coaching</h2>
              {!canVantage && (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", background: "var(--gold)", color: "#fff", padding: "2px 7px", borderRadius: 20 }}>Vantage</span>
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
            <p style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: ".05em", marginBottom: 16 }}>
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
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--muted)", letterSpacing: ".1em" }}>
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
                    <h3 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--muted)" }}>
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
                <h2 id="support-heading" className="card-title" style={{ fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  {t.prioritySupport || "Priority Support"}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", background: "var(--gold)", color: "#fff", padding: "2px 7px", borderRadius: 20 }}>Vantage</span>
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
