// ── MarketPulseV2.jsx ─────────────────────────────────────────────────────
// Build-30 editorial Market Pulse. Drop-in replacement for the legacy
// MarketPulseCard surface. Personal-cohort briefing:
//
//   1. Cohort plate — dark-ink card echoing the verdict seal. P25 / MEDIAN
//      (gold) / P75 numerals + a horizontal bar pinning the user's floor
//      and target across the cohort distribution. Percentile headline.
//   2. Per-role rollup — every scored role with a min/max range, mini bar
//      drawn on the cohort scale so the user can read each role against
//      the whole. Verdict pill + VQ on the right.
//   3. Live findings — Perplexity Sonar + Robert Half + BLS card list with
//      COMP / HIRING / BENCHMARK / SUPPLY tags + age stamps. Read-only.
//
// Cohort is INFERRED from the user's scored opportunities (jd salary
// ranges are extracted at render time). Findings are fetched from
// /.netlify/functions/market-findings when available, otherwise fall
// back to the fixture so the screen always renders.
//
// Port of design source: ~/Downloads/MarketPulseV2.jsx (May 17). Global
// references (window.MARKET_DATA / MARKET_PROFILE / MARKET_FINDINGS, F.*,
// HamburgerButton, useLocale) have been rewired to real props + util
// imports.

import React, { useEffect, useMemo, useState } from "react";
import { ENDPOINTS } from "../../../config.js";
import { extractSalaryFromJd } from "../../../utils/salaryExtract.js";

// ── Tokens ────────────────────────────────────────────────────────────────
const C = {
  ink:        "#1A2E1A",
  paper:      "#FAFAF8",
  cream:      "#F0F4F0",
  border:     "#D8E8D8",
  accent:     "#3A7A3A",
};
const F = {
  serif: "var(--font-serif)",
  prose: "var(--font-prose)",
  data:  "var(--font-data)",
};
const ON_DARK = {
  ink:      "#EDF2EC",
  soft:     "#C8D4C5",
  mono:     "#7A9A7A",
  eyebrow:  "#5A7A5A",
  border:   "rgba(232,240,232,0.16)",
  goldSoft: "rgba(212,188,82,0.30)",
  goldDot:  "#fbbf24",
};

// ── Fixture: Perplexity Sonar findings (used until backend lands) ─────────
const FINDINGS_FIXTURE = [
  { source: "ROBERT HALF", age: "3D AGO", tag: "COMP",
    h: "Series B ops leadership comp up 8% in Q1.",
    b: "Base-salary bands for VP-grade operations leaders moved up across NYC, SF, and remote postings. The shift is in target, not floor." },
  { source: "PERPLEXITY · SONAR", age: "6D AGO", tag: "HIRING",
    h: "Stripe opened four senior ops roles in NYC this week.",
    b: "Three Directors and one Head of, all metro NYC, all matching your target roles. Public job-board listings; no internal source." },
  { source: "BLS · SOII", age: "2W AGO", tag: "BENCHMARK",
    h: "Operations director median rose to $295k in metro NYC.",
    b: "Up from $278k in 2024Q3. Aligned with the cohort median above. Median is now the line, not a stretch." },
  { source: "PERPLEXITY · SONAR", age: "4D AGO", tag: "SUPPLY",
    h: "HashiCorp ops layoffs ripple into adjacent post-IPO orgs.",
    b: "Four named ex-HashiCorp ops directors have moved into your target cohort. Supply-side competition for the same VP+ roles." },
];

// ══════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════

// Build a row from a real opportunity. Returns null when the JD has no
// extractable salary range — those roles are skipped from the cohort.
function rowFromOpp(opp) {
  const jd = opp.framework_snapshot?.jd || opp.jd || "";
  const range = extractSalaryFromJd(jd);
  if (!range) return null;
  const min = Math.round(range.low / 1000);
  const max = Math.round(range.high / 1000);
  if (min < 30 || max > 1500 || min === max) return null;
  return {
    co:      (opp.company || "—").toUpperCase(),
    title:   opp.role_title || "Untitled",
    min,
    max,
    score:   typeof opp.overall_score === "number" ? opp.overall_score : null,
    verdict: String(opp.recommendation || "").toUpperCase(),
  };
}

