// Reel 03 — Profile Built
// JD: Art Director · Editorial (The Atavist)
// Cinematic device: facts about YOU draw themselves as a constellation,
// lines connect into a portrait. Climax: "We know you" + tier offer.

const { C, F, lerp, E, JDs, Act0HandShot, EndCard } = window.VETTED;
const W = 1080, H = 1920, D = 20;
const T1 = 5;     // Act 0 hand+phone end
const T2 = 9;     // facts begin appearing
const T3 = 14;    // lines connect, portrait resolves
const T4 = 17;    // CTA

const JD = JDs.artDirector;

// 12 facts about the user — each becomes a node in the constellation.
const FACTS = [
  { txt: '8 years editorial',  cat: 'experience', x: 0.20, y: 0.28 },
  { txt: 'Pentagram alum',     cat: 'experience', x: 0.78, y: 0.18 },
  { txt: 'reads slowly',       cat: 'taste',      x: 0.16, y: 0.55 },
  { txt: 'long-form first',    cat: 'taste',      x: 0.85, y: 0.42 },
  { txt: 'Brooklyn',           cat: 'place',      x: 0.42, y: 0.72 },
  { txt: 'won\u2019t relocate', cat: 'fit',        x: 0.62, y: 0.82 },
  { txt: '$140k floor',        cat: 'comp',       x: 0.18, y: 0.78 },
  { txt: 'Indesign · daily',   cat: 'craft',      x: 0.82, y: 0.65 },
  { txt: 'managed 4',          cat: 'scope',      x: 0.50, y: 0.20 },
  { txt: 'no roadmap meetings',cat: 'fit',        x: 0.30, y: 0.40 },
  { txt: 'wants tactile work', cat: 'taste',      x: 0.72, y: 0.28 },
  { txt: 'kid · 5yo',          cat: 'life',       x: 0.62, y: 0.55 },
];

// Connections between fact pairs (forms the "portrait" outline)
const LINKS = [
  [0, 8], [8, 1], [1, 10], [10, 7], [7, 5], [5, 4],
  [4, 6], [6, 2], [2, 9], [9, 0], [3, 1], [11, 4],
  [9, 8], [3, 7], [11, 5],
];

function colorFor(cat) {
  if (cat === 'comp')    return C.gold;
  if (cat === 'taste')   return C.accent;
  if (cat === 'fit')     return C.accent;
  if (cat === 'craft')   return C.ink;
  if (cat === 'place')   return C.mute;
  if (cat === 'life')    return C.gold;
  return C.ink;
}

function ConstellationPhase() {
  const t = window.useTime();
  if (t < T1 - 0.2 || t > T4 + 1.5) return null;
  const lt = t - T1;

  // Background: dark paper to match the "we're inside your story" mood
  const bgFade = window.clamp(lt / 0.8, 0, 1);

  // Each fact appears at staggered times during T2..T2+3.5
  const factsStartLT = T2 - T1; // 4s
  const factDur = 4.0;

  // Lines draw between T3..T3+1.5
  const linesStartLT = T3 - T1;
  const linesDur = 1.6;

  // Knowingness reveal at end
  const knowK = window.clamp((lt - (T4 - T1)) / 0.8, 0, 1);
  const ctaK = window.clamp((lt - (T4 - T1) - 1.0) / 0.6, 0, 1);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(ellipse at 50% 50%, #1F2A24 0%, #14180f 100%)`,
      opacity: bgFade,
      overflow: 'hidden',
    }}>
      {/* SVG canvas for connecting lines */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
      }}>
        {LINKS.map(([a, b], i) => {
          const fa = FACTS[a], fb = FACTS[b];
          const enterK = window.clamp(
            (lt - linesStartLT - i * 0.06) / linesDur, 0, 1
          );
          const eK = E.io(enterK);
          const x1 = fa.x * W, y1 = fa.y * H;
          const x2 = fb.x * W, y2 = fb.y * H;
          // animate from a's point to b's point
          const xEnd = lerp(x1, x2, eK);
          const yEnd = lerp(y1, y2, eK);
          return (
            <line key={i}
              x1={x1} y1={y1} x2={xEnd} y2={yEnd}
              stroke={C.gold}
              strokeWidth="1"
              strokeOpacity={0.55}
            />
          );
        })}
      </svg>

      {/* Eyebrow above */}
      <div style={{
        position: 'absolute', top: 140, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.data, fontSize: 22, letterSpacing: '0.32em',
        color: C.mute, fontWeight: 500,
        opacity: window.clamp(lt / 0.6, 0, 1),
      }}>VETTED · YOUR PROFILE</div>

      {/* Facts */}
      {FACTS.map((f, i) => {
        const enterK = window.clamp(
          (lt - factsStartLT - i * 0.18) / 0.6, 0, 1
        );
        if (enterK <= 0) return null;
        const eK = E.out(enterK);
        const op = eK * (1 - knowK * 0.4);
        const dotSize = lerp(0, 8, eK);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${f.x * 100}%`, top: `${f.y * 100}%`,
            transform: `translate(-50%, -50%) translateY(${(1 - eK) * 12}px)`,
            opacity: op,
            textAlign: 'center',
          }}>
            {/* dot */}
            <div style={{
              width: dotSize, height: dotSize, borderRadius: '50%',
              background: colorFor(f.cat),
              margin: '0 auto 12px',
              boxShadow: `0 0 16px ${colorFor(f.cat)}aa`,
            }}/>
            {/* label */}
            <div style={{
              fontFamily: f.cat === 'comp' || f.cat === 'place' ? F.data : F.serif,
              fontSize: 28,
              fontStyle: f.cat === 'taste' ? 'italic' : 'normal',
              color: '#F4F1E8',
              whiteSpace: 'nowrap',
              letterSpacing: f.cat === 'comp' ? '0.04em' : '-0.005em',
            }}>{f.txt}</div>
          </div>
        );
      })}

      {/* "We know you" climax */}
      {knowK > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '46%',
          textAlign: 'center',
          opacity: knowK,
          transform: `translateY(${(1 - knowK) * 16}px)`,
        }}>
          <div style={{
            fontFamily: F.serif, fontSize: 96, lineHeight: 1.1,
            color: '#F4F1E8', letterSpacing: '-0.02em',
            textShadow: '0 4px 30px rgba(0,0,0,0.6)',
          }}>We know you.</div>
          <div style={{
            marginTop: 28,
            fontFamily: F.serif, fontStyle: 'italic', fontSize: 32,
            color: C.gold, letterSpacing: '-0.005em',
          }}>So we'll only score what fits.</div>
        </div>
      )}

      {/* CTA */}
      {ctaK > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 160,
          textAlign: 'center',
          opacity: ctaK,
          transform: `translateY(${(1 - ctaK) * 14}px)`,
        }}>
          <div style={{
            fontFamily: F.data, fontSize: 22, letterSpacing: '0.28em',
            color: '#F4F1E8', fontWeight: 500,
          }}>BUILD YOUR PROFILE · 6 MIN</div>
          <div style={{
            marginTop: 18,
            fontFamily: F.data, fontSize: 18, letterSpacing: '0.18em',
            color: C.mute,
          }}>VETTED · ON THE APP STORE</div>
        </div>
      )}
    </div>
  );
}

function ActDirector() {
  return (
    <>
      <Act0HandShot jd={JD} T1={T1} caption="Before they decide if you fit…" />
      <ConstellationPhase/>
    </>
  );
}

window.ActDirector = ActDirector;
window.REEL_W = W; window.REEL_H = H; window.REEL_D = D;
window.REEL_BG = C.paper;
