// ─── WalkthroughModal — First-Run Onboarding Overlay ─────────────────────────
// Fires once on first dashboard entry. Stored in localStorage so it never
// re-appears. Explains the three core moves: Score → Coach → Compare.

export default function WalkthroughModal({ t, userTier, onDismiss }) {
  const isVantage = userTier === "vantage" || userTier === "vantage_lifetime";
  const isPaid    = userTier && userTier !== "free";

  const features = [
    {
      icon: "◎",
      color: "var(--accent)",
      bg: "#c8edda",
      title: t.walkthroughScoreTitle,
      desc:  t.walkthroughScoreDesc,
      badge: null,
    },
    {
      icon: "💬",
      color: "var(--gold)",
      bg: "var(--gold-light)",
      title: t.walkthroughCoachTitle,
      desc:  t.walkthroughCoachDesc,
      badge: "Vantage",
    },
    {
      icon: "⇄",
      color: "var(--accent)",
      bg: "var(--cream)",
      title: t.walkthroughCompareTitle,
      desc:  t.walkthroughCompareDesc,
      badge: "Vantage",
    },
  ];

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        onClick={onDismiss}
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(15,14,12,0.65)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* ── Modal ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wt-title"
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 401,
          width: "calc(100% - 32px)",
          maxWidth: 480,
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
          background: "#fff",
          borderRadius: "var(--r)",
          boxShadow: "0 24px 64px rgba(15,14,12,0.28)",
          padding: "32px 28px 24px",
        }}
      >
        {/* ── Eyebrow ── */}
        <p style={{
          fontFamily: "var(--font-data)",
          fontSize: 11, fontWeight: 700,
          letterSpacing: ".22em", textTransform: "uppercase",
          color: "var(--accent)", marginBottom: 12,
        }}>
          Vetted · Quick Start
        </p>

        {/* ── Headline ── */}
        <h1
          id="wt-title"
          style={{
            fontFamily: "var(--font-prose)",
            fontSize: 28, fontWeight: 700,
            lineHeight: 1.15, marginBottom: 6,
          }}
        >
          {t.walkthroughTitle}
        </h1>

        <p style={{
          fontSize: 14, color: "#5A6A5A",
          lineHeight: 1.5, marginBottom: 28,
        }}>
          {t.walkthroughSubtitle}
        </p>

        {/* ── Feature cards ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                padding: "14px 16px",
                background: "var(--paper)",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--r)",
              }}
            >
              {/* Icon bubble */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: f.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0,
              }}>
                {f.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7, marginBottom: 4,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                    {f.title}
                  </span>
                  {f.badge && (
                    <span style={{
                      fontFamily: "var(--font-data)",
                      fontSize: 11, fontWeight: 700,
                      letterSpacing: ".1em", textTransform: "uppercase",
                      background: isVantage ? "var(--gold)" : "var(--border)",
                      color: isVantage ? "#fff" : "var(--muted)",
                      padding: "2px 6px", borderRadius: 20,
                      flexShrink: 0,
                    }}>
                      {f.badge}
                    </span>
                  )}
                </div>
                <p style={{
                  fontSize: 12, color: "#5A6A5A",
                  lineHeight: 1.6, margin: 0,
                }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tier note for non-Vantage ── */}
        {!isVantage && (
          <p style={{
            fontSize: 11, color: "#5A6A5A",
            lineHeight: 1.5, marginBottom: 20,
            padding: "10px 14px",
            background: "var(--gold-light)",
            borderRadius: "var(--r)",
            borderLeft: "3px solid var(--gold)",
          }}>
            Coaching and Compare are Vantage features. You can score unlimited roles and unlock them at any time.
          </p>
        )}

        {/* ── CTA ── */}
        <button
          className="btn btn-primary"
          onClick={onDismiss}
          style={{ width: "100%", justifyContent: "center", fontSize: 15, marginBottom: 12 }}
          autoFocus
        >
          {t.walkthroughCta}
        </button>

        {/* ── Skip ── */}
        <button
          onClick={onDismiss}
          style={{
            display: "block", width: "100%",
            background: "none", border: "none",
            cursor: "pointer", color: "var(--muted)",
            fontSize: 12, textAlign: "center",
            fontFamily: "inherit", padding: "6px 0",
            minHeight: 36,
          }}
        >
          {t.walkthroughSkip}
        </button>
      </div>
    </>
  );
}
