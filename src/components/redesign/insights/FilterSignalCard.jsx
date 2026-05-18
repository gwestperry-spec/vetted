// ── FilterSignalCard.jsx ──────────────────────────────────────────────────
// Card 2 of the Behavioral Insights pod: Filter Signal.
//
// Visual: five filter rows. Each row: filter name, small bar
// (width = avg score / 5), score value. The filter with the lowest average
// is highlighted with a gold tint (gold-bg row, gold-display number/bar).
//
// Data shape:
//   { filters: [{ id, name, avgScore }], laggingId, draggedCount }
//
// CTA: "Adjust weight" → routes to filter weight editor for laggingId.

import React from "react";

export default function FilterSignalCard({ data, onAdjustWeight, t = {} }) {
  const { filters = [], laggingId, draggedCount } = data || {};
  const lagging = filters.find((f) => f.id === laggingId);

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
      }}>{t.filterSignal || "FILTER SIGNAL"}</div>

      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 13, fontWeight: 700,
        letterSpacing: "-0.005em", color: "var(--ink)",
        lineHeight: 1.3, marginBottom: 10,
      }}>Which filter drags your scores</div>

      <div style={{ flex: 1 }}>
        {filters.map((f) => {
          const isDragging = f.id === laggingId;
          const widthPct = Math.max(0, Math.min(100, (f.avgScore / 5) * 100));
          return (
            <div
              key={f.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 72px 26px",
                alignItems: "center", gap: 10,
                padding: isDragging ? "6px 8px" : "4px 0",
                background: isDragging ? "var(--gold-bg)" : "transparent",
                margin: isDragging ? "0 -8px" : 0,
                borderRadius: isDragging ? 6 : 0,
                outline: isDragging ? "0.5px solid var(--gold-border)" : "none",
              }}
            >
              <div style={{
                fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 700,
                letterSpacing: "-0.005em", color: "var(--ink)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{f.name}</div>
              <div style={{
                height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${widthPct}%`,
                  background: isDragging ? "var(--gold-display)" : "var(--ink)",
                }} />
              </div>
              <div style={{
                fontFamily: "var(--font-serif)", fontSize: 12, fontWeight: 700,
                color: isDragging ? "var(--gold-display)" : "var(--ink)",
                textAlign: "right", letterSpacing: "-0.01em",
              }}>{Number(f.avgScore).toFixed(1)}</div>
            </div>
          );
        })}

        {lagging && draggedCount > 0 && (
          <div style={{
            marginTop: 8,
            fontFamily: "var(--font-prose)", fontSize: 11, color: "var(--gold)",
          }}>
            {lagging.name} · <strong style={{ fontWeight: 700 }}>{draggedCount}↓</strong> from Pursue / Monitor
          </div>
        )}
      </div>

      <div style={{
        marginTop: 10,
        display: "flex", justifyContent: "flex-end",
      }}>
        <button
          onClick={() => onAdjustWeight && onAdjustWeight(laggingId)}
          style={{
            background: "transparent", border: "none", cursor: "pointer", padding: 0,
            fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.20em", color: "var(--ink)",
            textTransform: "uppercase",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {t.adjustWeight || "Adjust weight"}
          <span style={{
            fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 400,
            color: "var(--muted-soft)",
          }}>›</span>
        </button>
      </div>
    </div>
  );
}
