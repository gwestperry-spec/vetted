// Vetted — 19s reel (Act 0 hand shot removed)
// Vertical 1080x1920. Three acts:
//  Act 1 (0–5s):    Inside the app — JD finishes typing, camera dollies INTO
//                   the textbox itself.
//  Act 2 (5–13s):   Inside the box — words become a 3D field of evidence shards
//                   that resolve into the VQ score floating in space.
//  Act 3 (13–19s):  VQ pulls back into the Scorecard. CTA.

const C = {
  ink:    '#1F2A24',
  paper:  '#F4F1E8',
  cream:  '#FAF6EC',
  accent: '#2D6A4F',
  gold:   '#B8945A',
  mute:   '#8A9A8A',
  border: '#D8DBD3',
};
const F = {
  serif: '"Libre Baskerville", Georgia, serif',
  prose: '"Inter", system-ui, sans-serif',
  data:  '"Inter", system-ui, sans-serif',
};

const W = 1080, H = 1920, D = 19;
// Act timing (Act 0 removed; everything shifted -5s)
const T1 = 0;     // Act 1 in-app JD frame
const T2 = 5;     // Act 2 evidence cloud
const T3 = 13;    // Act 3 scorecard

// ─── helpers ────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = window.Easing.easeOutCubic;
const eIn  = window.Easing.easeInCubic;
const eIO  = window.Easing.easeInOutCubic;
const eOE  = window.Easing.easeOutExpo;

