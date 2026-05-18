// ── ScoringScreen.jsx ─────────────────────────────────────────────────────
// Full-screen scoring experience that replaces VQLoadingScreen. Forest
// backdrop, rotating VerdictSeal at the top (animated mode), cycling
// AnchorPairCycle in the middle, "Usually under eight seconds" hint, and
// StepTrail at the bottom.
//
// Cancel pill top-right is the only exit.

import React from "react";
import VerdictSeal from "../VerdictSeal.jsx";
import AnchorPairCycle from "./AnchorPairCycle.jsx";
import StepTrail from "./StepTrail.jsx";

// scoringPhase: 0 = fetch, 1 = read, 2 = weigh, 3 = call (legacy contract
// from App.jsx). Map to the trail's activeIdx directly.
export default function ScoringScreen({ scoringPhase = 0, onCancel, anchorPairs }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background:
        "radial-gradient(130% 90% at 50% 40%, #1F3520 0%, #152715 50%, #0F1F0F 100%)",
      color: "var(--on-dark-ink)",
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 56, paddingBottom: 32,
      zIndex: 50,
    }}>

      {/* Cancel pill */}
      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            position: "absolute", top: 14, right: 14,
            background: "transparent",
            border: "1px solid var(--on-dark-border)",
            borderRadius: 20, padding: "6px 14px",
            cursor: "pointer",
            fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.20em", color: "var(--on-dark-soft)",
            textTransform: "uppercase",
          }}
        >CANCEL</button>
      )}

      {/* Vetted brand line */}
      <div style={{
        marginTop: 14, marginBottom: 24,
        fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.30em", color: "var(--on-dark-soft)",
        textTransform: "uppercase",
      }}>VETTED · SCORING</div>

      {/* Animated seal */}
      <VerdictSeal
        size={220}
        paused={false}
        outerSpeed={9}
        innerSpeed={6}
        opacity={0.95}
      />

      {/* Anchor pair */}
      <div style={{ marginTop: 32, marginBottom: 32, flexShrink: 0 }}>
        <AnchorPairCycle pairs={anchorPairs} />
      </div>

      {/* "Usually under eight seconds" */}
      <div style={{
        marginBottom: 22,
        fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 400,
        fontStyle: "italic", color: "var(--on-dark-soft)",
        textAlign: "center",
      }}>Usually under eight seconds.</div>

      <div style={{ flex: 1 }} />

      {/* Step trail */}
      <StepTrail activeIdx={Math.min(3, Math.max(0, scoringPhase))} />
    </div>
  );
}
