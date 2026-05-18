// ── ResolveHub.jsx ────────────────────────────────────────────────────────
// The score-result landing surface that opens after scoring completes.
// Ported from design source: ~/Downloads/score-result-hub.jsx (May 17).
//
// Composition (top → bottom):
//   - VQ · COMPLETE eyebrow (left) + Close pill (right)
//   - Role context: "COMPANY · LOCATION" eyebrow + role title (serif)
//   - Paused, dimmed VerdictSeal with the score (80pt) centered on top
//   - "VQ · OUT OF 5.0" sub-label under the score
//   - Verdict pill (PURSUE / MONITOR / PASS) on dark theme
//   - Italic recommendation line
//   - READ DEEPER eyebrow + 4-pill grid (INSIGHTS · FILTERS · COACH · PAY)
//   - "SAVED · {N} SECONDS" footer eyebrow
//
// Forest backdrop with 620×620 gold halo + faint grain overlay matches
// the rest of the editorial dark surfaces (Scoring, Profile).

import React from "react";
import { createPortal } from "react-dom";
import VerdictSeal from "../VerdictSeal.jsx";

// ── Dark palette tokens (mirrors ~/Downloads/score-result-hub.jsx) ─────────
const C = {
  inkDeep:  "#0F1F0F",
  inkMid:   "#152715",
  inkRich:  "#1F3520",
  dot:      "#fbbf24",
  onDarkInk:    "#EDF2EC",
  onDarkSoft:   "#C8D4C5",
  onDarkMono:   "#7A9A7A",
  onDarkEyebrow:      "#5A7A5A",
  onDarkBorder:       "rgba(232,240,232,0.16)",
  onDarkBorderStrong: "rgba(232,240,232,0.30)",
  onDarkGold:         "rgba(212,188,82,0.55)",
  onDarkCream:        "rgba(232,240,232,0.06)",
  pursueDarkBg: "rgba(200,232,192,0.18)", pursueDarkFg: "#C8E8C0",
  monitorDarkBg:"rgba(212,168,64,0.22)",  monitorDarkFg:"#F0D090",
  passDarkBg:   "rgba(192,80,80,0.22)",   passDarkFg:   "#F0A0A0",
};
const F = {
  serif: "var(--font-serif)",
  prose: "var(--font-prose)",
};

// ── Forest backdrop (radial halo + grain) ──────────────────────────────────
function ForestBackdrop({ haloY = "44%" }) {
  return (
    <>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(130% 90% at 50% ${haloY}, ${C.inkRich} 0%, ${C.inkMid} 50%, ${C.inkDeep} 100%)`,
      }}/>
      <div style={{
        position: "absolute", top: haloY, left: "50%",
        width: 620, height: 620, transform: "translate(-50%, -50%)",
        background: "radial-gradient(circle, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0.04) 35%, transparent 65%)",
        pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(0deg, rgba(232,240,232,0.014) 0 1px, transparent 1px 2px),
                          repeating-linear-gradient(90deg, rgba(232,240,232,0.012) 0 1px, transparent 1px 2px)`,
        mixBlendMode: "overlay",
      }}/>
    </>
  );
}

function ClosePill({ label, onClick }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      background: "transparent", border: `0.5px solid ${C.onDarkBorder}`,
      borderRadius: 20, padding: "6px 14px", cursor: "pointer",
      fontFamily: F.serif, fontSize: 9, fontWeight: 700,
      letterSpacing: "0.22em", color: C.onDarkSoft,
      textTransform: "uppercase",
      WebkitTapHighlightColor: "transparent",
    }}>{label}</button>
  );
}

