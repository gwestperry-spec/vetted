// ── redesign/index.js ─────────────────────────────────────────────────────
// Barrel exports for the Build-30 redesign primitives. Import from here so
// call sites stay clean and refactors don't fan out across the codebase.
//
//   import { Tile, ThoughtCard, TopBar, NextPrompt, Breadcrumb, Pod,
//            VerdictSeal, Icon } from "../components/redesign";

export { Icon } from "./IconSet.jsx";
export { default as TopBar } from "./TopBar.jsx";
export { default as Breadcrumb } from "./Breadcrumb.jsx";
export { default as Tile } from "./Tile.jsx";
export { default as NextPrompt } from "./NextPrompt.jsx";
export { default as ThoughtCard } from "./ThoughtCard.jsx";
export { default as Pod } from "./Pod.jsx";
export { default as VerdictSeal } from "./VerdictSeal.jsx";
