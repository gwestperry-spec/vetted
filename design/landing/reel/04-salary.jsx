// Reel 04 — Salary Truthing
// JD: CFO · Marigold Health (Series D)
// Cinematic device: market distribution curve renders, comp band drops in,
// the offer lands as a pin. Honest verdict — over or under market?

const { C, F, lerp, E, JDs, Act0HandShot, EndCard } = window.VETTED;
const W = 1080, H = 1920, D = 15;
const T1 = 0;     // curve enters
const T2 = 3;     // curve renders
const T3 = 7;     // comp band drops
const T4 = 10;    // pin lands + verdict
const T5 = 13;    // CTA

const JD = JDs.cfo;

// Distribution: bell-ish curve with samples at key percentiles.
// Range: $260k → $520k, peak around $385k. Offer band is $340–410k.
// The "honest" verdict: median is $395k, offer midpoint is $375k → 5% below.
function curveY(x) {
  // x in 0..1, returns y in 0..1 (height fraction)
  const peak = 0.55;
  const sigma = 0.18;
  return Math.exp(-Math.pow((x - peak) / sigma, 2));
}

function CurvePhase() {
  const t = window.useTime();
  if (t < T1 - 0.2) return null;
  const lt = t - T1;

  // Background fade in
  const bgK = window.clamp(lt / 0.6, 0, 1);

  // Curve draws between T2 and T3
  const curveK = window.clamp((lt - (T2 - T1)) / 2.2, 0, 1);
  const curveE = E.io(curveK);

  // Comp band drops at T3
  const bandK = window.clamp((lt - (T3 - T1)) / 0.8, 0, 1);
  const bandE = E.out(bandK);

  // Pin lands at T4
  const pinK = window.clamp((lt - (T4 - T1)) / 0.5, 0, 1);
  const pinE = E.oe(pinK);

  // Verdict
  const verdictK = window.clamp((lt - (T4 - T1) - 0.6) / 0.5, 0, 1);

  // CTA
  const ctaK = window.clamp((lt - (T5 - T1)) / 0.6, 0, 1);

  // Layout: curve fills middle 50% of screen vertically
  const chartTop = 540;
  const chartH = 700;
  const chartLeft = 80;
  const chartW = W - 160;

  // Build the SVG path for the curve, animated drawing
  const samples = 80;
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const x = i / samples;
    const y = curveY(x);
    const px = chartLeft + x * chartW;
    const py = chartTop + chartH - y * chartH * 0.85 - 30;
    pts.push([px, py]);
  }
  // Animate: only show pts up to curveE
  const showCount = Math.floor(pts.length * curveE);
  const pathPts = pts.slice(0, Math.max(2, showCount));
  const pathD = pathPts.map((p, i) => (i === 0 ? `M${p[0]} ${p[1]}` : `L${p[0]} ${p[1]}`)).join(' ');
  // Filled area under curve
  const areaD = showCount > 1
    ? `${pathD} L${pathPts[pathPts.length - 1][0]} ${chartTop + chartH} L${pathPts[0][0]} ${chartTop + chartH} Z`
    : '';

  // Comp band: $340–410k → x positions
  // Map $260 → 0, $520 → 1
  const compToX = (k) => (k - 260) / (520 - 260);
  const bandLeftX = chartLeft + compToX(340) * chartW;
  const bandRightX = chartLeft + compToX(410) * chartW;
  const offerMid = 375;
  const offerX = chartLeft + compToX(offerMid) * chartW;
  const medianX = chartLeft + compToX(395) * chartW;

  // Pin Y: at the curve at that x
  const offerCurveY = chartTop + chartH - curveY(compToX(offerMid)) * chartH * 0.85 - 30;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.paper,
      opacity: bgK,
      overflow: 'hidden',
    }}>
      {/* Eyebrow */}
      <div style={{
        position: 'absolute', top: 140, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.data, fontSize: 22, letterSpacing: '0.32em',
        color: C.mute, fontWeight: 500,
      }}>VETTED · MARKET</div>

      {/* Title */}
      <div style={{
        position: 'absolute', top: 200, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.serif, fontSize: 56, lineHeight: 1.15,
        color: C.ink, letterSpacing: '-0.015em',
        padding: '0 80px',
      }}>
        CFO · Series D · NYC/Boston
      </div>
      <div style={{
        position: 'absolute', top: 290, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.serif, fontStyle: 'italic', fontSize: 30,
        color: C.mute,
      }}>
        18 sources · 142 comparable comps
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
      }}>
        {/* X-axis baseline */}
        <line x1={chartLeft} y1={chartTop + chartH - 30}
              x2={chartLeft + chartW} y2={chartTop + chartH - 30}
              stroke={C.border} strokeWidth="1.5"/>

        {/* X-axis tick marks at $300, $400, $500 */}
        {[300, 350, 400, 450, 500].map(k => {
          const x = chartLeft + compToX(k) * chartW;
          return (
            <g key={k}>
              <line x1={x} y1={chartTop + chartH - 30}
                    x2={x} y2={chartTop + chartH - 22}
                    stroke={C.mute}/>
              <text x={x} y={chartTop + chartH + 4}
                    fontFamily={F.data} fontSize="20" fill={C.mute}
                    textAnchor="middle" letterSpacing="0.08em">
                ${k}k
              </text>
            </g>
          );
        })}

        {/* Filled area */}
        {areaD && <path d={areaD} fill={C.accent} fillOpacity={0.12}/>}
        {/* Curve line */}
        {pathD && <path d={pathD} fill="none" stroke={C.accent} strokeWidth="2.5"/>}

        {/* Comp band */}
        {bandK > 0 && (
          <g opacity={bandE}>
            <rect x={bandLeftX} y={chartTop + 40}
                  width={(bandRightX - bandLeftX) * bandE}
                  height={chartH - 70}
                  fill={C.gold} fillOpacity={0.18}/>
            <line x1={bandLeftX} y1={chartTop + 40}
                  x2={bandLeftX} y2={chartTop + chartH - 30}
                  stroke={C.gold} strokeWidth="2" strokeDasharray="4 4"/>
            <line x1={bandRightX} y1={chartTop + 40}
                  x2={bandRightX} y2={chartTop + chartH - 30}
                  stroke={C.gold} strokeWidth="2" strokeDasharray="4 4"/>
            <text x={(bandLeftX + bandRightX) / 2} y={chartTop + 22}
                  fontFamily={F.data} fontSize="22" fill={C.gold}
                  textAnchor="middle" fontWeight="600" letterSpacing="0.16em">
              OFFER · $340–410K
            </text>
          </g>
        )}

        {/* Median marker */}
        {bandK > 0.5 && (
          <g opacity={bandE}>
            <line x1={medianX} y1={chartTop + 80}
                  x2={medianX} y2={chartTop + chartH - 30}
                  stroke={C.ink} strokeWidth="1.5"/>
            <text x={medianX} y={chartTop + 70}
                  fontFamily={F.data} fontSize="18" fill={C.ink}
                  textAnchor="middle" letterSpacing="0.12em">
              MEDIAN · $395K
            </text>
          </g>
        )}

        {/* Pin */}
        {pinK > 0 && (
          <g transform={`translate(${offerX}, ${offerCurveY})`}
             opacity={pinE}>
            {/* drop line from above */}
            <line x1="0" y1={lerp(-300, 0, pinE)} x2="0" y2="0"
                  stroke={C.clay} strokeWidth="2"/>
            {/* pin head */}
            <circle cx="0" cy="0" r={lerp(20, 12, pinE)}
                    fill={C.clay} stroke={C.paper} strokeWidth="3"/>
            {/* halo */}
            <circle cx="0" cy="0" r={lerp(10, 30, pinE)}
                    fill="none" stroke={C.clay} strokeWidth="1.5"
                    opacity={1 - pinE}/>
          </g>
        )}
      </svg>

      {/* Verdict text */}
      {verdictK > 0 && (
        <div style={{
          position: 'absolute', bottom: 280, left: 0, right: 0,
          textAlign: 'center',
          opacity: verdictK,
          transform: `translateY(${(1 - verdictK) * 14}px)`,
        }}>
          <span style={{
            display: 'inline-block', padding: '10px 22px', borderRadius: 999,
            background: C.clay, color: C.cream,
            fontFamily: F.data, fontSize: 18, letterSpacing: '0.22em',
            fontWeight: 600,
          }}>BELOW MARKET</span>
          <div style={{
            marginTop: 28,
            fontFamily: F.serif, fontSize: 64, lineHeight: 1.1,
            color: C.ink, letterSpacing: '-0.02em',
          }}>$20k under median.</div>
          <div style={{
            marginTop: 16,
            fontFamily: F.serif, fontStyle: 'italic', fontSize: 30,
            color: C.mute, padding: '0 80px',
          }}>
            For a Series D where you're leading the E round? Negotiate.
          </div>
        </div>
      )}

      {/* CTA */}
      <EndCard
        headline="Know what your offer's actually worth."
        sub="VETTED · ON THE APP STORE"
        fadeIn={ctaK}
      />
    </div>
  );
}

function ActDirector() {
  return (
    <>
      <CurvePhase/>
    </>
  );
}

window.ActDirector = ActDirector;
window.REEL_W = W; window.REEL_H = H; window.REEL_D = D;
window.REEL_BG = C.paper;