function buildCohort(rows, profile) {
  if (!rows.length) return null;
  const all = [];
  rows.forEach(r => { for (let v = r.min; v <= r.max; v += 5) all.push(v); });
  all.sort((a, b) => a - b);
  const q = (p) => all[Math.min(all.length - 1, Math.floor(all.length * p))];
  const cohortLow  = Math.min(...rows.map(r => r.min));
  const cohortHigh = Math.max(...rows.map(r => r.max));
  const p25 = q(0.25);
  const p50 = q(0.50);
  const p75 = q(0.75);
  const floorK  = profile.compensationMin
    ? Math.round(parseFloat(profile.compensationMin) / 1000) : cohortLow;
  const targetK = profile.compensationTarget
    ? Math.round(parseFloat(profile.compensationTarget) / 1000) : p50;
  const below   = all.filter(v => v <= targetK).length;
  const percentile = Math.max(1, Math.round((below / all.length) * 100));
  return {
    cohortLow, cohortHigh, p25, p50, p75,
    userFloor:  floorK,
    userTarget: targetK,
    percentile,
  };
}

function cohortLabel(rows) {
  const titles = [...new Set(rows.map(r => (r.title || "").split(/[,·]/)[0].trim()))]
    .filter(Boolean).slice(0, 3).join(" · ");
  return titles || "Your scored roles";
}

// ══════════════════════════════════════════════════════════════════════════
// Atoms
// ══════════════════════════════════════════════════════════════════════════
function DarkNum({ label, value, sub, big, right }) {
  const size = big ? 40 : 22;
  const color = big ? ON_DARK.goldDot : ON_DARK.ink;
  return (
    <div style={{ textAlign: right ? "right" : (big ? "center" : "left") }}>
      <div style={{
        fontFamily: F.data, fontSize: 8, fontWeight: 500,
        letterSpacing: "0.22em", color: ON_DARK.eyebrow,
        textTransform: "uppercase", marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontFamily: F.prose, fontSize: size, fontWeight: 600,
        color, lineHeight: 1, letterSpacing: "-0.025em",
      }}>{value}<span style={{
        fontSize: big ? 17 : 11, color: ON_DARK.mono, marginLeft: 1,
      }}>{sub}</span></div>
    </div>
  );
}

function CohortBar({ cohort }) {
  const span = Math.max(1, cohort.cohortHigh - cohort.cohortLow);
  const pct = v => Math.max(0, Math.min(100, ((v - cohort.cohortLow) / span) * 100));
  return (
    <div style={{ position: "relative", height: 18 }}>
      <div style={{
        position: "absolute", top: 8, left: 0, right: 0, height: 2,
        background: ON_DARK.border, borderRadius: 1,
      }}/>
      <div style={{
        position: "absolute", top: 7, height: 4,
        left: `${pct(cohort.p25)}%`, width: `${pct(cohort.p75) - pct(cohort.p25)}%`,
        background: ON_DARK.goldSoft, borderRadius: 2,
      }}/>
      <div style={{
        position: "absolute", top: 4, height: 10, width: 1,
        left: `${pct(cohort.p50)}%`, background: ON_DARK.soft,
        transform: "translateX(-0.5px)",
      }}/>
      <div style={{
        position: "absolute", top: 5, height: 8, width: 2,
        left: `${pct(cohort.userFloor)}%`, background: ON_DARK.soft,
        transform: "translateX(-1px)", opacity: 0.7, borderRadius: 1,
      }}/>
      <div style={{
        position: "absolute", top: 2, height: 14, width: 3,
        left: `${pct(cohort.userTarget)}%`, background: ON_DARK.goldDot,
        transform: "translateX(-1.5px)",
        boxShadow: "0 0 0 2px rgba(15,31,15,0.85)", borderRadius: 1,
      }}/>
    </div>
  );
}

function VerdictDot({ verdict, vq }) {
  const tone =
    verdict === "PURSUE"  ? { bg: "#EAF3DE", fg: "#27500A" } :
    verdict === "MONITOR" ? { bg: "#FAEEDA", fg: "#633806" } :
                            { bg: "#F8ECEC", fg: "#C05050" };
  return (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
      {vq != null && (
        <span style={{
          fontFamily: F.prose, fontSize: 13, fontWeight: 600,
          color: C.ink, letterSpacing: "-0.01em",
        }}>{vq}</span>
      )}
      {verdict && (
        <span style={{
          padding: "2px 8px", borderRadius: 20,
          background: tone.bg, color: tone.fg,
          fontFamily: F.data, fontSize: 8.5, fontWeight: 500,
          letterSpacing: "0.20em", textTransform: "uppercase",
        }}>{verdict}</span>
      )}
    </div>
  );
}

