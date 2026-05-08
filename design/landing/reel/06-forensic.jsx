// Reel 06 — Tilt-Shift Forensic
// JD: Technical Director · Soho Rep. (theater)
// Cinematic device: camera orbits around the JD as if it's a 3D specimen on a
// glass slide, annotations float in space tethered to lines in the text.

const { C, F, lerp, E, JDs, Act0HandShot, EndCard } = window.VETTED;
const W = 1080, H = 1920, D = 15;
const T1 = 0;
const T2 = 3;     // orbit begins, annotations appear
const T3 = 9;     // verdict resolves
const T4 = 12;    // CTA

const JD = JDs.techDirector;

// Annotations tethered to specific phrases in the JD.
// Each carries a forensic label + a verdict color.
const NOTES = [
  { tag: 'TITLE',     note: 'Scope = solo TD',                  color: 'ink',    side: 'L', y: 0.30 },
  { tag: 'COMP',      note: '$78–92k · 2k below Off-Bway median', color: 'gold',   side: 'R', y: 0.40 },
  { tag: 'VOLUME',    note: '4 shows · ~14 weeks each = full-time',  color: 'ink',    side: 'L', y: 0.52 },
  { tag: 'VENUE',     note: '75 seats · low-stakes craft',       color: 'accent', side: 'R', y: 0.62 },
  { tag: 'LOCATION',  note: 'Walker St · close-knit downtown',   color: 'mute',   side: 'L', y: 0.72 },
];

function noteColor(c) {
  if (c === 'gold') return C.gold;
  if (c === 'accent') return C.accent;
  if (c === 'clay') return C.clay;
  if (c === 'mute') return C.mute;
  return C.ink;
}

