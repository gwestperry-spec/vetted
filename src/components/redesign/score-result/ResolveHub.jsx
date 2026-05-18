// ── ResolveHub.jsx ────────────────────────────────────────────────────────
// The score-result landing surface that opens after scoring completes.
// Paused VerdictSeal + big score number + verdict pill + recommendation
// line + 4-pill grid (INSIGHTS · FILTERS · COACH · PAY) on a forest
// backdrop. Tap any pill → opens that pill's landing.
//
// Per Claude design spec: editorial calm. No CTA below the grid; the grid
// IS the navigation. Coach is the terminus (Phase 5 wires that flow).

import React from "react";
import VerdictSeal from "../VerdictSeal.jsx";

const PILLS = [
  { id: "insights", label: "INSIGHTS", teaser: "The case" },
  { id: "filters",  label: "FILTERS",  teaser: "5, weighted" },
  { id: "coach",    label: "COACH",    teaser: "The take" },
  { id: "pay",      label: "PAY",      teaser: "Market range" },
];

export default function ResolveHub({
  score,            // number 1–5
  verdict,          // "pursue" | "monitor" | "pass"
  rationale,        // recommendation_rationale string
  roleTitle,        // string
  company,          // string
  onPillTap,        // function(id)
  onBack,
}) {
  const verdictUpper = String(verdict || "").toUpperCase();
  const pillTheme =
    verdict === "pursue"  ? { bg: "var(--pursue-dark-bg)",  fg: "var(--pursue-dark-fg)" } :
    verdict === "monitor" ? { bg: "var(--monitor-dark-bg)", fg: "var(--monitor-dark-fg)" } :
                            { bg: "var(--pass-dark-bg)",    fg: "var(--pass-dark-fg)" };

  return (
    <div style={{
      position: "relative", width: "100%", minHeight: "100%",
      color: "var(--on-dark-ink)",
      background:
        "radial-gradient(130% 90% at 50% 40%, #1F3520 0%, #152715 50%, #0F1F0F 100%)",
      paddingTop: 56, paddingBottom: 24,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>

      {/* Back arrow */}
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            position: "absolute", top: 14, left: 14,
            background: "transparent", border: "none", cursor: "pointer",
            padding: 8,
            color: "var(--on-dark-soft)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Verdict label */}
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.22em", color: "var(--on-dark-soft)",
        textTransform: "uppercase", marginTop: 14, marginBottom: 18,
      }}>VERDICT · {verdictUpper}</div>

      {/* Seal with score in center */}
      <VerdictSeal
        size={220}
        paused
        opacity={0.9}
        centerContent={
          <div style={{
            fontFamily: "var(--font-serif)", fontSize: 56, fontWeight: 700,
            color: "var(--on-dark-ink)", lineHeight: 1, letterSpacing: "-0.02em",
          }}>
            {Number(score).toFixed(1)}
          </div>
        }
      />

      {/* Verdict pill */}
      <div style={{
        marginTop: 18,
        padding: "6px 16px", borderRadius: 20,
        background: pillTheme.bg, color: pillTheme.fg,
        fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.20em", textTransform: "uppercase",
      }}>{verdictUpper}</div>

      {/* Role context */}
      {(roleTitle || company) && (
        <div style={{
          marginTop: 14, padding: "0 28px", textAlign: "center",
          fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 400,
          letterSpacing: "0.18em", color: "var(--on-dark-soft)",
          textTransform: "uppercase",
        }}>
          {company}{company && roleTitle ? " · " : ""}{roleTitle}
        </div>
      )}

      {/* Recommendation line */}
      {rationale && (
        <div style={{
          marginTop: 18, padding: "0 28px", textAlign: "center", maxWidth: 360,
          fontFamily: "var(--font-prose)", fontSize: 13, lineHeight: 1.55,
          color: "var(--on-dark-ink)",
        }}>{rationale}</div>
      )}

      {/* READ DEEPER eyebrow */}
      <div style={{
        marginTop: 28, marginBottom: 14,
        fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.22em", color: "var(--dot)",
        textTransform: "uppercase",
      }}>READ DEEPER</div>

      {/* 4-pill grid (2×2) */}
      <div style={{
        width: "100%", maxWidth: 340,
        padding: "0 28px",
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 10,
      }}>
        {PILLS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPillTap?.(p.id)}
            style={{
              background: "rgba(232,240,232,0.04)",
              border: "0.5px solid var(--gold-border)",
              borderRadius: 10,
              padding: "14px 14px",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
              color: "var(--on-dark-ink)",
              textAlign: "left",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{
              fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.22em", color: "var(--on-dark-ink)",
              textTransform: "uppercase",
            }}>{p.label}</div>
            <div style={{
              fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 400,
              fontStyle: "italic", color: "var(--on-dark-soft)",
            }}>{p.teaser}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