// ─── ACT 0 — Hand holding phone, JD typed on screen ────────────────────
// We render a "phone" rectangle inside a moody desk scene, with the same
// VETTED workspace UI on its display. Camera pushes from environment shot
// → close on the phone screen → hands off Act 1 (which dollies INTO the box).
function Act0HandShot() {
  const t = window.useTime();
  if (t > T1 + 0.4) return null;

  // Camera push over 0..5s: phone starts smaller in frame, pushes in.
  const k = window.clamp(t / 5.0, 0, 1);
  const kE = eIO(k);
  // phone scale 0.78 → 1.18 (frame fills with screen by end of act)
  const phoneScale = lerp(0.78, 1.18, kE);
  // phone Y bob — handheld feel
  const bob = Math.sin(t * 1.6) * 6 + Math.cos(t * 2.3) * 3;
  const tilt = Math.sin(t * 0.9) * 0.4; // tiny rotation, degrees

  // Environment fade — desk darkens out toward Act 1 transition
  const envFade = window.clamp(1 - (t - 4.0) / 1.0, 0, 1);

  // Hand visibility — thumbs come into frame at t≈0.4, slide out by 4.0
  const handIn = window.clamp((t - 0.3) / 0.5, 0, 1);
  const handOut = window.clamp(1 - (t - 3.6) / 0.6, 0, 1);
  const handOpacity = handIn * handOut;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse at 50% 45%, #2a2520 0%, #14110f 70%, #0a0907 100%)',
      overflow: 'hidden',
    }}>
      {/* Desk surface — warm wood blur, very subtle */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%',
        background: 'linear-gradient(180deg, transparent 0%, #1a1410 60%, #110d0a 100%)',
        opacity: envFade,
      }}/>

      {/* Ambient grain dots — faint paper-like texture in highlights */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 30% 25%, rgba(184,148,90,0.08) 0%, transparent 35%),
                          radial-gradient(circle at 70% 70%, rgba(45,106,79,0.05) 0%, transparent 40%)`,
        opacity: envFade,
      }}/>

      {/* Phone — held slightly off-center for natural composition */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%, calc(-50% + ${bob}px)) rotate(${tilt}deg) scale(${phoneScale})`,
        transformOrigin: '50% 50%',
      }}>
        {/* Phone bezel */}
        <div style={{
          width: 540, height: 1100, borderRadius: 68,
          background: '#0c0a08',
          border: '2px solid #2a2620',
          boxShadow: '0 80px 120px rgba(0,0,0,0.6), 0 30px 60px rgba(0,0,0,0.4), inset 0 0 0 6px #181412',
          padding: 14, position: 'relative',
        }}>
          {/* Screen */}
          <div style={{
            position: 'absolute', inset: 14, borderRadius: 56,
            background: C.paper, overflow: 'hidden',
          }}>
            {/* Status bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 32px 0',
              fontFamily: F.data, fontSize: 16, color: C.ink, fontWeight: 600,
            }}>
              <span>9:41</span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                <span>•••</span><span>📶</span><span>🔋</span>
              </span>
            </div>

            {/* App header */}
            <div style={{
              marginTop: 28, textAlign: 'center',
              fontFamily: F.data, fontSize: 14, letterSpacing: '0.32em',
              color: C.mute, fontWeight: 500,
            }}>VETTED · WORKSPACE</div>

            {/* eyebrow */}
            <div style={{
              marginTop: 280, marginLeft: 40,
              fontFamily: F.data, fontSize: 13, letterSpacing: '0.22em',
              color: C.mute, fontWeight: 500,
            }}>SCORE A NEW ROLE</div>

            {/* Textbox — JD types in here in real time */}
            <div style={{
              margin: '24px 28px 0', height: 460, borderRadius: 18,
              background: C.cream,
              border: `1px solid ${C.border}`,
              padding: '28px 30px',
              overflow: 'hidden',
            }}>
              <div style={{
                fontFamily: F.serif, fontSize: 22, lineHeight: 1.4,
                color: C.ink, letterSpacing: '-0.005em',
              }}>
                <TypedJD startAt={0.6} dur={3.4} cursorWhile={4.6}/>
              </div>
            </div>

            {/* below textbox */}
            <div style={{
              marginTop: 28, textAlign: 'center',
              fontFamily: F.data, fontSize: 11, letterSpacing: '0.18em',
              color: C.mute,
            }}>PASTE · TYPE · OR LINK</div>
          </div>
        </div>

        {/* Left thumb */}
        <div style={{
          position: 'absolute', left: -120, bottom: -40,
          width: 280, height: 380,
          borderRadius: '50% 50% 60% 40% / 60% 60% 40% 40%',
          background: 'linear-gradient(135deg, #c9a888 0%, #a07a55 60%, #6b4a30 100%)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset -20px -10px 30px rgba(0,0,0,0.3)',
          opacity: handOpacity,
          transform: `rotate(-25deg) translateX(${(1 - handIn) * -40}px)`,
        }}/>
        {/* Right thumb — slightly higher, taps on the textbox area */}
        <div style={{
          position: 'absolute', right: -100, bottom: 100,
          width: 240, height: 340,
          borderRadius: '50% 50% 40% 60% / 60% 60% 40% 40%',
          background: 'linear-gradient(225deg, #c9a888 0%, #a07a55 60%, #6b4a30 100%)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 20px -10px 30px rgba(0,0,0,0.3)',
          opacity: handOpacity,
          transform: `rotate(20deg) translate(${(1 - handIn) * 40}px, ${Math.sin(t * 6) * 4}px)`,
        }}/>
      </div>

      {/* Bottom caption */}
      <div style={{
        position: 'absolute', bottom: 180, left: 0, right: 0,
        textAlign: 'center',
        opacity: envFade * 0.85,
        fontFamily: F.serif, fontSize: 38, fontStyle: 'italic',
        color: '#F4F1E8', letterSpacing: '-0.005em',
        textShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}>
        Before you take the role…
      </div>

      {/* Vignette to darken edges */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }}/>

      {/* Final whoosh — white flash as we punch into the screen */}
      {t > 4.6 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: C.paper,
          opacity: window.clamp((t - 4.6) / 0.4, 0, 1),
        }}/>
      )}
    </div>
  );
}

