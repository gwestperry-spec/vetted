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

// GitHub SVG mark
function GitHubMark({ size = 20, fill = "#E8F0E8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 98 96" fill={fill} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
    </svg>
  );
}

const isNative = () => Boolean(window.Capacitor?.isNativePlatform?.());

export default function SignInGate({ t, lang, setLang, onSignIn, onGitHubSignIn, authLoading, authError, onClearAuth }) {
  const guidance = authError ? ERROR_GUIDANCE[authError] : null;

  return (
    <div style={{
      maxWidth: 480,
      margin: "0 auto",
      paddingTop: 60,
      paddingBottom: 48,
      paddingLeft: 24,
      paddingRight: 24,
      background: "#FAFAF8",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      {/* ── Brand name ── */}
      <h1 style={{
        fontFamily: "var(--font-display)",
        fontSize: 32,
        fontWeight: 700,
        color: "#1A2E1A",
        marginTop: 0,
        marginBottom: 0,
      }}>Vetted</h1>

      {/* ── Tagline ── */}
      <p style={{
        fontFamily: "var(--font-data)",
        fontSize: 11,
        color: "#1A2E1A",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        marginTop: 6,
        marginBottom: 0,
      }}>Career Intelligence</p>

      {/* ── Green rule ── */}
      <div style={{
        height: 2,
        width: 32,
        background: "#1A2E1A",
        borderRadius: 1,
        margin: "20px auto",
      }} />

      {/* ── Brief copy ── */}
      <p style={{
        fontFamily: "var(--font-prose)",
        fontSize: 14,
        color: "#3A4A3A",
        textAlign: "center",
        maxWidth: 280,
        lineHeight: 1.7,
        marginBottom: 32,
      }}>Score every opportunity against what actually matters to you.</p>

      <div style={{ marginBottom: 28 }}>
        <LangSwitcher lang={lang} setLang={setLang} />
      </div>

      {/* ── Error state with actionable guidance ── */}
      {guidance && (
        <div role="alert" style={{
          background: "#F0F4F0",
          border: "1px solid #D8E8D8",
          borderRadius: 10,
          padding: "16px",
          marginBottom: 16,
          textAlign: "left",
          width: "100%",
          maxWidth: 320,
        }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: "#1A2E1A", marginBottom: guidance.steps ? 10 : 0 }}>
            {guidance.title}
          </p>
          {guidance.steps && (
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {guidance.steps.map((step, i) => (
                <li key={i} style={{ fontSize: 12, color: "#1A2E1A", lineHeight: 1.7, marginBottom: 2 }}>
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
                background: "transparent", border: "1px solid #D8E8D8",
                borderRadius: 8, fontSize: 12, color: "#1A2E1A",
                cursor: "pointer", fontFamily: "var(--font-data)",
                letterSpacing: ".06em", textTransform: "uppercase",
              }}
            >
              Reset &amp; Try Again
            </button>
          )}
        </div>
      )}

      {/* ── Sign in with Apple button ── */}
      <button
        onClick={onSignIn}
        disabled={authLoading}
        aria-busy={authLoading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          maxWidth: 320,
          minHeight: 52,
          background: "#1A2E1A",
          color: "#E8F0E8",
          border: "none",
          borderRadius: 10,
          fontFamily: "var(--font-prose)",
          fontSize: 16,
          fontWeight: 500,
          cursor: authLoading ? "not-allowed" : "pointer",
          opacity: authLoading ? 0.75 : 1,
          marginTop: 4,
          marginBottom: 16,
        }}
      >
        {authLoading ? (
          <>
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: "rgba(232,240,232,0.3)", borderTopColor: "#E8F0E8" }} aria-hidden="true" />
            Signing in…
          </>
        ) : (
          <>
            {/* Apple logo — 384×512 viewBox, aspect ratio 0.75, rendered at 18×24 */}
            <svg width="18" height="24" viewBox="0 0 384 512" fill="#E8F0E8" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
            </svg>
            {guidance ? "Try Again" : "Sign in with Apple"}
          </>
        )}
      </button>

      {/* ── Sign in with GitHub (web only) ── */}
      {!isNative() && onGitHubSignIn && (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%", maxWidth: 320, margin: "4px 0",
          }}>
            <div style={{ flex: 1, height: 1, background: "#D8E8D8" }} />
            <span style={{ fontFamily: "var(--font-data)", fontSize: 10, color: "#1A2E1A", letterSpacing: ".1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              or on web
            </span>
            <div style={{ flex: 1, height: 1, background: "#D8E8D8" }} />
          </div>
          <button
            onClick={onGitHubSignIn}
            disabled={authLoading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", maxWidth: 320, minHeight: 52,
              background: "#24292F", color: "#FFFFFF",
              border: "none", borderRadius: 10,
              fontFamily: "var(--font-prose)", fontSize: 16, fontWeight: 500,
              cursor: authLoading ? "not-allowed" : "pointer",
              opacity: authLoading ? 0.75 : 1,
              marginBottom: 16,
            }}
          >
            <GitHubMark size={20} fill="#FFFFFF" />
            Sign in with GitHub
          </button>
        </>
      )}

      {/* ── Free note ── */}
      <p style={{
        fontFamily: "var(--font-prose)",
        fontSize: 12,
        color: "#1A2E1A",
        textAlign: "center",
        marginTop: 0,
        marginBottom: 8,
      }}>Free to download · No card required</p>

      {/* ── Terms and Privacy ── */}
      <p style={{
        fontFamily: "var(--font-prose)",
        fontSize: 11,
        color: "#1A2E1A",
        textAlign: "center",
        lineHeight: 1.8,
        marginTop: 8,
      }}>
        <a href={ENDPOINTS.terms} target="_blank" rel="noopener noreferrer" style={{ color: "#1A2E1A", textDecoration: "none" }}>Terms of Use</a>
        {"  ·  "}
        <a href={ENDPOINTS.privacy} target="_blank" rel="noopener noreferrer" style={{ color: "#1A2E1A", textDecoration: "none" }}>Privacy Policy</a>
      </p>

      {/* ── Blog footer (web only — hidden in native app) ── */}
      {!isNative() && (
        <div style={{
          width: "100%",
          maxWidth: 320,
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid #E0E8E0",
          paddingBottom: 12,
          textAlign: "center",
        }}>
          <a
            href="/blog"
            style={{
              display: "block",
              fontFamily: "var(--font-prose)",
              fontSize: 13,
              fontWeight: 500,
              color: "#2d6a4f",
              textDecoration: "none",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            CAREER INTELLIGENCE BLOG
          </a>
          <span style={{
            fontFamily: "var(--font-prose)",
            fontSize: 11,
            fontWeight: 400,
            color: "#1A2E1A",
          }}>
            tryvettedai.com
          </span>
        </div>
      )}
    </div>
  );
}
