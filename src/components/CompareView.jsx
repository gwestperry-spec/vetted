// ─── CompareView — Side-by-Side Opportunity Comparison ───────────────────────
// Feature #6 of the Vantage Suite. Renders two scored opportunities in a
// dual-column layout with a filter-by-filter score comparison.

const WEIGHT_LABELS = {
  0.5: "Minor", 1.0: "Standard", 1.2: "Relevant",
  1.3: "Important", 1.5: "Critical", 2.0: "Critical +",
};

function scoreColor(score) {
  if (score >= 4) return "var(--success)";
  if (score >= 3) return "var(--gold)";
  return "var(--pass)";
}

function ScoreDots({ score }) {
  const filled = Math.round(score);
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5].map(n => (
        <div key={n} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: n <= filled ? scoreColor(score) : "var(--border)",
        }} />
      ))}
    </div>
  );
}

// ── Single column header ─────────────────────────────────────────────────────
function OppHeader({ t, opp, profile, isWinner, onViewFull }) {
  const sc = opp.overall_score >= 4 ? "high" : opp.overall_score >= profile.threshold ? "mid" : "low";
  const scoreColorClass = { high: "var(--success)", mid: "var(--gold)", low: "var(--pass)" }[sc];
  const recBg = { pursue: "#c8edda", monitor: "var(--warn-bg)", pass: "var(--pass-bg)" };
  const recColor = { pursue: "var(--success)", monitor: "var(--gold)", pass: "var(--pass)" };

  return (
    <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--border)" }}>
      {isWinner && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontFamily: "var(--font-data)", fontSize: 11,
          fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
          background: "var(--accent)", color: "#fff",
          padding: "2px 8px", borderRadius: 20, marginBottom: 8,
        }}>
          ↑ {t.compareHigher}
        </div>
      )}
      <p style={{
        fontFamily: "var(--font-data)", fontSize: 10,
        letterSpacing: ".12em", textTransform: "uppercase",
        color: "var(--muted)", marginBottom: 4, wordBreak: "break-word",
      }}>{opp.company}</p>
      <h2 style={{
        fontFamily: "var(--font-prose)", fontSize: 17,
        fontWeight: 600, lineHeight: 1.25, marginBottom: 12,
        wordBreak: "break-word",
      }}>{opp.role_title}</h2>

      {/* Big score */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
        <span style={{
          fontFamily: "var(--font-data)", fontSize: 44,
          fontWeight: 500, lineHeight: 1, color: scoreColorClass,
        }}>{opp.overall_score.toFixed(1)}</span>
        <span style={{
          fontFamily: "var(--font-data)", fontSize: 10,
          color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase",
        }}>{t.weightedScore}</span>
      </div>

      {/* Recommendation badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", padding: "5px 12px",
        borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: ".06em",
        background: recBg[opp.recommendation] || "#f5f5f0",
        color: recColor[opp.recommendation] || "var(--ink)",
        border: `1.5px solid ${recColor[opp.recommendation] || "var(--border)"}`,
        marginBottom: 10,
      }}>
        {t[opp.recommendation] || opp.recommendation}
      </div>

      <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>
        {t.threshold}: {profile.threshold} — {opp.overall_score >= profile.threshold ? t.aboveThreshold : t.belowThreshold}
      </p>

      <button
        onClick={onViewFull}
        className="btn btn-secondary btn-sm"
        style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
      >
        {t.compareViewFull}
      </button>
    </div>
  );
}

// ── Main CompareView ─────────────────────────────────────────────────────────
export default function CompareView({ t, profile, oppA, oppB, onBack, onViewOpp }) {
  if (!oppA || !oppB) return null;

  const winnerIsA = oppA.overall_score >= oppB.overall_score;

  // Build unified filter list from both opps
  const allFilterIds = [
    ...new Set([
      ...(oppA.filter_scores || []).map(f => f.filter_id),
      ...(oppB.filter_scores || []).map(f => f.filter_id),
    ])
  ];

  const aMap = Object.fromEntries((oppA.filter_scores || []).map(f => [f.filter_id, f]));
  const bMap = Object.fromEntries((oppB.filter_scores || []).map(f => [f.filter_id, f]));

  return (
    <main id="main-content" aria-label={t.compareTitle}>
      <button className="back-link" onClick={onBack}>{t.compareBack}</button>

      <div style={{
        fontFamily: "var(--font-data)", fontSize: 10,
        letterSpacing: ".18em", textTransform: "uppercase",
        color: "var(--muted)", marginBottom: 8,
      }}>
        Vetted Quotient
      </div>
      <h1 style={{
        fontFamily: "var(--font-prose)", fontSize: 24,
        fontWeight: 600, marginBottom: 24, lineHeight: 1.2,
      }}>{t.compareTitle}</h1>

      {/* ── Dual-column header card ── */}
      <div style={{
        background: "#fff", border: "1.5px solid var(--border)",
        borderRadius: "var(--r)", boxShadow: "var(--shadow)",
        display: "grid", gridTemplateColumns: "1fr 1fr",
        marginBottom: 16, overflow: "hidden",
      }}>
        <div style={{ borderRight: "1px solid var(--border)" }}>
          <OppHeader t={t} opp={oppA} profile={profile} isWinner={winnerIsA} onViewFull={() => onViewOpp(oppA)} />
        </div>
        <div>
          <OppHeader t={t} opp={oppB} profile={profile} isWinner={!winnerIsA} onViewFull={() => onViewOpp(oppB)} />
        </div>
      </div>

      {/* ── Score delta bar ── */}
      <div style={{
        background: "#fff", border: "1.5px solid var(--border)",
        borderRadius: "var(--r)", boxShadow: "var(--shadow)",
        padding: "16px 20px", marginBottom: 16,
      }}>
        <p style={{
          fontFamily: "var(--font-data)", fontSize: 11,
          letterSpacing: ".15em", textTransform: "uppercase",
          color: "var(--muted)", marginBottom: 10,
        }}>VQ Delta</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-data)", fontSize: 15, fontWeight: 700, color: winnerIsA ? "var(--success)" : "var(--muted)", minWidth: 32, textAlign: "right" }}>
            {oppA.overall_score.toFixed(1)}
          </span>
          <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
            <div style={{
              position: "absolute", top: 0, height: "100%", borderRadius: 3,
              background: "var(--accent)",
              left: winnerIsA ? "50%" : `${(oppA.overall_score / 5) * 100}%`,
              right: !winnerIsA ? "50%" : `${100 - (oppA.overall_score / 5) * 100}%`,
              width: `${Math.abs(oppA.overall_score - oppB.overall_score) / 5 * 100}%`,
              left: winnerIsA
                ? `${(oppB.overall_score / 5) * 100}%`
                : `${(oppA.overall_score / 5) * 100}%`,
            }} />
            {/* Center line */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1.5, background: "var(--border)" }} />
          </div>
          <span style={{ fontFamily: "var(--font-data)", fontSize: 15, fontWeight: 700, color: !winnerIsA ? "var(--success)" : "var(--muted)", minWidth: 32 }}>
            {oppB.overall_score.toFixed(1)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10, color: "var(--muted)", maxWidth: "45%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{oppA.role_title}</span>
          <span style={{ fontSize: 10, color: "var(--muted)", maxWidth: "45%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{oppB.role_title}</span>
        </div>
      </div>

      {/* ── Strengths & Gaps ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16,
      }}>
        {/* Strengths A */}
        <div style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: "var(--r)", padding: "16px 18px" }}>
          <p style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--success)", marginBottom: 10, fontWeight: 700 }}>
            {t.strengths} — {oppA.role_title}
          </p>
          <ul style={{ paddingLeft: 16 }}>
            {(oppA.strengths || []).map((s, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 4, color: "var(--ink)" }}>{s}</li>)}
          </ul>
          <p style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--pass)", marginTop: 14, marginBottom: 8, fontWeight: 700 }}>
            {t.gaps}
          </p>
          <ul style={{ paddingLeft: 16 }}>
            {(oppA.gaps || []).map((g, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 4, color: "var(--ink)" }}>{g}</li>)}
          </ul>
        </div>
        {/* Strengths B */}
        <div style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: "var(--r)", padding: "16px 18px" }}>
          <p style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--success)", marginBottom: 10, fontWeight: 700 }}>
            {t.strengths} — {oppB.role_title}
          </p>
          <ul style={{ paddingLeft: 16 }}>
            {(oppB.strengths || []).map((s, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 4, color: "var(--ink)" }}>{s}</li>)}
          </ul>
          <p style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--pass)", marginTop: 14, marginBottom: 8, fontWeight: 700 }}>
            {t.gaps}
          </p>
          <ul style={{ paddingLeft: 16 }}>
            {(oppB.gaps || []).map((g, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 4, color: "var(--ink)" }}>{g}</li>)}
          </ul>
        </div>
      </div>

      {/* ── Filter-by-filter breakdown ── */}
      {allFilterIds.length > 0 && (
        <div style={{
          background: "#fff", border: "1.5px solid var(--border)",
          borderRadius: "var(--r)", boxShadow: "var(--shadow)",
          padding: "20px 20px 8px", marginBottom: 16,
        }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 11,
            letterSpacing: ".18em", textTransform: "uppercase",
            color: "var(--muted)", marginBottom: 20, fontWeight: 700,
          }}>{t.filterBreakdown}</p>

          {allFilterIds.map(fid => {
            const fa = aMap[fid];
            const fb = bMap[fid];
            const filterName = fa?.filter_name || fb?.filter_name || fid;
            const scoreA = fa?.score ?? null;
            const scoreB = fb?.score ?? null;
            const weight = fa?.weight || fb?.weight || 1.0;
            const weightLabel = WEIGHT_LABELS[weight];
            const aWins = scoreA !== null && scoreB !== null && scoreA > scoreB;
            const bWins = scoreA !== null && scoreB !== null && scoreB > scoreA;

            return (
              <div key={fid} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--cream)" }}>
                {/* Filter name row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{filterName}</span>
                  {weightLabel && (
                    <span style={{
                      fontFamily: "var(--font-data)", fontSize: 11,
                      fontWeight: 700, color: "var(--muted)", letterSpacing: ".08em",
                    }}>{weightLabel}</span>
                  )}
                </div>

                {/* Score comparison row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  {/* Opp A score */}
                  <div style={{ textAlign: "right" }}>
                    {scoreA !== null ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                          <ScoreDots score={scoreA} />
                        </div>
                        <span style={{
                          fontFamily: "var(--font-data)", fontSize: 20, fontWeight: 500,
                          color: aWins ? scoreColor(scoreA) : "var(--muted)",
                        }}>{scoreA}</span>
                        {aWins && <span style={{ fontSize: 10, marginLeft: 4, color: "var(--success)" }}>↑</span>}
                      </>
                    ) : <span style={{ color: "var(--border)", fontSize: 12 }}>—</span>}
                  </div>
                  {/* vs divider */}
                  <div style={{
                    fontFamily: "var(--font-data)", fontSize: 11,
                    color: "var(--muted)", letterSpacing: ".1em", textAlign: "center",
                  }}>vs</div>
                  {/* Opp B score */}
                  <div style={{ textAlign: "left" }}>
                    {scoreB !== null ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 4 }}>
                          <ScoreDots score={scoreB} />
                        </div>
                        <span style={{
                          fontFamily: "var(--font-data)", fontSize: 20, fontWeight: 500,
                          color: bWins ? scoreColor(scoreB) : "var(--muted)",
                        }}>{scoreB}</span>
                        {bWins && <span style={{ fontSize: 10, marginLeft: 4, color: "var(--success)" }}>↑</span>}
                      </>
                    ) : <span style={{ color: "var(--border)", fontSize: 12 }}>—</span>}
                  </div>
                </div>

                {/* Rationale rows */}
                {(fa?.rationale || fb?.rationale) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>{fa?.rationale || ""}</p>
                    <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>{fb?.rationale || ""}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Action row ── */}
      <div className="btn-actions">
        <button className="btn btn-secondary" onClick={onBack}>{t.compareBack}</button>
      </div>
    </main>
  );
}
