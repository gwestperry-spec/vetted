// ── TopBar.jsx ────────────────────────────────────────────────────────────
// Top bar used inside pill landings and other modal-route screens.
// Back arrow + label on the left, centered title (mono-caps serif), right
// slot reserved for symmetry. Matches Claude design's pill-flow.jsx
// implementation exactly.

import React from "react";
import { Icon } from "./IconSet.jsx";

export default function TopBar({ title, backLabel = "VQ", onBack, rightSlot }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "14px 20px 0",
    }}>
      <button
        onClick={onBack}
        aria-label={`Back to ${backLabel}`}
        style={{
          background: "transparent", border: "none", cursor: onBack ? "pointer" : "default",
          display: "flex", alignItems: "center", gap: 6, padding: 0,
        }}
      >
        <Icon name="back" size={14} color="var(--muted-soft)" />
        <span style={{
          fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.16em", color: "var(--muted-soft)",
          textTransform: "uppercase",
        }}>{backLabel}</span>
      </button>

      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.22em", color: "var(--ink)",
          textTransform: "uppercase",
        }}>{title}</div>
      </div>

      <div style={{ minWidth: 36, display: "flex", justifyContent: "flex-end" }}>
        {rightSlot || null}
      </div>
    </div>
  );
}