function PillButton({ label, teaser, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", minHeight: 64,
      background: C.onDarkCream,
      border: `0.5px solid ${C.onDarkGold}`,
      borderRadius: 12,
      cursor: "pointer",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 3,
      padding: "8px 10px",
      WebkitTapHighlightColor: "transparent",
    }}>
      <span style={{
        fontFamily: F.serif, fontSize: 11, fontWeight: 700,
        letterSpacing: "0.22em", color: C.onDarkInk,
        textTransform: "uppercase",
      }}>{label}</span>
      <span style={{
        fontFamily: F.serif, fontSize: 10, fontWeight: 400,
        fontStyle: "italic", color: C.onDarkSoft,
        lineHeight: 1.3, textAlign: "center",
      }}>{teaser}</span>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function ResolveHub({
  score,            // number 1–5
  verdict,          // "pursue" | "monitor" | "pass"
  rationale,        // recommendation_rationale string
  roleTitle,        // string
  company,          // string
  location,         // optional string (e.g. "New York"); falls back to nothing
  scoredSeconds,    // optional number — shown in footer ("SAVED · {n} SECONDS")
  onPillTap,        // function(id)
  onBack,
  t = {},
}) {
  const verdictUpper = String(verdict || "").toUpperCase();
  const pillTheme =
    verdict === "pursue"  ? { bg: C.pursueDarkBg,  fg: C.pursueDarkFg } :
    verdict === "monitor" ? { bg: C.monitorDarkBg, fg: C.monitorDarkFg } :
                            { bg: C.passDarkBg,    fg: C.passDarkFg };

  const PILLS = [
    { id: "insights", label: t.pillInsights || "INSIGHTS", teaser: t.pillInsightsTeaser || "The case" },
    { id: "filters",  label: t.pillFilters  || "FILTERS",  teaser: t.pillFiltersTeaser  || "5, weighted" },
    { id: "coach",    label: t.pillCoach    || "COACH",    teaser: t.pillCoachTeaser    || "The take" },
    { id: "pay",      label: t.pillPay      || "PAY",      teaser: t.pillPayTeaser      || "Market range" },
  ];

  const contextEyebrow = [company, location].filter(Boolean).join(" · ").toUpperCase();

  const body = (
    <div style={{
      position: "fixed", inset: 0,
      width: "100vw", height: "100dvh",
      overflow: "hidden",
      paddingTop: "calc(48px + env(safe-area-inset-top, 0px))",
      paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
      paddingLeft: "env(safe-area-inset-left, 0px)",
      paddingRight: "env(safe-area-inset-right, 0px)",
      color: C.onDarkInk,
      zIndex: 9999,
    }}>
      <ForestBackdrop haloY="44%"/>

      {/* Header — VQ · COMPLETE eyebrow + Close pill */}
      <div style={{
        position: "relative",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 22px",
      }}>
        <div style={{
          fontFamily: F.serif, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.22em", color: C.onDarkMono,
        }}>{t.rxVqComplete || "VQ · COMPLETE"}</div>
        <ClosePill label={t.close || "Close"} onClick={onBack}/>
      </div>

      {/* Role context */}
      <div style={{
        position: "relative", padding: "24px 32px 0", textAlign: "center",
      }}>
        {contextEyebrow && (
          <div style={{
            fontFamily: F.serif, fontSize: 9, fontWeight: 400,
            letterSpacing: "0.22em", color: C.onDarkEyebrow,
            textTransform: "uppercase", marginBottom: 6,
          }}>{contextEyebrow}</div>
        )}
        {roleTitle && (
          <div style={{
            fontFamily: F.serif, fontSize: 19, fontWeight: 700,
            letterSpacing: "-0.01em", color: C.onDarkInk, lineHeight: 1.2,
          }}>{roleTitle}</div>
        )}
      </div>

      {/* Resolved seal + score */}
      <div style={{
        position: "relative", marginTop: 20,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{
          position: "relative", width: 220, height: 220,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <VerdictSeal size={220} paused opacity={0.32}/>
          </div>
          <div style={{ position: "relative", textAlign: "center" }}>
            <div style={{
              fontFamily: F.serif, fontSize: 80, fontWeight: 700,
              letterSpacing: "-0.04em", color: C.onDarkInk, lineHeight: 1,
            }}>{Number(score).toFixed(1)}</div>
            <div style={{
              marginTop: 2,
              fontFamily: F.serif, fontSize: 9, fontWeight: 400,
              letterSpacing: "0.22em", color: C.onDarkMono,
            }}>{t.rxOutOf5 || "VQ · OUT OF 5.0"}</div>
          </div>
        </div>

        {/* Verdict pill */}
        <div style={{
          marginTop: 14,
          padding: "5px 14px", borderRadius: 20,
          background: pillTheme.bg, color: pillTheme.fg,
          fontFamily: F.serif, fontSize: 10, fontWeight: 700,
          letterSpacing: "0.28em",
        }}>{verdictUpper}</div>

        {/* Italic recommendation rationale */}
        {rationale && (
          <div style={{
            marginTop: 12,
            fontFamily: F.serif, fontSize: 14, fontWeight: 400,
            fontStyle: "italic", color: C.onDarkSoft, lineHeight: 1.45,
            maxWidth: 320, textAlign: "center", padding: "0 32px",
            textWrap: "pretty",
          }}>{rationale}</div>
        )}
      </div>

      {/* READ DEEPER + 4-pill grid */}
      <div style={{
        position: "absolute", bottom: scoredSeconds ? 70 : 40,
        left: 0, right: 0,
        padding: "0 20px",
      }}>
        <div style={{
          fontFamily: F.serif, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.24em", color: C.dot,
          textTransform: "uppercase", textAlign: "center", marginBottom: 12,
        }}>{t.rxReadDeeper || "READ DEEPER"}</div>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
        }}>
          {PILLS.map((p) => (
            <PillButton key={p.id} label={p.label} teaser={p.teaser}
                        onClick={() => onPillTap?.(p.id)}/>
          ))}
        </div>
      </div>

      {/* Footer — SAVED · N SECONDS */}
      {scoredSeconds != null && (
        <div style={{
          position: "absolute", bottom: 24, left: 0, right: 0,
          textAlign: "center",
          fontFamily: F.serif, fontSize: 9, fontWeight: 400,
          letterSpacing: "0.24em", color: C.onDarkEyebrow,
        }}>{(t.rxSaved || "SAVED")} · {scoredSeconds} {t.rxSeconds || "SECONDS"}</div>
      )}
    </div>
  );
  return typeof document !== "undefined" ? createPortal(body, document.body) : body;
}