function ForensicPhase() {
  const t = window.useTime();
  if (t < T1 - 0.2 || t > T3 + 0.5) return null;
  const lt = t - T1;

  const bgK = window.clamp(lt / 0.6, 0, 1);

  // Orbit: rotates the JD card from -8° to +8° on Y, slow yaw
  const orbitLT = lt - (T2 - T1);
  const yaw = orbitLT > 0 ? Math.sin(orbitLT * 0.5) * 8 : -8;
  const tilt = orbitLT > 0 ? Math.cos(orbitLT * 0.4) * 4 : 0;

  // Focus blur (tilt-shift): top + bottom blurred slightly
  // Simulate via gradient overlays.

  // Verdict near end
  const verdictK = window.clamp((lt - (T3 - T1) - 0.2) / 0.6, 0, 1);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(ellipse at 50% 50%, ${C.cream} 0%, ${C.paper} 60%, #e9e2d0 100%)`,
      opacity: bgK,
      overflow: 'hidden',
      perspective: 2400,
      perspectiveOrigin: '50% 50%',
    }}>
      {/* Eyebrow */}
      <div style={{
        position: 'absolute', top: 110, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.data, fontSize: 20, letterSpacing: '0.32em',
        color: C.mute, fontWeight: 500,
      }}>VETTED · FORENSICS</div>

      {/* The "specimen" — JD card on a glass slide */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%, -50%) rotateY(${yaw}deg) rotateX(${tilt}deg)`,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.1s linear',
      }}>
        {/* Slide glass underlay */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 760, height: 920,
          transform: 'translate(-50%, -50%) translateZ(-30px)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(184,148,90,0.08))',
          borderRadius: 8,
          border: '1px solid rgba(184,148,90,0.3)',
          boxShadow: '0 60px 80px rgba(0,0,0,0.15)',
        }}/>
        {/* JD card */}
        <div style={{
          position: 'relative',
          width: 700, height: 860,
          background: C.cream,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: '64px 56px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            fontFamily: F.data, fontSize: 14, letterSpacing: '0.32em',
            color: C.mute, fontWeight: 500, marginBottom: 36,
          }}>SPECIMEN · 04A</div>
          {JD.body.split('\n').map((line, i) => (
            <div key={i} style={{
              fontFamily: F.serif, fontSize: 30, lineHeight: 1.5,
              color: C.ink, letterSpacing: '-0.005em',
              marginBottom: 20,
            }}>{line}</div>
          ))}
        </div>
      </div>

      {/* Tilt-shift blur overlays — top + bottom */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 280,
        background: `linear-gradient(180deg, ${C.paper} 0%, transparent 100%)`,
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
        background: `linear-gradient(0deg, ${C.paper} 0%, transparent 100%)`,
        pointerEvents: 'none',
      }}/>

      {/* Annotations — float at the sides, draw lines to the JD */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none',
      }}>
        {NOTES.map((n, i) => {
          const enterK = window.clamp((lt - (T2 - T1) - i * 0.25) / 0.5, 0, 1);
          if (enterK <= 0) return null;
          const eK = E.out(enterK);
          // Card center is around (W/2, H/2). Tether y is n.y * H.
          const tetherY = n.y * H;
          const cardEdgeX = n.side === 'L' ? W / 2 - 230 : W / 2 + 230;
          const labelX = n.side === 'L' ? 90 : W - 90;
          const labelEnd = lerp(cardEdgeX, labelX, eK);
          return (
            <line key={i}
              x1={cardEdgeX} y1={tetherY}
              x2={labelEnd} y2={tetherY}
              stroke={noteColor(n.color)}
              strokeWidth="1"
              strokeOpacity={0.6}/>
          );
        })}
      </svg>

      {NOTES.map((n, i) => {
        const enterK = window.clamp((lt - (T2 - T1) - i * 0.25) / 0.5, 0, 1);
        if (enterK <= 0) return null;
        const eK = E.out(enterK);
        const labelY = n.y * 100;
        return (
          <div key={i} style={{
            position: 'absolute',
            top: `calc(${labelY}% - 30px)`,
            [n.side === 'L' ? 'left' : 'right']: 60,
            opacity: eK,
            transform: `translateX(${(1 - eK) * (n.side === 'L' ? -20 : 20)}px)`,
            textAlign: n.side === 'L' ? 'left' : 'right',
            maxWidth: 240,
          }}>
            <div style={{
              fontFamily: F.data, fontSize: 14, letterSpacing: '0.22em',
              color: noteColor(n.color), fontWeight: 700,
            }}>{n.tag}</div>
            <div style={{
              marginTop: 6,
              fontFamily: F.serif, fontSize: 20, lineHeight: 1.35,
              color: C.ink, fontStyle: 'italic',
            }}>{n.note}</div>
          </div>
        );
      })}

      {/* Verdict */}
      {verdictK > 0 && (
        <div style={{
          position: 'absolute', bottom: 240, left: 0, right: 0,
          textAlign: 'center',
          opacity: verdictK,
          transform: `translateY(${(1 - verdictK) * 14}px)`,
        }}>
          <span style={{
            display: 'inline-block', padding: '10px 22px', borderRadius: 999,
            background: C.accent, color: C.cream,
            fontFamily: F.data, fontSize: 18, letterSpacing: '0.22em',
            fontWeight: 600,
          }}>VERDICT · WORTH IT</span>
          <div style={{
            marginTop: 22,
            fontFamily: F.serif, fontSize: 38, lineHeight: 1.25,
            color: C.ink, padding: '0 100px',
          }}>VQ <span style={{ fontSize: 56, fontWeight: 700 }}>4.2</span> / 5</div>
          <div style={{
            marginTop: 10,
            fontFamily: F.serif, fontStyle: 'italic', fontSize: 24,
            color: C.mute, padding: '0 100px',
          }}>
            Underpaid, but the room is small enough to actually build something.
          </div>
        </div>
      )}
    </div>
  );
}

function CTAPhase() {
  const t = window.useTime();
  if (t < T4 - 0.2) return null;
  const lt = t - T4;
  const bgK = window.clamp(lt / 0.5, 0, 1);
  const ctaK = window.clamp((lt - 0.3) / 0.6, 0, 1);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.paper,
      opacity: bgK,
    }}>
      <div style={{
        position: 'absolute', top: 600, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.serif, fontSize: 88, lineHeight: 1.1,
        color: C.ink, letterSpacing: '-0.02em',
        padding: '0 80px',
        opacity: ctaK,
      }}>
        Read the listing. Then read between it.
      </div>
      <EndCard
        headline=""
        sub="VETTED · ON THE APP STORE"
        fadeIn={ctaK}
      />
    </div>
  );
}

function ActDirector() {
  return (
    <>
      <ForensicPhase/>
      <CTAPhase/>
    </>
  );
}

window.ActDirector = ActDirector;
window.REEL_W = W; window.REEL_H = H; window.REEL_D = D;
window.REEL_BG = C.paper;
