// ── CoverLetterDraft.jsx ──────────────────────────────────────────────────
// Standalone screen reached from Coach landing's "Draft cover letter" tile.
// One opinionated draft (no A/B/C style picker). Regenerate re-rolls the
// same opinionated prompt with a fresh seed.
//
// Layout:
//   TopBar: ← COACH · COVER LETTER · DRAFT · SAVE
//   Meta block: TO · COMPANY (eyebrow) + Role title (serif)
//   Editable serif body — ~140–180 words by default
//   Source line: "drafted from the Coach take + your positioning"
//   Action bar: Regenerate · Copy · Save to role (ink primary)
//
// Vantage: unlimited regenerates. Navigator: 3 / month. Free: read-only.

import React, { useState, useEffect } from "react";
import TopBar from "../TopBar.jsx";
import { ENDPOINTS } from "../../../config.js";

export default function CoverLetterDraft({
  opp,
  profile,
  authUser,
  userTier,
  onBack,
  t = {},
}) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [savedAt, setSavedAt] = useState(null);

  const isVantage = userTier === "vantage" || userTier === "vantage_lifetime";

  // Initial fetch on mount
  useEffect(() => {
    fetchDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDraft() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(ENDPOINTS.coverLetter, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appleId:      authUser?.id,
          sessionToken: authUser?.sessionToken || "",
          role: {
            title:    opp.role_title,
            company:  opp.company,
            verdict:  opp.recommendation,
          },
          context: {
            strengths:        opp.strengths || [],
            gaps:             opp.gaps || [],
            narrative_bridge: opp.narrative_bridge || "",
            honest_fit:       opp.honest_fit_summary || "",
          },
          profile: {
            background:  profile?.background || "",
            careerGoal:  profile?.careerGoal || "",
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Draft generation failed.");
      setDraft(data.draft || "");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!draft) return;
    try {
      navigator.clipboard?.writeText(draft);
      setSavedAt(t.copied || "Copied");
      setTimeout(() => setSavedAt(null), 2200);
    } catch { /* ignore */ }
  }

  return (
    <div style={{
      width: "100%", minHeight: "100%", background: "var(--paper)",
      paddingTop: 56,
      display: "flex", flexDirection: "column",
    }}>
      <TopBar
        title={t.coverLetter ? String(t.coverLetter).toUpperCase() : "COVER LETTER"}
        backLabel={t.pillCoach || "COACH"}
        onBack={onBack}
        rightSlot={
          <button
            onClick={() => setSavedAt(t.saved || "Saved")}
            style={{
              background: "transparent", border: "none", cursor: "pointer", padding: 0,
              fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.20em", color: "var(--ink)", textTransform: "uppercase",
            }}
          >{t.save ? String(t.save).toUpperCase() : "SAVE"}</button>
        }
      />

      <div style={{ padding: "20px 22px 8px" }}>
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.22em", color: "var(--muted-soft)",
          textTransform: "uppercase", marginBottom: 4,
        }}>TO · {(opp.company || "—").toUpperCase()}</div>
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700,
          color: "var(--ink)", lineHeight: 1.3, letterSpacing: "-0.005em",
        }}>{opp.role_title || "Unknown Role"}</div>
      </div>

      <div style={{
        height: 1, background: "var(--border)", margin: "12px 22px 16px",
      }} />

      <div style={{ flex: 1, padding: "0 22px 16px", overflowY: "auto" }}>
        {loading && (
          <div style={{
            fontFamily: "var(--font-prose)", fontSize: 13,
            color: "var(--muted-soft)", textAlign: "center",
            padding: "40px 0",
          }}>{t.drafting || "Drafting…"}</div>
        )}

        {err && (
          <div style={{
            fontFamily: "var(--font-prose)", fontSize: 13,
            color: "var(--pass)", padding: "20px 0",
          }}>{err}</div>
        )}

        {!loading && !err && (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{
                width: "100%", minHeight: 360,
                background: "transparent", border: "none", outline: "none",
                fontFamily: "var(--font-serif)", fontSize: 13, lineHeight: 1.65,
                color: "var(--ink)", resize: "vertical",
              }}
            />

            <div style={{
              marginTop: 12,
              fontFamily: "var(--font-serif)", fontSize: 9, fontWeight: 400,
              letterSpacing: "0.18em", color: "var(--muted-soft)",
              textTransform: "uppercase",
            }}>
              {draft.split(/\s+/).filter(Boolean).length} {t.wordCount || "WORDS · DRAFTED FROM THE COACH TAKE"}
            </div>
          </>
        )}
      </div>

      {/* Action bar */}
      <div style={{
        borderTop: "0.5px solid var(--border)",
        padding: "14px 22px 22px",
        background: "var(--paper)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <button
          onClick={fetchDraft}
          disabled={loading || !isVantage}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 20, padding: "8px 14px",
            fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.20em", color: isVantage ? "var(--ink)" : "var(--muted-soft)",
            textTransform: "uppercase",
            cursor: isVantage && !loading ? "pointer" : "default",
          }}
        >{t.regenerate ? String(t.regenerate).toUpperCase() : "REGENERATE"}</button>

        <button
          onClick={handleCopy}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 20, padding: "8px 14px",
            fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.20em", color: "var(--ink)",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >{t.copy ? String(t.copy).toUpperCase() : "COPY"}</button>

        <div style={{ flex: 1 }} />

        {savedAt && (
          <span style={{
            fontFamily: "var(--font-prose)", fontSize: 12,
            color: "var(--accent)",
          }}>{savedAt}</span>
        )}
      </div>
    </div>
  );
}
