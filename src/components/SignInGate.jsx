import { ENDPOINTS } from "../config.js";
import LangSwitcher from "./LangSwitcher.jsx";

// ─── Error guidance map ───────────────────────────────────────────────────────
// Specific, actionable recovery steps per error type.
// Written for members — not generic "user" language.
const ERROR_GUIDANCE = {
  cancelled: {
    title: "Sign in was cancelled.",
    steps: null,
    showRetry: true,
    showClear: false,
  },
  bridge_error: {
    title: "The Sign in with Apple service didn't load.",
    steps: [
      "Close Vetted completely — swipe it away in the app switcher.",
      "Wait 5 seconds, then reopen the app and try again.",
      "If it still fails: restart your iPhone, then reopen Vetted.",
      "Last resort: delete Vetted, restart your iPhone, and reinstall from the App Store. Your account and data are saved — nothing will be lost.",
    ],
    showRetry: true,
    showClear: true,
  },
  network_error: {
    title: "Could not reach the authentication server.",
    steps: [
      "Check your Wi-Fi or cellular connection.",
      "If you're on VPN, try disabling it temporarily.",
      "Tap Try Again when your connection is restored.",
      "If the issue persists, restart your iPhone and try again.",
    ],
    showRetry: true,
    showClear: false,
  },
  server_error: {
    title: "Authentication couldn't be verified.",
    steps: [
      "Tap Reset & Try Again below — this clears any stale session data.",
      "Sign in fresh with your Apple ID.",
      "If this continues: restart your iPhone, reopen Vetted, and try once more.",
      "Still blocked? Email us at hello@tryvettedai.com and we'll sort it out.",
    ],
    showRetry: true,
    showClear: true,
  },
  unknown_error: {
    title: "Something went wrong during sign in.",
    steps: [
      "Tap Reset & Try Again to clear any stale session data.",
      "If the issue persists: close Vetted, restart your iPhone, and reopen the app.",
      "Last resort: delete Vetted, restart your iPhone, and reinstall from the App Store. Your account and data are saved.",
      "Still having trouble? Email hello@tryvettedai.com.",
    ],
    showRetry: true,
    showClear: true,
  },
};

export default function SignInGate({ t, lang, setLang, onSignIn, authLoading, authError, onClearAuth }) {
  const guidance = authError ? ERROR_GUIDANCE[authError] : null;

  return (
    <div className="region-gate">
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <p className="header-eyebrow">AI-Powered Opportunity Intelligence</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          <span style={{ color: "var(--accent)" }}>Vetted</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
          Filter The Noise. Score every role against what you actually care about.
        </p>
      </div>

      <LangSwitcher lang={lang} setLang={setLang} />

      <div className="card" style={{ textAlign: "center" }}>
        <h2 className="card-title" style={{ marginBottom: 8 }}>Welcome</h2>
        <p className="card-subtitle">Sign in to access your personalized career intelligence framework.</p>

        {/* ── Error state with actionable guidance ── */}
        {guidance && (
          <div role="alert" style={{
            background: "var(--cream)", border: "1.5px solid var(--border)",
            borderRadius: "var(--r)", padding: "16px", marginBottom: 16,
            textAlign: "left",
          }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: guidance.steps ? 10 : 0 }}>
              {guidance.title}
            </p>
            {guidance.steps && (
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {guidance.steps.map((step, i) => (
                  <li key={i} style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 2 }}>
                    {step}
                  </li>
                ))}
              </ol>
            )}
            {guidance.showClear && onClearAuth && (
              <button
                onClick={onClearAuth}
                style={{
                  marginTop: 12, width: "100%", padding: "8px 12px",
                  background: "transparent", border: "1.5px solid var(--border)",
                  borderRadius: "var(--r)", fontSize: 12, color: "var(--muted)",
                  cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: ".06em", textTransform: "uppercase",
                }}
              >
                Reset &amp; Try Again
              </button>
            )}
          </div>
        )}

        {/* ── Sign in button ── */}
        <button
          className="btn btn-primary"
          onClick={onSignIn}
          disabled={authLoading}
          aria-busy={authLoading}
          style={{ width: "100%", marginBottom: 16, minHeight: 50, fontSize: 16, gap: 10 }}
        >
          {authLoading ? (
            <>
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              {guidance ? "Try Again" : "Sign in with Apple"}
            </>
          )}
        </button>

        <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
          Your data is private and never sold.{" "}
          <a href={ENDPOINTS.privacy} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)" }}>Privacy Policy</a>
        </p>
      </div>

      {/* ── Support footer ── */}
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 16, lineHeight: 1.7 }}>
        Need help?{" "}
        <a href="mailto:hello@tryvettedai.com" style={{ color: "var(--muted)" }}>
          hello@tryvettedai.com
        </a>
      </p>
    </div>
  );
}
