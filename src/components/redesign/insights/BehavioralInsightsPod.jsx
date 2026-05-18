// ── BehavioralInsightsPod.jsx ─────────────────────────────────────────────
// The full Behavioral Insights pod that lives on the Workspace tab above
// the role list. Composes the four card components into a swipeable
// Pod (Phase 1 primitive), with a section eyebrow above and CTAs wired
// to App-level handlers.
//
// Data is fetched by the parent (RoleWorkspace) and passed in via `data`.
// Loading + empty states handled here.
//
// Empty state: when fewer than 5 scored roles exist, show a single card
// with "Score 5+ roles to unlock insights" rather than empty cards.

import React from "react";
import Pod from "../Pod.jsx";
import SpectrumCard from "./SpectrumCard.jsx";
import FilterSignalCard from "./FilterSignalCard.jsx";
import PreferenceDriftCard from "./PreferenceDriftCard.jsx";
import SynthesisCard from "./SynthesisCard.jsx";

export default function BehavioralInsightsPod({
  data,
  loading = false,
  onEditFloor,
  onAdjustWeight,
  onEditPreferences,
  onOpenPipeline,
}) {
  // Eyebrow row above the pod
  const Header = ({ activeCount }) => (
    <div style={{
      padding: "0 22px 8px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{
        fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.22em", color: "var(--muted-soft)",
        textTransform: "uppercase",
      }}>PATTERNS</span>
      <span style={{ flex: 1, height: 0.5, background: "var(--border)" }} />
      <span style={{
        fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.20em", color: "var(--accent)",
      }}>{activeCount} ACTIVE</span>
    </div>
  );

  // Empty state — too few scored roles for meaningful aggregations
  if (data?.eligible === false) {
    return (
      <div style={{ marginBottom: 12 }}>
        <Header activeCount={0} />
        <div style={{ padding: "0 22px" }}>
          <div style={{
            background: "var(--cream)",
            borderRadius: 10,
            padding: "18px 16px",
            fontFamily: "var(--font-prose)", fontSize: 13,
            color: "var(--muted-deep)", lineHeight: 1.5,
          }}>
            <div style={{
              fontFamily: "var(--font-serif)", fontSize: 13, fontWeight: 700,
              letterSpacing: "-0.005em", color: "var(--ink)",
              marginBottom: 4,
            }}>Score 5+ roles to unlock insights.</div>
            We need a small history to see patterns — floor margins, filter
            drift, pursue rate. Score a few more roles and your pod will
            populate here.
          </div>
        </div>
      </div>
    );
  }

  // Loading state — show eyebrow + an empty pod frame so layout doesn't shift
  if (loading || !data) {
    return (
      <div style={{ marginBottom: 12 }}>
        <Header activeCount={0} />
        <div style={{ padding: "0 22px" }}>
          <div style={{
            background: "var(--cream)",
            borderRadius: 10,
            height: 220,
            opacity: 0.5,
          }} />
        </div>
      </div>
    );
  }

  // Full pod — count active cards (data presence determines)
  const activeCount = [
    data.floorMargin,
    data.filterSignal,
    data.preferenceDrift,
    data.synthesis,
  ].filter(Boolean).length;

  return (
    <div style={{ marginBottom: 12 }}>
      <Header activeCount={activeCount} />
      <Pod ariaLabel="Behavioral insights">
        {data.floorMargin && (
          <SpectrumCard data={data.floorMargin} onEditFloor={onEditFloor} />
        )}
        {data.filterSignal && (
          <FilterSignalCard data={data.filterSignal} onAdjustWeight={onAdjustWeight} />
        )}
        {data.preferenceDrift && (
          <PreferenceDriftCard data={data.preferenceDrift} onEditPreferences={onEditPreferences} />
        )}
        {data.synthesis && (
          <SynthesisCard data={data.synthesis} onOpenPipeline={onOpenPipeline} />
        )}
      </Pod>
    </div>
  );
}