function RoleRow({ row, cohortLow, cohortHigh, target, last }) {
  const span = Math.max(1, cohortHigh - cohortLow);
  const pct = v => Math.max(0, Math.min(100, ((v - cohortLow) / span) * 100));
  const median = (row.min + row.max) / 2;
  return (
    <li style={{
      padding: "14px 0",
      borderBottom: last ? "none" : `0.5px solid ${C.border}`,
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 4,
      }}>
        <div style={{
          fontFamily: F.data, fontSize: 9, fontWeight: 500,
          letterSpacing: "0.20em", color: "#8A9A8A", textTransform: "uppercase",
        }}>{row.co}</div>
        <VerdictDot verdict={row.verdict} vq={row.score != null ? row.score.toFixed(1) : null}/>
      </div>
      <div style={{
        fontFamily: F.prose, fontSize: 15, fontWeight: 600,
        color: C.ink, lineHeight: 1.25, marginBottom: 10,
        letterSpacing: "-0.01em",
      }}>{row.title}</div>
      <div style={{ position: "relative", height: 14, width: "100%" }}>
        <div style={{
          position: "absolute", top: 6.5, left: 0, right: 0, height: 0.5,
          background: C.border,
        }}/>
        <div style={{
          position: "absolute", top: 4, height: 4,
          left: `${pct(row.min)}%`, width: `${pct(row.max) - pct(row.min)}%`,
          background: C.cream, border: `0.5px solid ${C.border}`,
          borderRadius: 2,
        }}/>
        <div style={{
          position: "absolute", top: 2.5, height: 7, width: 1,
          left: `${pct(median)}%`, background: C.ink,
          transform: "translateX(-0.5px)",
        }}/>
        <div style={{
          position: "absolute", top: 1, height: 10, width: 2,
          left: `${pct(target)}%`, background: "#fbbf24",
          transform: "translateX(-1px)",
          boxShadow: `0 0 0 2px ${C.paper}`,
        }}/>
      </div>
      <div style={{
        marginTop: 8, display: "flex", justifyContent: "space-between",
        fontFamily: F.prose, fontSize: 11.5, color: "#8A9A8A",
      }}>
        <span>${row.min}k</span>
        <span style={{
          fontWeight: 600, color: C.ink, fontFamily: F.data, fontSize: 10,
          letterSpacing: "0.12em",
        }}>${Math.round(median)}k · MED</span>
        <span>${row.max}k</span>
      </div>
    </li>
  );
}

function SectionHead({ label, tail, gutter = 20 }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
      padding: `0 ${gutter}px`,
    }}>
      <div style={{
        fontFamily: F.data, fontSize: 9, fontWeight: 500,
        letterSpacing: "0.24em", color: C.ink, textTransform: "uppercase",
      }}>{label}</div>
      <div style={{ flex: 1, height: 0.5, background: C.border }}/>
      {tail && <div style={{
        fontFamily: F.data, fontSize: 9, fontWeight: 400, fontStyle: "italic",
        letterSpacing: "0.18em", color: "#8A9A8A", textTransform: "uppercase",
      }}>{tail}</div>}
    </div>
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

