// Vetted — score gauge V icon
//
// A V-shape (brand initial, also reads as a checkmark) rendered as a
// score gauge: a stroke traces the V path like a gauge filling up.
// The fill is partial — a gold dot marks the live edge.
//
// Forest green ground, white fill, gold tip.

const FOREST   = '#2d6a4f';
const FOREST_HI = '#3a8462';
const FOREST_LO = '#1f4d39';
const WHITE    = '#ffffff';
const GOLD     = '#fbbf24';
const GOLD_WARM = '#f5a623';
const GOLD_PALE = '#ffd766';

// ──────────────────────────────────────────────────────────────────
// The mark itself.  All knobs exposed.
// ──────────────────────────────────────────────────────────────────
function ScoreV({
  size = 260,
  // ── Background ──────────────────────────────────────────────
  bg          = FOREST,
  bgGradient  = null,            // [topColor, bottomColor] | null
  vignette    = 0,               // 0..1, darkening factor at corners
  // ── V geometry ──────────────────────────────────────────────
  vSpan       = 0.56,            // horizontal width of V (fraction of icon)
  vTop        = 0.32,            // y of V's top corners
  vBot        = 0.78,            // y of V's apex
  // ── Stroke ──────────────────────────────────────────────────
  strokeRel   = 0.085,           // stroke width / icon width
  fillColor   = WHITE,
  fillOpacity = 0.93,
  grooveColor = WHITE,
  grooveOpacity = 0.14,
  grooveStyle = 'plain',         // 'plain' | 'depth-light' | 'outlined'
  // ── Progress ────────────────────────────────────────────────
  progress    = 0.72,            // 0..1 — fraction of the V drawn
  // ── Live tip ───────────────────────────────────────────────
  dotColor    = GOLD,
  dotSizeRel  = 0.085,           // dot diameter / icon width
  dotGlow     = false,
  dotGlowSize = 2.0,             // halo radius / dot radius
  // ── Carving ─────────────────────────────────────────────────
  carved      = false,           // adds a subtle inner shadow on the groove
  // ── Frame ───────────────────────────────────────────────────
  cornerRel   = 0.225,           // iOS icon corner radius
  showFrame   = true,            // wrap in rounded square; off for raw use
  shadow      = true,            // outer drop shadow
}) {
  const w = size;
  const cx = w / 2;
  const stroke = w * strokeRel;
  const halfV = (w * vSpan) / 2;
  const yTop = w * vTop;
  const yBot = w * vBot;

  const tlX = cx - halfV;
  const trX = cx + halfV;
  const apexX = cx;

  // Path geometry
  const armLen = Math.sqrt(halfV * halfV + (yBot - yTop) * (yBot - yTop));
  const totalLen = armLen * 2;
  const fillLen = totalLen * progress;

  // Live edge
  let liveX, liveY;
  if (fillLen <= armLen) {
    const t = fillLen / armLen;
    liveX = tlX + t * (apexX - tlX);
    liveY = yTop + t * (yBot - yTop);
  } else {
    const t = (fillLen - armLen) / armLen;
    liveX = apexX + t * (trX - apexX);
    liveY = yBot + t * (yTop - yBot);
  }

  const groovePath = `M ${tlX} ${yTop} L ${apexX} ${yBot} L ${trX} ${yTop}`;
  const fillPath = fillLen <= armLen
    ? `M ${tlX} ${yTop} L ${liveX} ${liveY}`
    : `M ${tlX} ${yTop} L ${apexX} ${yBot} L ${liveX} ${liveY}`;

  const dotR = w * dotSizeRel / 2;

  // Unique IDs for SVG defs (prevents collisions when many ScoreVs render)
  const uid = React.useMemo(() => Math.random().toString(36).slice(2, 8), []);

  // Background fill: solid, gradient, or vignette
  const backgroundFill = bgGradient
    ? `url(#bg-${uid})`
    : bg;

  return (
    <div style={{
      width: size, height: size,
      borderRadius: showFrame ? w * cornerRel : 0,
      overflow: 'hidden',
      position: 'relative',
      boxShadow: shadow && showFrame ? '0 14px 40px rgba(0,0,0,0.22)' : 'none',
    }}>
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
      >
        <defs>
          {bgGradient && (
            <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={bgGradient[0]}/>
              <stop offset="100%" stopColor={bgGradient[1]}/>
            </linearGradient>
          )}
          {vignette > 0 && (
            <radialGradient id={`vig-${uid}`} cx="50%" cy="50%" r="70%">
              <stop offset="55%"  stopColor="#000" stopOpacity="0"/>
              <stop offset="100%" stopColor="#000" stopOpacity={vignette}/>
            </radialGradient>
          )}
          {carved && (
            <filter id={`carve-${uid}`}>
              {/* inner shadow to suggest a groove */}
              <feGaussianBlur in="SourceAlpha" stdDeviation={stroke * 0.06}/>
              <feOffset dx="0" dy={stroke * 0.10} result="shadow"/>
              <feComposite in="shadow" in2="SourceAlpha" operator="arithmetic"
                           k2="-1" k3="1" result="inner"/>
              <feFlood floodColor="#000" floodOpacity="0.35"/>
              <feComposite in2="inner" operator="in"/>
              <feComposite in2="SourceGraphic" operator="over"/>
            </filter>
          )}
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={size} height={size} fill={backgroundFill}/>

        {/* Vignette (on top of bg) */}
        {vignette > 0 && (
          <rect x="0" y="0" width={size} height={size} fill={`url(#vig-${uid})`}/>
        )}

        {/* Groove — full V path */}
        {grooveStyle === 'outlined' && (
          // A wider dark stroke behind the groove — reads as an etched outline.
          <path
            d={groovePath}
            stroke="#000"
            strokeOpacity={0.45}
            strokeWidth={stroke + Math.max(2, stroke * 0.10)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
        {grooveStyle === 'depth-light' && (
          // Soft drop into the groove: a slightly offset dark stroke under the dim white.
          <g transform={`translate(0 ${stroke * 0.05})`}>
            <path
              d={groovePath}
              stroke="#000"
              strokeOpacity={0.28}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        )}
        <path
          d={groovePath}
          stroke={grooveColor}
          strokeOpacity={grooveStyle === 'depth-light' ? grooveOpacity * 1.4 : grooveOpacity}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter={carved ? `url(#carve-${uid})` : undefined}
        />
        {grooveStyle === 'depth-light' && (
          // Top highlight — a thin offset-up white line, hints at an inset rim.
          <g transform={`translate(0 ${-stroke * 0.04})`}>
            <path
              d={groovePath}
              stroke="#fff"
              strokeOpacity={0.18}
              strokeWidth={stroke * 0.85}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        )}

        {/* Fill — partial V */}
        <path
          d={fillPath}
          stroke={fillColor}
          strokeOpacity={fillOpacity}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Gold dot — glow first, then dot on top */}
        {dotGlow && (
          <circle
            cx={liveX} cy={liveY}
            r={dotR * dotGlowSize}
            fill={dotColor}
            opacity={0.35}
          />
        )}
        <circle
          cx={liveX} cy={liveY}
          r={dotR}
          fill={dotColor}
        />
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Display contexts — the canonical mark at the sizes it ships at.
// ──────────────────────────────────────────────────────────────────

// Hero — display scale, default knobs.
function MarkHero() {
  return <ScoreV size={300}/>;
}

// At app-icon scale (120px).
function MarkAppIcon() {
  return <ScoreV size={120}/>;
}

// At notification size (40px) — the legibility floor.
function MarkNotification() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <ScoreV size={40} strokeRel={0.105} dotSizeRel={0.18}/>
      <Caption>40PX · NOTIFICATION</Caption>
    </div>
  );
}

// Tiny — favicon scale (16px).
function MarkFavicon() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <ScoreV size={16} strokeRel={0.13} dotSizeRel={0.30} cornerRel={0.18}/>
      <Caption>16PX · FAVICON</Caption>
    </div>
  );
}

