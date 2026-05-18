// ── CoachLanding.jsx ──────────────────────────────────────────────────────
// The Coach pill landing — terminus of the canonical pill sequence.
// Three reading tiles + one action tile:
//
//   1. Interview preparation (chat icon) → ThoughtCard with two Q+A scripts
//   2. How to position yourself (target) → ThoughtCard with opening line + bridge
//   3. Negotiation leverage (money)      → ThoughtCard restating Pay's leverage
//   4. Draft cover letter (pen, action)  → opens CoverLetterDraft screen
//
// No NextPrompt — Coach is the terminus. The Draft cover letter tile IS
// the forward affordance for users who want to act.

import React, { useState } from "react";
import TopBar from "../TopBar.jsx";
import Breadcrumb from "../Breadcrumb.jsx";
import Tile from "../Tile.jsx";
import ThoughtCard from "../ThoughtCard.jsx";
import { Icon } from "../IconSet.jsx";

export default function CoachLanding({ opp, profile, onBack, onDraftCoverLetter }) {
  const [openTile, setOpenTile] = useState(null);

  return (
    <div style={{
      width: "100%", minHeight: "100%", background: "var(--paper)",
      paddingTop: 56,
      display: "flex", flexDirection: "column",
    }}>
      <TopBar title="COACH" backLabel="VQ" onBack={onBack} />

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
        }}>HOW TO ACT ON THIS</div>
      </div>

      <div style={{
        flex: 1, padding: "16px 20px 24px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <Tile
          icon={(c) => <Icon name="chat" size={20} color={c} />}
          title="Interview preparation"
          body="Two scripted questions to lead with — and the answers your background already gives you."
          onClick={() => setOpenTile("interview")}
        />
        <Tile
          icon={(c) => <Icon name="target" size={20} color={c} />}
          title="How to position yourself"
          body="The opening sentence to walk in with, plus the bridge from your background to this role."
          onClick={() => setOpenTile("position")}
        />
        <Tile
          icon={(c) => <Icon name="money" size={20} color={c} />}
          title="Negotiation leverage"
          body="Where to anchor comp, restated as a coaching move."
          onClick={() => setOpenTile("leverage")}
        />
        <Tile
          action
          icon={(c) => <Icon name="pen" size={20} color={c} />}
          title="Draft cover letter"
          onClick={onDraftCoverLetter}
        />
      </div>

      {openTile === "interview" && (
        <ThoughtCard
          pillName="COACH" sectionLabel="INTERVIEW PREPARATION"
          title="Interview preparation"
          nextLabel="DRAFT COVER LETTER"
          onNext={() => { setOpenTile(null); onDraftCoverLetter?.(); }}
          onClose={() => setOpenTile(null)}
        >
          <p style={{ margin: "0 0 14px" }}>
            <strong style={{ fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--ink)" }}>
              Q: Walk me through how you'd think about the first 90 days.
            </strong>
          </p>
          <p style={{ margin: "0 0 18px" }}>
            Lead with diagnosis, not action. The strongest version: spend 30
            days listening to the operating cadence, 30 mapping where the
            unit economics actually live, then 30 making one focused bet
            you can defend. Your background — {opp.strengths?.[0] || "what you've done"} —
            is the credibility you arrive with.
          </p>
          <p style={{ margin: "0 0 14px" }}>
            <strong style={{ fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--ink)" }}>
              Q: What's the biggest gap between this role and your last?
            </strong>
          </p>
          <p style={{ margin: 0 }}>
            Don't soften it. Name the specific transfer challenge — likely
            {opp.gaps?.[0] ? ` "${opp.gaps[0]?.toLowerCase()}"` : " the operating context"} —
            then explain what you'd do in the first month to close it.
            Confidence here is the move.
          </p>
        </ThoughtCard>
      )}

      {openTile === "position" && (
        <ThoughtCard
          pillName="COACH" sectionLabel="HOW TO POSITION YOURSELF"
          title="How to position yourself"
          nextLabel="DRAFT COVER LETTER"
          onNext={() => { setOpenTile(null); onDraftCoverLetter?.(); }}
          onClose={() => setOpenTile(null)}
        >
          <p style={{ margin: "0 0 14px" }}>
            {opp.narrative_bridge || "Your narrative bridge will land here."}
          </p>
          <p style={{ margin: 0 }}>
            Walk in with that sentence. Don't oversell — your background does
            the work. Their job is to figure out whether you transfer; your
            job is to make the transfer obvious in one line.
          </p>
        </ThoughtCard>
      )}

      {openTile === "leverage" && (
        <ThoughtCard
          pillName="COACH" sectionLabel="NEGOTIATION LEVERAGE"
          title="Negotiation leverage"
          nextLabel="DRAFT COVER LETTER"
          onNext={() => { setOpenTile(null); onDraftCoverLetter?.(); }}
          onClose={() => setOpenTile(null)}
        >
          <p style={{ margin: 0 }}>
            {opp.strengths?.[0]
              ? `Your leverage: ${opp.strengths[0]?.toLowerCase()}. Anchor your comp ask there. They're buying the operating model you've already built, not a learning curve.`
              : "Anchor at the top of the posted range. Senior compensation reflects what you've already shipped, not what the role will teach you."}
          </p>
        </ThoughtCard>
      )}
    </div>
  );
}