// ══════════════════════════════════════════════════════════════════════════
// MarketPulseV2 — Personal-cohort briefing screen
//
// Props:
//   opportunities  array of scored opportunity objects
//   profile        live profile (compensationMin/compensationTarget)
//   authUser       { id, sessionToken } — used for findings fetch
//   onOpenMenu     hamburger handler
//   t              translations
// ══════════════════════════════════════════════════════════════════════════
export default function MarketPulseV2({
  opportunities = [],
  profile = {},
  authUser,
  onOpenMenu,
  t = {},
}) {
  // Build cohort rows from real opps. Memoized so re-renders don't redo
  // the JD regex when the data didn't change.
  const rows = useMemo(() => {
    return opportunities
      .map(rowFromOpp)
      .filter(Boolean)
      .slice(0, 20);
  }, [opportunities]);

  const cohort = useMemo(() => buildCohort(rows, profile), [rows, profile]);
  const description = useMemo(() => cohortLabel(rows), [rows]);

  // Findings fetch — backend may not exist yet; fall back to fixture.
  const [findings, setFindings] = useState(FINDINGS_FIXTURE);
  useEffect(() => {
    if (!authUser?.id || !ENDPOINTS.marketFindings) return;
    let cancelled = false;
    fetch(ENDPOINTS.marketFindings, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appleId:       authUser.id,
        sessionToken:  authUser.sessionToken || "",
        targetRoles:   profile.targetRoles || [],
        targetIndustries: profile.targetIndustries || [],
        locations:     profile.locationPrefs || [],
      }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data?.findings) && data.findings.length) {
          setFindings(data.findings);
        }
      })
      .catch(() => { /* keep fixture on error */ });
    return () => { cancelled = true; };
  }, [authUser?.id, profile.targetRoles?.length, profile.targetIndustries?.length]);

  // Empty cohort — fall back to a soft message so the screen always renders.
  if (!cohort) {
    return (
      <div style={{
        position: "absolute", inset: 0, background: C.paper,
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <header style={{
          flex: "0 0 auto", padding: "54px 8px 0 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{
            fontFamily: F.data, fontSize: 11, letterSpacing: "0.18em",
            color: C.ink, textTransform: "uppercase",
          }}>VETTED</div>
          <HamburgerButton onClick={onOpenMenu}/>
        </header>
        <div style={{ padding: "20px 20px 8px", flex: 1 }}>
          <div style={{
            fontFamily: F.data, fontSize: 9, fontWeight: 500,
            letterSpacing: "0.24em", color: "#8A9A8A",
            textTransform: "uppercase", marginBottom: 12,
          }}>{t.mpEyebrow || "PULSE · YOUR MARKET"}</div>
          <h1 style={{
            margin: 0, fontFamily: F.prose, fontSize: 24, fontWeight: 600,
            color: C.ink, lineHeight: 1.2, letterSpacing: "-0.02em",
          }}>{t.mpEmptyTitle || "Score a few roles first."}</h1>
          <p style={{
            marginTop: 12, fontFamily: F.prose, fontStyle: "italic",
            fontSize: 14, color: "#5A6A5A", lineHeight: 1.5,
          }}>{t.mpEmptyBody || "Pulse builds your cohort from job postings with disclosed salary. Once a few roles you've scored carry comp ranges, the plate fills out here."}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "absolute", inset: 0, background: C.paper,
      overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <header style={{
        flex: "0 0 auto", padding: "54px 8px 0 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          fontFamily: F.data, fontSize: 11, letterSpacing: "0.18em",
          color: C.ink, textTransform: "uppercase",
        }}>VETTED</div>
        <HamburgerButton onClick={onOpenMenu}/>
      </header>

      {/* Scrolling body */}
      <div style={{ flex: 1, overflow: "auto", paddingBottom: 100 }}>

        {/* Lead — eyebrow + percentile headline + italic gestalt */}
        <div style={{ padding: "20px 20px 8px" }}>
          <div style={{
            fontFamily: F.data, fontSize: 9, fontWeight: 500,
            letterSpacing: "0.24em", color: "#8A9A8A",
            textTransform: "uppercase", marginBottom: 12,
          }}>{t.mpEyebrow || "PULSE · YOUR MARKET"}</div>
          <h1 style={{
            margin: 0, fontFamily: F.prose, fontSize: 28, fontWeight: 600,
            color: C.ink, lineHeight: 1.12, letterSpacing: "-0.02em",
          }}>{(t.mpHeadlinePrefix || "Your target lands at the ")}{cohort.percentile}<sup style={{
            fontSize: 16, fontWeight: 400, letterSpacing: "0",
          }}>{t.mpOrdinalTh || "th"}</sup>{(t.mpHeadlineSuffix || ".")}</h1>
          <div style={{
            marginTop: 10, fontFamily: F.prose, fontStyle: "italic",
            fontSize: 14.5, color: "#5A6A5A", lineHeight: 1.45,
            textWrap: "pretty",
          }}>{(t.mpGestaltPrefix || "Across ")}{rows.length}{(t.mpGestaltSuffix || " roles you've scored. The market is paying for what you're optimizing for.")}</div>
        </div>

        {/* Cohort plate */}
        <div style={{
          position: "relative", margin: "14px 16px 4px",
          padding: "20px 22px 22px",
          borderRadius: 14, overflow: "hidden",
          background: C.ink,
        }}>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(120% 130% at 70% 0%, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0.04) 30%, transparent 60%)",
          }}/>

          <div style={{
            position: "relative", display: "flex", alignItems: "baseline",
            justifyContent: "space-between", marginBottom: 14,
          }}>
            <div style={{
              fontFamily: F.data, fontSize: 9, fontWeight: 500,
              letterSpacing: "0.24em", color: ON_DARK.goldDot,
              textTransform: "uppercase",
            }}>{t.mpYourCohort || "YOUR COHORT"}</div>
            <div style={{
              fontFamily: F.data, fontSize: 9, fontWeight: 400, fontStyle: "italic",
              letterSpacing: "0.18em", color: ON_DARK.eyebrow,
              textTransform: "uppercase",
            }}>{rows.length} {t.mpRolesSources || "ROLES · 3 SOURCES"}</div>
          </div>

          <div style={{
            position: "relative", fontFamily: F.prose,
            fontStyle: "italic", fontSize: 13, lineHeight: 1.4,
            color: ON_DARK.soft, marginBottom: 18,
          }}>{description}</div>

          <div style={{
            position: "relative", display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr",
            alignItems: "end", gap: 6, marginBottom: 16,
          }}>
            <DarkNum label="P25"    value={`$${cohort.p25}`} sub="k"/>
            <DarkNum label={t.mpMedian || "MEDIAN"} value={`$${cohort.p50}`} sub="k" big/>
            <DarkNum label="P75"    value={`$${cohort.p75}`} sub="k" right/>
          </div>

          <div style={{ position: "relative", marginTop: 8 }}>
            <CohortBar cohort={cohort}/>
            <div style={{
              marginTop: 12, display: "flex", justifyContent: "space-between",
              fontFamily: F.data, fontSize: 9, fontWeight: 500,
              letterSpacing: "0.20em", color: ON_DARK.eyebrow,
              textTransform: "uppercase",
            }}>
              <span>${cohort.cohortLow}k</span>
              <span style={{ color: ON_DARK.goldDot }}>
                {t.mpYourTarget || "YOUR TARGET"} · ${cohort.userTarget}k · {cohort.percentile}<sup style={{ fontSize: 7 }}>{(t.mpOrdinalTh || "th").toUpperCase()}</sup>
              </span>
              <span>${cohort.cohortHigh}k</span>
            </div>
          </div>
        </div>

        {/* Per-role rollup */}
        <section style={{ marginTop: 24 }}>
          <SectionHead label={t.mpRolesScored || "ROLES YOU'VE SCORED"} tail={`${t.mpLastN || "LAST"} ${rows.length}`}/>
          <ul style={{ margin: 0, padding: "0 20px", listStyle: "none" }}>
            {rows.map((r, i) => (
              <RoleRow key={`${r.co}-${r.title}-${i}`} row={r}
                cohortLow={cohort.cohortLow} cohortHigh={cohort.cohortHigh}
                target={cohort.userTarget}
                last={i === rows.length - 1}/>
            ))}
          </ul>
        </section>

        {/* Live findings */}
        <section style={{ marginTop: 28 }}>
          <SectionHead label={t.mpLiveFindings || "LIVE FINDINGS"} tail={t.mpSonarWeb || "SONAR · WEB"}/>
          <ul style={{ margin: 0, padding: "0 20px", listStyle: "none",
            display: "flex", flexDirection: "column", gap: 14 }}>
            {findings.map((f, i) => (
              <li key={i} style={{
                padding: "14px 16px", borderRadius: 12,
                border: `0.5px solid ${C.border}`,
                background: C.cream,
              }}>
                <div style={{
                  display: "flex", alignItems: "baseline", justifyContent: "space-between",
                  gap: 8, marginBottom: 6,
                }}>
                  <div style={{
                    fontFamily: F.data, fontSize: 8.5, fontWeight: 500,
                    letterSpacing: "0.22em", color: C.accent, textTransform: "uppercase",
                  }}>{f.tag} · {f.source}</div>
                  <div style={{
                    fontFamily: F.data, fontSize: 8.5, fontWeight: 400, fontStyle: "italic",
                    letterSpacing: "0.16em", color: "#8A9A8A", textTransform: "uppercase",
                  }}>{f.age}</div>
                </div>
                <div style={{
                  fontFamily: F.prose, fontSize: 15, fontWeight: 600,
                  color: C.ink, lineHeight: 1.3, letterSpacing: "-0.01em",
                  marginBottom: 6, textWrap: "pretty",
                }}>{f.h}</div>
                <div style={{
                  fontFamily: F.prose, fontSize: 13, color: "#5A6A5A",
                  lineHeight: 1.5, textWrap: "pretty",
                }}>{f.b}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* Sources footer */}
        <section style={{ marginTop: 28, padding: "0 20px" }}>
          <SectionHead label={t.mpSources || "SOURCES"} gutter={0}/>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {["Robert Half", "Kinsa · BLS", "Perplexity Sonar"].map(s => (
              <span key={s} style={{
                padding: "6px 12px", borderRadius: 20,
                background: C.paper, border: `0.5px solid ${C.border}`,
                fontFamily: F.prose, fontSize: 12.5, color: C.ink,
              }}>{s}</span>
            ))}
          </div>
          <p style={{
            margin: "0 0 24px", fontFamily: F.prose, fontStyle: "italic",
            fontSize: 12.5, color: "#8A9A8A", lineHeight: 1.5,
          }}>{t.mpSourcesBlurb || "Cohort modelling pulls from Robert Half and BLS percentile bands. Live findings query Perplexity Sonar against your target roles, industries, and metros. Read-only — adjustments live in your profile."}</p>
        </section>
      </div>
    </div>
  );
}
