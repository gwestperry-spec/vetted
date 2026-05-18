// ── IconSet.jsx ───────────────────────────────────────────────────────────
// Outline SVG icons for the Build-30 redesign. Stroke-based, 1.5px width,
// inherits currentColor by default. Match pill-flow.jsx exactly.
//
// Usage:
//   import { Icon } from "./redesign/IconSet.jsx";
//   <Icon name="back" size={14} color="var(--muted-soft)" />

import React from "react";

const baseStrokeProps = (color, strokeWidth) => ({
  stroke:        color || "currentColor",
  strokeWidth:   strokeWidth || 1.5,
  fill:          "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

const ICONS = {
  back: (p) => (
    <path d="M15 6l-6 6 6 6" {...p} />
  ),
  chev: (p) => (
    <path d="M9 6l6 6-6 6" {...p} />
  ),
  close: (p) => (
    <path d="M6 6l12 12M18 6L6 18" {...p} />
  ),
  check: (p) => (
    <path d="M5 12l5 5 10-12" {...p} />
  ),
  triangle: (p) => (
    <path d="M12 4l9 16H3z" {...p} />
  ),
  bridge: (p) => (
    <>
      <path d="M3 16c2-4 4-6 6-6h6c2 0 4 2 6 6" {...p} />
      <line x1="3" y1="20" x2="21" y2="20" {...p} />
      <line x1="8" y1="13" x2="8" y2="20" {...p} />
      <line x1="16" y1="13" x2="16" y2="20" {...p} />
    </>
  ),
  quote: (p) => (
    <>
      <path d="M5 16c0-3 1-5 4-7M5 16h4v-5H6" {...p} />
      <path d="M14 16c0-3 1-5 4-7M14 16h4v-5h-3" {...p} />
    </>
  ),
  chat: (p) => (
    <path d="M4 5C4 4.45 4.45 4 5 4H19C19.55 4 20 4.45 20 5V14C20 14.55 19.55 15 19 15H10L6 19V15H5C4.45 15 4 14.55 4 14V5Z" {...p} />
  ),
  target: (p, color) => (
    <>
      <circle cx="12" cy="12" r="8" {...p} />
      <circle cx="12" cy="12" r="4" {...p} />
      <circle cx="12" cy="12" r="1" fill={color || "currentColor"} stroke="none" />
    </>
  ),
  money: (p) => (
    <>
      <line x1="12" y1="4" x2="12" y2="20" {...p} />
      <path d="M16 8c-.5-1.3-2-2-4-2-2.5 0-4 1.5-4 3.5S9.5 13 12 13s4 1 4 3-1.5 3-4 3-3.5-.7-4-2" {...p} />
    </>
  ),
  pen: (p) => (
    <>
      <path d="M14 4l6 6-10 10H4v-6z" {...p} />
      <path d="M13 5l6 6" {...p} />
    </>
  ),
  chart: (p) => (
    <>
      <line x1="5" y1="20" x2="5" y2="12" {...p} />
      <line x1="10" y1="20" x2="10" y2="8" {...p} />
      <line x1="15" y1="20" x2="15" y2="14" {...p} />
      <line x1="20" y1="20" x2="20" y2="4" {...p} />
      <line x1="3" y1="20" x2="22" y2="20" {...p} />
    </>
  ),
  hamburger: (p) => (
    <>
      <line x1="4" y1="6"  x2="20" y2="6"  {...p} />
      <line x1="4" y1="12" x2="20" y2="12" {...p} />
      <line x1="4" y1="18" x2="20" y2="18" {...p} />
    </>
  ),
  plus: (p) => (
    <>
      <line x1="12" y1="5"  x2="12" y2="19" {...p} />
      <line x1="5"  y1="12" x2="19" y2="12" {...p} />
    </>
  ),
};

export function Icon({ name, size = 20, color, strokeWidth }) {
  const drawer = ICONS[name];
  if (!drawer) {
    if (typeof console !== "undefined") console.warn(`[Icon] unknown name: ${name}`);
    return null;
  }
  const props = baseStrokeProps(color, strokeWidth);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {drawer(props, color)}
    </svg>
  );
}
