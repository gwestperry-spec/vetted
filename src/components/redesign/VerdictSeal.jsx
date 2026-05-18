// ── VerdictSeal.jsx ───────────────────────────────────────────────────────
// The Vetted brand seal that appears on the scoring screen (animated) and
// the resolve hub (paused). Two concentric rings around the Vetted mark:
//
//   - Outer ring: PURSUE · MONITOR · PASS · text running around the circle
//   - Inner ring: 12 verdict glyphs (✓ ◎ —, every 3rd in gold)
//
// Phase 1 ships the paused mode used by the resolve hub. Phase 6 adds the
// animated mode (outer 9s/rev clockwise, inner 6s/rev clockwise) with
// `prefers-reduced-motion` fallback to static.
//
// Props:
//   size           — diameter in px (default 220)
//   paused         — boolean (Phase 1: always true)
//   centerContent  — optional ReactNode rendered in the dead center
//                    (used by resolve hub to show the score number)
//   opacity        — outer ring fill opacity, useful for header treatments

import React from "react";

export default function VerdictSeal({
  size = 220,
  paused = true,
  centerContent,
  opacity = 1,
  outerSpeed = 9,      // seconds per revolution (clockwise)
  innerSpeed = 6,      // seconds per revolution (clockwise)
}) {
  const half = size / 2;
  const outerR = half - 14;
  const innerR = half - 36;
  const glyphR = innerR - 12;

  // 12 verdict glyphs, every 3rd one gold (positions 0, 3, 6, 9)
  const glyphs = [];
  const symbols = ["✓", "◎", "—", "✓", "◎", "—", "✓", "◎", "—", "✓", "◎", "—"];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = half + Math.cos(angle) * glyphR;
    const y = half + Math.sin(angle) * glyphR;
    const isGold = i % 3 === 0;
    glyphs.push(
      <text
        key={i}
        x={x} y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isGold ? "var(--dot)" : "var(--on-dark-soft)"}
        fontFamily="var(--font-serif)"
        fontSize={11}
        fontWeight={700}
        style={{ opacity: opacity }}
      >
        {symbols[i]}
      </text>
    );
  }

  // Outer ring text. Single pass of "PURSUE ◆ MONITOR ◆ PASS ◆", stretched
  // to fill the exact arc circumference via textLength. Browser distributes
  // whitespace evenly — no Unicode em-space tricks, no looping, the
  // three verdicts always read evenly spaced regardless of seal size.
  const circumference = 2 * Math.PI * outerR;
  const outerText = "PURSUE  ◆  MONITOR  ◆  PASS  ◆";

  return (
    <div style={{
      position: "relative",
      width: size, height: size,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Outer ring text */}
        <defs>
          <path
            id="seal-outer-path"
            d={`M ${half}, ${half} m -${outerR}, 0 a ${outerR},${outerR} 0 1,1 ${outerR * 2},0 a ${outerR},${outerR} 0 1,1 -${outerR * 2},0`}
            fill="none"
          />
        </defs>
        <g
          style={{
            transformOrigin: `${half}px ${half}px`,
            animation: paused ? "none" : `seal-spin-cw ${outerSpeed}s linear infinite`,
          }}
        >
          <text
            fontFamily="var(--font-serif)"
            fontSize={11}
            fontWeight={700}
            fill="var(--on-dark-soft)"
            style={{ opacity: opacity * 0.85 }}
          >
            <textPath
              href="#seal-outer-path"
              startOffset="0"
              textLength={circumference}
              lengthAdjust="spacing"
            >
              {outerText}
            </textPath>
          </text>
        </g>

        {/* Inner ring — glyphs */}
        <g
          style={{
            transformOrigin: `${half}px ${half}px`,
            animation: paused ? "none" : `seal-spin-cw ${innerSpeed}s linear infinite`,
          }}
        >
          {glyphs}
        </g>

        {/* Thin separator ring */}
        <circle
          cx={half} cy={half} r={innerR + 6}
          fill="none"
          stroke="var(--on-dark-border)"
          strokeWidth="0.5"
          style={{ opacity }}
        />
      </svg>

      {/* Center content (e.g. the score number) */}
      {centerContent && (
        <div style={{
          position: "relative", zIndex: 1,
          textAlign: "center",
        }}>
          {centerContent}
        </div>
      )}

      {/* Keyframes — only declared once per mount. Reduced motion disables. */}
      <style>{`
        @keyframes seal-spin-cw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-seal-spinner] g { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
