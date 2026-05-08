// Shared helpers + JD data for all Vetted reels.
// Each reel imports this first, then its own scenes file.

window.VETTED = window.VETTED || {};

// ─── tokens ─────────────────────────────────────────────────────────────
window.VETTED.C = {
  ink:    '#1F2A24',
  paper:  '#F4F1E8',
  cream:  '#FAF6EC',
  accent: '#2D6A4F',
  gold:   '#B8945A',
  mute:   '#8A9A8A',
  border: '#D8DBD3',
  clay:   '#A85C45',
};
window.VETTED.F = {
  serif: '"Libre Baskerville", Georgia, serif',
  prose: '"Inter", system-ui, sans-serif',
  data:  '"Inter", system-ui, sans-serif',
};

// ─── easing ─────────────────────────────────────────────────────────────
window.VETTED.lerp = (a, b, t) => a + (b - a) * t;
window.VETTED.E = {
  out: window.Easing.easeOutCubic,
  in:  window.Easing.easeInCubic,
  io:  window.Easing.easeInOutCubic,
  oe:  window.Easing.easeOutExpo,
};

// ─── JD library — one per reel, varied roles ───────────────────────────
window.VETTED.JDs = {
  gtm: {
    company: 'Anthropic',
    title: 'Head of GTM Operations',
    eyebrow: 'SCORE A NEW ROLE',
    body:
      "Head of GTM Operations.  Anthropic.  $240–290k base.\n" +
      "Own the revenue motion: pipeline, forecast, comp design.\n" +
      "Report to COO.  Hybrid SF.  Equity material.",
  },
  electrician: {
    company: 'Local 3 IBEW',
    title: 'Master Electrician · Foreman',
    eyebrow: 'SCORE A NEW JOB',
    body:
      "Master Electrician · Foreman.  Local 3 IBEW.\n" +
      "$58/hr scale + benefits package.  OT after 8.\n" +
      "Commercial high-rise · Manhattan.  Days, M–F.",
  },
  artDirector: {
    company: 'The Atavist',
    title: 'Art Director · Editorial',
    eyebrow: 'SCORE A NEW ROLE',
    body:
      "Art Director, Editorial.  The Atavist Magazine.\n" +
      "$135–155k.  Long-form features, monthly cadence.\n" +
      "Reports to EIC.  Brooklyn, hybrid 2/wk.",
  },
  cfo: {
    company: 'Marigold Health',
    title: 'Chief Financial Officer',
    eyebrow: 'SCORE A NEW ROLE',
    body:
      "Chief Financial Officer.  Marigold Health (Series D).\n" +
      "$340–410k base + 0.6–1.0% equity.  Reports to CEO.\n" +
      "Lead Series E, build FP&A team.  Boston, hybrid.",
  },
  product: {
    company: 'Linear',
    title: 'Head of Product',
    eyebrow: 'SCORE A NEW ROLE',
    body:
      "Head of Product.  Linear.  $260–310k + meaningful equity.\n" +
      "Own roadmap, hire 3 PMs, partner with Karri & Tuomas.\n" +
      "Remote-first, quarterly onsites.",
  },
  techDirector: {
    company: 'Soho Rep.',
    title: 'Technical Director',
    eyebrow: 'SCORE A NEW ROLE',
    body:
      "Technical Director.  Soho Rep.\n" +
      "$78–92k.  4 mainstage productions/season.\n" +
      "Black-box venue, 75 seats.  Walker Street, NYC.",
  },
};

// ─── Typed JD effect ────────────────────────────────────────────────────
// Renders a string with a typewriter cursor over [startAt, startAt+dur].
window.VETTED.TypedJD = function TypedJD({ jd, startAt = 0.4, dur = 3.0, cursorWhile = 5.5 }) {
  const t = window.useTime();
  const { lerp, E, C } = window.VETTED;
  const full = jd.body;
  const k = window.clamp((t - startAt) / dur, 0, 1);
  const n = Math.floor(full.length * E.out(k));
  const shown = full.slice(0, n);
  const cursorOn = (Math.floor(t * 2.5) % 2) === 0 && t < cursorWhile;
  const lines = shown.split('\n');
  return (
    <span>
      {lines.map((line, i) => (
        <span key={i}>{line}{i < lines.length - 1 && <br/>}</span>
      ))}
      {cursorOn && n < full.length && <span style={{
        display: 'inline-block', width: 3, height: '0.85em',
        background: C.ink, marginLeft: 3, verticalAlign: 'baseline',
      }}/>}
    </span>
  );
};

