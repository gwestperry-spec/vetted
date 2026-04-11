import { useState } from "react";
import { ENDPOINTS } from "../config.js";
import { handleError } from "../handleError.js";

const LINK = { color: "var(--muted)", textDecoration: "underline" };

const TIERS = [
  {
    id: "signal",
    iapId: "com.vettedai.app.signal.monthly",
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
    iapId: "com.vettedai.app.vantage.monthly",
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

const LIFETIME_TIERS = [
  {
    id: "signal_lifetime",
    iapId: "com.vettedai.app.signal.lifetime",
    name: "Signal Founding Member",
    price: "$399",
    tagline: "Everything in Signal — pay once, use forever",
    cta: "Get Signal Lifetime",
    accent: "var(--accent)",
  },
  {
    id: "vantage_lifetime",
    iapId: "com.vettedai.app.vantage.lifetime",
    name: "Vantage Founding Member",
    price: "$799",
    tagline: "Everything in Vantage — pay once, use forever",
    cta: "Get Vantage Lifetime",
    accent: "var(--gold)",
  },
];

const isNativeApp = window.Capacitor?.isNativePlatform?.() === true;

// Tier rank — higher index = higher tier
const TIER_RANK = { free: 0, signal: 1, signal_lifetime: 2, vantage: 3, vantage_lifetime: 4 };

export default function PaywallModal({ authUser, onClose }) {
  const [loading, setLoading] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");
  const [error, setError] = useState("");

  // ── iOS — StoreKit 2 via native plugin ────────────────────────────────────
  async function handleIAPUpgrade(tier) {
    if (loading) return;
    setLoading(tier.id);
    setError("");

    try {
      const plugin = window.Capacitor?.Plugins?.StoreKitPlugin;
      if (!plugin) throw new Error("StoreKit not available");

      // Initiate native purchase sheet
      const result = await plugin.purchase({ productId: tier.iapId });

      if (!result?.jws) throw new Error("No transaction returned from StoreKit");

      // Validate server-side and update Supabase
      const res = await fetch(ENDPOINTS.appleIap, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jws: result.jws,
          appleId: authUser?.id,
          sessionToken: authUser?.sessionToken || "",
        }),
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "Invalid session" || data.error === "Authentication required") {
          setLoading(null);
          onClose("session_expired");
          return;
        }
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Validation failed (${res.status})`);
      }

      const { tier: confirmedTier } = await res.json();
      setLoading(null);
      // Signal success with the confirmed tier — App.jsx applies it immediately,
      // no polling needed (IAP validation is synchronous).
      onClose("iap_success", confirmedTier);

    } catch (err) {
      if (err?.message === "cancelled" || err?.message === "pending") {
        setLoading(null);
        return;
      }
      handleError(err, "iap_upgrade");
      setError(err?.message || "Purchase failed. Please try again.");
      setLoading(null);
    }
  }

  // ── Web — Stripe Checkout ─────────────────────────────────────────────────
  async function handleStripeUpgrade(tierId) {
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
          isNative: false,
        }),
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "Invalid session" || data.error === "Authentication required") {
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

      // Web: navigate in-place; success_url returns with ?upgrade=success
      window.location.href = url;

    } catch (err) {
      handleError(err, "stripe_upgrade");
      setError(err?.message || "Could not start checkout. Please try again.");
      setLoading(null);
    }
  }

  // ── Restore Purchases (iOS only — Apple requirement) ─────────────────────
  async function handleRestorePurchases() {
    if (restoring || loading) return;
    setRestoring(true);
    setRestoreMsg("");
    setError("");

    try {
      const plugin = window.Capacitor?.Plugins?.StoreKitPlugin;
      if (!plugin) throw new Error("StoreKit not available");

      const { transactions } = await plugin.restorePurchases();

      if (!transactions?.length) {
        setRestoreMsg("No previous purchases found.");
        setRestoring(false);
        return;
      }

      // Validate each entitlement server-side; apply the highest tier found
      let bestTier = null;
      for (const tx of transactions) {
        try {
          const res = await fetch(ENDPOINTS.appleIap, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jws: tx.jws,
              appleId: authUser?.id,
              sessionToken: authUser?.sessionToken || "",
            }),
          });
          if (res.ok) {
            const { tier } = await res.json();
            if (tier && (TIER_RANK[tier] ?? 0) > (TIER_RANK[bestTier] ?? 0)) {
              bestTier = tier;
            }
          }
        } catch { /* skip failed validation, try next */ }
      }

      if (bestTier) {
        setRestoring(false);
        onClose("iap_success", bestTier);
      } else {
        setRestoreMsg("Purchases found but could not be verified. Please contact support.");
        setRestoring(false);
      }
    } catch (err) {
      handleError(err, "restore_purchases");
      setError(err?.message || "Restore failed. Please try again.");
      setRestoring(false);
    }
  }

  // Route to the correct payment path based on platform
  function handleUpgrade(tier) {
    if (isNativeApp) {
      handleIAPUpgrade(tier);
    } else {
      handleStripeUpgrade(tier.id);
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
          <p style={{ fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
            You've used all 10 free scores this month
          </p>
          <h2 id="paywall-title" style={{ fontFamily: "var(--font-prose)", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
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
                  fontFamily: "var(--font-data)",
                }}>{tier.badge}</div>
              )}
              <div style={{ fontFamily: "var(--font-prose)", fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                {tier.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>{tier.tagline}</div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontFamily: "var(--font-prose)", fontSize: 26, fontWeight: 700 }}>{tier.price}</span>
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
                onClick={() => handleUpgrade(tier)}
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

        {/* Founding member section */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, marginBottom: 20 }}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <p style={{ fontFamily: "var(--font-data)", fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
              Founding Member — Limited Seats
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              Pay once. Use forever. Lock in access before prices increase.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {LIFETIME_TIERS.map(tier => (
              <div key={tier.id} style={{
                border: `1.5px solid ${tier.accent}`,
                borderRadius: 6, padding: "16px 14px",
                background: "#fff", opacity: 0.92,
              }}>
                <div style={{ fontFamily: "var(--font-prose)", fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
                  {tier.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, lineHeight: 1.4 }}>{tier.tagline}</div>
                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontFamily: "var(--font-prose)", fontSize: 22, fontWeight: 700 }}>{tier.price}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>one-time</span>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleUpgrade(tier)}
                  disabled={!!loading}
                  aria-busy={loading === tier.id}
                  style={{ width: "100%", fontSize: 12, minHeight: 38, borderColor: tier.accent, color: tier.accent }}
                >
                  {loading === tier.id ? (
                    <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} aria-hidden="true" /> Starting…</>
                  ) : tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>
        )}

        {/* Restore message */}
        {restoreMsg && (
          <p role="status" style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
            {restoreMsg}
          </p>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          {/* Apple-required auto-renewal disclosure */}
          {isNativeApp && (
            <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6, marginBottom: 8 }}>
              Payment will be charged to your Apple ID at confirmation of purchase. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your Apple ID account settings.
            </p>
          )}
          <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6, marginBottom: 10 }}>
            {isNativeApp
              ? "Vetted · Career Intelligence Subscription"
              : "Payment processed securely by Stripe. Subscriptions can be cancelled anytime."}
          </p>
          {/* Required links */}
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: isNativeApp ? 6 : 0 }}>
            <a href={ENDPOINTS.privacy} target="_blank" rel="noopener noreferrer" style={LINK}>Privacy Policy</a>
            <span style={{ margin: "0 8px" }}>·</span>
            <a href={ENDPOINTS.terms} target="_blank" rel="noopener noreferrer" style={LINK}>Terms of Use</a>
          </p>
          {isNativeApp && (
            <button
              onClick={handleRestorePurchases}
              disabled={restoring || !!loading}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted)", fontSize: 12,
                textDecoration: "underline", fontFamily: "inherit",
                padding: "4px 8px", minHeight: 36,
              }}
            >
              {restoring ? "Restoring…" : "Restore Purchases"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
