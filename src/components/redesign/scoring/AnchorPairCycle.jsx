// ── AnchorPairCycle.jsx ───────────────────────────────────────────────────
// Cycles through Q/A "anchor pairs" during the scoring screen. Each pair
// fades through: Q appears, A fades in ~2s later, full pair holds ~3s,
// then next pair. No in-session repeats.
//
// Phase-8 ships the full 140-pair library across 7 languages. Phase 6
// uses a built-in starter set so the visual lands cleanly until copy
// arrives. Caller can override via `pairs` prop.

import React, { useEffect, useState, useRef } from "react";

// Starter set — ~20 pairs. Replaced in Phase 8 by translated library.
const DEFAULT_PAIRS = [
  { q: "Will this role stretch me, or stall me?",       a: "The framework knows the difference." },
  { q: "Is the title bigger than the actual scope?",    a: "We read the scope, not the headline." },
  { q: "Does the role own a number?",                   a: "Named accountability moves the needle." },
  { q: "Where does this report?",                       a: "Proximity to power is half the job." },
  { q: "What's the first quarter actually about?",      a: "Real metrics or vague directions." },
  { q: "Is the comp market, or hopeful?",               a: "We compare to the band, not the offer." },
  { q: "Why is this role open?",                        a: "Origin stories tell you the rest." },
  { q: "What's the bridge from where you are?",         a: "Same operating model, new context." },
  { q: "What would you walk in already knowing?",       a: "The leverage is in the prior work." },
  { q: "Where does this role plateau?",                 a: "Read the ceiling before the floor." },
  { q: "Who hired before this person?",                 a: "Pattern matters as much as the role." },
  { q: "Is this a build, a fix, or a maintain?",        a: "Match the mode to your muscle." },
  { q: "What changes if you say yes?",                  a: "Compound the trajectory, don't trade it." },
  { q: "Where does the data actually live?",            a: "Proximity to truth is leverage." },
  { q: "What's the team you'd inherit?",                a: "Inheritance is the silent variable." },
  { q: "What does ‘good' look like at 90 days?",        a: "If they can't say, you'll write it." },
  { q: "What's the exit story they imagine?",           a: "Acquire, IPO, or staying private?" },
  { q: "How will you know you're winning?",             a: "Define it before you start." },
  { q: "Where's the operational debt?",                 a: "Read the gaps, not the polish." },
  { q: "Is the founder still in the room?",             a: "Founder mode reshapes the seat." },
];

export default function AnchorPairCycle({
  pairs,
  intervalMs = 6000,
  answerDelayMs = 2000,
}) {
  const list = pairs && pairs.length > 0 ? pairs : DEFAULT_PAIRS;
  // Shuffle order on mount so each scoring session is fresh
  const orderRef = useRef([]);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Initialize a shuffled order once
  useEffect(() => {
    const indices = list.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    orderRef.current = indices;
  }, [list]);

  // Cycle interval
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) {
      setShowAnswer(true);
      return; // no cycling under reduced motion
    }
    const answerTimer = setTimeout(() => setShowAnswer(true), answerDelayMs);
    const cycleTimer = setTimeout(() => {
      setIdx((i) => (i + 1) % list.length);
      setShowAnswer(false);
    }, intervalMs);
    return () => { clearTimeout(answerTimer); clearTimeout(cycleTimer); };
  }, [idx, list.length, answerDelayMs, intervalMs]);

  const order = orderRef.current.length === list.length ? orderRef.current : list.map((_, i) => i);
  const pair = list[order[idx] ?? 0] || list[0];

  return (
    <div style={{
      width: "100%", maxWidth: 360, padding: "0 28px",
      textAlign: "center",
      minHeight: 100,
      display: "flex", flexDirection: "column", justifyContent: "center", gap: 8,
    }}>
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 400,
        fontStyle: "italic", color: "var(--on-dark-ink)", lineHeight: 1.4,
        transition: "opacity 0.4s ease",
        textAlign: "center",
      }}>
        {pair.q}
      </div>
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 400,
        fontStyle: "italic", color: "var(--on-dark-soft)", lineHeight: 1.4,
        textAlign: "right",
        opacity: showAnswer ? 1 : 0,
        transition: "opacity 0.7s ease",
      }}>
        — {pair.a}
      </div>
    </div>
  );
}
