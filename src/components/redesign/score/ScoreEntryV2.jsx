// ── ScoreEntryV2.jsx ──────────────────────────────────────────────────────
// Build-30 editorial Score tab. Drop-in replacement for the legacy
// ScoreEntry which carried THIS WEEK KPIs + a cohort row (both now
// redundant — history lives on Workspace, cohort lives on Pulse).
//
// Single-purpose entry surface: eyebrow + headline + italic subhead,
// cream input slab with auto-detect URL/text + serif SCORE button, six
// source chips (Greenhouse · LinkedIn · Indeed · Lever · Careers page ·
// Email JD), generic "When a URL won't fetch" tip, and an empty-state
// anchor-pair quote that rotates every 12s and hides on first keystroke.
//
// Scoring + Resolve states live elsewhere (ScoringScreen.jsx, ResolveHub.jsx)
// — this component owns only the entry beat.
//
// Port of ~/Downloads/ScoreFlowV2.jsx → SF2Entry. Same fetch + prefill
// logic as the legacy ScoreEntry so the share-extension deep-link flow
// still works (vetted://score?url=… → prefill prop → auto-submit).

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ENDPOINTS } from "../../../config.js";

const C = {
  ink:        "#1A2E1A",
  paper:      "#FAFAF8",
  cream:      "#F0F4F0",
  border:     "#D8E8D8",
  gold:       "#8A6A10",
  goldDisplay:"#B8A030",
  muted:      "#4A5A4A",
  mutedSoft:  "#8A9A8A",
  mutedDeep:  "#5A6A5A",
};
const F = {
  serif: "var(--font-serif)",
  prose: "var(--font-prose)",
  data:  "var(--font-data)",
};

// Default anchor library — kept in-file so the entry never renders blank
// before translations.js hydrates t.anchorPairs.
const DEFAULT_ANCHORS = [
  { q: "What if this score — whatever it says — is exactly the information you needed today?", a: "It is. That’s why you’re here." },
  { q: "Whether you pursue or pass, the framework you brought is the same.",                     a: "Trust it." },
  { q: "The number is the easy part.",                                                            a: "The decision is the rest of the day." },
  { q: "A pass on this isn’t a pass on you.",                                                     a: "It’s a pass on a fit." },
];

const MAX_URL = 2048;
function sanitizeUrl(value) {
  const trimmed = (value || "").trim().slice(0, MAX_URL);
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" || host === "127.0.0.1" ||
      host.startsWith("192.168.") || host.startsWith("10.") ||
      host.endsWith(".internal")
    ) return "";
    return trimmed;
  } catch { return ""; }
}

function StepDot({ n }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: "50%",
      border: `0.5px solid ${C.muted}`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: F.data, fontSize: 9, fontWeight: 700, color: C.muted,
      marginRight: 6, flexShrink: 0,
    }}>{n}</div>
  );
}

function StepArrow() {
  return (
    <span style={{
      margin: "0 8px", color: "#B5BFB5",
      fontFamily: F.prose, fontSize: 11,
    }}>→</span>
  );
}

function HamburgerButton({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Open menu" style={{
      width: 44, height: 44, display: "inline-flex",
      alignItems: "center", justifyContent: "center",
      background: "transparent", border: "none", cursor: "pointer",
      color: C.ink, padding: 0,
    }}>
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <line x1="3.5" y1="7"  x2="18.5" y2="7"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <line x1="3.5" y1="11" x2="18.5" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <line x1="3.5" y1="15" x2="18.5" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

