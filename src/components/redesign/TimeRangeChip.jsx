// ── TimeRangeChip.jsx ─────────────────────────────────────────────────────
// Pill-shaped dropdown that filters a list by time range. Matches the
// Claude design's workspace chip exactly:
//   - 1px hairline border, 20pt radius, 6×12 padding
//   - Label: 9px serif weight 700, 0.20em tracking, uppercase ink
//   - Small chevron-down on the right
//
// Options: 24 HOURS · 7 DAYS · 14 DAYS · 30 DAYS · ALL TIME
// Default: 14 DAYS

import React, { useState } from "react";

export const TIME_RANGES = [
  { key: "24h", label: "24 hours", days: 1 },
  { key: "7d",  label: "7 days",   days: 7 },
  { key: "14d", label: "14 days",  days: 14 },
  { key: "30d", label: "30 days",  days: 30 },
  { key: "all", label: "All time", days: null },
];

export default function TimeRangeChip({ value = "14d", onChange, t = {} }) {
  const [open, setOpen] = useState(false);
  const labelFor = (r) => {
    if (r.key === "24h") return t.trange24h || r.label;
    if (r.key === "7d")  return t.trange7d  || r.label;
    if (r.key === "30d") return t.trange30d || r.label;
    if (r.key === "14d") return t.trange14d || r.label;
    if (r.key === "all") return t.trangeAll || r.label;
    return r.label;
  };
  const current = TIME_RANGES.find((r) => r.key === value) || TIME_RANGES[2];
  const labelUpper = String(labelFor(current)).toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "6px 12px",
          display: "inline-flex", alignItems: "center", gap: 6,
          cursor: "pointer",
          fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.20em", color: "var(--ink)",
          textTransform: "uppercase",
        }}
      >
        {labelUpper}
        <svg width="8" height="6" viewBox="0 0 9 6" fill="none">
          <path d="M1 1L4.5 5L8 1" stroke="var(--ink)" strokeWidth="1.2"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              minWidth: 140,
              background: "var(--paper)",
              border: "0.5px solid var(--border)",
              borderRadius: 12,
              padding: 4,
              zIndex: 51,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            {TIME_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => { onChange?.(r.key); setOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: r.key === value ? "var(--cream)" : "transparent",
                  border: "none", borderRadius: 8,
                  padding: "8px 10px", cursor: "pointer",
                  fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.18em", color: "var(--ink)",
                  textTransform: "uppercase",
                }}
              >
                {labelFor(r)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
