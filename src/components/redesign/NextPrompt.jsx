// ── NextPrompt.jsx ────────────────────────────────────────────────────────
// Bottom strip on a pill landing or thought card. Muted hint on the left
// (no italic per build direction), pill button on the right that advances
// to the next pill in the canonical sequence.
//
// Sequence is fixed: Insights → Filters → Pay → Coach.
// On Coach (terminus), label changes to "DRAFT COVER LETTER".

import React from "react";

export default function NextPrompt({ hint, label, onNext }) {
  return (
    <div style={{
      borderTop: "0.5px solid var(--border)",
      padding: "14px 20px 22px",
      background: "var(--paper)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{
        flex: 1,
        fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 400,
        color: "var(--muted-soft)", letterSpacing: "0.02em",
      }}>
        {hint || "Tap any section to open it."}
      </div>

      <button
        onClick={onNext}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "8px 14px",
          display: "inline-flex", alignItems: "center", gap: 8,
          cursor: onNext ? "pointer" : "default",
          fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.20em", color: "var(--ink)",
          textTransform: "uppercase",
        }}
      >
        NEXT · {label}
        <span style={{
          fontSize: 13, lineHeight: 1, color: "var(--muted-soft)",
        }}>→</span>
      </button>
    </div>
  );
}
