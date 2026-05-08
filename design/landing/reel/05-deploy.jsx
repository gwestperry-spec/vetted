// Reel 05 — Deploy Advocate
// JD: Head of Product · Linear
// Cinematic device: agent fans out from center into a grid of recruiter inboxes,
// time-lapse, then a push notification arrives on the user's phone.

const { C, F, lerp, E, JDs, Act0HandShot, EndCard } = window.VETTED;
const W = 1080, H = 1920, D = 20;
const T1 = 5;
const T2 = 7.5;   // deploy starts
const T3 = 13;    // time-lapse complete
const T4 = 14.5;  // notification arrives
const T5 = 18;    // CTA

const JD = JDs.product;

// 18 inbox cards in a grid that the agent "reaches into"
const INBOXES = [
  { co: 'Notion',     role: 'VP Product' },
  { co: 'Figma',      role: 'Head of Design Eng' },
  { co: 'Vercel',     role: 'Director of Product' },
  { co: 'Stripe',     role: 'Group PM · Payments' },
  { co: 'Ramp',       role: 'Head of Product' },
  { co: 'Anthropic',  role: 'Product Lead · Claude' },
  { co: 'Retool',     role: 'Director of PM' },
  { co: 'Linear',     role: 'Head of Product' },
  { co: 'Arc',        role: 'VP Product' },
  { co: 'Replit',     role: 'Head of Product' },
  { co: 'Loom',       role: 'Group PM' },
  { co: 'Airtable',   role: 'Director of Product' },
  { co: 'Webflow',    role: 'VP Product' },
  { co: 'Linear (B)', role: 'Sr. PM · Mobile' },
  { co: 'Pitch',      role: 'Head of Product' },
  { co: 'Cursor',     role: 'Founding PM' },
  { co: 'Granola',    role: 'Product Lead' },
  { co: 'Mercury',    role: 'Director of Product' },
];

// Status states an inbox can be in during the time-lapse
function statusAt(idx, lt) {
  // Each inbox starts being "engaged" at slightly different time
  const local = lt - (T2 - T1) - idx * 0.05;
  if (local < 0) return { state: 'idle', k: 0 };
  if (local < 0.6) return { state: 'reaching', k: local / 0.6 };
  if (local < 1.4) return { state: 'reading', k: (local - 0.6) / 0.8 };
  // After 1.4s, deterministically resolve to one of three states
  // Most "passed", a few "interested", one "match"
  const rng = (idx * 7919) % 100;
  if (idx === 7) return { state: 'match', k: 1 };           // Linear
  if (rng < 20)  return { state: 'interested', k: 1 };
  return { state: 'passed', k: 1 };
}

