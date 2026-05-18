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

import React, { useState, useEffect, useRef } from "react";
import TopBar from "../TopBar.jsx";
import { ENDPOINTS } from "../../../config.js";

const LS_KEY = (id) => `vetted:coverLetterDraft:${id || "default"}`;

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
  const textareaRef = useRef(null);

  const isVantage = userTier === "vantage" || userTier === "vantage_lifetime";

  // Initial mount: pre-fill from localStorage if a saved draft exists for
  // this opportunity. Otherwise, generate fresh from the API.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LS_KEY(opp?.id));
      if (cached && cached.trim()) {
        setDraft(cached);
        return;
      }
    } catch { /* ignore storage errors */ }
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

  async function handleCopy() {
    if (!draft) return;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(draft);
        copied = true;
      }
    } catch { /* fall through to legacy */ }
    if (!copied) {
      // Legacy fallback for iOS WebView / older browsers — select the
      // textarea and trigger document.execCommand("copy").
      try {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.select();
          document.execCommand("copy");
          copied = true;
          el.blur();
        }
      } catch { /* ignore */ }
    }
    setSavedAt(copied ? (t.copied || "Copied") : (t.copyFailed || "Copy failed"));
    setTimeout(() => setSavedAt(null), 2200);
  }

  function handleSave() {
    if (!draft) return;
    try {
      localStorage.setItem(LS_KEY(opp?.id), draft);
      setSavedAt(t.saved || "Saved");
    } catch {
      setSavedAt(t.saveFailed || "Save failed");
    }
    setTimeout(() => setSavedAt(null), 2200);
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
            onClick={handleSave}
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
              ref={textareaRef}
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
        {(() => {
          // Allow Regenerate when: Vantage tier OR there's an error to retry
          // OR draft is empty (first generation never landed). Otherwise
          // non-Vantage tiers see a disabled chip.
          const canRegen = isVantage || !!err || !draft;
          return (
            <button
              onClick={fetchDraft}
              disabled={loading || !canRegen}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 20, padding: "8px 14px",
                fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700,
                letterSpacing: "0.20em", color: canRegen ? "var(--ink)" : "var(--muted-soft)",
                textTransform: "uppercase",
                cursor: canRegen && !loading ? "pointer" : "default",
              }}
            >{t.regenerate ? String(t.regenerate).toUpperCase() : "REGENERATE"}</button>
          );
        })()}

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
