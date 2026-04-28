// Vetted — VQ Advocate
// Full-screen behavioral intelligence screen.
// Measures user behavior against stated filters and surfaces mismatches gently.

import { useState, useMemo } from "react";

// ─── String interpolation helper ─────────────────────────────────────────────
function fmt(s, vars = {}) {
  if (!s) return "";
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)), s);
}

// ─── Severity ────────────────────────────────────────────────────────────────
function sevMeta(sev, t = {}) {
  if (sev === 3) return { dot: "#B86A2C", label: t.advocateSev3 || "WORTH PAUSING", sevLabel: "SEV 3" };
  if (sev === 2) return { dot: "#C9A227", label: t.advocateSev2 || "NOTICED",       sevLabel: "SEV 2" };
  return               { dot: "#6B8E6B", label: t.advocateSev1 || "OBSERVATION",   sevLabel: "SEV 1" };
}

function scoreColor(v) {
  if (v >= 4.0) return "var(--score-high)";
  if (v >= 3.0) return "var(--score-mid)";
  return "var(--score-pass)";
}

// ─── Timeline helpers ─────────────────────────────────────────────────────────
const WINDOW_DAYS = {
  asap: 14, "30days": 30, quarter: 90, "6months": 180, yearout: 365, yearplus: 548,
};
function getWindowLabel(key, t = {}) {
  const map = {
    asap:      t.advWindowAsap     || "ASAP",
    "30days":  t.advWindow30days   || "30-day",
    quarter:   t.advWindowQuarter  || "quarter",
    "6months": t.advWindow6months  || "6-month",
    yearout:   t.advWindowYearout  || "1-year",
    yearplus:  t.advWindowYearplus || "exploratory",
  };
  return map[key] || "stated";
}
const SEARCH_START_KEY = "vetted_search_started";
function getSearchStart(opps) {
  try {
    const stored = localStorage.getItem(SEARCH_START_KEY);
    if (stored) return new Date(stored);
    const dates = (opps || []).filter(o => o.created_at).map(o => new Date(o.created_at)).sort((a, b) => a - b);
    const d = dates.length > 0 ? dates[0] : new Date();
    localStorage.setItem(SEARCH_START_KEY, d.toISOString());
    return d;
  } catch { return new Date(); }
}