// ─── ACT 1 — JD frame, camera dollies in ────────────────────────────────
function Act1Frame() {
  const t = window.useTime();
  if (t < T1 - 0.1 || t > T2 + 0.4) return null;
  const lt = t - T1;
  // camera scale: 1.0 → 5.5 over 0..5s, accelerating
  const k = window.clamp((lt - 0.0) / 4.6, 0, 1);
  const scale = lerp(1.0, 5.6, eIn(k));
  // shift origin so the JD textbox stays centered while we dolly in
  const tx = lerp(0, 0, k);
  const ty = lerp(0, -180, k);
  // fade frame chrome out toward end
  const chromeOpacity = window.clamp(1 - (lt - 3.6) / 1.0, 0, 1);
  // fade in from white at start (continuation of Act 0 punch-through)
  const whiteIn = window.clamp(1 - lt / 0.5, 0, 1);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.paper,
      transform: `translate(${tx}px,${ty}px) scale(${scale})`,
      transformOrigin: '50% 62%',
      transition: 'none',
    }}>
      {/* App chrome */}
      <div style={{
        position: 'absolute', top: 120, left: 0, right: 0,
        textAlign: 'center', opacity: chromeOpacity,
        fontFamily: F.data, fontSize: 22, letterSpacing: '0.32em',
        color: C.mute, fontWeight: 500,
      }}>VETTED · WORKSPACE</div>

      {/* eyebrow */}
      <div style={{
        position: 'absolute', top: 880, left: 88,
        fontFamily: F.data, fontSize: 22, letterSpacing: '0.22em',
        color: C.mute, fontWeight: 500, opacity: chromeOpacity,
      }}>SCORE A NEW ROLE</div>

      {/* The textbox — this is the portal */}
      <div style={{
        position: 'absolute', top: 940, left: 64, right: 64,
        height: 720, borderRadius: 28,
        background: C.cream,
        border: `1.5px solid ${C.border}`,
        boxShadow: '0 2px 0 rgba(0,0,0,0.04)',
        padding: '56px 56px',
        overflow: 'hidden',
      }}>
        <div style={{
          fontFamily: F.serif, fontSize: 44, lineHeight: 1.45,
          color: C.ink, letterSpacing: '-0.005em',
        }}>
          <TypedJD startAt={-100} dur={0.1} cursorWhile={-1}/>
        </div>
      </div>

      {/* below textbox */}
      <div style={{
        position: 'absolute', bottom: 200, left: 0, right: 0,
        textAlign: 'center', opacity: chromeOpacity * 0.7,
        fontFamily: F.data, fontSize: 18, letterSpacing: '0.18em',
        color: C.mute,
      }}>PASTE · TYPE · OR LINK</div>

      {/* white-in from Act 0 punch-through */}
      {whiteIn > 0 && (
        <div style={{
          position: 'absolute', inset: 0, background: C.paper,
          opacity: whiteIn, pointerEvents: 'none',
        }}/>
      )}
    </div>
  );
}

// Type the JD body. Used by both Act 0 (small phone screen) and Act 1.
function TypedJD({ startAt = 0.4, dur = 3.0, cursorWhile = 5.5 }) {
  const t = window.useTime();
  const full =
    "Head of GTM Operations.  Anthropic.  $240–290k base.\n" +
    "Own the revenue motion: pipeline, forecast, comp design.\n" +
    "Report to COO.  Hybrid SF.  Equity material.";
  const k = window.clamp((t - startAt) / dur, 0, 1);
  const n = Math.floor(full.length * eOut(k));
  const shown = full.slice(0, n);
  const cursorOn = (Math.floor(t * 2.5) % 2) === 0 && t < cursorWhile;
  return (
    <span>
      {shown.split('\n').map((line, i) => (
        <span key={i}>{line}{i < shown.split('\n').length - 1 && <br/>}</span>
      ))}
      {cursorOn && n < full.length && <span style={{
        display: 'inline-block', width: 3, height: '0.85em',
        background: C.ink, marginLeft: 3, verticalAlign: 'baseline',
      }}/>}
    </span>
  );
}

