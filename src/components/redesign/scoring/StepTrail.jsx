// ── StepTrail.jsx ─────────────────────────────────────────────────────────
// Four-step progress trail at the bottom of the scoring screen.
//   FETCH · READ · WEIGH · CALL
// Active step is gold; completed steps are accent; pending are muted.

import React from "react";

const STEPS_DEFAULT = ["FETCH", "READ", "WEIGH", "CALL"];

export default function StepTrail({ activeIdx = 0, t = {} }) {
  const STEPS = [
    t.stepFetch ? String(t.stepFetch).toUpperCase() : "FETCH",
    t.stepRead  ? String(t.stepRead).toUpperCase()  : "READ",
    t.stepWeigh ? String(t.stepWeigh).toUpperCase() : "WEIGH",
    t.stepCall  ? String(t.stepCall).toUpperCase()  : "CALL",
  ];
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 8, padding: "0 28px",
    }}>
      {STEPS.map((label, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        const color = isActive ? "var(--dot)"
                    : isDone   ? "var(--on-dark-soft)"
                    :            "rgba(232,240,232,0.30)";
        return (
          <React.Fragment key={label}>
            <span style={{
              fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.22em", color,
              textTransform: "uppercase",
              transition: "color 0.3s ease",
            }}>{label}</span>
            {i < STEPS.length - 1 && (
              <span style={{
                width: 16, height: 0.5,
                background: i < activeIdx ? "var(--on-dark-soft)" : "rgba(232,240,232,0.20)",
                transition: "background 0.3s ease",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