export default function ScoreEntryV2({
  onScore,
  loading = false,
  onOpenMenu,
  authUser = null,
  prefill = null,
  onPrefillConsumed,
  t = {},
}) {
  const [val, setVal] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Anchor rotation — only runs while the input is empty.
  const anchors = (Array.isArray(t?.anchorPairs) && t.anchorPairs.length > 0)
    ? t.anchorPairs
    : DEFAULT_ANCHORS;
  const [anchorIdx, setAnchorIdx] = useState(
    () => Math.floor(Math.random() * anchors.length)
  );

  const isUrl  = /^https?:\/\//i.test(val.trim());
  const busy   = loading || fetching;
  const ready  = val.trim().length > 12 && !busy;
  const empty  = val.length === 0;
  const anchor = anchors[anchorIdx % anchors.length] || DEFAULT_ANCHORS[0];

  useEffect(() => {
    if (!empty) return;
    const id = setInterval(() => {
      setAnchorIdx(i => (i + 1) % anchors.length);
    }, 12000);
    return () => clearInterval(id);
  }, [empty, anchors.length]);

  // Consume incoming prefill (share-extension deep link). Same two-source
  // pattern as the legacy ScoreEntry — prefill prop OR localStorage stash.
  const lastPrefillKey = useRef(null);
  useEffect(() => {
    let pendingUrl = prefill?.url || "";
    let pendingAt  = prefill?.at  || "";
    if (!pendingUrl) {
      try {
        const stored = localStorage.getItem("vetted_pending_share_url");
        if (stored) {
          pendingUrl = stored;
          pendingAt  = "ls";
        }
      } catch { /* ignore */ }
    }
    if (!pendingUrl) return;
    const key = `${pendingUrl}|${pendingAt}`;
    if (lastPrefillKey.current === key) return;
    lastPrefillKey.current = key;
    setVal(pendingUrl);
    try { localStorage.removeItem("vetted_pending_share_url"); } catch { /* ignore */ }
    onPrefillConsumed?.();
    if (prefill?.autoTrigger || pendingAt === "ls") {
      setTimeout(() => handleSubmit(pendingUrl), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.url, prefill?.at]);

  async function handleSubmit(overrideVal) {
    const sourceCandidate = typeof overrideVal === "string" ? overrideVal : val;
    const source = sourceCandidate.trim();
    if (!source || source.length < 12) return;
    if (busy) return;
    const isUrlLocal = /^https?:\/\//i.test(source);

    if (isUrlLocal) {
      const safeUrl = sanitizeUrl(source);
      if (!safeUrl) {
        setFetchError(t?.urlFetchError || "That URL looks invalid.");
        return;
      }
      setFetching(true);
      setFetchError("");
      try {
        const res = await fetch(ENDPOINTS.fetchJd, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: safeUrl,
            appleId: authUser?.id || "",
            sessionToken: authUser?.sessionToken || "",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || (t?.urlFetchError || "Couldn't fetch this URL."));
        if (!data.jd) throw new Error("empty_response");
        onScore(data.jd, safeUrl);
        setVal("");
      } catch (err) {
        setFetchError(err?.message || (t?.urlFetchError || "Couldn't fetch this URL."));
      } finally {
        setFetching(false);
      }
      return;
    }

    setFetchError("");
    onScore(source, "");
    setVal("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && e.metaKey) handleSubmit();
  }

  const wordCount = val.trim() ? val.trim().split(/\s+/).length : 0;
  const slabStatus = !val
    ? (t.scoreSlabAutoDetect || "AUTO-DETECTS URL OR TEXT")
    : isUrl
      ? `↳ ${t.scoreSlabUrlDetected || "URL DETECTED"}`
      : `↳ ${wordCount} ${t.scoreSlabWords || "WORDS"}`;

  const body = (
    <div style={{
      // Portal-rendered onto document.body so the entry surface is
      // viewport-locked and can never push the document height past
      // 100dvh — no page scroll, ever. Tab bar (z 100) sits above
      // the score tab content (z 30).
      background: C.paper, position: "fixed", inset: 0,
      width: "100vw", height: "100dvh",
      display: "flex", flexDirection: "column", overflow: "hidden",
      zIndex: 30,
    }}>
      {/* Pinned header + title */}
      <div style={{ flexShrink: 0, background: C.paper }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)",
          paddingRight: 8, paddingBottom: 6, paddingLeft: 20,
        }}>
          <div style={{
            fontFamily: F.data, fontSize: 11, letterSpacing: "0.18em",
            color: C.ink, textTransform: "uppercase",
          }}>VETTED</div>
          <HamburgerButton onClick={onOpenMenu}/>
        </header>

        <div style={{ padding: "10px 20px 12px" }}>
          <div style={{
            fontFamily: F.serif, fontSize: 9, fontWeight: 700,
            letterSpacing: "0.24em", color: C.mutedSoft,
            textTransform: "uppercase", marginBottom: 10,
          }}>{t.scoreEyebrow || "SCORE · NEW OPPORTUNITY"}</div>
          <h1 style={{
            fontFamily: F.serif, fontSize: 24, fontWeight: 600,
            color: C.ink, lineHeight: 1.1, margin: 0,
            letterSpacing: "-0.02em",
          }}>{t.scoreHeadline || "Run a role through your filter framework."}</h1>
          <div style={{
            marginTop: 6, fontFamily: F.serif, fontStyle: "italic",
            fontSize: 14, color: C.mutedDeep, lineHeight: 1.4,
            textWrap: "pretty",
          }}>{t.scoreSubhead || "Paste the JD or drop a link. Eight seconds."}</div>
        </div>
      </div>

      {/* Body — sized to fit the viewport so the tab no longer scrolls.
          KPIs / cohort were removed; the remaining elements are tightened
          to land between the header and the bottom tab bar without any
          vertical overflow. */}
      <div style={{
        flex: 1, minHeight: 0, overflow: "hidden",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)",
        display: "flex", flexDirection: "column",
      }}>
        {/* The input slab — flex column so the empty-state anchor at the
            very bottom can push down with marginTop: auto, keeping the
            slab + chips + tip locked to the top of the body area. */}
        <div style={{ padding: "0 20px 8px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{
            position: "relative",
            background: C.cream,
            borderRadius: 14,
            border: `0.5px solid ${val ? "#A8B8A5" : C.border}`,
            padding: "14px 14px 12px",
            transition: "border-color 200ms ease",
          }}>
            <textarea
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.scoreSlabPlaceholder || "Paste a job description, or drop a URL…"}
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "transparent", border: "none", outline: "none",
                fontFamily: F.serif, fontSize: 14, color: C.ink,
                lineHeight: 1.45, resize: "none", minHeight: 80,
                fontStyle: empty ? "italic" : "normal",
              }}/>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, marginTop: 6, paddingTop: 10,
              borderTop: `0.5px solid ${C.border}`,
            }}>
              <div style={{
                fontFamily: F.serif, fontSize: 9, fontWeight: 700,
                letterSpacing: "0.20em", color: C.mutedSoft,
                textTransform: "uppercase",
              }}>{slabStatus}</div>
              <button
                disabled={!ready}
                onClick={() => handleSubmit()}
                style={{
                  minHeight: 40, padding: "0 18px", borderRadius: 999,
                  background: ready ? C.ink : "#C8D4C5",
                  color: ready ? "#F4F8F0" : "#FAFAF8",
                  fontFamily: F.serif, fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.24em", textTransform: "uppercase",
                  border: "none", cursor: ready ? "pointer" : "not-allowed",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  transition: "background 180ms ease",
                }}>
                {busy ? (t.scoring || "SCORING") : (t.score || "SCORE")}
                {!busy && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M6.5 3L9 6L6.5 9" stroke="currentColor" strokeWidth="1.4"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {fetchError && (
            <div role="alert" style={{
              marginTop: 10,
              fontFamily: F.serif, fontSize: 13, fontStyle: "italic",
              color: "#C05050", lineHeight: 1.4,
            }}>{fetchError}</div>
          )}

          {/* Source chips — decorative; sources known to work */}
          <div style={{
            marginTop: 10,
            display: "flex", gap: 6, flexWrap: "wrap",
          }}>
            {[
              t.sourceGreenhouse  || "Greenhouse",
              t.sourceLinkedIn    || "LinkedIn",
              t.sourceIndeed      || "Indeed",
              t.sourceLever       || "Lever",
              t.sourceCareersPage || "Careers page",
              t.sourceEmailJD     || "Email JD",
            ].map(s => (
              <span key={s} style={{
                padding: "5px 10px", borderRadius: 999,
                background: "transparent", border: `0.5px solid ${C.border}`,
                fontFamily: F.serif, fontSize: 9, fontWeight: 700,
                letterSpacing: "0.18em", color: C.mutedDeep,
                textTransform: "uppercase",
              }}>{s}</span>
            ))}
          </div>

          {/* When a URL won't fetch — source-agnostic tip */}
          <div style={{
            marginTop: 12,
            padding: "10px 12px",
            background: "rgba(184, 134, 11, 0.06)",
            borderLeft: `2px solid ${C.gold}`,
            borderRadius: "0 4px 4px 0",
          }}>
            <div style={{
              fontFamily: F.serif, fontSize: 9, fontWeight: 700,
              letterSpacing: "0.22em", color: C.gold,
              textTransform: "uppercase", marginBottom: 4,
            }}>{t.scoreTipTitle || "WHEN A URL WON'T FETCH"}</div>
            <div style={{
              fontFamily: F.serif, fontSize: 12.5, fontStyle: "italic",
              color: C.ink, lineHeight: 1.45, marginBottom: 8,
              textWrap: "pretty",
            }}>
              {t.scoreTipBody || (
                <>Some sites — LinkedIn, Indeed, certain careers pages — block our reader. Easiest fix: open the listing, tap the <span style={{ fontStyle: "normal", fontWeight: 600 }}>Share</span> button, then choose <span style={{ fontStyle: "normal", fontWeight: 600 }}>Vetted</span> from the share sheet.</>
              )}
            </div>
            <div style={{
              display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0,
              fontFamily: F.serif, fontSize: 9, fontWeight: 700,
              letterSpacing: "0.20em", color: C.muted,
              textTransform: "uppercase",
            }}>
              <StepDot n="1"/>
              <span>{t.scoreTipStep1 || "OPEN THE LISTING"}</span>
              <StepArrow/>
              <StepDot n="2"/>
              <span>{t.scoreTipStep2 || "TAP SHARE"}</span>
              <StepArrow/>
              <StepDot n="3"/>
              <span>{t.scoreTipStep3 || "CHOOSE VETTED"}</span>
            </div>
          </div>

          {/* Empty-state anchor pair — italic editorial weight, pushed to
              the bottom of the available space so it never bumps the tip
              box up against the input slab. */}
          {empty && (
            <div style={{ marginTop: "auto", paddingTop: 16, padding: "16px 4px 0" }}>
              <div style={{
                fontFamily: F.serif, fontSize: 22, color: C.goldDisplay,
                lineHeight: 0.4, marginBottom: 4,
              }}>&ldquo;</div>
              <div key={anchorIdx} style={{
                fontFamily: F.serif, fontStyle: "italic", fontSize: 14,
                lineHeight: 1.45, color: C.ink,
                letterSpacing: "-0.005em", textWrap: "pretty",
                animation: "sf2-pair-fadein 600ms ease",
              }}>{anchor.q}</div>
              <div style={{
                marginTop: 6, paddingRight: 4, textAlign: "right",
                fontFamily: F.serif, fontStyle: "italic", fontSize: 12.5,
                color: C.mutedDeep, lineHeight: 1.45,
              }}>{anchor.a}</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes sf2-pair-fadein { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(body, document.body) : body;
}
