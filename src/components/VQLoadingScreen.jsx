import { useState, useEffect, useRef } from "react";

// ─── Coaching pairs — shown during scoring wait ────────────────────────────
const COACHING_PAIRS = [
  { question: "If this scores below 3.0 — what's your next move?", statement: "You're doing what most professionals never do. Evaluating before committing." },
  { question: "What would a 4.5 change about how you respond to this recruiter?", statement: "Every score is a data point. Every data point is leverage." },
  { question: "Which filter matters most to you on this one — and why?", statement: "Clarity before the room is always better than clarity after." },
  { question: "If this role scores a Monitor — will you wait, or will you move on?", statement: "The best career decisions aren't made on instinct. They're made on evidence." },
  { question: "What does a Pursue verdict on this role mean for the next 90 days?", statement: "You built a framework. Now let it work." },
  { question: "What's the one filter you're most nervous about on this role?", statement: "Knowing the gap before you're in the room is the advantage." },
  { question: "If this comes back Pass — are you relieved or disappointed?", statement: "A Pass isn't a loss. It's time and energy returned to you." },
  { question: "What would you do differently if you knew the score before the first call?", statement: "That's exactly what you're about to find out." },
  { question: "Who else in your network should be scoring roles this way?", statement: "Navigators don't drift. They decide." },
  { question: "Is this role worth your full application effort — or just your attention?", statement: "Attention is free. Effort is finite. The score helps you decide." },
  { question: "What would change about your search if you knew exactly which roles were worth your energy?", statement: "That's what you're building right now. One score at a time." },
  { question: "What does landing the right role make possible for you — not just professionally, but personally?", statement: "Keep that answer close. It's why this work matters." },
  { question: "What's one thing you know about yourself today that you didn't know at the start of this search?", statement: "That clarity is progress. Even when it doesn't feel like it." },
  { question: "If the right role appeared tomorrow — would you recognize it?", statement: "You're building the framework to make sure you do." },
  { question: "What would it feel like to walk into an interview already knowing this role fits?", statement: "That confidence starts here." },
  { question: "What's the best professional decision you've ever made — and what made it clear?", statement: "You already know how to decide well. This just makes it easier." },
  { question: "What does your next role need to give you that your last one didn't?", statement: "Knowing that is half the work. The other half is what you're doing right now." },
  { question: "What would it mean to stop second-guessing and start deciding?", statement: "You're closer to that than you think." },
  { question: "Who are you becoming through this search — not just who you're looking to become?", statement: "The process is shaping you. Let it." },
  { question: "What's one role you passed on that you're grateful you did?", statement: "Your instincts have protected you before. Now you have data too." },
  { question: "Do you know how rare it is to evaluate a role before you're already emotionally invested in it?", statement: "You're doing something most professionals never do. That matters." },
  { question: "What does it say about you that you're still in this search with this level of intention?", statement: "Persistence with discernment is not common. You have both." },
  { question: "Have you given yourself credit for how far this search has taken you — even when it hasn't felt like progress?", statement: "Every evaluation is a step forward. Including this one." },
  { question: "What would the version of you who lands the right role say to the version of you right now?", statement: "Keep going. You're closer than you feel." },
  { question: "What does it mean that you haven't settled — even when settling would have been easier?", statement: "That's not stubbornness. That's standards. Honor them." },
  { question: "What are you protecting by taking this search seriously?", statement: "Your time, your energy, your trajectory. All worth protecting." },
  { question: "What has this search taught you about what you actually want — versus what you thought you wanted?", statement: "That gap is valuable information. Most people never find it." },
  { question: "What would you tell a friend who has been searching as long as you have?", statement: "Say it to yourself. You deserve to hear it." },
  { question: "How many roles have you walked away from because they weren't right?", statement: "Every one of those was a decision made in your own best interest. That's strength." },
  { question: "What does it mean to evaluate a role on your terms — not the recruiter's timeline?", statement: "It means you're in control of this search. Even when it doesn't feel that way." },
  { question: "What's the one question you'd ask this company before you'd ever say yes?", statement: "The score will help you figure out if you even need to ask it." },
  { question: "What filter are you most likely to rationalize away — and why?", statement: "The score won't rationalize it for you. That's the point." },
  { question: "What does this role need to score to make you respond to the recruiter today?", statement: "Hold that number. See how close it gets." },
  { question: "What would a perfect role look like right now — not in five years, right now?", statement: "Your framework is built around exactly that question." },
  { question: "What's the difference between a role that excites you and a role that fits you?", statement: "That gap is what the VQ score is designed to close." },
  { question: "What would you need to see in this score to share this role with someone who matters to you?", statement: "That threshold is your real standard. Trust it." },
  { question: "What's the role you keep comparing every other role to — and what made it so clear?", statement: "Your framework was built on that clarity. It's working for you right now." },
  { question: "What does this company's job posting tell you about how they treat the people who work there?", statement: "Your filters were designed to answer exactly that question." },
  { question: "If you had to defend this role to someone who knows your career best — could you?", statement: "The score gives you the language to do it." },
  { question: "What's the version of this role that would make it worth relocating for — if relocation were on the table?", statement: "Knowing your threshold before you're asked is leverage." },
  { question: "What is this job post not telling you — and does that silence tell you something?", statement: "Ambiguity in a posting is data. Your score treats it that way." },
  { question: "What does the language in this posting reveal about the company's culture — before you ever walk in?", statement: "The score reads between the lines so you don't have to guess." },
  { question: "What would a 2.8 on Financial Accountability mean for your life in 18 months?", statement: "The score makes the long-term visible before it becomes the short-term reality." },
  { question: "If this role scored perfectly on every filter except one — which one would be the dealbreaker?", statement: "That answer is already inside you. The score helps surface it." },
  { question: "What's the difference between a role that sounds right and a role that is right?", statement: "One is marketing. The other is what your score is measuring." },
  { question: "What does a weak Access to Leadership score actually cost you over a three-year arc?", statement: "More than the salary makes up for. Your framework knows that." },
  { question: "What signals in this posting suggest the role might be different in six months than it is today?", statement: "Role Integrity is designed to catch exactly that." },
  { question: "What does your gut say right now — and how much do you trust it without evidence to back it up?", statement: "Your score is the evidence. Let them work together." },
  { question: "What would change about your read on this role if you knew the last person in it left in under a year?", statement: "The score won't always have that data. But your filters will ask the right questions." },
  { question: "What's the real cost of interviewing for a role that scores below your threshold?", statement: "Time. Energy. Opportunity cost. The score returns all three." },
  { question: "Are you tired of this search?", statement: "That's allowed. Being tired doesn't mean being wrong. Keep going." },
  { question: "Has this search taken longer than you expected?", statement: "The right role doesn't run on your timeline. It runs on its own. You'll meet it." },
  { question: "What if the fact that nothing has fit yet means the right thing is still coming?", statement: "Standards are not failure. They are the reason the right role will feel right." },
  { question: "What would it feel like to stop applying to roles you already know aren't right?", statement: "You're building the discipline to do exactly that. One score at a time." },
  { question: "Have you given yourself permission to want what you actually want — not what seems reasonable?", statement: "Your framework was built around what matters to you. Not what's convenient." },
  { question: "What would it mean to end this search on your terms — not because you ran out of patience?", statement: "That's what discernment looks like. That's what you're practicing right now." },
  { question: "What's the one thing keeping you going on the hardest days of this search?", statement: "Hold onto that. It's the reason this score matters." },
  { question: "What does the right role give the people who depend on you — not just you?", statement: "That's not pressure. That's purpose. Let it fuel you." },
  { question: "What would it feel like to wake up and know you made the right call?", statement: "You're building the framework to make that feeling possible. It's coming." },
  // Anchor pair — weighted 2× in selection pool. Works at every score and stage.
  { question: "What if this score — whatever it says — is exactly the information you needed today?", statement: "It is. That's why you're here." },
];

