// Vetted — Score Entry screen (SCORE tab)
// Editorial input + THIS WEEK KPI strip + Pursue Cohort.

import { useState } from "react";

export default function ScoreEntry({
  onScore,
  loading = false,
  workspaceRoles = [],
  onOpenMenu,
  t = {},
}) {
  const [val, setVal] = useState("");
  const isUrl  = /^https?:\/\//i.test(val.trim());
  const ready  = val.trim().length > 12 && !loading;

  // Derive THIS WEEK KPIs from workspace roles scored in last 7 days
  const now = Date.now();
  const weekRoles = workspaceRoles.filter(r =>
    r.vq_score != null && r.created_at &&
    (now - new Date(r.created_at).getTime()) < 7 * 24 * 3600 * 1000
  );
  const avgVq = weekRoles.length
    ? (weekRoles.reduce((s, r) => s + r.vq_score, 0) / weekRoles.length).toFixed(1)
    : "—";
  const pursueCount  = weekRoles.filter(r => r.framework_snapshot?.recommendation === "pursue").length;
  const pursueRate   = weekRoles.length ? Math.round((pursueCount / weekRoles.length) * 100) + "%" : "—";

  function handleSubmit() {
    if (!ready) return;
    onScore(val, isUrl ? val.trim() : "");
    setVal("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && e.metaKey) handleSubmit();
  }

  return (
    <div style={{
      background: "var(--paper)",
      display: "flex", flexDirection: "column",
      minHeight: "100%",
    }}>
      {/* Header */}
      <div style={{ flexShrink: 0 }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 8px 6px 16px",
        }}>
          <span style={{
            fontFamily: "var(--font-data)", fontSize: 11,
            letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink)",
          }}>VETTED</span>
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              aria-label="Open menu"
              style={{
                width: 44, height: 44, display: "inline-flex",
                alignItems: "center", justifyContent: "center",
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--ink)", padding: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <line x1="3.5" y1="7"  x2="18.5" y2="7"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="3.5" y1="11" x2="18.5" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="3.5" y1="15" x2="18.5" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </header>

        {/* Title block */}
        <div style={{ padding: "14px 16px 22px" }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--muted)", marginBottom: 10,
          }}>SCORE · NEW OPPORTUNITY</p>
          <h1 style={{
            fontFamily: "var(--font-prose)", fontSize: 24, fontWeight: 500,
            color: "var(--ink)", lineHeight: 1.2, margin: 0,
            letterSpacing: "-0.005em",
          }}>Run a role through your filter framework.</h1>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 110 }}>
        {/* Big input card */}
        <div style={{ padding: "0 16px 8px" }}>
          <div style={{
            background: "var(--cream)",
            borderRadius: 14,
            border: `0.5px solid ${val ? "#A8B8A5" : "var(--border)"}`,
            padding: "16px 16px 14px",
            transition: "border-color 200ms ease",
          }}>
            <textarea
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste a job description, or drop a Greenhouse / LinkedIn URL…"
              rows={6}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "transparent", border: "none", outline: "none",
                fontFamily: "var(--font-prose)", fontSize: 15, color: "var(--ink)",
                lineHeight: 1.5, resize: "none", minHeight: 120,
              }}
            />
            {/* Input footer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, marginTop: 6, paddingTop: 10,
              borderTop: "0.5px solid var(--border)",
            }}>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em",
                color: "#8A9A8A", textTransform: "uppercase",
              }}>
                {!val
                  ? "AUTO-DETECTS URL OR TEXT"
                  : isUrl
                  ? "↳ URL DETECTED"
                  : `↳ ${val.trim().split(/\s+/).length} WORDS`}
              </div>
              <button
                disabled={!ready}
                onClick={handleSubmit}
                style={{
                  minHeight: 40, padding: "0 18px", borderRadius: 999,
                  background: ready ? "var(--ink)" : "#C8D4C5",
                  color: ready ? "#F4F8F0" : "#FAFAF8",
                  fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 500,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  border: "none", cursor: ready ? "pointer" : "not-allowed",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  transition: "background 180ms ease",
                }}
              >
                {loading ? (
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} aria-hidden="true" />
                ) : (
                  <>
                    SCORE
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <path d="M6.5 3L9 6L6.5 9" stroke="currentColor" strokeWidth="1.4"
                            strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Source chips */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Greenhouse", "LinkedIn", "Lever", "Email JD"].map(s => (
              <span key={s} style={{
                padding: "6px 11px", borderRadius: 999,
                background: "transparent", border: "0.5px solid var(--border)",
                fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.12em",
                color: "var(--score-pass)", textTransform: "uppercase",
              }}>{s}</span>
            ))}
          </div>

          {/* LinkedIn note */}
          <div style={{
            marginTop: 14, padding: "12px 14px",
            background: "rgba(138,106,16,0.06)",
            borderLeft: "2px solid var(--gold)",
            borderRadius: "0 4px 4px 0",
          }}>
            <div style={{
              fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em",
              color: "var(--gold)", textTransform: "uppercase", fontWeight: 500, marginBottom: 6,
            }}>FROM LINKEDIN</div>
            <div style={{
              fontFamily: "var(--font-prose)", fontSize: 13, fontStyle: "italic",
              color: "var(--ink)", lineHeight: 1.45, marginBottom: 8,
            }}>
              LinkedIn blocks our reader, so the URL won't fetch. Easiest fix — long-press the job description, tap{" "}
              <span style={{ fontStyle: "normal", fontWeight: 500 }}>Copy</span>, then paste here.
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap",
              fontFamily: "var(--font-data)", fontSize: 9.5, letterSpacing: "0.10em",
              color: "var(--muted)", textTransform: "uppercase", fontWeight: 500,
            }}>
              <StepDot n="1"/><span>OPEN ON LINKEDIN</span>
              <StepArrow/>
              <StepDot n="2"/><span>LONG-PRESS · COPY</span>
              <StepArrow/>
              <StepDot n="3"/><span>PASTE HERE</span>
            </div>
          </div>
        </div>

        {/* THIS WEEK KPI strip */}
        <div style={{
          marginTop: 28, padding: "14px 16px 6px",
          borderTop: "0.5px solid var(--border)",
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
        }}>
          <div style={{
            fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.16em",
            color: "var(--ink)", textTransform: "uppercase", fontWeight: 500,
          }}>THIS WEEK</div>
          <div style={{
            fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.12em",
            color: "#8A9A8A", textTransform: "uppercase",
          }}>VS. STLW</div>
        </div>

        <div style={{ padding: "4px 16px 18px", display: "flex", gap: 6 }}>
          <KpiTile big={avgVq}           delta={null}   label="AVG VQ"/>
          <KpiTile big={String(weekRoles.length)} delta={null}   label="SCORED"/>
          <KpiTile big={pursueRate}       delta={null}   label="PURSUE"/>
        </div>

        {/* PURSUE COHORT */}
        {weekRoles.length > 0 && (
          <>
            <div style={{
              padding: "10px 16px 6px",
              borderTop: "0.5px solid var(--border)",
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
            }}>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.16em",
                color: "var(--ink)", textTransform: "uppercase", fontWeight: 500,
              }}>PURSUE COHORT</div>
              <div style={{
                fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.12em",
                color: "#8A9A8A", textTransform: "uppercase",
              }}>{pursueCount} ROLE{pursueCount !== 1 ? "S" : ""}</div>
            </div>
            <div style={{ padding: "4px 16px 22px" }}>
              {workspaceRoles
                .filter(r => r.framework_snapshot?.recommendation === "pursue" && r.vq_score != null)
                .slice(0, 4)
                .map((r, i, arr) => (
                  <div key={r.role_id} style={{
                    padding: "12px 0",
                    borderBottom: i === arr.length - 1 ? "none" : "0.5px solid var(--border)",
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <div style={{
                      width: 38, flexShrink: 0, textAlign: "right",
                      fontFamily: "var(--font-prose)", fontSize: 20, fontWeight: 500,
                      color: "var(--score-high)", lineHeight: 1, letterSpacing: "-0.01em",
                    }}>{Number(r.vq_score).toFixed(1)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "var(--font-prose)", fontSize: 14, fontWeight: 500,
                        color: "var(--ink)", lineHeight: 1.2,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{r.title || "Untitled"}</div>
                      <div style={{
                        fontFamily: "var(--font-data)", fontSize: 9, color: "#8A9A8A",
                        letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2,
                      }}>{(r.company || "").toUpperCase()}</div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiTile({ big, delta, label }) {
  const positive = delta && delta.startsWith("+");
  const deltaColor = positive ? "var(--accent)" : "#8A9A8A";
  return (
    <div style={{
      flex: 1, padding: "12px 12px 10px",
      background: "var(--cream)", borderRadius: 10,
      border: "0.5px solid var(--border)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <div style={{
          fontFamily: "var(--font-prose)", fontSize: 24, fontWeight: 500,
          color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.01em",
        }}>{big}</div>
        {delta && (
          <div style={{
            fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 500,
            color: deltaColor, letterSpacing: "0.04em",
          }}>{delta}</div>
        )}
      </div>
      <div style={{
        fontFamily: "var(--font-data)", fontSize: 8.5, letterSpacing: "0.14em",
        color: "#8A9A8A", textTransform: "uppercase",
      }}>{label}</div>
    </div>
  );
}

function StepDot({ n }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: 999,
      border: "0.5px solid var(--muted)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-data)", fontSize: 9, color: "var(--muted)",
      marginRight: 6, flexShrink: 0,
    }}>{n}</div>
  );
}

function StepArrow() {
  return (
    <span style={{ margin: "0 8px", color: "#B5BFB5", fontFamily: "var(--font-data)", fontSize: 11 }}>→</span>
  );
}