// Trio — three sizes side by side.
function MarkTrio() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 36 }}>
      <ScoreV size={180}/>
      <ScoreV size={88}/>
      <ScoreV size={40} strokeRel={0.105} dotSizeRel={0.18}/>
    </div>
  );
}

// Quartet — full range, including 16px favicon.
function MarkQuartet() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
      <ScoreV size={140}/>
      <ScoreV size={72}/>
      <ScoreV size={40} strokeRel={0.105} dotSizeRel={0.18}/>
      <ScoreV size={16} strokeRel={0.13} dotSizeRel={0.30} cornerRel={0.18}/>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Variations
// ──────────────────────────────────────────────────────────────────

// V proportions: narrower / default / wider
function VarVNarrow()  { return <ScoreV size={200} vSpan={0.46}/>; }
function VarVDefault() { return <ScoreV size={200} vSpan={0.56}/>; }
function VarVWide()    { return <ScoreV size={200} vSpan={0.66}/>; }

// V height: shorter / default / taller
function VarVShort()  { return <ScoreV size={200} vTop={0.36} vBot={0.70}/>; }
function VarVTall()   { return <ScoreV size={200} vTop={0.26} vBot={0.84}/>; }

// V vertical position: higher / lower
function VarVHigh()   { return <ScoreV size={200} vTop={0.26} vBot={0.72}/>; }
function VarVLow()    { return <ScoreV size={200} vTop={0.36} vBot={0.82}/>; }

// Gold dot — sizes
function VarDotSmall()  { return <ScoreV size={200} dotSizeRel={0.060}/>; }
function VarDotMed()    { return <ScoreV size={200} dotSizeRel={0.085}/>; }
function VarDotLarge()  { return <ScoreV size={200} dotSizeRel={0.115}/>; }

// Gold dot — glow on/off
function VarDotGlow()      { return <ScoreV size={200} dotGlow={true}  dotGlowSize={2.4}/>; }
function VarDotGlowSmall() { return <ScoreV size={200} dotGlow={true}  dotGlowSize={1.8}/>; }
function VarDotFlat()      { return <ScoreV size={200} dotGlow={false}/>; }

