// ── PayLanding.jsx ────────────────────────────────────────────────────────
// The Pay pill landing. Reads salary signal from the JD text (no
// schema-tracked offer state per Build-30 simplification). Two tiles:
//
//   1. Market range — comparison of role's listed comp vs user's stated
//      floor + market band derived from MarketPulse data (passed in)
//   2. Negotiation leverage — opinionated coaching line based on the
//      role's strengths and the user's experience
//
// Status header above the tiles reads the JD's salary text and labels it:
//   - Posted range: "$220k – $340k posted"
//   - No range:     "Range not disclosed."

import React, { useState } from "react";
import TopBar from "../TopBar.jsx";
import Breadcrumb from "../Breadcrumb.jsx";
import Tile from "../Tile.jsx";
import NextPrompt from "../NextPrompt.jsx";
import ThoughtCard from "../ThoughtCard.jsx";
import { Icon } from "../IconSet.jsx";
import { extractSalaryFromJd, formatRange } from "../../../utils/salaryExtract.js";

export default function PayLanding({ opp, profile, onBack, onNext, t = {} }) {
  const [openTile, setOpenTile] = useState(null);

  const jdSalary = extractSalaryFromJd(opp.framework_snapshot?.jd || opp.jd || "");
  const stated = profile?.compensationMin
    ? `$${Math.round(parseFloat(profile.compensationMin) / 1000)}K ${t.rxFloor || "floor"}`
    : null;

  const statusLabel = jdSalary
    ? `${formatRange(jdSalary)}`
    : (t.rangeNotDisclosed || "Range not disclosed.");

  return (
    <div className="no-scrollbar" style={{
      width: "100%", height: "100dvh", background: "var(--paper)",
      paddingTop: 56,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <TopBar title={t.pillPay || "PAY"} backLabel="VQ" onBack={onBack} />

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
        }}>{t.rxPostedRange || "POSTED RANGE"}</div>
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 400,
          color: "var(--ink)", lineHeight: 1.4,
        }}>{statusLabel}</div>
        {stated && (
          <div style={{
            marginTop: 4,
            fontFamily: "var(--font-prose)", fontSize: 12, color: "var(--muted-deep)",
          }}>{t.yourStatedFloor || "Your stated floor:"} {stated}</div>
        )}
      </div>

      <div style={{
        flex: 1, padding: "20px 20px 0",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <Tile
          accent="accent"
          icon={(c) => <Icon name="chart" size={20} color={c} />}
          title={t.tileMarketRange || "Market range"}
          body={jdSalary
            ? `${formatRange(jdSalary)}. ${stated || (t.setFloorToCompare || "Set a floor in your profile to compare.")}`
            : (t.rangeNotDisclosedJD || "Range not disclosed in JD. Use the role title to compare to market in Pulse.")}
          onClick={() => setOpenTile("market")}
        />
        <Tile
          accent="accent"
          icon={(c) => <Icon name="money" size={20} color={c} />}
          title={t.tileNegotiationLeverage || "Negotiation leverage"}
          body={t.tileLeverageBody || "Anchor where your experience commands the conversation."}
          onClick={() => setOpenTile("leverage")}
        />
      </div>

      <NextPrompt
        hint={t.hintReadTakeCoach || "Read the take, then move to Coach."}
        label={t.pillCoach || "COACH"}
        onNext={onNext}
      />

      {openTile === "market" && (
        <ThoughtCard
          pillName={t.pillPay || "PAY"}
          sectionLabel={(t.tileMarketRange || "Market range").toUpperCase()}
          title={t.tileMarketRange || "Market range"}
          nextLabel={t.pillCoach || "COACH"}
          onNext={() => { setOpenTile(null); onNext?.(); }}
          onClose={() => setOpenTile(null)}
        >
          <p style={{ margin: 0 }}>
            {jdSalary
              ? `The posted range is ${formatRange(jdSalary)}. ${stated ? `Compared to your floor of ${stated}, the role ${jdSalary.high < parseFloat(profile.compensationMin) ? "sits below — worth a hard conversation before further interest." : jdSalary.low >= parseFloat(profile.compensationMin) ? "clears your floor cleanly. Anchor at the upper third of the band." : "spans your floor. Anchor at the top of the band; the conversation is yours to lead."}` : "Set a floor in your profile to see how this role compares against your minimum."}`
              : "The job description doesn't disclose comp. Use Pulse to see market range for this role title and region, or ask explicitly in your first conversation — it's a reasonable question at the senior level."}
          </p>
        </ThoughtCard>
      )}

      {openTile === "leverage" && (
        <ThoughtCard
          pillName={t.pillPay || "PAY"}
          sectionLabel={(t.tileNegotiationLeverage || "Negotiation leverage").toUpperCase()}
          title={t.tileNegotiationLeverage || "Negotiation leverage"}
          nextLabel={t.pillCoach || "COACH"}
          onNext={() => { setOpenTile(null); onNext?.(); }}
          onClose={() => setOpenTile(null)}
        >
          <p style={{ margin: 0 }}>
            {(opp.strengths || []).length > 0
              ? `Your strongest position with this role: ${opp.strengths[0]?.toLowerCase()}. Anchor your comp ask around that — they're buying the operating model you've already built, not a learning curve.`
              : "Anchor at the top of the posted range. Senior compensation reflects what you've already shipped, not what the role will teach you."}
          </p>
        </ThoughtCard>
      )}
    </div>
  );
}
