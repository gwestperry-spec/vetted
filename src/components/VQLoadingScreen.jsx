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
  const nameColor = status === "done" ? "#3A5A3A" : status === "active" ? "#1A2E1A" : "#8A9A8A";
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
//   loadingMsg       {string}  — status line (unused visually but kept for aria)
//   streamingFilters {Array}   — live filter scores from SSE stream
//                                [{filter_name, score, rationale}, ...]
//   filters          {Array}   — full user filter list [{id, name, ...}]
export function VQLoadingScreen({ loadingMsg, streamingFilters = [], filters = [] }) {
  // Pick initial coaching pair
  const initIdx = useRef(null);
  if (initIdx.current === null) {
    const pool = COACHING_PAIRS.map((_, i) => i).filter(i => i !== _lastCoachingIdx);
    if (_lastCoachingIdx !== ANCHOR_IDX) pool.push(ANCHOR_IDX);
    initIdx.current = pool[Math.floor(Math.random() * pool.length)];
    _lastCoachingIdx = initIdx.current;
  }

  const [pairIdx, setPairIdx]           = useState(initIdx.current);
  const [phase, setPhase]               = useState("in"); // "in" | "out"
  const [coachingVisible, setCoachingVisible] = useState(false);

  // ── Time-based progress fallback ────────────────────────────────────────
  // Drives the bar and active-dot position when streaming isn't delivering
  // real filter data (e.g. Netlify CDN buffering, iOS WKWebView fallback).
  // Real streaming data always takes precedence via Math.max below.
  const startTimeRef = useRef(Date.now());
  const [timePct, setTimePct] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      // Exponential ease-out: reaches ~88% at ~15s, leaving headroom for completion
      const eased = 1 - Math.exp(-(elapsed / 15000) * 3);
      setTimePct(Math.min(88, Math.round(eased * 100)));
    }, 400);
    return () => clearInterval(iv);
  }, []);

  // Brief delay before coaching pair fades in
  useEffect(() => {
    const t = setTimeout(() => setCoachingVisible(true), 500);
    return () => clearTimeout(t);
  }, []);

  // Cycle coaching pairs every 5 seconds
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

  const totalFilters = Math.max(filters.length, 1);

  // Real streaming progress (0 when no filters have arrived yet)
  const realPct = Math.round((streamingFilters.length / totalFilters) * 100);

  // Display the higher of real streaming progress or time-based estimate.
  // Once streaming kicks in (realPct > 0), real data drives the bar.
  const displayPct = Math.max(realPct, timePct);

  // Build filter display list: merge full filter list with streamed results
  const filterRows = filters.map(f => {
    const filterName = typeof f.name === "object" ? (f.name.en || Object.values(f.name)[0]) : f.name;
    const streamed = streamingFilters.find(sf =>
      sf.filter_name?.toLowerCase() === filterName?.toLowerCase()
    );
    const isDone = streamed !== undefined;
    return { name: filterName, isDone, score: streamed?.score };
  });

  // Active dot position: real streamed count OR time-estimated position
  const realDoneCount = streamingFilters.length;
  const estimatedDoneCount = Math.floor((timePct / 100) * totalFilters);
  // Use real count when streaming is delivering data, otherwise use time estimate
  const doneCount = realDoneCount > 0 ? realDoneCount : estimatedDoneCount;

  const filterRowsWithStatus = filterRows.map((row, i) => {
    if (row.isDone) return { ...row, status: "done" };
    if (i === doneCount) return { ...row, status: "active" };
    return { ...row, status: "waiting" };
  });

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={loadingMsg}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: "32px 20px 48px",
        maxWidth: 420,
        margin: "0 auto",
        gap: 0,
      }}
    >
      {/* ── Progress bar ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}>
          <span style={{
            fontFamily: "var(--font-data)",
            fontSize: 11,
            color: "#8A9A8A",
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}>Analyzing</span>
          <span style={{
            fontFamily: "var(--font-data)",
            fontSize: 11,
            color: "#3A7A3A",
            letterSpacing: ".04em",
          }}>{displayPct}%</span>
        </div>
        <div style={{
          width: "100%",
          height: 4,
          background: "#E0E8E0",
          borderRadius: 2,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${displayPct}%`,
            background: "#3A7A3A",
            borderRadius: 2,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* ── Filter completion card ── */}
      {filters.length > 0 && (
        <div style={{
          background: "#F0F4F0",
          borderRadius: 12,
          border: "1px solid #D8E8D8",
          padding: "16px 18px",
          marginBottom: 28,
        }}>
          {/* Header */}
          <div style={{
            fontFamily: "var(--font-data)",
            fontSize: 11,
            color: "#8A9A8A",
            letterSpacing: ".15em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}>YOUR FILTERS</div>

          {/* Filter rows */}
          {filterRowsWithStatus.map((row, i) => (
            <FilterRow
              key={row.name || i}
              name={row.name}
              status={row.status}
              score={row.score}
            />
          ))}
        </div>
      )}

      {/* ── Coaching pair ── */}
      {coachingVisible && (
        <div
          aria-hidden="true"
          style={{
            textAlign: "center",
            animation: phase === "in"
              ? "vq-fadein 0.45s ease forwards"
              : phase === "out"
              ? "vq-fadeout 0.35s ease forwards"
              : "none",
          }}
        >
          <p style={{
            fontFamily: "var(--font-prose)",
            fontSize: 17,
            fontWeight: 500,
            color: "#3A5A3A",
            lineHeight: 1.5,
            textAlign: "center",
            maxWidth: 320,
            margin: "0 auto 10px",
          }}>
            {COACHING_PAIRS[pairIdx].question}
          </p>
          <p style={{
            fontFamily: "var(--font-data)",
            fontSize: 12,
            color: "#8A9A8A",
            textAlign: "center",
            maxWidth: 320,
            margin: "0 auto",
            letterSpacing: ".04em",
            lineHeight: 1.7,
          }}>
            {COACHING_PAIRS[pairIdx].statement}
          </p>
        </div>
      )}
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
      <div className="scoring-progress">
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-prose)", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
            Analyzing opportunity
          </div>
          <div style={{ fontFamily: "var(--font-data)", fontSize: 10, color: "var(--muted)", letterSpacing: ".15em", textTransform: "uppercase" }}>
            {pct}% complete
          </div>
        </div>
        <div className="scoring-progress-bar-track" aria-hidden="true">
          <div className="scoring-progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="scoring-progress-steps" aria-hidden="true">
          {SCORING_PHASES.map((p, i) => (
            <div key={p.key} className={`scoring-progress-step${i === phase ? " active" : i < phase ? " done" : ""}`}>
              <div className="scoring-step-dot" />
              <span>{i < phase ? "✓ " : ""}{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
