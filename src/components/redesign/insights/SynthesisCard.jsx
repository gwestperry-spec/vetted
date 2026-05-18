// ── SynthesisCard.jsx ─────────────────────────────────────────────────────
// Card 4 of the Behavioral Insights pod: This Week.
//
// Three numbers only:
//   - Roles scored this week (integer)
//   - Roles in Pursue status currently (integer)
//   - Pursue rate this week as % + personal 4-week average delta
//     (format: "12% ↓ vs 35% avg")
//
// CTA: "Open pipeline" → routes to workspace pipeline view.

import React from "react";

export default function SynthesisCard({ data, onOpenPipeline }) {
  const {
    scoredThisWeek = 0,
    inPursueNow    = 0,
    pursueRatePct  = 0,    // this week
    pursueRateAvgPct = null, // prior 4-week avg
  } = data || {};

  const delta = pursueRateAvgPct != null ? pursueRatePct - pursueRateAvgPct : null;
  const isDown = delta != null && delta < 0;
  const isUp   = delta != null && delta > 0;
  const arrow  = isDown ? "↓" : isUp ? "↑" : "→";

  return (
    <div style={{
      background: "var(--cream)",
      borderRadius: 10,
      padding: "14px 14px",
      height: "100%",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.22em", color: "var(--muted-soft)",
        textTransform: "uppercase", marginBottom: 6,
      }}>THIS WEEK</div>

      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 13, fontWeight: 700,
        letterSpacing: "-0.005em", color: "var(--ink)",
        lineHeight: 1.3, marginBottom: 10,
      }}>Where the pipeline sits</div>

      <div style={{ flex: 1 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "12px 16px",
        }}>
          <Cell num={scoredThisWeek} label="Scored" />
          <Cell num={inPursueNow}    label="In Pursue" />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <div style={{
              fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 700,
              color: isDown ? "var(--gold-display)" : "var(--ink)",
              lineHeight: 1, letterSpacing: "-0.02em",
            }}>{Math.round(pursueRatePct)}%</div>
            {delta != null && (
              <span style={{
                fontFamily: "var(--font-prose)", fontSize: 10.5,
                color: isDown ? "var(--gold)" : "var(--muted)",
              }}>
                {arrow} vs {Math.round(pursueRateAvgPct)}% avg
              </span>
            )}
          </div>
          <div style={{
            marginTop: 4,
            fontFamily: "var(--font-serif)", fontSize: 8, fontWeight: 700,
            letterSpacing: "0.20em", color: "var(--muted-soft)",
            textTransform: "uppercase",
          }}>Pursue rate · 4-wk comparison</div>
        </div>
      </div>

      <div style={{
        marginTop: 10,
        display: "flex", justifyContent: "flex-end",
      }}>
        <button
          onClick={onOpenPipeline}
          style={{
            background: "transparent", border: "none", cursor: "pointer", padding: 0,
            fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.20em", color: "var(--ink)",
            textTransform: "uppercase",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          Open pipeline
          <span style={{
            fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 400,
            color: "var(--muted-soft)",
          }}>›</span>
        </button>
      </div>
    </div>
  );
}

function Cell({ num, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 700,
        color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.02em",
      }}>{num}</div>
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 8, fontWeight: 700,
        letterSpacing: "0.20em", color: "var(--muted-soft)",
        textTransform: "uppercase",
      }}>{label}</div>
    </div>
  );
}
