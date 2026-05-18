// ── FiltersLanding.jsx ────────────────────────────────────────────────────
// The Filters pill landing. Renders one tile per filter in the user's
// framework (up to 10 = 5 default + 5 custom). Each tile shows the
// filter name, a small bar (width = score / 5), the numeric score, and
// is color-tiered:
//
//   score ≥ 4.0 → accent tier (cream-warm bg, 3px accent left-border)
//   score 3.0–3.9 → gold tier (gold-bg, 3px gold left-border)
//   score < 3.0 → default (cream, no border)
//
// Tap any tile → ThoughtCard with the filter's rationale.
//
// NEXT → PAY (canonical sequence Insights → Filters → Pay → Coach).

import React, { useState } from "react";
import TopBar from "../TopBar.jsx";
import Breadcrumb from "../Breadcrumb.jsx";
import Tile from "../Tile.jsx";
import NextPrompt from "../NextPrompt.jsx";
import ThoughtCard from "../ThoughtCard.jsx";

function localizedName(filters, filter_id, fallback) {
  const match = filters?.find((f) => f.id === filter_id);
  if (!match) return fallback;
  if (typeof match.name === "string") return match.name;
  if (typeof match.name === "object") return match.name.en || Object.values(match.name)[0] || fallback;
  return fallback;
}

function tierFor(score) {
  if (score >= 4.0) return "accent";
  if (score >= 3.0) return "gold";
  return null;
}

function ScoreBar({ score, color }) {
  const widthPct = Math.max(0, Math.min(100, (score / 5) * 100));
  return (
    <div style={{
      width: 60, height: 3, background: "rgba(0,0,0,0.06)",
      borderRadius: 2, overflow: "hidden",
      display: "inline-block", verticalAlign: "middle",
      marginRight: 8,
    }}>
      <div style={{ height: "100%", width: `${widthPct}%`, background: color }} />
    </div>
  );
}

export default function FiltersLanding({ opp, filters, onBack, onNext, t = {} }) {
  const [openFilterId, setOpenFilterId] = useState(null);

  // Sort: highest score first so user reads strengths before weak filters
  const scored = (opp.filter_scores || [])
    .slice()
    .sort((a, b) => Number(b.score) - Number(a.score));

  const openFilter = openFilterId
    ? scored.find((f) => f.filter_id === openFilterId)
    : null;

  return (
    <div style={{
      width: "100%", height: "100dvh", background: "var(--paper)",
      paddingTop: 56,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <TopBar title={t.pillFilters || "FILTERS"} backLabel="VQ" onBack={onBack} />

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
        }}>{scored.length} {scored.length === 1 ? (t.rxFilterOfN || "FILTER") : (t.rxFiltersOfN || "FILTERS")}</div>
      </div>

      <div style={{
        flex: 1, padding: "16px 20px 12px", minHeight: 0, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {scored.map((fs) => {
          const name = localizedName(filters, fs.filter_id, fs.filter_name || fs.filter_id);
          const score = Number(fs.score) || 0;
          const tier = tierFor(score);
          const scoreColor =
            tier === "accent" ? "var(--accent)" :
            tier === "gold"   ? "var(--gold-display)" :
                                "var(--muted-deep)";
          return (
            <Tile
              key={fs.filter_id}
              accent={tier}
              title={name}
              body={
                <span>
                  <ScoreBar score={score} color={scoreColor} />
                  <strong style={{ color: scoreColor, fontWeight: 700 }}>
                    {score.toFixed(1)}
                  </strong>
                  <span style={{ color: "var(--muted-soft)" }}> / 5</span>
                </span>
              }
              onClick={() => setOpenFilterId(fs.filter_id)}
            />
          );
        })}
      </div>

      <NextPrompt
        hint={t.hintTapFilter || "Tap any filter for the rationale."}
        label={t.pillPay || "PAY"}
        onNext={onNext}
      />

      {openFilter && (
        <ThoughtCard
          pillName={t.pillFilters || "FILTERS"}
          sectionLabel={localizedName(filters, openFilter.filter_id, openFilter.filter_name).toUpperCase()}
          title={localizedName(filters, openFilter.filter_id, openFilter.filter_name)}
          provenance={`${t.rxFilterOfN || "SOURCE"} · ${Number(openFilter.score).toFixed(1)} / 5`}
          nextLabel={t.pillPay || "PAY"}
          onNext={() => { setOpenFilterId(null); onNext?.(); }}
          onClose={() => setOpenFilterId(null)}
        >
          <p style={{ margin: 0 }}>
            {openFilter.rationale || "No rationale available."}
          </p>
        </ThoughtCard>
      )}
    </div>
  );
}
