// ── Breadcrumb.jsx ────────────────────────────────────────────────────────
// Sits below the TopBar inside pill landings. Shows the active role's
// score + verdict on the left, hairline filler, and company/role context
// on the right. Eyebrow-style serif typography both sides.

import React from "react";

export default function Breadcrumb({ score, verdict, context }) {
  const verdictColor = verdict === "PURSUE"  ? "var(--pursue-fg)"
                     : verdict === "MONITOR" ? "var(--monitor-fg)"
                     : verdict === "PASS"    ? "var(--pass)"
                     : "var(--accent)";

  return (
    <div style={{
      padding: "14px 22px 0",
      display: "flex", alignItems: "baseline", gap: 10,
    }}>
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.20em", color: verdictColor,
        textTransform: "uppercase",
      }}>
        {score} · {verdict}
      </div>
      <div style={{ flex: 1, height: 0.5, background: "var(--border)" }} />
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 400,
        letterSpacing: "0.18em", color: "var(--muted-soft)",
        textTransform: "uppercase",
      }}>
        {context}
      </div>
    </div>
  );
}