// ─── Hand-and-phone opening (Act 0) ─────────────────────────────────────
// Reusable across reels. Pass the JD + the time at which Act 0 ends (T1).
window.VETTED.Act0HandShot = function Act0HandShot({ jd, T1 = 5.0, caption = 'Before you take the role…' }) {
  const t = window.useTime();
  if (t > T1 + 0.4) return null;
  const { lerp, E, C, F, TypedJD } = window.VETTED;

  const k = window.clamp(t / T1, 0, 1);
  const kE = E.io(k);
  const phoneScale = lerp(0.78, 1.18, kE);
  const bob = Math.sin(t * 1.6) * 6 + Math.cos(t * 2.3) * 3;
  const tilt = Math.sin(t * 0.9) * 0.4;
  const envFade = window.clamp(1 - (t - (T1 - 1.0)) / 1.0, 0, 1);
  const handIn = window.clamp((t - 0.3) / 0.5, 0, 1);
  const handOut = window.clamp(1 - (t - (T1 - 1.4)) / 0.6, 0, 1);
  const handOpacity = handIn * handOut;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse at 50% 45%, #2a2520 0%, #14110f 70%, #0a0907 100%)',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%',
        background: 'linear-gradient(180deg, transparent 0%, #1a1410 60%, #110d0a 100%)',
        opacity: envFade,
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 30% 25%, rgba(184,148,90,0.08) 0%, transparent 35%),
                          radial-gradient(circle at 70% 70%, rgba(45,106,79,0.05) 0%, transparent 40%)`,
        opacity: envFade,
      }}/>
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%, calc(-50% + ${bob}px)) rotate(${tilt}deg) scale(${phoneScale})`,
        transformOrigin: '50% 50%',
      }}>
        <div style={{
          width: 540, height: 1100, borderRadius: 68,
          background: '#0c0a08',
          border: '2px solid #2a2620',
          boxShadow: '0 80px 120px rgba(0,0,0,0.6), 0 30px 60px rgba(0,0,0,0.4), inset 0 0 0 6px #181412',
          padding: 14, position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 14, borderRadius: 56,
            background: C.paper, overflow: 'hidden',
          }}>
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
            <div style={{
              marginTop: 28, textAlign: 'center',
              fontFamily: F.data, fontSize: 14, letterSpacing: '0.32em',
              color: C.mute, fontWeight: 500,
            }}>VETTED · WORKSPACE</div>
            <div style={{
              marginTop: 280, marginLeft: 40,
              fontFamily: F.data, fontSize: 13, letterSpacing: '0.22em',
              color: C.mute, fontWeight: 500,
            }}>{jd.eyebrow}</div>
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
                <TypedJD jd={jd} startAt={0.6} dur={T1 - 1.6} cursorWhile={T1 - 0.4}/>
              </div>
            </div>
            <div style={{
              marginTop: 28, textAlign: 'center',
              fontFamily: F.data, fontSize: 11, letterSpacing: '0.18em',
              color: C.mute,
            }}>PASTE · TYPE · OR LINK</div>
          </div>
        </div>
        <div style={{
          position: 'absolute', left: -120, bottom: -40,
          width: 280, height: 380,
          borderRadius: '50% 50% 60% 40% / 60% 60% 40% 40%',
          background: 'linear-gradient(135deg, #c9a888 0%, #a07a55 60%, #6b4a30 100%)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset -20px -10px 30px rgba(0,0,0,0.3)',
          opacity: handOpacity,
          transform: `rotate(-25deg) translateX(${(1 - handIn) * -40}px)`,
        }}/>
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
      <div style={{
        position: 'absolute', bottom: 180, left: 0, right: 0,
        textAlign: 'center',
        opacity: envFade * 0.85,
        fontFamily: F.serif, fontSize: 38, fontStyle: 'italic',
        color: '#F4F1E8', letterSpacing: '-0.005em',
        textShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}>
        {caption}
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }}/>
      {t > T1 - 0.4 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: C.paper,
          opacity: window.clamp((t - (T1 - 0.4)) / 0.4, 0, 1),
        }}/>
      )}
    </div>
  );
};

// ─── End-card CTA (used by every reel) ──────────────────────────────────
window.VETTED.EndCard = function EndCard({ headline, sub, show = true, fadeIn = 0 }) {
  const { C, F } = window.VETTED;
  const op = window.clamp(fadeIn, 0, 1);
  if (!show) return null;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 120,
      textAlign: 'center', opacity: op,
      transform: `translateY(${(1 - op) * 18}px)`,
    }}>
      <div style={{
        fontFamily: F.serif, fontSize: 52, lineHeight: 1.15,
        color: C.ink, letterSpacing: '-0.01em', padding: '0 80px',
      }}>{headline}</div>
      {sub && <div style={{
        marginTop: 20,
        fontFamily: F.data, fontSize: 22, letterSpacing: '0.28em',
        color: C.mute, fontWeight: 500,
      }}>{sub}</div>}
    </div>
  );
};
