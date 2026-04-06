import { useState } from "react";
import { ENDPOINTS } from "../config.js";
import { handleError } from "../handleError.js";

const TIERS = [
  {
    id: "signal",
    name: "Signal",
    price: "$24.99",
    period: "/ month",
    tagline: "For serious job seekers",
    features: [
      "Unlimited scoring",
      "All 5 core filters",
      "Custom filters",
      "Full AI analysis",
      "Score history",
    ],
    cta: "Subscribe to Signal",
    accent: "var(--accent)",
    badge: null,
  },
  {
    id: "vantage",
    name: "Vantage",
    price: "$49.99",
    period: "/ month",
    tagline: "For executives in active search",
    features: [
      "Everything in Signal",
      "Priority scoring queue",
      "Advanced narrative bridge",
      "Early access to new features",
      "Priority support",
    ],
    cta: "Subscribe to Vantage",
    accent: "var(--gold)",
    badge: "Best Value",
  },
];

export default function PaywallModal({ authUser, onClose }) {
  const [loading, setLoading] = useState(null); // "signal" | "vantage" | null
  const [error, setError] = useState("");

  async function handleUpgrade(tierId) {
    if (loading) return;
    setLoading(tierId);
    setError("");

    try {
      const res = await fetch(ENDPOINTS.checkout, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tierId,
          appleId: authUser?.id,
          sessionToken: authUser?.sessionToken || "",
          isNative: window.Capacitor?.isNativePlatform?.() === true,
        }),
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "Invalid session" || data.error === "Authentication required") {
          // Session expired — close modal so App can prompt re-sign-in
          setLoading(null);
          onClose("session_expired");
          return;
        }
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const { url } = await res.json();
      if (!url) throw new Error("No checkout URL returned");

      // Redirect to Stripe Checkout.
      // On iOS Capacitor (native app): open in system Safari so WKWebView state is preserved.
      // On web: navigate the current tab — Stripe will redirect back to success_url.
      const isNativeApp = window.Capacitor?.isNativePlatform?.() === true;
      if (isNativeApp) {
        window.open(url, "_blank");
        setLoading(null);
        onClose("pending");
      } else {
        // Web: navigate in-place. The success_url brings the user back to the app
        // with ?upgrade=success, which App.jsx detects to refresh tier state.
        window.location.href = url;
      }
    } catch (err) {
      handleError(err, "paywall_upgrade");
      setError(err?.message || "Could not start checkout. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,14,12,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--paper)", borderRadius: 8, width: "100%", maxWidth: 600,
        padding: "32px 28px", position: "relative", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 8px 40px rgba(15,14,12,0.28)",
      }}>
        {/* Close button */}
        <button
          onClick={() => onClose()}
          aria-label="Close"
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 22, color: "var(--muted)", lineHeight: 1, padding: 4,
            minWidth: 32, minHeight: 32,
          }}
        >×</button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
            You've used all 10 free scores this month
          </p>
          <h2 id="paywall-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
            Upgrade to keep scoring
          </h2>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
            Unlimited scoring. Full AI analysis. Cancel anytime.
          </p>
        </div>

        {/* Tier cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          {TIERS.map(tier => (
            <div key={tier.id} style={{
              border: `1.5px solid ${tier.accent}`,
              borderRadius: 6, padding: "20px 18px",
              position: "relative", background: "#fff",
            }}>
              {tier.badge && (
                <div style={{
                  position: "absolute", top: -10, right: 12,
                  background: tier.accent, color: "#fff",
                  fontSize: 10, fontWeight: 700, padding: "2px 10px",
                  borderRadius: 20, letterSpacing: ".05em",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>{tier.badge}</div>
              )}
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                {tier.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>{tier.tagline}</div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700 }}>{tier.price}</span>
                <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>{tier.period}</span>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, marginBottom: 18 }}>
                {tier.features.map((f, i) => (
                  <li key={i} style={{ fontSize: 13, color: "var(--ink)", paddingBottom: 5, display: "flex", alignItems: "flex-start", gap: 7, lineHeight: 1.4 }}>
                    <span style={{ color: tier.accent, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className="btn btn-primary"
                onClick={() => handleUpgrade(tier.id)}
                disabled={!!loading}
                aria-busy={loading === tier.id}
                style={{ width: "100%", background: tier.accent, fontSize: 13, minHeight: 42 }}
              >
                {loading === tier.id ? (
                  <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" /> Starting…</>
                ) : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>
        )}

        {/* Footer note */}
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
          Payment processed securely by Stripe. Cancel anytime — no long-term commitment.
        </p>
      </div>
    </div>
  );
}