const ANCHOR_IDX = COACHING_PAIRS.length - 1;
let _lastCoachingIdx = -1;

// ─── Keyframe injection ────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("vq-loading-keyframes")) {
  const s = document.createElement("style");
  s.id = "vq-loading-keyframes";
  s.textContent = `
    @keyframes vq-fadein { from { opacity: 0; transform: translateY(8px); }
                           to   { opacity: 1; transform: translateY(0); } }
    @keyframes vq-fadeout{ from { opacity: 1; transform: translateY(0); }
                           to   { opacity: 0; transform: translateY(-6px); } }
    @keyframes vq-pulse-dot { 0%,100% { opacity: 1; transform: scale(1); }
                               50%     { opacity: 0.5; transform: scale(1.3); } }
  `;
  document.head.appendChild(s);
}

// ─── Weight label map — matches exportPdf.js ──────────────────────────────
const WEIGHT_LABELS = {
  0.5: "Minor",
  1.0: "Standard",
  1.2: "Relevant",
  1.3: "Important",
  1.5: "Critical",
  2.0: "Critical+",
};
function weightLabel(w) {
  return WEIGHT_LABELS[w] ?? (w !== undefined ? `${Number(w).toFixed(1)}×` : null);
}

// ─── Score color helper ────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 4) return "#3A7A3A";
  if (score >= 3) return "#B8A030";
  return "#C05050";
}