// ─── ACT 2 — inside the box: 3D evidence field → VQ ─────────────────────

// Words/phrases that fly in 3D space, drawn from "evidence" the app reads.
const SHARDS = [
  { txt: 'GTM ops', cat: 'role' },
  { txt: 'forecast', cat: 'scope' },
  { txt: 'comp design', cat: 'scope' },
  { txt: 'reports to COO', cat: 'power' },
  { txt: '$240–290k', cat: 'comp' },
  { txt: 'levels.fyi · 18 samples', cat: 'source' },
  { txt: 'reddit · r/sales', cat: 'source' },
  { txt: 'Glassdoor · 4.1', cat: 'source' },
  { txt: 'hybrid SF', cat: 'fit' },
  { txt: 'equity material', cat: 'comp' },
  { txt: 'Series E', cat: 'stage' },
  { txt: 'reorg risk · low', cat: 'risk' },
  { txt: '“ambitious COO”', cat: 'signal' },
  { txt: 'tenure: 2.3y avg', cat: 'risk' },
  { txt: 'pipeline', cat: 'scope' },
  { txt: 'Anthropic', cat: 'company' },
  { txt: 'comp band fits', cat: 'fit' },
  { txt: 'role scope clear', cat: 'fit' },
];

function colorFor(cat) {
  if (cat === 'comp')    return C.gold;
  if (cat === 'source')  return C.mute;
  if (cat === 'fit')     return C.accent;
  if (cat === 'risk')    return '#A85C45';
  return C.ink;
}

