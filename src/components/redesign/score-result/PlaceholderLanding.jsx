// ── PlaceholderLanding.jsx ────────────────────────────────────────────────
// Stub landing used by pills that haven't been built yet (FILTERS · PAY ·
// COACH all wire to this until Phase 4 + 5 ship). Falls back to the
// existing Insights/Filters/Coach UI when the user taps "Show legacy view"
// so no functionality is lost during the redesign rollout.

import React from "react";
import TopBar from "../TopBar.jsx";
import Breadcrumb from "../Breadcrumb.jsx";

export default function PlaceholderLanding({
  title,
  opp,
  onBack,
  onShowLegacy,
}) {
  return (
    <div style={{
      width: "100%", minHeight: "100%", background: "var(--paper)",
      paddingTop: 56,
      display: "flex", flexDirection: "column",
    }}>
      <TopBar title={title} backLabel="VQ" onBack={onBack} />

      <Breadcrumb
        score={Number(opp.overall_score).toFixed(1)}
        verdict={String(opp.recommendation || "").toUpperCase()}
        context={`${(opp.company || "").toUpperCase()} · ${(opp.role_title || "").toUpperCase()}`}
      />

      <div style={{ padding: "32px 22px 24px", flex: 1 }}>
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.22em", color: "var(--muted-soft)",
          textTransform: "uppercase", marginBottom: 14,
        }}>COMING IN BUILD 30</div>

        <h2 style={{
          fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 700,
          letterSpacing: "-0.005em", color: "var(--ink)", lineHeight: 1.25,
          margin: "0 0 12px",
        }}>This pill is being finished.</h2>

        <p style={{
          fontFamily: "var(--font-prose)", fontSize: 14, lineHeight: 1.6,
          color: "var(--muted-deep)", margin: 0,
        }}>
          The redesigned {title.toLowerCase()} surface ships in this build.
          Until then, the previous {title.toLowerCase()} view is one tap
          away.
        </p>

        {onShowLegacy && (
          <button
            onClick={onShowLegacy}
            style={{
              marginTop: 22,
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 20, padding: "10px 16px",
              fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.20em", color: "var(--ink)",
              textTransform: "uppercase", cursor: "pointer",
            }}
          >
            SHOW LEGACY {title} →
          </button>
        )}
      </div>
    </div>
  );
}
