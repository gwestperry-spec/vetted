// ── Tile.jsx ──────────────────────────────────────────────────────────────
// Single-subject tile used by pill landings (Insights, Filters, Pay, Coach).
// Five variants, matching Claude design's pill-flow.jsx Tile component:
//
//   default — cream background, neutral
//   accent  — cream-warm bg + 3px accent left-border (positive signal)
//   gold    — gold-bg + 3px gold-border (worth attention)
//   pass    — pass-bg + 3px pass-border (system errors only, rarely used)
//   action  — ink-filled background, light text, mono-caps title
//             (used for "Draft cover letter" and similar verbs)
//
// Props:
//   accent     — "accent" | "gold" | "pass" | undefined (default)
//   action     — boolean (true = ink-filled action tile)
//   icon       — function(color) => SVG element, or null
//   title      — string
//   body       — string | ReactNode (optional)
//   onClick    — function
//   chevron    — boolean (default true; show > chevron on right)

import React from "react";
import { Icon } from "./IconSet.jsx";

export default function Tile({
  accent,
  action = false,
  icon,
  title,
  body,
  onClick,
  chevron = true,
}) {
  const tileBg =
    action               ? "var(--ink)"      :
    accent === "accent"  ? "var(--cream-warm)" :
    accent === "gold"    ? "var(--gold-bg)"  :
    accent === "pass"    ? "var(--pass-bg)"  :
                           "var(--cream)";

  const borderLeft =
    accent === "accent" ? "3px solid var(--accent-border-strong)" :
    accent === "gold"   ? "3px solid var(--gold-border)" :
    accent === "pass"   ? "3px solid var(--pass-border)" :
                          "none";

  const titleColor  = action ? "var(--on-dark-ink)" : "var(--ink)";
  const bodyColor   = action ? "var(--on-dark-soft)" : "var(--muted-deep)";
  const iconColor   =
    accent === "accent" ? "var(--accent)" :
    accent === "gold"   ? "var(--gold)" :
    accent === "pass"   ? "var(--pass)" :
    action              ? "var(--dot)" :
                          "var(--muted)";
  const chevColor   = action ? "var(--dot)" : "var(--muted-soft)";

  return (
    <div
      role="button"
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(e);
        }
      }}
      style={{
        background: tileBg, borderRadius: 10,
        borderLeft,
        padding: "14px 14px",
        display: "flex", alignItems: "flex-start", gap: 12,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ flex: "0 0 22px", paddingTop: 1 }}>
        {icon && icon(iconColor)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: 13, fontWeight: 700,
          letterSpacing: action ? "0.20em" : "-0.005em",
          color: titleColor, lineHeight: 1.3,
          textTransform: action ? "uppercase" : "none",
        }}>
          {title}
        </div>
        {body && (
          <div style={{
            marginTop: 4,
            fontFamily: "var(--font-prose)", fontSize: 12.5, color: bodyColor,
            lineHeight: 1.5,
          }}>
            {body}
          </div>
        )}
      </div>

      {chevron && (
        <div style={{ flex: "0 0 12px", paddingTop: 4 }}>
          <Icon name="chev" size={12} color={chevColor} />
        </div>
      )}
    </div>
  );
}