function DeployPhase() {
  const t = window.useTime();
  if (t < T1 - 0.2 || t > T4 + 0.2) return null;
  const lt = t - T1;

  const bgK = window.clamp(lt / 0.5, 0, 1);
  const titleK = window.clamp(lt / 0.7, 0, 1);

  // Beam sweep ring radius
  const beamLT = lt - (T2 - T1);
  const beamR = beamLT > 0 ? beamLT * 320 : 0;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.paper,
      opacity: bgK,
      overflow: 'hidden',
    }}>
      {/* Eyebrow */}
      <div style={{
        position: 'absolute', top: 110, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.data, fontSize: 22, letterSpacing: '0.32em',
        color: C.mute, fontWeight: 500,
        opacity: titleK,
      }}>VETTED · ADVOCATE</div>
      {/* Title */}
      <div style={{
        position: 'absolute', top: 170, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.serif, fontSize: 56, lineHeight: 1.15,
        color: C.ink, letterSpacing: '-0.015em',
        padding: '0 80px',
        opacity: titleK,
      }}>
        Pitching you to 18 hiring managers.
      </div>
      <div style={{
        position: 'absolute', top: 270, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.serif, fontStyle: 'italic', fontSize: 28,
        color: C.mute,
        opacity: titleK,
      }}>
        While you sleep.
      </div>

      {/* Center beacon — agent core */}
      {beamLT > -0.5 && (
        <div style={{
          position: 'absolute', left: '50%', top: 1000,
          transform: 'translate(-50%, -50%)',
        }}>
          {/* expanding ring */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: beamR * 2, height: beamR * 2, borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            border: `1.5px solid ${C.accent}`,
            opacity: window.clamp(1 - beamLT / 4, 0, 0.5),
          }}/>
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: Math.max(0, (beamR - 60) * 2), height: Math.max(0, (beamR - 60) * 2),
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            border: `1px solid ${C.gold}`,
            opacity: window.clamp(0.4 - beamLT / 6, 0, 0.4),
          }}/>
          {/* core */}
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            background: `radial-gradient(circle, ${C.accent} 0%, ${C.ink} 80%)`,
            boxShadow: `0 0 60px ${C.accent}aa`,
          }}/>
          <div style={{
            position: 'absolute', left: '50%', top: 'calc(100% + 22px)',
            transform: 'translateX(-50%)',
            fontFamily: F.data, fontSize: 18, letterSpacing: '0.22em',
            color: C.accent, fontWeight: 600, whiteSpace: 'nowrap',
          }}>VQ ADVOCATE · DEPLOYED</div>
        </div>
      )}

      {/* Inbox grid */}
      <div style={{
        position: 'absolute', left: 60, right: 60,
        top: 380, height: 540,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
      }}>
        {INBOXES.map((inb, i) => {
          const s = statusAt(i, lt);
          const enterK = window.clamp(s.k, 0, 1);
          let bg = C.cream;
          let badge = null;
          let badgeColor = C.mute;
          let opacity = 1;
          if (s.state === 'idle') {
            bg = C.cream; opacity = 0.55;
          } else if (s.state === 'reaching') {
            bg = `color-mix(in oklab, ${C.cream} ${(1 - enterK) * 100}%, ${C.gold} ${enterK * 100}%)`;
            badge = '...';
          } else if (s.state === 'reading') {
            bg = '#f4ecdb';
            badge = 'READING';
            badgeColor = C.gold;
          } else if (s.state === 'interested') {
            bg = '#eef3ee';
            badge = 'INTERESTED';
            badgeColor = C.accent;
          } else if (s.state === 'match') {
            bg = C.accent;
            badge = 'MATCH';
            badgeColor = '#fff';
          } else if (s.state === 'passed') {
            bg = C.cream; opacity = 0.45;
            badge = 'PASS';
            badgeColor = C.mute;
          }
          const isMatch = s.state === 'match';
          return (
            <div key={i} style={{
              background: bg, borderRadius: 10,
              border: `1px solid ${isMatch ? C.accent : C.border}`,
              padding: '10px 12px',
              opacity,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              transition: 'background 0.3s',
              boxShadow: isMatch ? `0 0 24px ${C.accent}66` : 'none',
              transform: isMatch ? 'scale(1.05)' : 'scale(1)',
            }}>
              <div style={{
                fontFamily: F.serif, fontSize: 16, lineHeight: 1.2,
                color: isMatch ? '#fff' : C.ink, fontWeight: 700,
              }}>{inb.co}</div>
              <div style={{
                fontFamily: F.data, fontSize: 11, lineHeight: 1.3,
                color: isMatch ? 'rgba(255,255,255,0.8)' : C.mute,
                marginTop: 4,
              }}>{inb.role}</div>
              {badge && (
                <div style={{
                  marginTop: 6,
                  fontFamily: F.data, fontSize: 9, letterSpacing: '0.18em',
                  color: badgeColor, fontWeight: 700,
                }}>{badge}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats counter */}
      <div style={{
        position: 'absolute', bottom: 200, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.serif, fontSize: 36, color: C.ink,
        opacity: window.clamp((lt - 5) / 0.6, 0, 1),
      }}>
        <span style={{ color: C.accent, fontWeight: 700 }}>1 match</span>
        <span style={{ color: C.mute, fontStyle: 'italic' }}> · 3 interested · 14 passed</span>
      </div>
    </div>
  );
}

// Push notification arriving on phone — lockscreen-ish
function NotificationPhase() {
  const t = window.useTime();
  if (t < T4 - 0.2) return null;
  const lt = t - T4;

  const bgK = window.clamp(lt / 0.5, 0, 1);
  const notifK = window.clamp((lt - 0.5) / 0.5, 0, 1);
  const ctaK = window.clamp((lt - 2.8) / 0.6, 0, 1);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0a0807',
      opacity: bgK,
      overflow: 'hidden',
    }}>
      {/* Wallpaper-ish: subtle warm gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 30%, #1a1814 0%, #0a0807 75%)',
      }}/>

      {/* Time on lockscreen */}
      <div style={{
        position: 'absolute', top: 280, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.serif, fontSize: 180, lineHeight: 1,
        color: '#F4F1E8', fontWeight: 400, letterSpacing: '-0.03em',
      }}>
        2:14
      </div>
      <div style={{
        position: 'absolute', top: 480, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: F.data, fontSize: 22, letterSpacing: '0.18em',
        color: 'rgba(244,241,232,0.6)',
      }}>
        TUESDAY · MARCH 12
      </div>

      {/* Notification card */}
      <div style={{
        position: 'absolute', left: 60, right: 60, top: 720,
        background: 'rgba(244,241,232,0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 22, padding: '20px 22px',
        opacity: notifK,
        transform: `translateY(${(1 - notifK) * 30}px) scale(${lerp(0.9, 1, notifK)})`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: F.data, fontSize: 13, letterSpacing: '0.18em',
          color: C.mute, fontWeight: 600,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: C.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: F.serif, fontSize: 14, fontWeight: 700,
          }}>V</div>
          <span>VETTED</span>
          <span style={{ marginLeft: 'auto', color: C.mute, opacity: 0.7 }}>now</span>
        </div>
        <div style={{
          marginTop: 10,
          fontFamily: F.serif, fontSize: 24, lineHeight: 1.3,
          color: C.ink, fontWeight: 700,
        }}>
          Linear is interested.
        </div>
        <div style={{
          marginTop: 6,
          fontFamily: F.serif, fontSize: 19, lineHeight: 1.4,
          color: C.ink, fontStyle: 'italic',
        }}>
          Head of Product. They want to talk this week. VQ scored it 4.6.
        </div>
      </div>

      {/* CTA */}
      <EndCard
        headline="Let your advocate work the night shift."
        sub="VETTED · ON THE APP STORE"
        fadeIn={ctaK}
      />
    </div>
  );
}

function ActDirector() {
  return (
    <>
      <Act0HandShot jd={JD} T1={T1} caption="Before you spam the inboxes…" />
      <DeployPhase/>
      <NotificationPhase/>
    </>
  );
}

window.ActDirector = ActDirector;
window.REEL_W = W; window.REEL_H = H; window.REEL_D = D;
window.REEL_BG = C.paper;