// ─── FilterRow — single filter in the completion list ─────────────────────
function FilterRow({ name, status, score }) {
  // status: "waiting" | "active" | "done"
  const dotColor = status === "done" ? "#3A7A3A" : status === "active" ? "#B8A030" : "#D8E8D8";
  const nameColor = status === "done" ? "#1A2E1A" : status === "active" ? "#1A2E1A" : "#1A2E1A";
  const nameFontWeight = status === "active" ? 600 : 400;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 0",
      borderBottom: "1px solid #EEF4EE",
    }}>
      {/* Dot indicator */}
      <div style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: dotColor,
        flexShrink: 0,
        transition: "background 0.3s ease",
        animation: status === "active" ? "vq-pulse-dot 1.2s ease-in-out infinite" : "none",
      }} />
      {/* Filter name */}
      <span style={{
        fontFamily: "var(--font-prose)",
        fontSize: 13,
        color: nameColor,
        fontWeight: nameFontWeight,
        flex: 1,
        transition: "color 0.3s ease",
      }}>{name}</span>
      {/* Score — only when done */}
      {status === "done" && score !== undefined && (
        <span style={{
          fontFamily: "var(--font-data)",
          fontSize: 12,
          color: scoreColor(score),
          letterSpacing: ".04em",
          flexShrink: 0,
        }}>{score.toFixed(1)}</span>
      )}
    </div>
  );
}