// ─── Pattern computation ──────────────────────────────────────────────────────
function computePatterns(opportunities, profile, t = {}) {
  const scored = (opportunities || []).filter(o =>
    typeof o.overall_score === "number" && o.status !== "queued"
  );
  const threshold = parseFloat(profile?.threshold) || 3.5;

  const patterns = [];

  // ── Below floor ────────────────────────────────────────────────────────────
  const belowFloor = scored.filter(o => o.overall_score < threshold);
  if (belowFloor.length >= 2) {
    const avg = (scored.reduce((s, o) => s + o.overall_score, 0) / scored.length).toFixed(1);
    const newFloor = Math.max(2.0, threshold - 0.5).toFixed(1);
    patterns.push({
      id: "below-floor",
      severity: 3,
      headline: t.advPatBelowFloorHeadline || "You're applying below your floor.",
      sub: fmt(t.advPatBelowFloorSub || "{below} of {total} scored roles are under your stated VQ floor of {threshold}.", { below: belowFloor.length, total: scored.length, threshold }),
      detail: t.advPatBelowFloorDetail || "Either your floor is set too high, or the market is tighter than expected. Both are worth knowing.",
      metric: { value: `${belowFloor.length} of ${scored.length}`, label: "BELOW FLOOR" },
      evidence: belowFloor.slice(0, 3).map(o => ({
        title: o.role_title || "Untitled",
        co:    o.company    || "",
        score: o.overall_score,
        delta: parseFloat((o.overall_score - threshold).toFixed(1)),
      })),
      suggestion: fmt(t.advPatBelowFloorSuggestion || "Your average VQ this period: {avg}. Consider lowering your floor to {newFloor} or tightening your filters.", { avg, newFloor }),
      actions: [
        { label: t.advActionRevisitFloor  || "Revisit your floor" },
        { label: t.advActionFilterWeights || "See full filter weights" },
        { label: t.advActionDismiss14     || "Dismiss for 14 days", dismiss: true },
      ],
    });
  }

  // ── VQ trending down ───────────────────────────────────────────────────────
  if (scored.length >= 4) {
    const recent = scored.slice(0, Math.ceil(scored.length / 2));
    const older  = scored.slice(Math.ceil(scored.length / 2));
    const recentAvg = recent.reduce((s, o) => s + o.overall_score, 0) / recent.length;
    const olderAvg  = older.reduce((s,  o) => s + o.overall_score, 0) / older.length;
    const delta = recentAvg - olderAvg;
    if (delta < -0.3) {
      patterns.push({
        id: "vq-trending-down",
        severity: 2,
        headline: t.advPatTrendDownHeadline || "Your scores are trending down.",
        sub: fmt(t.advPatTrendDownSub || "Recent average: {recent}. Earlier average: {earlier}.", { recent: recentAvg.toFixed(1), earlier: olderAvg.toFixed(1) }),
        detail: t.advPatTrendDownDetail || "When score quality drops, it usually means filter widening, urgency, or fatigue. Worth a pause.",
        metric: { value: delta.toFixed(1), label: "VQ TREND" },
        evidence: [],
        suggestion: t.advPatTrendDownSuggestion || "Your highest-scoring roles tend to share specific filter strengths. Consider tightening to what's working.",
        actions: [
          { label: t.advActionReviewFilterWeights || "Review filter weights" },
          { label: t.advActionTakeWeek            || "Take a week" },
          { label: t.advActionDismiss             || "Dismiss", dismiss: true },
        ],
      });
    }
  }

  // ── Timeline awareness ─────────────────────────────────────────────────────
  if (profile?.timeline && WINDOW_DAYS[profile.timeline]) {
    const windowDays  = WINDOW_DAYS[profile.timeline];
    const windowLabel = getWindowLabel(profile.timeline, t);
    const startDate   = getSearchStart(scored);
    const now         = new Date();
    const daysElapsed = Math.max(0, Math.floor((now - startDate) / 86400000));
    const daysLeft    = Math.max(0, windowDays - daysElapsed);
    const progress    = daysElapsed / windowDays;
    const weekNum     = Math.floor(daysElapsed / 7);
    const avgVq       = scored.length > 0
      ? (scored.reduce((s, o) => s + o.overall_score, 0) / scored.length).toFixed(1)
      : null;
    const topRole = scored.length > 0
      ? scored.sort((a, b) => b.overall_score - a.overall_score)[0]
      : null;

    if (progress >= 0.90) {
      patterns.push({
        id: `timeline-closing-w${weekNum}`,
        severity: 3,
        headline: t.advPatTimelineClosingHeadline || "Your search window is nearly closed.",
        sub: fmt(t.advPatTimelineClosingSub || "You set a {window} window. About {days} days remain.", { window: windowLabel, days: daysLeft }),
        detail: t.advPatTimelineClosingDetail || "This is the highest-leverage moment to act on your strongest opportunities — or reset your timeline with clear eyes.",
        metric: { value: `${daysLeft}d left`, label: "WINDOW CLOSING" },
        evidence: [],
        suggestion: topRole
          ? fmt(t.advPatTimelineClosingTopRole || "Your top-scoring role: {title} at {company}. That's your strongest lead.", { title: topRole.role_title || "Untitled", company: topRole.company || "" })
          : (t.advPatTimelineClosingNoRoles || "You haven't scored any roles yet. Start with one — any signal is better than silence."),
        actions: [
          { label: t.advActionSeeTopScores  || "See top scores" },
          { label: t.advActionResetTimeline || "Reset timeline" },
          { label: t.advActionDismiss       || "Dismiss", dismiss: true },
        ],
      });
    } else if (progress >= 0.65) {
      patterns.push({
        id: `timeline-late-w${weekNum}`,
        severity: 2,
        headline: t.advPatTimelineLateHeadline || "Three-quarters of your window is behind you.",
        sub: fmt(t.advPatTimelineLateSub || "{days} days left in your {window} window.", { days: daysLeft, window: windowLabel }),
        detail: t.advPatTimelineLateDetail || "The last stretch is where searches accelerate or stall. Focus energy on your highest-VQ opportunities.",
        metric: { value: `${daysLeft}d left`, label: "WINDOW · LATE STAGE" },
        evidence: [],
        suggestion: t.advPatTimelineLateSuggestion || "Consider narrowing to your top 3 roles rather than scoring new ones.",
        actions: [
          { label: t.advActionSeeYourTopScores || "See your top scores" },
          { label: t.advActionDismiss          || "Dismiss", dismiss: true },
        ],
      });
    } else if (progress >= 0.40) {
      patterns.push({
        id: `timeline-mid-w${weekNum}`,
        severity: 1,
        headline: t.advPatTimelineMidHeadline || "You're halfway through your window.",
        sub: fmt(t.advPatTimelineMidSub || "{elapsed} days in, {left} to go in your {window} window.", { elapsed: daysElapsed, left: daysLeft, window: windowLabel }),
        detail: t.advPatTimelineMidDetail || "The second half is where most searches accelerate or stall. If something feels off, now is the time to adjust.",
        metric: { value: `${Math.round(progress * 100)}%`, label: "WINDOW COMPLETE" },
        evidence: [],
        suggestion: avgVq
          ? fmt(t.advPatTimelineMidSuggestion || "You've scored {n} roles with an average VQ of {avg}. Keep the quality standard.", { n: scored.length, avg: avgVq })
          : (t.advPatTimelineMidNoRoles || "You haven't scored any roles yet. Half your window is gone — time to start."),
        actions: [
          { label: t.advActionReviewPipeline || "Review your pipeline" },
          { label: t.advActionDismiss        || "Dismiss", dismiss: true },
        ],
      });
    } else if (progress >= 0.20) {
      patterns.push({
        id: `timeline-early-w${weekNum}`,
        severity: 1,
        headline: t.advPatTimelineEarlyHeadline || "You're a quarter of the way through your window.",
        sub: fmt(t.advPatTimelineEarlySub || "{elapsed} days in. {left} days left in your {window} window.", { elapsed: daysElapsed, left: daysLeft, window: windowLabel }),
        detail: t.advPatTimelineEarlyDetail || "Early enough to course-correct. Most strong candidates use this stage to tighten filters based on what they've seen so far.",
        metric: { value: `${Math.round(progress * 100)}%`, label: "WINDOW COMPLETE" },
        evidence: [],
        suggestion: t.advPatTimelineEarlySuggestion || "Check that your filters reflect what you've learned — early patterns often reveal misaligned weights.",
        actions: [
          { label: t.advActionReviewFilterWeights || "Review filter weights" },
          { label: t.advActionDismiss             || "Dismiss", dismiss: true },
        ],
      });
    }
  }

  // ── Demo patterns (shown when no live data) ────────────────────────────────
  if (patterns.length === 0) {
    const threshold0 = parseFloat(profile?.threshold) || 3.5;
    patterns.push(
      {
        id: "below-floor-demo",
        severity: 3,
        headline: t.advPatBelowFloorHeadline || "You're applying below your floor.",
        sub: fmt(t.advPatBelowFloorDemoSub || "Five sends, three under your stated VQ floor of {threshold}.", { threshold: threshold0 }),
        detail: t.advPatBelowFloorDetail || "Either your floor is wrong, or the market is tighter than you thought. Both are worth knowing.",
        metric: { value: "3 of 5", label: "BELOW FLOOR · 14 DAYS" },
        evidence: [
          { co: "Stripe",  title: "Director, Strategy",     score: 2.1, delta: -1.4 },
          { co: "Vercel",  title: "Head of RevOps",          score: 2.8, delta: -0.7 },
          { co: "Brex",    title: "VP, Revenue Operations",  score: 2.4, delta: -1.1 },
        ],
        suggestion: fmt(t.advPatBelowFloorDemoSuggestion || "Your average application this month: 3.1. Consider lowering your floor to 3.0 or tightening your filters.", { threshold: threshold0 }),
        actions: [
          { label: t.advActionRevisitFloor  || "Revisit your floor" },
          { label: t.advActionFilterWeights || "See full filter weights" },
          { label: t.advActionDismiss14     || "Dismiss for 14 days", dismiss: true },
        ],
      },
      {
        id: "hard-no-violation",
        severity: 3,
        headline: t.advPatHardNoHeadline || "Two roles broke a hard no.",
        sub: t.advPatHardNoSub || "You said no to startups under Series B. You've applied to two.",
        detail: t.advPatHardNoDetail || "Hard nos are the rules you said you wouldn't break. The system flags every violation so you can decide if the rule still holds.",
        metric: { value: "2", label: "HARD-NO BREACHES" },
        evidence: [
          { co: "Mercury", title: "VP Operations",          score: 3.6, flag: "Series A · 38 employees" },
          { co: "Linear",  title: "Director of Operations", score: 4.3, flag: "Series A · 72 employees" },
        ],
        suggestion: t.advPatHardNoSuggestion || 'Linear scored 4.3 despite the breach. Consider whether "Series B+" should be a soft filter, not a hard no.',
        actions: [
          { label: t.advActionReviewHardNos || "Review hard nos" },
          { label: t.advActionAdjustFilter  || "Adjust filter" },
          { label: t.advActionDismiss       || "Dismiss", dismiss: true },
        ],
      },
      {
        id: "comp-aspirational",
        severity: 2,
        headline: t.advPatCompHeadline || "Your comp floor may be aspirational.",
        sub: t.advPatCompSub || "Median application: $278k. Your stated floor: $300k.",
        detail: t.advPatCompDetail || "Behavior reveals what filters can't. Either your floor needs to drop, or you're sending applications you don't actually want to win.",
        metric: { value: "−$22k", label: "BELOW FLOOR · MEDIAN" },
        evidence: [
          { co: "Notion", title: "VP, Customer Success",       score: 3.4, flag: "$260k–$310k" },
          { co: "Figma",  title: "VP People",                  score: 3.7, flag: "$270k–$320k" },
          { co: "Gusto",  title: "Director, Strategic Finance", score: 3.2, flag: "$250k–$295k" },
        ],
        suggestion: t.advPatCompSuggestion || "At your level, market median for senior ops roles is $295k. Your $300k floor is reasonable; the gap is in your application targeting.",
        actions: [
          { label: t.advActionAdjustCompFloor || "Adjust comp floor" },
          { label: t.advActionSeeMarketData   || "See market data" },
          { label: t.advActionDismiss         || "Dismiss", dismiss: true },
        ],
      },
      {
        id: "remote-drift",
        severity: 1,
        headline: t.advPatRemoteHeadline || "Hybrid openness isn't showing up.",
        sub: t.advPatRemoteSub || "You said yes to hybrid. Every application this month was remote.",
        detail: t.advPatRemoteDetail || "Not necessarily a problem — just a tell about what you actually want.",
        metric: { value: "0 of 7", label: "HYBRID APPLICATIONS" },
        evidence: [],
        suggestion: t.advPatRemoteSuggestion || "Consider tightening your stated preference to remote-only — cleaner filters yield cleaner scores.",
        actions: [
          { label: t.advActionUpdateLocationFilter || "Update location filter" },
          { label: t.advActionKeepAsIs             || "Keep as-is" },
        ],
      },
      {
        id: "vq-trending-down-demo",
        severity: 2,
        headline: t.advPatTrendDownHeadline || "Your scores are trending down.",
        sub: t.advPatTrendDownDemoSub || "Average VQ this month: 3.1. Last month: 3.7.",
        detail: t.advPatTrendDownDetail || "When score quality drops, it usually means filter widening, urgency, or burnout. Worth a pause.",
        metric: { value: "−0.6", label: "VQ TREND · 30D" },
        evidence: [],
        suggestion: t.advPatTrendDownDemoSuggestion || 'Your last 5 high-VQ scores all share "Financial Authority" as critical. Consider whether broader applications are worth the time.',
        actions: [
          { label: t.advActionReviewFilterWeights || "Review filter weights" },
          { label: t.advActionTakeWeek            || "Take a week" },
          { label: t.advActionDismiss             || "Dismiss", dismiss: true },
        ],
      }
    );
  }

  return patterns;
}

