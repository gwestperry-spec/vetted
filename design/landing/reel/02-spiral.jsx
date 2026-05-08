// Reel 02 — Spiral Read
// JD: Master Electrician · Foreman (IBEW Local 3)
// Cinematic device: camera spirals INTO the JD text, words orbit outward as we
// descend. At the eye of the spiral, the VQ resolves. Pull back to scorecard.

const { C, F, lerp, E, JDs, TypedJD, Act0HandShot, EndCard } = window.VETTED;
const W = 1080, H = 1920, D = 20;
const T1 = 5;     // Act 0 → 1 transition
const T2 = 9;     // spiral begins
const T3 = 15;    // VQ at eye
const T4 = 18;    // pull back to scorecard

const JD = JDs.electrician;

// Spiral phase: camera Z dive + rotation. Words drawn from the JD itself orbit
// outward like leaves caught in a funnel.
function SpiralPhase() {
  const t = window.useTime();
  if (t < T2 - 0.2 || t > T4 + 0.2) return null;
  const lt = t - T2;
  const dur = T3 - T2; // 6s spiral
  const k = window.clamp(lt / dur, 0, 1);
  const kE = E.io(k);

  // Camera: rotate clockwise, dive in (Z negative → positive)
  const rot = lerp(0, -540, kE); // 1.5 turns
  const camZ = lerp(-200, 1400, kE);
  const camScale = lerp(1.0, 0.4, kE); // text gets pulled into the funnel

  // White punch-out flash at start of spiral
  const flashK = window.clamp(lt / 0.4, 0, 1);

  // Words orbiting — each at a different angle + radius + Z
  const orbitWords = [
    { txt: '$58/hr scale',          cat: 'comp',   r: 280, a: 0,    z: -200 },
    { txt: 'OT after 8',            cat: 'rule',   r: 360, a: 0.7,  z: -380 },
    { txt: 'Local 3 IBEW',          cat: 'union',  r: 240, a: 1.4,  z: -120 },
    { txt: 'commercial high-rise',  cat: 'scope',  r: 420, a: 2.1,  z: -480 },
    { txt: 'Manhattan jurisdiction',cat: 'rule',   r: 320, a: 2.8,  z: -260 },
    { txt: 'days · M–F',            cat: 'fit',    r: 200, a: 3.5,  z: -100 },
    { txt: 'pension · vested 5y',   cat: 'comp',   r: 380, a: 4.2,  z: -360 },
    { txt: 'apprentice ratio 1:3',  cat: 'scope',  r: 300, a: 4.9,  z: -200 },
    { txt: 'health · Empire BCBS',  cat: 'comp',   r: 340, a: 5.6,  z: -300 },
    { txt: 'reddit · r/electricians', cat: 'source', r: 260, a: 6.3, z: -160 },
    { txt: 'BLS · NYC zone',        cat: 'source', r: 400, a: 7.0,  z: -440 },
    { txt: 'reliable shop',         cat: 'fit',    r: 220, a: 7.7,  z: -100 },
  ];

  function colorFor(cat) {
    if (cat === 'comp')   return C.gold;
    if (cat === 'union')  return C.accent;
    if (cat === 'fit')    return C.accent;
    if (cat === 'rule')   return C.ink;
    if (cat === 'source') return C.mute;
    return C.ink;
  }

  // VQ resolves near the end (lt ≥ 4.5)
  const vqK = window.clamp((lt - 4.5) / 1.5, 0, 1);
  const vqE = E.oe(vqK);
  const vqNum = (4.6 * vqE).toFixed(1);
  const verdictK = window.clamp((lt - 5.4) / 0.4, 0, 1);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(ellipse at 50% 50%, ${C.cream} 0%, ${C.paper} 50%, #E9E2D0 100%)`,
      perspective: 1400,
      perspectiveOrigin: '50% 50%',
      overflow: 'hidden',
    }}>
      {/* white flash on entry */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#fff',
        opacity: (1 - flashK) * 0.95,
      }}/>

      {/* concentric rings — spiral floor */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%,-50%) rotate(${rot}deg)`,
        width: 2400, height: 2400, transformStyle: 'preserve-3d',
        opacity: 0.5,
      }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 300 + i * 220, height: 300 + i * 220,
            borderRadius: '50%',
            border: `1px solid ${C.border}`,
            transform: `translate(-50%,-50%) translateZ(${-i * 90}px)`,
          }}/>
        ))}
        {/* radial spokes */}
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * 360;
          return (
            <div key={`s${i}`} style={{
              position: 'absolute', left: '50%', top: '50%',
              width: 1, height: 1200,
              background: C.border, opacity: 0.4,
              transform: `translate(-50%,-50%) rotate(${a}deg)`,
              transformOrigin: '50% 0%',
            }}/>
          );
        })}
      </div>

      {/* Center: original JD body, shrinking + rotating into the eye */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%,-50%) rotate(${rot * 0.6}deg) scale(${camScale})`,
        width: 700, textAlign: 'left',
        fontFamily: F.serif, fontSize: 32, lineHeight: 1.5,
        color: C.ink, letterSpacing: '-0.005em',
        opacity: 1 - vqK,
      }}>
        {JD.body.split('\n').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {/* Orbiting evidence words */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%,-50%) rotate(${rot}deg)`,
        transformStyle: 'preserve-3d',
      }}>
        {orbitWords.map((w, i) => {
          // each word has its own entry stagger
          const enterK = window.clamp((lt - i * 0.18 - 0.4) / 0.7, 0, 1);
          // radius widens as we descend (centrifugal)
          const r = w.r * (1 + kE * 0.6);
          const x = Math.cos(w.a) * r;
          const y = Math.sin(w.a) * r;
          const z = lerp(w.z, w.z + 800, kE);
          // counter-rotate text so it stays readable
          const counter = -rot;
          const op = enterK * (1 - vqK * 0.85);
          return (
            <div key={i} style={{
              position: 'absolute',
              transform: `translate3d(${x}px, ${y}px, ${z}px) rotate(${counter}deg)`,
              fontFamily: w.cat === 'source' ? F.data : F.serif,
              fontSize: w.cat === 'source' ? 20 : 32,
              letterSpacing: w.cat === 'source' ? '0.16em' : '-0.01em',
              textTransform: w.cat === 'source' ? 'uppercase' : 'none',
              color: colorFor(w.cat),
              whiteSpace: 'nowrap',
              opacity: op,
            }}>{w.txt}</div>
          );
        })}
      </div>

      {/* VQ at eye */}
      {vqK > 0 && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: `translate(-50%,-50%) scale(${lerp(0.6, 1, vqE)})`,
          textAlign: 'center', opacity: vqE,
        }}>
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 700, height: 700, borderRadius: '50%',
            transform: 'translate(-50%,-50%)',
            background: `radial-gradient(circle, ${C.accent}40 0%, transparent 60%)`,
          }}/>
          <div style={{
            position: 'relative', zIndex: 2, opacity: verdictK,
            transform: `translateY(${(1 - verdictK) * -16}px)`,
          }}>
            <span style={{
              display: 'inline-block', padding: '12px 26px', borderRadius: 999,
              background: C.accent, color: C.cream,
              fontFamily: F.data, fontSize: 22, letterSpacing: '0.22em',
              fontWeight: 600,
            }}>VERDICT · TAKE IT</span>
          </div>
          <div style={{
            position: 'relative', zIndex: 2,
            fontFamily: F.serif, fontSize: 360, lineHeight: 1,
            color: C.ink, letterSpacing: '-0.04em',
            marginTop: 36, fontWeight: 400,
          }}>
            {vqNum}
            <span style={{ fontSize: 80, color: C.mute, marginLeft: 12 }}>/ 5</span>
          </div>
          <div style={{
            marginTop: 28,
            fontFamily: F.serif, fontSize: 30, fontStyle: 'italic',
            color: C.ink, opacity: verdictK * 0.85,
          }}>scale honest · pension real · shop reliable</div>
        </div>
      )}
    </div>
  );
}

// Pull back to scorecard
function ScorecardPhase() {
  const t = window.useTime();
  if (t < T4 - 0.2) return null;
  const lt = t - T4;
  const k = window.clamp(lt / 1.0, 0, 1);
  const kE = E.io(k);
  const ctaK = window.clamp((lt - 1.4) / 0.6, 0, 1);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.paper,
      opacity: window.clamp(lt / 0.4, 0, 1),
    }}>
      <div style={{
        position: 'absolute', left: 60, right: 60,
        top: 220, bottom: 360,
        background: C.cream,
        borderRadius: 36,
        border: `1.5px solid ${C.border}`,
        padding: '56px 56px',
        transform: `scale(${lerp(1.3, 1.0, kE)})`,
        transformOrigin: '50% 50%',
      }}>
        <div style={{
          fontFamily: F.data, fontSize: 20, letterSpacing: '0.24em',
          color: C.mute, fontWeight: 500,
        }}>SCORECARD · LOCAL 3 IBEW</div>
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <span style={{
            display: 'inline-block', padding: '10px 22px', borderRadius: 999,
            background: C.accent, color: C.cream,
            fontFamily: F.data, fontSize: 18, letterSpacing: '0.22em', fontWeight: 600,
          }}>VERDICT · TAKE IT</span>
          <div style={{
            fontFamily: F.serif, fontSize: 220, lineHeight: 1,
            color: C.ink, letterSpacing: '-0.04em', marginTop: 20,
          }}>4.6<span style={{ fontSize: 56, color: C.mute, marginLeft: 8 }}>/ 5</span></div>
        </div>
        <div style={{
          marginTop: 40, paddingTop: 28,
          borderTop: `1px solid ${C.border}`,
          fontFamily: F.serif, fontSize: 28, lineHeight: 1.45,
          color: C.ink,
        }}>
          The scale is union-published, the OT line is honest,
          and the shop's last three foremen all stayed five+ years.
          That's not a job posting — that's a career.
        </div>
      </div>
      <EndCard
        headline="Score the job before you take it."
        sub="VETTED · ON THE APP STORE"
        fadeIn={ctaK}
      />
    </div>
  );
}

function ActDirector() {
  return (
    <>
      <Act0HandShot jd={JD} T1={T1} caption="Before you take the job…" />
      <SpiralPhase/>
      <ScorecardPhase/>
    </>
  );
}

window.ActDirector = ActDirector;
window.REEL_W = W; window.REEL_H = H; window.REEL_D = D;
window.REEL_BG = C.paper;
