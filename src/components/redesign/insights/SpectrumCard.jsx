// ── SpectrumCard.jsx ──────────────────────────────────────────────────────
// Card 1 of the Behavioral Insights pod: Floor Margin.
//
// Visual: red→amber→green gradient track with a position marker. Position
// is calculated from (avgPursueComp - compFloor) / compFloor, clamped 0–1.
//
// Data shape:
//   { avgPursueComp: number, compFloor: number, belowFloorCount: number,
//     pursueTotal: number, currency: string }
//
// CTA: "Edit floor" → routes to profile comp edit.

import React from "react";

export default function SpectrumCard({ data, onEditFloor, t = {} }) {
  const { avgPursueComp, compFloor, belowFloorCount, pursueTotal, currency = "USD" } = data || {};

  // Position 0–1: where avg sits on the track. 0 = floor, 1 = floor + 50%
  const ratio = compFloor > 0 ? (avgPursueComp - compFloor) / compFloor : 0;
  const markerPct = Math.max(0, Math.min(1, (ratio + 0.1) / 0.6)) * 100; // remap so floor sits at ~17%

  const delta = avgPursueComp - compFloor;
  const deltaSign = delta >= 0 ? "+" : "−";
  const deltaAbsK = Math.round(Math.abs(delta) / 1000);
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  const floorK = Math.round(compFloor / 1000);

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
      }}>{t.floorMargin || "FLOOR MARGIN"}</div>

      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 13, fontWeight: 700,
        letterSpacing: "-0.005em", color: "var(--ink)",
        lineHeight: 1.3, marginBottom: 10,
      }}>Where your Pursue comp lands</div>

      <div style={{ flex: 1 }}>
        <div style={{
          position: "relative", height: 8, borderRadius: 4,
          background: "linear-gradient(90deg, var(--pass) 0%, var(--gold-display) 50%, var(--accent) 100%)",
          marginTop: 4,
        }}>
          <div style={{
            position: "absolute", top: -3, bottom: -3,
            width: 3, borderRadius: 2,
            background: "var(--ink)",
            left: `${markerPct}%`,
            boxShadow: "0 0 0 2px rgba(250,250,248,0.95)",
          }} />
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", marginTop: 5,
          fontFamily: "var(--font-serif)", fontSize: 8, fontWeight: 400,
          letterSpacing: "0.14em", color: "var(--muted-soft)",
          textTransform: "uppercase",
        }}>
          <span>FLOOR</span>
          <span>+20%</span>
          <span>+50%+</span>
        </div>

        <div style={{
          display: "flex", alignItems: "baseline", gap: 8, marginTop: 10,
        }}>
          <div style={{
            fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 700,
            color: delta >= 0 ? "var(--accent)" : "var(--pass)",
            lineHeight: 1, letterSpacing: "-0.02em",
          }}>{deltaSign}{symbol}{deltaAbsK}K</div>
          <div style={{
            fontFamily: "var(--font-prose)", fontSize: 12, color: "var(--muted-deep)",
          }}>over your {symbol}{floorK}K floor</div>
        </div>

        {belowFloorCount > 0 && (
          <div style={{
            marginTop: 6,
            fontFamily: "var(--font-prose)", fontSize: 11.5, color: "var(--muted-deep)",
          }}>
            <strong style={{ color: "var(--ink)", fontWeight: 700 }}>
              {belowFloorCount}
            </strong> of {pursueTotal} Pursues sit below your floor.
          </div>
        )}
      </div>

      <div style={{
        marginTop: 10,
        display: "flex", justifyContent: "flex-end",
      }}>
        <button
          onClick={onEditFloor}
          style={{
            background: "transparent", border: "none", cursor: "pointer", padding: 0,
            fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.20em", color: "var(--ink)",
            textTransform: "uppercase",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {t.editFloor || "Edit floor"}
          <span style={{
            fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 400,
            color: "var(--muted-soft)",
          }}>›</span>
        </button>
      </div>
    </div>
  );
}