const HISTORY = [
  { id: "h1", headline: "Resolved — raised VQ floor to 3.0.", date: "Mar 14", resolved: true },
  { id: "h2", headline: 'Dismissed — "remote drift".',          date: "Mar 02", resolved: false },
  { id: "h3", headline: 'Resolved — dropped "P&L Critical".',   date: "Feb 19", resolved: true },
];

// ─── PatternRow ───────────────────────────────────────────────────────────────
function PatternRow({ pattern, active, onClick, t = {} }) {
  const sev = sevMeta(pattern.severity, t);
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left",
        padding: "14px 14px",
        background: active ? "var(--ink)" : "var(--cream)",
        border: `0.5px solid ${active ? "var(--ink)" : "var(--border)"}`,
        borderRadius: 10, marginBottom: 6, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
        transition: "background 180ms ease, border-color 180ms ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: sev.dot, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 500,
          color: active ? "#F4F8F0" : "var(--ink)", lineHeight: 1.3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{pattern.headline}</div>
      </div>
      {pattern.metric && (
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 500,
          color: active ? "#A8C0A8" : "var(--muted)",
          letterSpacing: "-0.005em", flexShrink: 0,
        }}>{pattern.metric.value}</div>
      )}
    </button>
  );
}

// ─── PatternDetail ────────────────────────────────────────────────────────────
function PatternDetail({ pattern, onDismiss, t = {} }) {
  const sev = sevMeta(pattern.severity, t);
  return (
    <div style={{
      background: "var(--paper)",
      border: "0.5px solid var(--border)",
      borderRadius: 12,
      padding: "18px 18px 16px",
      marginTop: 8,
    }}>
      {/* Severity rail */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sev.dot }} />
        <span style={{
          fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
          color: "#6B7B6B", textTransform: "uppercase",
        }}>{sev.label} · {sev.sevLabel}</span>
      </div>

      {/* Headline + sub */}
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--ink)",
        lineHeight: 1.25, letterSpacing: "-0.005em", marginBottom: 6,
      }}>{pattern.headline}</div>
      <div style={{ fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>
        {pattern.sub}
      </div>

      {/* Detail italic */}
      <div style={{
        marginTop: 14, padding: "12px 0", borderTop: "0.5px solid var(--border)",
        fontFamily: "var(--font-prose)", fontSize: 13, color: "var(--ink)",
        lineHeight: 1.5, fontStyle: "italic",
      }}>{pattern.detail}</div>

      {/* Evidence */}
      {pattern.evidence && pattern.evidence.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
            color: "#8A9A8A", textTransform: "uppercase", marginBottom: 6,
          }}>{(t.advocateEvidence || "EVIDENCE").toUpperCase()}</div>
          {pattern.evidence.map((e, i) => (
            <div key={i} style={{
              padding: "10px 0",
              borderBottom: i < pattern.evidence.length - 1 ? "0.5px solid var(--border)" : "none",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 36, textAlign: "right",
                fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500,
                color: scoreColor(e.score), lineHeight: 1, letterSpacing: "-0.005em",
              }}>{e.score.toFixed(1)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "var(--font-display)", fontSize: 13, color: "var(--ink)", lineHeight: 1.3,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{e.title}</div>
                <div style={{
                  fontFamily: "var(--font-data)", fontSize: 9, color: "#8A9A8A",
                  letterSpacing: "0.06em", marginTop: 2, textTransform: "uppercase",
                }}>
                  {e.co}{e.flag ? ` · ${e.flag}` : e.delta != null ? ` · ${e.delta > 0 ? "+" : ""}${e.delta.toFixed(1)} VS FLOOR` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestion */}
      {pattern.suggestion && (
        <div style={{
          marginTop: 14, padding: "12px 14px",
          background: "var(--cream)", borderRadius: 8,
        }}>
          <div style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
            color: "#8A9A8A", textTransform: "uppercase", marginBottom: 4,
          }}>{(t.advocateWhatToDo || "WHAT TO DO").toUpperCase()}</div>
          <div style={{ fontFamily: "var(--font-prose)", fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
            {pattern.suggestion}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {pattern.actions.map((a, i) => (
          <button
            key={i}
            onClick={a.dismiss ? onDismiss : undefined}
            style={{
              padding: "12px 14px",
              background: i === 0 ? "var(--ink)" : "transparent",
              color: i === 0 ? "#F4F8F0" : "var(--ink)",
              border: i === 0 ? "none" : "0.5px solid var(--border)",
              borderRadius: 8, cursor: "pointer",
              fontFamily: "var(--font-prose)", fontSize: 14, fontWeight: 500,
              textAlign: "left", minHeight: 44,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span>{a.label}</span>
            {i === 0 && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3L9 7L5 11" stroke="#F4F8F0" strokeWidth="1.4"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── VQAdvocateScreen ─────────────────────────────────────────────────────────
export default function VQAdvocateScreen({ onClose, opportunities, profile, t = {} }) {
  const patterns = useMemo(
    () => computePatterns(opportunities, profile, t),
    [opportunities, profile, t]
  );

  const [dismissed, setDismissed] = useState([]);
  const [notifyOn, setNotifyOn]   = useState(true);
  const active = patterns.filter(p => !dismissed.includes(p.id));
  const [activeId, setActiveId]   = useState(active[0]?.id);
  const activePattern = active.find(p => p.id === activeId);

  function dismiss(id) {
    setDismissed(d => [...d, id]);
    const next = active.find(p => p.id !== id);
    setActiveId(next?.id);
  }

  const activeCountStr = active.length === 1
    ? fmt(t.advocateActivePatterns1 || "{n} active pattern in the last 30 days.", { n: active.length })
    : fmt(t.advocateActivePatterns  || "{n} active patterns in the last 30 days.", { n: active.length });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "var(--paper)", overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "54px 8px 8px 12px",
        position: "sticky", top: 0,
        background: "var(--paper)", zIndex: 1,
        borderBottom: "0.5px solid var(--border)",
      }}>
        <button
          onClick={onClose}
          aria-label="Back"
          style={{
            width: 44, height: 44, background: "transparent", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="var(--ink)" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{
          fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.18em",
          color: "var(--ink)", textTransform: "uppercase",
        }}>{t.advocateTitle || "VQ ADVOCATE"}</div>
        <div style={{ width: 44 }} />
      </header>

      <div style={{ paddingBottom: 48 }}>
        {/* Title block */}
        <div style={{ padding: "20px 20px 18px" }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--accent)", marginBottom: 10,
          }}>{(t.advocateEyebrow || "WHAT THE BEHAVIOR SHOWS").toUpperCase()}</p>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700,
            color: "var(--ink)", lineHeight: 1.18, margin: 0, letterSpacing: "-0.005em",
          }}>{activeCountStr}</h1>
          <p style={{
            fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--muted)",
            lineHeight: 1.5, margin: "10px 0 0",
          }}>
            {t.advocateDesc || "We measure your behavior against the filters you set. When they don't match, we tell you."}
          </p>
        </div>

        {/* Pattern list */}
        <div style={{ padding: "0 20px 18px" }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--muted)", marginBottom: 8,
          }}>{(t.advocateActive || "ACTIVE").toUpperCase()}</p>
          {active.length === 0 ? (
            <div style={{
              padding: "20px 0",
              fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--muted)",
              textAlign: "center",
            }}>{t.advocateEmpty || "No active patterns right now. Keep going."}</div>
          ) : active.map(p => (
            <PatternRow
              key={p.id}
              pattern={p}
              active={p.id === activeId}
              onClick={() => setActiveId(p.id)}
              t={t}
            />
          ))}
        </div>

        {/* Active pattern detail */}
        {activePattern && (
          <div style={{ padding: "0 20px 24px" }}>
            <PatternDetail
              pattern={activePattern}
              onDismiss={() => dismiss(activePattern.id)}
              t={t}
            />
          </div>
        )}

        {/* History */}
        <div style={{ padding: "0 20px 24px" }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--muted)", marginBottom: 8,
          }}>{(t.advocateHistory || "HISTORY · 30 DAYS").toUpperCase()}</p>
          <div style={{ borderTop: "0.5px solid var(--border)" }}>
            {HISTORY.map(h => (
              <div key={h.id} style={{
                padding: "12px 0",
                borderBottom: "0.5px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: h.resolved ? "var(--accent)" : "#B0B8B0",
                    flexShrink: 0,
                  }} />
                  <div style={{ fontFamily: "var(--font-prose)", fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>
                    {h.headline}
                  </div>
                </div>
                <div style={{
                  fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em",
                  color: "#8A9A8A", textTransform: "uppercase", flexShrink: 0, marginLeft: 12,
                }}>{h.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification toggle */}
        <div style={{ padding: "0 20px 32px" }}>
          <button
            onClick={() => setNotifyOn(n => !n)}
            style={{
              width: "100%", padding: "14px 16px",
              background: "var(--cream)", border: "0.5px solid var(--border)",
              borderRadius: 10, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{
                fontFamily: "var(--font-prose)", fontSize: 14, fontWeight: 500, color: "var(--ink)",
              }}>{t.advocateNotify || "Notify me about new patterns"}</div>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em",
                color: "#8A9A8A", marginTop: 3, textTransform: "uppercase",
              }}>{(t.advocateNotifyHint || "WORTH-PAUSING ONLY").toUpperCase()}</div>
            </div>
            {/* Toggle pill */}
            <div style={{
              width: 36, height: 22, borderRadius: 999, flexShrink: 0,
              background: notifyOn ? "var(--accent)" : "#C8D4C5",
              position: "relative", transition: "background 200ms ease",
            }}>
              <div style={{
                position: "absolute", top: 2,
                left: notifyOn ? 16 : 2,
                width: 18, height: 18, borderRadius: "50%",
                background: "#FFFFFF",
                transition: "left 200ms ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VQAdvocateCard — compact stack card for Workspace ───────────────────────
const DISMISSED_KEY = "vetted_advocate_dismissed";
function readDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}
function writeDismissed(ids) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids)); } catch {}
}

export function VQAdvocateCard({ opportunities, profile, onOpen, t = {} }) {
  const patterns = useMemo(
    () => computePatterns(opportunities, profile, t),
    [opportunities, profile, t]
  );
  const [dismissed, setDismissed] = useState(readDismissed);
  const active = patterns.filter(p => !dismissed.includes(p.id)).slice(0, 1);

  if (active.length === 0) return null;

  const p   = active[0];
  const sev = sevMeta(p.severity, t);
  const remaining = patterns.filter(q => !dismissed.includes(q.id)).length - 1;

  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div
        onClick={onOpen}
        style={{
          background: "var(--paper)",
          border: "0.5px solid var(--border)",
          borderRadius: 12,
          padding: "14px 16px 12px",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(26,46,26,0.08), 0 1px 2px rgba(26,46,26,0.04)",
        }}
      >
        {/* Top rail */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: sev.dot }} />
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.16em",
              color: "var(--ink)", textTransform: "uppercase", fontWeight: 500,
            }}>{t.advocateTitle || "VQ ADVOCATE"}</span>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em",
              color: "#8A9A8A", textTransform: "uppercase",
            }}>· {sev.label}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(d => { const next = [...d, p.id]; writeDismissed(next); return next; }); }}
            aria-label="Dismiss"
            style={{
              width: 22, height: 22, background: "transparent", border: "none",
              cursor: "pointer", color: "#8A9A8A", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center", marginRight: -4,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <line x1="2" y1="2" x2="9" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="9" y1="2" x2="2" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Headline */}
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--ink)",
          lineHeight: 1.3, letterSpacing: "-0.005em",
        }}>{p.headline}</div>

        {/* Sub */}
        <div style={{
          fontFamily: "var(--font-prose)", fontSize: 13, color: "var(--muted)",
          marginTop: 4, lineHeight: 1.45,
        }}>{p.sub}</div>

        {/* Footer */}
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: "0.5px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.12em",
            color: "#8A9A8A", textTransform: "uppercase",
          }}>
            {remaining > 0 ? `${remaining} MORE IN MENU` : "ALL IN MENU"}
          </div>
          <span style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
            color: "var(--accent)", textTransform: "uppercase",
          }}>OPEN →</span>
        </div>
      </div>
    </div>
  );
}
