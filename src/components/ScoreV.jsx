// Vetted — Score Gauge V icon / logo mark
//
// Fully parametric. All geometry is fractions of `size` so it scales
// cleanly to any render target.
//
// Canonical mark (matches design handoff):
//   <ScoreV vSpan={0.50} strokeRel={0.17} dotSizeRel={0.17}
//           dotGlow vignette={0.30} grooveOpacity={0.10}
//           grooveStyle="outlined" progress={0.72} />
//
// App-icon export (no frame — Xcode applies the mask):
//   <ScoreV size={1024} showFrame={false} shadow={false} ... />

import { useMemo } from "react";

const FOREST    = "#2d6a4f";
const FOREST_HI = "#3a8462";
const FOREST_LO = "#1f4d39";
const WHITE     = "#ffffff";
const GOLD      = "#fbbf24";

export default function ScoreV({
  size        = 260,
  // Background
  bg          = FOREST,
  bgGradient  = null,         // [topColor, bottomColor] | null
  vignette    = 0,            // 0..1 corner darkening
  // V geometry (fractions of size)
  vSpan       = 0.56,         // horizontal span
  vTop        = 0.32,         // y of top corners
  vBot        = 0.78,         // y of apex
  // Stroke
  strokeRel   = 0.085,
  fillColor   = WHITE,
  fillOpacity = 0.93,
  grooveColor = WHITE,
  grooveOpacity = 0.14,
  grooveStyle = "plain",      // "plain" | "depth-light" | "outlined"
  // Progress
  progress    = 0.72,         // 0..1 fraction of V drawn
  // Live tip
  dotColor    = GOLD,
  dotSizeRel  = 0.085,
  dotGlow     = false,
  dotGlowSize = 2.0,
  // Frame
  cornerRel   = 0.225,
  showFrame   = true,
  shadow      = true,
}) {
  const w      = size;
  const cx     = w / 2;
  const stroke = w * strokeRel;
  const halfV  = (w * vSpan) / 2;
  const yTop   = w * vTop;
  const yBot   = w * vBot;
  const tlX    = cx - halfV;
  const trX    = cx + halfV;

  const armLen  = Math.sqrt(halfV * halfV + (yBot - yTop) ** 2);
  const fillLen = armLen * 2 * progress;

  let liveX, liveY;
  if (fillLen <= armLen) {
    const t = fillLen / armLen;
    liveX = tlX + t * (cx - tlX);
    liveY = yTop + t * (yBot - yTop);
  } else {
    const t = (fillLen - armLen) / armLen;
    liveX = cx + t * (trX - cx);
    liveY = yBot + t * (yTop - yBot);
  }

  const groovePath = `M ${tlX} ${yTop} L ${cx} ${yBot} L ${trX} ${yTop}`;
  const fillPath   = fillLen <= armLen
    ? `M ${tlX} ${yTop} L ${liveX} ${liveY}`
    : `M ${tlX} ${yTop} L ${cx} ${yBot} L ${liveX} ${liveY}`;

  const dotR = w * dotSizeRel / 2;
  const uid  = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  const bgFill = bgGradient ? `url(#bg-${uid})` : bg;

  return (
    <div style={{
      width: size, height: size,
      borderRadius: showFrame ? w * cornerRel : 0,
      overflow: "hidden",
      position: "relative",
      flexShrink: 0,
      boxShadow: shadow && showFrame ? "0 14px 40px rgba(0,0,0,0.22)" : "none",
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <defs>
          {bgGradient && (
            <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={bgGradient[0]} />
              <stop offset="100%" stopColor={bgGradient[1]} />
            </linearGradient>
          )}
          {vignette > 0 && (
            <radialGradient id={`vig-${uid}`} cx="50%" cy="50%" r="70%">
              <stop offset="55%"  stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity={vignette} />
            </radialGradient>
          )}
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={size} height={size} fill={bgFill} />

        {/* Vignette */}
        {vignette > 0 && (
          <rect x="0" y="0" width={size} height={size} fill={`url(#vig-${uid})`} />
        )}

        {/* Groove outline (outlined style only) */}
        {grooveStyle === "outlined" && (
          <path d={groovePath} stroke="#000" strokeOpacity={0.45}
            strokeWidth={stroke + Math.max(2, stroke * 0.10)}
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
        )}

        {/* Depth-light: shadow offset under groove */}
        {grooveStyle === "depth-light" && (
          <g transform={`translate(0 ${stroke * 0.05})`}>
            <path d={groovePath} stroke="#000" strokeOpacity={0.28}
              strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        )}

        {/* Groove — full V dim */}
        <path d={groovePath} stroke={grooveColor}
          strokeOpacity={grooveStyle === "depth-light" ? grooveOpacity * 1.4 : grooveOpacity}
          strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* Depth-light: top highlight */}
        {grooveStyle === "depth-light" && (
          <g transform={`translate(0 ${-stroke * 0.04})`}>
            <path d={groovePath} stroke="#fff" strokeOpacity={0.18}
              strokeWidth={stroke * 0.85} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        )}

        {/* Fill — partial V */}
        <path d={fillPath} stroke={fillColor} strokeOpacity={fillOpacity}
          strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* Gold halo */}
        {dotGlow && (
          <circle cx={liveX} cy={liveY} r={dotR * dotGlowSize} fill={dotColor} opacity={0.35} />
        )}

        {/* Gold dot */}
        <circle cx={liveX} cy={liveY} r={dotR} fill={dotColor} />
      </svg>
    </div>
  );
}
