// ── PreferenceDriftCard.jsx ───────────────────────────────────────────────
// Card 3 of the Behavioral Insights pod: Preference Drift.
//
// Visual: single large percentage at top (Pursues outside stated prefs /
// total Pursues). Two rows below — Location and Comp — each showing
// stated (struck through) vs revealed (derived from Pursues).
//
// Industry row deferred to Build 32+ (requires industry classification on
// roles; not in the schema yet).
//
// Data shape:
//   { driftPct: number, location: { stated: string, revealed: string },
//     comp: { stated: string, revealed: string } }
//
// CTA: "Edit preferences" → routes to profile preferences edit.

import React from "react";

export default function PreferenceDriftCard({ data, onEditPreferences, t = {} }) {
  const { driftPct = 0, location, comp } = data || {};

  return (
    <div style={{
      background: "var(--gold-bg)",
      borderRadius: 10,
      borderLeft: "3px solid var(--gold-border)",
      padding: "14px 14px",
      height: "100%",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.22em", color: "var(--gold)",
        textTransform: "uppercase", marginBottom: 6,
      }}>{t.preferenceDrift || "PREFERENCE DRIFT"}</div>

      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 13, fontWeight: 700,
        letterSpacing: "-0.005em", color: "var(--ink)",
        lineHeight: 1.3, marginBottom: 10,
      }}>Stated vs. revealed</div>

      <div style={{ flex: 1 }}>
        <div style={{
          display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8,
        }}>
          <div style={{
            fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 700,
            color: "var(--gold-display)", lineHeight: 1, letterSpacing: "-0.02em",
          }}>{Math.round(driftPct)}%</div>
          <div style={{
            fontFamily: "var(--font-prose)", fontSize: 11.5,
            color: "var(--muted-deep)", lineHeight: 1.35,
          }}>of your Pursues sit outside<br />your stated preferences.</div>
        </div>

        <DriftRow axis="LOC" stated={location?.stated} revealed={location?.revealed} />
        <DriftRow axis="COMP" stated={comp?.stated} revealed={comp?.revealed} />
      </div>

      <div style={{
        marginTop: 10,
        display: "flex", justifyContent: "flex-end",
      }}>
        <button
          onClick={onEditPreferences}
          style={{
            background: "transparent", border: "none", cursor: "pointer", padding: 0,
            fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.20em", color: "var(--ink)",
            textTransform: "uppercase",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {t.editPreferences || "Edit preferences"}
          <span style={{
            fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 400,
            color: "var(--muted-soft)",
          }}>›</span>
        </button>
      </div>
    </div>
  );
}

function DriftRow({ axis, stated, revealed }) {
  if (!stated && !revealed) return null;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "44px 1fr",
      gap: 8, padding: "5px 0",
      borderTop: "0.5px solid rgba(184,160,48,0.20)",
    }}>
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 8, fontWeight: 700,
        letterSpacing: "0.20em", color: "var(--muted-soft)",
        textTransform: "uppercase", paddingTop: 2,
      }}>{axis}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {stated && (
          <div style={{
            fontFamily: "var(--font-prose)", fontSize: 10.5, color: "var(--muted-soft)",
            textDecoration: "line-through",
          }}>{stated}</div>
        )}
        {revealed && (
          <div style={{
            fontFamily: "var(--font-prose)", fontSize: 11.5, color: "var(--ink)",
            fontWeight: 500,
          }}>{revealed}</div>
        )}
      </div>
    </div>
  );
}
