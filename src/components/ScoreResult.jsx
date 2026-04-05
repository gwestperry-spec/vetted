const WEIGHT_OPTIONS = [
  { value: 0.5, label: "Minor" },
  { value: 1.0, label: "Standard" },
  { value: 1.2, label: "Relevant" },
  { value: 1.3, label: "Important" },
  { value: 1.5, label: "Critical" },
  { value: 2.0, label: "Critical +" },
];

export default function ScoreResult({ t, opp, profile, onBack, onRemove }) {
  if (!opp) return null;
  const sc = opp.overall_score >= 4 ? "high" : opp.overall_score >= profile.threshold ? "mid" : "low";

  return (
    <main id="main-content" aria-label={opp.role_title}>
      <button className="back-link" onClick={onBack}>{t.backDash}</button>
      <article aria-labelledby="result-title">
        <div className="card">
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{opp.company}</p>
          <h1 className="card-title" id="result-title" style={{ fontSize: 26 }}>{opp.role_title}</h1>
          <div className="overall-score-display">
            <div className={`big-score ${sc}`} aria-label={`${t.weightedScore}: ${opp.overall_score.toFixed(1)}`}>{opp.overall_score.toFixed(1)}</div>
            <div className="score-meta">
              <p className="score-meta-label">{t.weightedScore}</p>
              <span className={`recommendation-badge rec-${opp.recommendation}`}>{t[opp.recommendation] || opp.recommendation}</span>
              <p className="threshold-note">{t.threshold}: {profile.threshold} — {opp.overall_score >= profile.threshold ? t.aboveThreshold : t.belowThreshold}</p>
            </div>
          </div>
          <div className="narrative-box" role="note"><strong>{t.recRationale}</strong>{opp.recommendation_rationale}</div>
          <div className="narrative-box" style={{ borderLeftColor: "var(--gold)" }} role="note"><strong>{t.honestFit}</strong>{opp.honest_fit_summary}</div>
        </div>

        <div className="fit-grid">
          <section className="fit-box fit-strength" aria-labelledby="str-heading">
            <h2 id="str-heading"><strong>{t.strengths}</strong></h2>
            <ul>{(opp.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
          <section className="fit-box fit-gap" aria-labelledby="gap-heading">
            <h2 id="gap-heading"><strong>{t.gaps}</strong></h2>
            <ul>{(opp.gaps || []).map((g, i) => <li key={i}>{g}</li>)}</ul>
          </section>
        </div>

        <section className="card" aria-labelledby="filter-bd-heading">
          <h2 id="filter-bd-heading" className="section-label">{t.filterBreakdown}</h2>
          {(opp.filter_scores || []).map(fs => {
            const filled = Math.round(fs.score);
            const col = fs.score >= 4 ? "var(--success)" : fs.score >= 3 ? "var(--gold)" : "var(--accent)";
            return (
              <div key={fs.filter_id} className="filter-row">
                <div className="filter-header">
                  <span className="filter-name" id={`fn-${fs.filter_id}`}>{fs.filter_name}</span>
                  <div className="filter-score-dots" aria-hidden="true">
                    {[1,2,3,4,5].map(n => <div key={n} className={`dot ${n <= filled ? (fs.score >= 4 ? "gold" : "filled") : ""}`} />)}
                  </div>
                  <span className="filter-score-num" style={{ color: col }} aria-label={`${t.scoreLabel}: ${fs.score} ${t.outOf}`}>{fs.score}/5</span>
                  {fs.weight && fs.weight !== 1.0 && (
                    <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace" }}>
                      {WEIGHT_OPTIONS.find(w => w.value === fs.weight)?.label || `${fs.weight}×`}
                    </span>
                  )}
                </div>
                <div className="score-bar-wrap" role="progressbar" aria-valuenow={fs.score} aria-valuemin={1} aria-valuemax={5} aria-labelledby={`fn-${fs.filter_id}`}>
                  <div className="score-bar-fill" style={{ width: `${(fs.score / 5) * 100}%`, background: col }} />
                </div>
                <p className="filter-rationale">{fs.rationale}</p>
              </div>
            );
          })}
        </section>

        {opp.narrative_bridge && (
          <section className="card" aria-labelledby="bridge-heading">
            <h2 id="bridge-heading" className="card-title" style={{ fontSize: 16 }}>{t.narrativeBridge}</h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>{opp.narrative_bridge}</p>
          </section>
        )}

        <div className="btn-actions" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-secondary" onClick={onBack}>{t.backDash}</button>
          <button className="btn btn-danger btn-sm" onClick={onRemove}>{t.removeOpp}</button>
        </div>
      </article>
    </main>
  );
}
