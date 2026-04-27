// Vetted — VQ Advocate
// Full-screen behavioral intelligence screen.
// Measures user behavior against stated filters and surfaces mismatches gently.

import { useState, useMemo } from "react";

// ─── Severity ────────────────────────────────────────────────────────────────
function sevMeta(sev) {
  if (sev === 3) return { dot: "#B86A2C", label: "WORTH PAUSING", sevLabel: "SEV 3" };
  if (sev === 2) return { dot: "#C9A227", label: "NOTICED",       sevLabel: "SEV 2" };
  return               { dot: "#6B8E6B", label: "OBSERVATION",   sevLabel: "SEV 1" };
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
const WINDOW_LABEL = {
  asap: "ASAP", "30days": "30-day", quarter: "quarter",
  "6months": "6-month", yearout: "1-year", yearplus: "exploratory",
};
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
// Derives live patterns from the user's real opportunities + profile data.
function computePatterns(opportunities, profile) {
  const scored = (opportunities || []).filter(o =>
    typeof o.overall_score === "number" && o.status !== "queued"
  );
  const threshold = parseFloat(profile?.threshold) || 3.5;
  const compFloorK = parseFloat(profile?.compensationMin) || null;

  const patterns = [];

  // ── Below floor ────────────────────────────────────────────────────────────
  const belowFloor = scored.filter(o => o.overall_score < threshold);
  if (belowFloor.length >= 2) {
    patterns.push({
      id: "below-floor",
      severity: 3,
      headline: "You're applying below your floor.",
      sub: `${belowFloor.length} of ${scored.length} scored roles are under your stated VQ floor of ${threshold}.`,
      detail: "Either your floor is set too high, or the market is tighter than expected. Both are worth knowing.",
      metric: { value: `${belowFloor.length} of ${scored.length}`, label: "BELOW FLOOR" },
      evidence: belowFloor.slice(0, 3).map(o => ({
        title: o.role_title || "Untitled",
        co:    o.company    || "",
        score: o.overall_score,
        delta: parseFloat((o.overall_score - threshold).toFixed(1)),
      })),
      suggestion: `Your average VQ this period: ${(scored.reduce((s, o) => s + o.overall_score, 0) / scored.length).toFixed(1)}. Consider lowering your floor to ${Math.max(2.0, threshold - 0.5).toFixed(1)} or tightening your filters.`,
      actions: ["Revisit your floor", "See full filter weights", "Dismiss for 14 days"],
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
        headline: "Your scores are trending down.",
        sub: `Recent average: ${recentAvg.toFixed(1)}. Earlier average: ${olderAvg.toFixed(1)}.`,
        detail: "When score quality drops, it usually means filter widening, urgency, or fatigue. Worth a pause.",
        metric: { value: delta.toFixed(1), label: "VQ TREND" },
        evidence: [],
        suggestion: "Your highest-scoring roles tend to share specific filter strengths. Consider tightening to what's working.",
        actions: ["Review filter weights", "Take a week", "Dismiss"],
      });
    }
  }

  // ── Timeline awareness ─────────────────────────────────────────────────────
  if (profile?.timeline && WINDOW_DAYS[profile.timeline]) {
    const windowDays  = WINDOW_DAYS[profile.timeline];
    const windowLabel = WINDOW_LABEL[profile.timeline] || "stated";
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
        headline: "Your search window is nearly closed.",
        sub: `You set a ${windowLabel} window. About ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remain.`,
        detail: "This is the highest-leverage moment to act on your strongest opportunities — or reset your timeline with clear eyes.",
        metric: { value: `${daysLeft}d left`, label: "WINDOW CLOSING" },
        evidence: [],
        suggestion: topRole
          ? `Your top-scoring role: ${topRole.role_title || "Untitled"} at ${topRole.company || ""}. That's your strongest lead.`
          : "You haven't scored any roles yet. Start with one — any signal is better than silence.",
        actions: ["See top scores", "Reset timeline", "Dismiss"],
      });
    } else if (progress >= 0.65) {
      patterns.push({
        id: `timeline-late-w${weekNum}`,
        severity: 2,
        headline: "Three-quarters of your window is behind you.",
        sub: `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your ${windowLabel} window.`,
        detail: "The last stretch is where searches accelerate or stall. Focus energy on your highest-VQ opportunities.",
        metric: { value: `${daysLeft}d left`, label: "WINDOW · LATE STAGE" },
        evidence: [],
        suggestion: "Consider narrowing to your top 3 roles rather than scoring new ones.",
        actions: ["See your top scores", "Dismiss"],
      });
    } else if (progress >= 0.40) {
      patterns.push({
        id: `timeline-mid-w${weekNum}`,
        severity: 1,
        headline: "You're halfway through your window.",
        sub: `${daysElapsed} days in, ${daysLeft} to go in your ${windowLabel} window.`,
        detail: "The second half is where most searches accelerate or stall. If something feels off, now is the time to adjust — not the last quarter.",
        metric: { value: `${Math.round(progress * 100)}%`, label: "WINDOW COMPLETE" },
        evidence: [],
        suggestion: avgVq
          ? `You've scored ${scored.length} role${scored.length !== 1 ? "s" : ""} with an average VQ of ${avgVq}. Keep the quality standard.`
          : "You haven't scored any roles yet. Half your window is gone — time to start.",
        actions: ["Review your pipeline", "Dismiss"],
      });
    } else if (progress >= 0.20) {
      patterns.push({
        id: `timeline-early-w${weekNum}`,
        severity: 1,
        headline: "You're a quarter of the way through your window.",
        sub: `${daysElapsed} days in. ${daysLeft} days left in your ${windowLabel} window.`,
        detail: "Early enough to course-correct. Most strong candidates use this stage to tighten filters based on what they've seen so far.",
        metric: { value: `${Math.round(progress * 100)}%`, label: "WINDOW COMPLETE" },
        evidence: [],
        suggestion: "Check that your filters reflect what you've learned — early patterns often reveal misaligned weights.",
        actions: ["Review filter weights", "Dismiss"],
      });
    }
  }

  // ── Static patterns (always shown in design; shown when no live data) ──────
  if (patterns.length === 0) {
    patterns.push(
      {
        id: "below-floor-demo",
        severity: 3,
        headline: "You're applying below your floor.",
        sub: `Five sends, three under your stated VQ floor of ${threshold}.`,
        detail: "Either your floor is wrong, or the market is tighter than you thought. Both are worth knowing.",
        metric: { value: "3 of 5", label: "BELOW FLOOR · 14 DAYS" },
        evidence: [
          { co: "Stripe",  title: "Director, Strategy",     score: 2.1, delta: -1.4 },
          { co: "Vercel",  title: "Head of RevOps",          score: 2.8, delta: -0.7 },
          { co: "Brex",    title: "VP, Revenue Operations",  score: 2.4, delta: -1.1 },
        ],
        suggestion: `Your average application this month: 3.1. Consider lowering your floor to 3.0 or tightening your filters.`,
        actions: ["Revisit your floor", "See full filter weights", "Dismiss for 14 days"],
      },
      {
        id: "hard-no-violation",
        severity: 3,
        headline: "Two roles broke a hard no.",
        sub: "You said no to startups under Series B. You've applied to two.",
        detail: "Hard nos are the rules you said you wouldn't break. The system flags every violation so you can decide if the rule still holds.",
        metric: { value: "2", label: "HARD-NO BREACHES" },
        evidence: [
          { co: "Mercury", title: "VP Operations",          score: 3.6, flag: "Series A · 38 employees" },
          { co: "Linear",  title: "Director of Operations", score: 4.3, flag: "Series A · 72 employees" },
        ],
        suggestion: 'Linear scored 4.3 despite the breach. Consider whether "Series B+" should be a soft filter, not a hard no.',
        actions: ["Review hard nos", "Adjust filter", "Dismiss"],
      },
      {
        id: "comp-aspirational",
        severity: 2,
        headline: "Your comp floor may be aspirational.",
        sub: "Median application: $278k. Your stated floor: $300k.",
        detail: "Behavior reveals what filters can't. Either your floor needs to drop, or you're sending applications you don't actually want to win.",
        metric: { value: "−$22k", label: "BELOW FLOOR · MEDIAN" },
        evidence: [
          { co: "Notion", title: "VP, Customer Success",       score: 3.4, flag: "$260k–$310k" },
          { co: "Figma",  title: "VP People",                  score: 3.7, flag: "$270k–$320k" },
          { co: "Gusto",  title: "Director, Strategic Finance", score: 3.2, flag: "$250k–$295k" },
        ],
        suggestion: "At your level, market median for senior ops roles is $295k. Your $300k floor is reasonable; the gap is in your application targeting.",
        actions: ["Adjust comp floor", "See market data", "Dismiss"],
      },
      {
        id: "remote-drift",
        severity: 1,
        headline: "Hybrid openness isn't showing up.",
        sub: "You said yes to hybrid. Every application this month was remote.",
        detail: "Not necessarily a problem — just a tell about what you actually want.",
        metric: { value: "0 of 7", label: "HYBRID APPLICATIONS" },
        evidence: [],
        suggestion: "Consider tightening your stated preference to remote-only — cleaner filters yield cleaner scores.",
        actions: ["Update location filter", "Keep as-is"],
      },
      {
        id: "vq-trending-down-demo",
        severity: 2,
        headline: "Your scores are trending down.",
        sub: "Average VQ this month: 3.1. Last month: 3.7.",
        detail: "When score quality drops, it usually means filter widening, urgency, or burnout. Worth a pause.",
        metric: { value: "−0.6", label: "VQ TREND · 30D" },
        evidence: [],
        suggestion: 'Your last 5 high-VQ scores all share "Financial Authority" as critical. Consider whether broader applications are worth the time.',
        actions: ["Review filter weights", "Take a week", "Dismiss"],
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
function PatternRow({ pattern, active, onClick }) {
  const sev = sevMeta(pattern.severity);
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
          fontFamily: "var(--font-prose)", fontSize: 14, fontWeight: 500,
          color: active ? "#F4F8F0" : "var(--ink)", lineHeight: 1.3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{pattern.headline}</div>
      </div>
      {pattern.metric && (
        <div style={{
          fontFamily: "var(--font-prose)", fontSize: 13, fontWeight: 500,
          color: active ? "#A8C0A8" : "var(--muted)",
          letterSpacing: "-0.005em", flexShrink: 0,
        }}>{pattern.metric.value}</div>
      )}
    </button>
  );
}

// ─── PatternDetail ────────────────────────────────────────────────────────────
function PatternDetail({ pattern, onDismiss }) {
  const sev = sevMeta(pattern.severity);
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
        fontFamily: "var(--font-prose)", fontSize: 18, fontWeight: 500, color: "var(--ink)",
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
          }}>EVIDENCE</div>
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
                  fontFamily: "var(--font-prose)", fontSize: 13, color: "var(--ink)", lineHeight: 1.3,
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
          }}>WHAT TO DO</div>
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
            onClick={a.toLowerCase().includes("dismiss") ? onDismiss : undefined}
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
            <span>{a}</span>
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
export default function VQAdvocateScreen({ onClose, opportunities, profile }) {
  const patterns = useMemo(
    () => computePatterns(opportunities, profile),
    [opportunities, profile]
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
        }}>VQ ADVOCATE</div>
        <div style={{ width: 44 }} />
      </header>

      <div style={{ paddingBottom: 48 }}>
        {/* Title block */}
        <div style={{ padding: "20px 20px 18px" }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--accent)", marginBottom: 10,
          }}>WHAT THE BEHAVIOR SHOWS</p>
          <h1 style={{
            fontFamily: "var(--font-prose)", fontSize: 26, fontWeight: 500,
            color: "var(--ink)", lineHeight: 1.18, margin: 0, letterSpacing: "-0.005em",
          }}>{active.length} active {active.length === 1 ? "pattern" : "patterns"} in the last 30 days.</h1>
          <p style={{
            fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--muted)",
            lineHeight: 1.5, margin: "10px 0 0",
          }}>
            We measure your behavior against the filters you set. When they don't match, we tell you.
          </p>
        </div>

        {/* Pattern list */}
        <div style={{ padding: "0 20px 18px" }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--muted)", marginBottom: 8,
          }}>ACTIVE</p>
          {active.length === 0 ? (
            <div style={{
              padding: "20px 0",
              fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--muted)",
              textAlign: "center",
            }}>No active patterns right now. Keep going.</div>
          ) : active.map(p => (
            <PatternRow
              key={p.id}
              pattern={p}
              active={p.id === activeId}
              onClick={() => setActiveId(p.id)}
            />
          ))}
        </div>

        {/* Active pattern detail */}
        {activePattern && (
          <div style={{ padding: "0 20px 24px" }}>
            <PatternDetail
              pattern={activePattern}
              onDismiss={() => dismiss(activePattern.id)}
            />
          </div>
        )}

        {/* History */}
        <div style={{ padding: "0 20px 24px" }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--muted)", marginBottom: 8,
          }}>HISTORY · 30 DAYS</p>
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
              }}>Notify me about new patterns</div>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em",
                color: "#8A9A8A", marginTop: 3, textTransform: "uppercase",
              }}>WORTH-PAUSING ONLY</div>
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

export function VQAdvocateCard({ opportunities, profile, onOpen }) {
  const patterns = useMemo(
    () => computePatterns(opportunities, profile),
    [opportunities, profile]
  );
  const [dismissed, setDismissed] = useState(readDismissed);
  const active = patterns.filter(p => !dismissed.includes(p.id)).slice(0, 1);

  if (active.length === 0) return null;

  const p   = active[0];
  const sev = sevMeta(p.severity);
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
            }}>VQ ADVOCATE</span>
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
          fontFamily: "var(--font-prose)", fontSize: 16, fontWeight: 500, color: "var(--ink)",
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