// Gold tone variations
function VarDotWarm() { return <ScoreV size={200} dotColor={GOLD_WARM}/>; }
function VarDotPale() { return <ScoreV size={200} dotColor={GOLD_PALE}/>; }

// Groove visibility
function VarGrooveBright() { return <ScoreV size={200} grooveOpacity={0.24}/>; }
function VarGrooveDim()    { return <ScoreV size={200} grooveOpacity={0.08}/>; }
function VarGrooveNone()   { return <ScoreV size={200} grooveOpacity={0}/>; }

// Carved (inner shadow) — depth read
function VarCarved()       { return <ScoreV size={200} carved={true}/>; }

// Background — solid forest variants
function VarBgFlat()    { return <ScoreV size={200}/>; }
function VarBgGradient(){ return <ScoreV size={200} bgGradient={[FOREST_HI, FOREST_LO]}/>; }
function VarBgVignette(){ return <ScoreV size={200} vignette={0.35}/>; }
function VarBgDeep()    { return <ScoreV size={200} bg="#1f4d39"/>; }
function VarBgWarm()    { return <ScoreV size={200} bg="#356f4e"/>; }
function VarBgRich()    { return <ScoreV size={200} bg="#26604a" bgGradient={["#3a8462", "#1f4d39"]}/>; }

// Stroke weight
function VarStrokeThin()  { return <ScoreV size={200} strokeRel={0.065}/>; }
function VarStrokeBold()  { return <ScoreV size={200} strokeRel={0.105}/>; }

// Progress
function VarProg50()  { return <ScoreV size={200} progress={0.50}/>; }
function VarProg72()  { return <ScoreV size={200} progress={0.72}/>; }
function VarProg85()  { return <ScoreV size={200} progress={0.85}/>; }
function VarProg100() { return <ScoreV size={200} progress={1.00}/>; }

// ──────────────────────────────────────────────────────────────────
// Composed candidates — best-of remixes for direct comparison.
// ──────────────────────────────────────────────────────────────────
function CandA_Default() {
  return <ScoreV size={220}/>;
}
function CandB_GlowVignette() {
  return <ScoreV size={220} vSpan={0.50} strokeRel={0.17} dotSizeRel={0.17}
                 dotGlow vignette={0.30} grooveOpacity={0.10} grooveStyle="outlined"/>;
}
function CandC_BoldClean() {
  return <ScoreV size={220} strokeRel={0.095} grooveOpacity={0.10}/>;
}
function CandD_RichGradient() {
  return <ScoreV size={220} bgGradient={[FOREST_HI, FOREST_LO]} dotGlow dotGlowSize={2.2}/>;
}
function CandE_Carved() {
  return <ScoreV size={220} carved grooveOpacity={0.18}/>;
}

// ──────────────────────────────────────────────────────────────────
// In context: a homescreen mockup so the icon reads next to real apps.
// ──────────────────────────────────────────────────────────────────
function HomescreenContext() {
  // A tiny iOS-style row of icons.
  const row = [
    { color: '#34c759', label: 'Health' },
    { color: '#0a84ff', label: 'Maps' },
    { type: 'vetted', label: 'Vetted' },
    { color: '#ff9500', label: 'Notes' },
  ];
  return (
    <div style={{
      width: '100%', padding: 28,
      background: 'linear-gradient(180deg, #aaa9a3 0%, #6c6960 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 18,
    }}>
      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-end' }}>
        {row.map((it, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {it.type === 'vetted' ? (
              <ScoreV size={70}/>
            ) : (
              <div style={{
                width: 70, height: 70, borderRadius: 16,
                background: it.color,
                boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
              }}/>
            )}
            <div style={{
              fontFamily: '"Inter", sans-serif', fontSize: 11,
              color: 'rgba(255,255,255,0.92)', letterSpacing: 0.2,
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            }}>{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────
function Caption({ children }) {
  return (
    <div style={{
      fontFamily: '"Inter", sans-serif', fontSize: 9, fontWeight: 500,
      letterSpacing: '0.28em', color: '#8FA28F', textTransform: 'uppercase',
    }}>{children}</div>
  );
}

Object.assign(window, {
  ScoreV,
  MarkHero, MarkAppIcon, MarkNotification, MarkFavicon, MarkTrio, MarkQuartet,
  VarVNarrow, VarVDefault, VarVWide, VarVShort, VarVTall, VarVHigh, VarVLow,
  VarDotSmall, VarDotMed, VarDotLarge, VarDotGlow, VarDotGlowSmall, VarDotFlat,
  VarDotWarm, VarDotPale,
  VarGrooveBright, VarGrooveDim, VarGrooveNone, VarCarved,
  VarBgFlat, VarBgGradient, VarBgVignette, VarBgDeep, VarBgWarm, VarBgRich,
  VarStrokeThin, VarStrokeBold,
  VarProg50, VarProg72, VarProg85, VarProg100,
  CandA_Default, CandB_GlowVignette, CandC_BoldClean, CandD_RichGradient, CandE_Carved,
  HomescreenContext,
});
