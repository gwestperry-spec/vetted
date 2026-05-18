// ── InsightsLanding.jsx ───────────────────────────────────────────────────
// The Insights pill landing. Four tiles: Honest Fit · Strengths · Real
// Gaps · Narrative Bridge. Tap any tile → opens a ThoughtCard overlay
// with the full content.
//
// Per Claude design spec: editorial — tiles read as section openers, not
// summaries. No italic gestalt sentences (per build direction).
//
// Data: opp.honest_fit_summary, opp.strengths, opp.gaps, opp.narrative_bridge

import React, { useState } from "react";
import TopBar from "../TopBar.jsx";
import Breadcrumb from "../Breadcrumb.jsx";
import Tile from "../Tile.jsx";
import NextPrompt from "../NextPrompt.jsx";
import ThoughtCard from "../ThoughtCard.jsx";
import { Icon } from "../IconSet.jsx";

function buildSections(t) {
  return [
    { key: "honestFit", icon: (c) => <Icon name="quote" size={20} color={c} />,
      title: t.tileHonestFit || "Honest fit assessment", accent: null },
    { key: "strengths", icon: (c) => <Icon name="check" size={14} color={c} />,
      title: t.tileStrengths || "Where you are strong", accent: "accent" },
    { key: "gaps", icon: (c) => <Icon name="triangle" size={14} color={c} />,
      title: t.tileGaps || "Real gaps", accent: "gold" },
    { key: "bridge", icon: (c) => <Icon name="bridge" size={20} color={c} />,
      title: t.tileBridge || "Narrative bridge", accent: null },
  ];
}

function buildBodySummary(opp, key) {
  switch (key) {
    case "honestFit":
      return opp.honest_fit_summary?.slice(0, 110)
        ? opp.honest_fit_summary.length > 110
          ? opp.honest_fit_summary.slice(0, 110).trim() + "…"
          : opp.honest_fit_summary
        : "";
    case "strengths":
      return `${(opp.strengths || []).length} signal${(opp.strengths || []).length === 1 ? "" : "s"}.`;
    case "gaps":
      return `${(opp.gaps || []).length} gap${(opp.gaps || []).length === 1 ? "" : "s"} to address.`;
    case "bridge":
      return opp.narrative_bridge?.slice(0, 110)
        ? opp.narrative_bridge.length > 110
          ? opp.narrative_bridge.slice(0, 110).trim() + "…"
          : opp.narrative_bridge
        : "";
    default:
      return "";
  }
}

function ThoughtBody({ section, opp }) {
  if (section === "honestFit") {
    return (
      <p style={{ margin: 0 }}>{opp.honest_fit_summary || "No assessment available."}</p>
    );
  }
  if (section === "strengths") {
    const list = opp.strengths || [];
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {list.map((s, i) => (
          <li key={i} style={{
            display: "flex", gap: 12, padding: "6px 0",
            borderBottom: i < list.length - 1 ? "0.5px solid var(--border)" : "none",
          }}>
            <Icon name="check" size={14} color="var(--accent)" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (section === "gaps") {
    const list = opp.gaps || [];
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {list.map((g, i) => (
          <li key={i} style={{
            display: "flex", gap: 12, padding: "6px 0",
            borderBottom: i < list.length - 1 ? "0.5px solid var(--border)" : "none",
          }}>
            <Icon name="triangle" size={14} color="var(--gold)" />
            <span>{g}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (section === "bridge") {
    return (
      <p style={{ margin: 0 }}>{opp.narrative_bridge || "No bridge generated."}</p>
    );
  }
  return null;
}

export default function InsightsLanding({ opp, onBack, onNext, t = {} }) {
  const [openSection, setOpenSection] = useState(null);
  const SECTIONS = buildSections(t);

  return (
    <div style={{
      width: "100%", minHeight: "100%", background: "var(--paper)",
      paddingTop: 56,
      display: "flex", flexDirection: "column",
    }}>
      <TopBar title={t.pillInsights || "INSIGHTS"} backLabel="VQ" onBack={onBack} />

      <Breadcrumb
        score={Number(opp.overall_score).toFixed(1)}
        verdict={String(opp.recommendation || "").toUpperCase()}
        context={`${(opp.company || "").toUpperCase()} · ${(opp.role_title || "").toUpperCase()}`}
      />

      <div style={{ padding: "22px 22px 0" }}>
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.22em", color: "var(--muted-soft)",
          textTransform: "uppercase", marginBottom: 8,
        }}>{t.rxFourSections || "FOUR SECTIONS"}</div>
      </div>

      <div style={{
        flex: 1, padding: "16px 20px 0",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {SECTIONS.map((s) => (
          <Tile
            key={s.key}
            accent={s.accent}
            icon={s.icon}
            title={s.title}
            body={buildBodySummary(opp, s.key)}
            onClick={() => setOpenSection(s.key)}
          />
        ))}
      </div>

      <NextPrompt
        hint={t.hintTapSection || "Tap any section to open it."}
        label={t.pillFilters || "FILTERS"}
        onNext={onNext}
      />

      {openSection && (
        <ThoughtCard
          pillName={t.pillInsights || "INSIGHTS"}
          sectionLabel={SECTIONS.find((s) => s.key === openSection).title.toUpperCase()}
          title={SECTIONS.find((s) => s.key === openSection).title}
          nextLabel={t.pillFilters || "FILTERS"}
          onNext={() => { setOpenSection(null); onNext?.(); }}
          onClose={() => setOpenSection(null)}
        >
          <ThoughtBody section={openSection} opp={opp} />
        </ThoughtCard>
      )}
    </div>
  );
}