// ─── VQLoadingScreen ───────────────────────────────────────────────────────
// Props:
//   loadingMsg       {string}  — aria label
//   streamingFilters {Array}   — live filter scores from SSE stream
//   filters          {Array}   — full user filter list (default + custom)
//   scoringPhase     {number}  — 0–3
//   t                {object}  — translations object for current language
//   lang             {string}  — current language code (en/es/zh/fr/ar/vi)
//
// Typography: IBM Plex Mono for all data/labels, Libre Baskerville for prose
export function VQLoadingScreen({ loadingMsg, streamingFilters = [], filters = [], scoringPhase = 0, t = {}, lang = "en" }) {
  // Pick initial coaching pair
  const initIdx = useRef(null);
  if (initIdx.current === null) {
    const pool = COACHING_PAIRS.map((_, i) => i).filter(i => i !== _lastCoachingIdx);
    if (_lastCoachingIdx !== ANCHOR_IDX) pool.push(ANCHOR_IDX);
    initIdx.current = pool[Math.floor(Math.random() * pool.length)];
    _lastCoachingIdx = initIdx.current;
  }

  const [pairIdx, setPairIdx]                 = useState(initIdx.current);
  const [phase, setPhase]                     = useState("in");
  const [coachingVisible, setCoachingVisible] = useState(false);

  // ── Time-based progress fallback ─────────────────────────────────────────
  const startTimeRef = useRef(Date.now());
  const [timePct, setTimePct] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const eased = 1 - Math.exp(-(elapsed / 15000) * 3);
      const cap = scoringPhase >= 3 ? 100 : scoringPhase >= 2 ? 99 : 88;
      setTimePct(Math.min(cap, Math.round(eased * 100)));
    }, 400);
    return () => clearInterval(iv);
  }, [scoringPhase]);

  useEffect(() => {
    const revealTimer = setTimeout(() => setCoachingVisible(true), 600);
    return () => clearTimeout(revealTimer);
  }, []);

  useEffect(() => {
    const cycle = setInterval(() => {
      setPhase("out");
      setTimeout(() => {
        setPairIdx(prev => {
          const pool = COACHING_PAIRS.map((_, i) => i).filter(i => i !== prev);
          if (prev !== ANCHOR_IDX) pool.push(ANCHOR_IDX);
          const next = pool[Math.floor(Math.random() * pool.length)];
          _lastCoachingIdx = next;
          return next;
        });
        setPhase("in");
      }, 380);
    }, 5000);
    return () => clearInterval(cycle);
  }, []);

  const totalFilters   = Math.max(filters.length, 1);
  const realPct        = Math.round((streamingFilters.length / totalFilters) * 100);
  const displayPct     = Math.max(realPct, timePct);

  const filterRows = filters.map(f => {
    // Resolve localized filter name: try current lang, fall back to en, then first available
    const filterName = typeof f.name === "object"
      ? (f.name[lang] || f.name.en || Object.values(f.name)[0])
      : (f.name || "");
    const streamed = streamingFilters.find(sf =>
      sf.filter_name?.toLowerCase() === filterName?.toLowerCase()
    );
    return { name: filterName, weight: f.weight, isDone: streamed !== undefined, score: streamed?.score };
  });

  const realDoneCount      = streamingFilters.length;
  const estimatedDoneCount = Math.floor((timePct / 100) * totalFilters);
  const doneCount          = realDoneCount > 0 ? realDoneCount : estimatedDoneCount;

  const filterRowsWithStatus = filterRows.map((row, i) => {
    if (row.isDone)    return { ...row, status: "done" };
    if (i === doneCount) return { ...row, status: "active" };
    return { ...row, status: "waiting" };
  });

  // Phase label shown in the hero — use translations with English fallback
  const phaseLabels = [
    t.loadingPhaseReading    || "Reading",
    t.loadingPhaseScoring    || "Scoring",
    t.loadingPhaseGenerating || "Generating",
    t.loadingPhaseFinalizing || "Finalizing",
  ];
  const phaseLabel = phaseLabels[Math.min(scoringPhase, 3)];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={loadingMsg}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#F7F5EF",
      }}
    >
      {/* ── DARK HERO — wordmark + progress ─────────────────────────────── */}
      <div style={{
        background: "#1A3A1A",
        borderBottom: "4px solid #3A7A3A",
        padding: "20px 24px 22px",
        flexShrink: 0,
      }}>
        {/* Wordmark row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}>
          <span style={{
            fontFamily: "var(--font-data)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.9)",
          }}>Vetted</span>
          <span style={{
            fontFamily: "var(--font-data)",
            fontSize: 9,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.75)",
          }}>{phaseLabel}…</span>
        </div>

        {/* Progress bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}>
          <span style={{
            fontFamily: "var(--font-data)",
            fontSize: 9,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.78)",
          }}>{t.loadingAnalyzing || "Analyzing role"}</span>
          <span style={{
            fontFamily: "var(--font-data)",
            fontSize: 14,
            fontWeight: 600,
            color: "#7AB87A",
            letterSpacing: ".04em",
          }}>{displayPct}%</span>
        </div>
        <div style={{
          width: "100%",
          height: 3,
          background: "rgba(255,255,255,0.12)",
          borderRadius: 2,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${displayPct}%`,
            background: "#7AB87A",
            borderRadius: 2,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* ── FILTER COMPLETION CARD ───────────────────────────────────────── */}
      {filters.length > 0 && (
        <div style={{
          margin: "20px 20px 0",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #DED9CE",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          {/* Card header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #F0EDE4",
          }}>
            <span style={{
              fontFamily: "var(--font-data)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "#7B776C",
            }}>{t.loadingYourFilters || "Your Filters"}</span>
            <span style={{
              fontFamily: "var(--font-data)",
              fontSize: 9,
              color: "#7B776C",
              letterSpacing: ".06em",
            }}>
              {streamingFilters.length} / {filters.length}
            </span>
          </div>

          {/* Filter rows — redesigned */}
          {filterRowsWithStatus.map((row, i) => {
            const isDone   = row.status === "done";
            const isActive = row.status === "active";
            const dotColor = isDone ? "#3A7A3A" : isActive ? "#B8A030" : "#DED9CE";
            const scoreColor = row.score >= 4 ? "#3A7A3A" : row.score >= 3 ? "#B8A030" : "#C05050";

            return (
              <div key={row.name || i} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 16px",
                borderBottom: i < filterRowsWithStatus.length - 1 ? "1px solid #F0EDE4" : "none",
                background: isActive ? "#FAFAF7" : "transparent",
                transition: "background 0.3s ease",
              }}>
                {/* Status dot */}
                <div style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: dotColor,
                  flexShrink: 0,
                  transition: "background 0.4s ease",
                  animation: isActive ? "vq-pulse-dot 1.2s ease-in-out infinite" : "none",
                }} />

                {/* Filter name — mono for data label */}
                <span style={{
                  fontFamily: "var(--font-data)",
                  fontSize: 10,
                  fontWeight: isDone ? 500 : isActive ? 600 : 400,
                  color: isDone || isActive ? "#1A1A18" : "#7B776C",
                  flex: 1,
                  letterSpacing: ".02em",
                  transition: "color 0.3s ease",
                }}>{row.name}</span>

                {/* Weight badge — descriptor label, skip Standard (baseline) */}
                {row.weight !== undefined && row.weight !== 1.0 && weightLabel(row.weight) && (
                  <span style={{
                    fontFamily: "var(--font-data)",
                    fontSize: 8,
                    color: isDone || isActive ? "#9B9690" : "#C0BBB4",
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    flexShrink: 0,
                    marginRight: 2,
                    transition: "color 0.3s ease",
                  }}>{weightLabel(row.weight)}</span>
                )}

                {/* Score — Libre Baskerville numeral when done */}
                {isDone && row.score !== undefined && (
                  <span style={{
                    fontFamily: "var(--font-prose)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: scoreColor,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}>{row.score}</span>
                )}

                {/* Active label */}
                {isActive && (
                  <span style={{
                    fontFamily: "var(--font-data)",
                    fontSize: 9,
                    color: "#B8A030",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                  }}>{t.loadingActiveFilter || "scoring"}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── COACHING PAIR ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px 28px 48px",
      }}>
        {coachingVisible && (
          <div
            aria-hidden="true"
            style={{
              textAlign: "center",
              maxWidth: 320,
              animation: phase === "in"
                ? "vq-fadein 0.45s ease forwards"
                : phase === "out"
                ? "vq-fadeout 0.35s ease forwards"
                : "none",
            }}
          >
            {/* Question — serif, editorial weight */}
            <p style={{
              fontFamily: "var(--font-prose)",
              fontSize: 18,
              fontWeight: 700,
              fontStyle: "italic",
              color: "#1A1A18",
              lineHeight: 1.55,
              margin: "0 auto 14px",
            }}>
              {COACHING_PAIRS[pairIdx].question}
            </p>

            {/* Divider */}
            <div style={{
              width: 32,
              height: 1,
              background: "#C8DDB8",
              margin: "0 auto 14px",
            }} />

            {/* Statement — mono, data register */}
            <p style={{
              fontFamily: "var(--font-data)",
              fontSize: 11,
              fontWeight: 600,
              color: "#3A3A38",
              letterSpacing: ".04em",
              lineHeight: 1.75,
              margin: 0,
            }}>
              {COACHING_PAIRS[pairIdx].statement}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ScoringProgress ──────────────────────────────────────────────────────
const SCORING_PHASES = [
  { key: "reading",    label: "Reading job description" },
  { key: "scoring",   label: "Scoring against your filters" },
  { key: "insights",  label: "Generating insights" },
  { key: "finishing", label: "Finalizing recommendation" },
];

export function ScoringProgress({ phase }) {
  const pct = Math.round(((phase + 1) / SCORING_PHASES.length) * 100);
  return (
    <div className="loading-wrap" role="status" aria-live="polite" aria-label="Scoring in progress">
      <div style={{
        maxWidth: 380,
        margin: "0 auto",
        padding: "32px 20px",
      }}>
        {/* Title */}
        <p style={{
          fontFamily: "var(--font-prose)",
          fontSize: 20,
          fontWeight: 700,
          fontStyle: "italic",
          color: "#1A1A18",
          textAlign: "center",
          marginBottom: 6,
          lineHeight: 1.3,
        }}>
          Analyzing opportunity
        </p>
        <p style={{
          fontFamily: "var(--font-data)",
          fontSize: 10,
          color: "#7B776C",
          letterSpacing: ".14em",
          textTransform: "uppercase",
          textAlign: "center",
          marginBottom: 20,
        }}>
          {pct}% complete
        </p>

        {/* Bar */}
        <div style={{
          height: 3,
          background: "#DED9CE",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 24,
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: "#3A7A3A",
            borderRadius: 2,
            transition: "width 0.4s ease",
          }} />
        </div>

        {/* Phase steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SCORING_PHASES.map((p, i) => {
            const isDone   = i < phase;
            const isActive = i === phase;
            return (
              <div key={p.key} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: isDone ? "#3A7A3A" : isActive ? "#B8A030" : "#DED9CE",
                  animation: isActive ? "vq-pulse-dot 1.2s ease-in-out infinite" : "none",
                  transition: "background 0.3s ease",
                }} />
                <span style={{
                  fontFamily: "var(--font-data)",
                  fontSize: 11,
                  color: isDone ? "#3A7A3A" : isActive ? "#1A1A18" : "#7B776C",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: ".02em",
                }}>
                  {isDone ? "✓ " : ""}{p.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