function Act2Field() {
  const t = window.useTime();
  if (t < T2 - 0.1 || t > T3 + 0.6) return null;

  // Local time within act 2
  const lt = t - T2;
  const dur = 9.0;
  const k = window.clamp(lt / dur, 0, 1);

  // After typing, the screen "punches through" — flash + zoom past
  const flashK = window.clamp((lt - 0.0) / 0.5, 0, 1);

  // Camera Z motion: start far back (we just emerged inside the box),
  // dolly forward through the cloud, then settle as VQ resolves.
  const camZ = lerp(-1400, 600, eIO(k));

  // Convergence: shards start scattered, end converging on VQ position
  const conv = window.clamp((lt - 4.0) / 3.5, 0, 1);
  const convE = eIO(conv);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(ellipse at 50% 50%, ${C.cream} 0%, ${C.paper} 55%, #E9E2D0 100%)`,
      perspective: 1600,
      perspectiveOrigin: '50% 50%',
      overflow: 'hidden',
    }}>
      {/* punch-through flash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#FFFFFF',
        opacity: (1 - flashK) * 0.95,
        pointerEvents: 'none',
      }}/>

      {/* horizontal rule rays — depth cue */}
      <div style={{
        position: 'absolute', inset: 0,
        transformStyle: 'preserve-3d',
        opacity: 0.25,
      }}>
        {Array.from({length: 14}).map((_, i) => {
          const z = -1800 + i * 220 + (lt * 90) % 220;
          return <div key={i} style={{
            position: 'absolute', left: '8%', right: '8%',
            top: '50%', height: 1, background: C.mute,
            transform: `translateZ(${z}px)`,
          }}/>;
        })}
      </div>

      {/* shard cloud */}
      <div style={{
        position: 'absolute', inset: 0,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${camZ}px)`,
      }}>
        {SHARDS.map((s, i) => {
          // distribute on a fibonacci-ish lattice in 3D
          const a = i * 2.39996;
          const r = 280 + (i % 5) * 70;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a * 1.3) * r * 0.85;
          const sz = -1200 + (i * 137) % 1700;
          // converge toward center
          const x = lerp(sx, 0, convE);
          const y = lerp(sy, 0, convE);
          const z = lerp(sz, 0, convE);
          // entry stagger
          const enterK = window.clamp((lt - i * 0.06 - 0.2) / 0.6, 0, 1);
          const op = enterK * (1 - convE * 0.85);
          return (
            <div key={i} style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: `translate(-50%,-50%) translate3d(${x}px, ${y}px, ${z}px)`,
              fontFamily: s.cat === 'source' || s.cat === 'comp' ? F.data : F.serif,
              fontSize: s.cat === 'source' ? 22 : 38,
              letterSpacing: s.cat === 'source' ? '0.16em' : '-0.01em',
              textTransform: s.cat === 'source' ? 'uppercase' : 'none',
              color: colorFor(s.cat),
              opacity: op,
              whiteSpace: 'nowrap',
              fontStyle: s.cat === 'signal' ? 'italic' : 'normal',
            }}>{s.txt}</div>
          );
        })}
      </div>

      {/* VQ resolves at center */}
      <VQReveal lt={lt}/>
    </div>
  );
}

function VQReveal({ lt }) {
  // VQ counts up 0 → 4.4 from lt 7.0..10.5
  // It enters with a forward push (Z) and bloom
  const k = window.clamp((lt - 6.5) / 2.5, 0, 1);
  const kE = eOE(k);
  if (k <= 0) return null;
  const target = 4.4;
  const num = (target * kE).toFixed(1);

  const verdictK = window.clamp((lt - 8.6) / 0.6, 0, 1);
  const subK = window.clamp((lt - 8.9) / 0.7, 0, 1);

  const z = lerp(-200, 0, kE);
  const scale = lerp(0.7, 1, kE);

  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      transform: `translate(-50%,-50%) translateZ(${z}px) scale(${scale})`,
      textAlign: 'center', perspective: 1200,
    }}>
      {/* halo */}
      <div style={{
        position: 'absolute', left: '50%', top: '52%',
        width: 720, height: 720, borderRadius: '50%',
        transform: 'translate(-50%,-50%)',
        background: `radial-gradient(circle, ${C.accent}33 0%, transparent 60%)`,
        opacity: kE,
      }}/>
      {/* verdict pill above */}
      <div style={{
        position: 'relative', zIndex: 2,
        opacity: verdictK,
        transform: `translateY(${(1 - verdictK) * -16}px)`,
      }}>
        <span style={{
          display: 'inline-block',
          padding: '12px 26px', borderRadius: 999,
          background: C.accent, color: C.cream,
          fontFamily: F.data, fontSize: 22, letterSpacing: '0.22em',
          fontWeight: 600,
        }}>VERDICT · PURSUE</span>
      </div>
      {/* VQ */}
      <div style={{
        position: 'relative', zIndex: 2,
        fontFamily: F.serif, fontSize: 360, lineHeight: 1,
        color: C.ink, letterSpacing: '-0.04em',
        marginTop: 36, fontWeight: 400,
      }}>
        {num}
        <span style={{
          fontSize: 80, color: C.mute, marginLeft: 12,
          letterSpacing: '0.04em',
        }}>/ 5</span>
      </div>
      {/* subline */}
      <div style={{
        marginTop: 28, opacity: subK,
        transform: `translateY(${(1 - subK) * 12}px)`,
        fontFamily: F.serif, fontSize: 30, fontStyle: 'italic',
        color: C.ink, opacity: subK * 0.85,
      }}>scope clear · comp fits · power real</div>
    </div>
  );
}

// ─── ACT 3 — pull back into Scorecard, CTA ──────────────────────────────
function Act3Card() {
  const t = window.useTime();
  if (t < T3 - 0.2) return null;
  const lt = t - T3;
  const dur = D - T3;
  const k = window.clamp(lt / 1.4, 0, 1);
  const kE = eIO(k);

  // dolly out — VQ shrinks into the card hero
  const cardScale = lerp(1.4, 1.0, kE);
  const cardY = lerp(40, 0, kE);
  const cardOpacity = window.clamp(lt / 0.5, 0, 1);

  const ctaK = window.clamp((lt - 3.4) / 0.6, 0, 1);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.paper,
      opacity: cardOpacity,
    }}>
      {/* phone-frame ish card centered */}
      <div style={{
        position: 'absolute', left: 60, right: 60,
        top: 160, bottom: 320,
        background: C.cream,
        borderRadius: 36,
        border: `1.5px solid ${C.border}`,
        padding: '64px 56px',
        transform: `translateY(${cardY}px) scale(${cardScale})`,
        transformOrigin: '50% 50%',
        overflow: 'hidden',
      }}>
        {/* eyebrow */}
        <div style={{
          fontFamily: F.data, fontSize: 20, letterSpacing: '0.24em',
          color: C.mute, fontWeight: 500,
        }}>SCORECARD · ANTHROPIC</div>

        {/* verdict + VQ block */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <span style={{
            display: 'inline-block', padding: '10px 22px', borderRadius: 999,
            background: C.accent, color: C.cream,
            fontFamily: F.data, fontSize: 18, letterSpacing: '0.22em',
            fontWeight: 600,
          }}>VERDICT · PURSUE</span>
          <div style={{
            fontFamily: F.serif, fontSize: 240, lineHeight: 1,
            color: C.ink, letterSpacing: '-0.04em', marginTop: 24,
          }}>4.4<span style={{ fontSize: 56, color: C.mute, marginLeft: 8 }}>/ 5</span></div>
        </div>

        {/* honest summary */}
        <div style={{
          marginTop: 56, paddingTop: 32,
          borderTop: `1px solid ${C.border}`,
          fontFamily: F.serif, fontSize: 32, lineHeight: 1.45,
          color: C.ink, letterSpacing: '-0.005em',
        }}>
          The COO is measured on revenue per head this year.
          You'd own the spreadsheet that decides their bonus.
          That's leverage. Pursue.
        </div>

        {/* mini framework bars */}
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { l: 'Scope',  v: 4.6 },
            { l: 'Power',  v: 4.4 },
            { l: 'Comp',   v: 4.2 },
            { l: 'Risk',   v: 4.0 },
            { l: 'Fit',    v: 4.8 },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 110, fontFamily: F.data, fontSize: 18,
                letterSpacing: '0.16em', color: C.mute, textTransform: 'uppercase',
              }}>{row.l}</div>
              <div style={{ flex: 1, height: 4, background: C.border, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${(row.v / 5) * 100}%`,
                  background: C.ink,
                  transformOrigin: 'left',
                  transform: `scaleX(${window.clamp((lt - 1.2 - i * 0.12) / 0.6, 0, 1)})`,
                }}/>
              </div>
              <div style={{ width: 70, textAlign: 'right',
                fontFamily: F.serif, fontSize: 28, color: C.ink }}>{row.v.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 120,
        textAlign: 'center', opacity: ctaK,
        transform: `translateY(${(1 - ctaK) * 18}px)`,
      }}>
        <div style={{
          fontFamily: F.serif, fontSize: 52, lineHeight: 1.15,
          color: C.ink, letterSpacing: '-0.01em',
        }}>Score the role before you take it.</div>
        <div style={{
          marginTop: 20,
          fontFamily: F.data, fontSize: 22, letterSpacing: '0.28em',
          color: C.mute, fontWeight: 500,
        }}>VETTED · ON THE APP STORE</div>
      </div>
    </div>
  );
}

// ─── Hold mask: act 1 → act 2 transition ────────────────────────────────
function Act1Mask() {
  const t = window.useTime();
  // Act 1 only renders during its window — the component already guards this.
  return <Act1Frame/>;
}

function ActDirector() {
  return (
    <>
      <Act1Mask/>
      <Act2Field/>
      <Act3Card/>
    </>
  );
}

window.ActDirector = ActDirector;
window.REEL_W = W; window.REEL_H = H; window.REEL_D = D;
window.REEL_BG = C.paper;
