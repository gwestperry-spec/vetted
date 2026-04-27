import { useRef, useState } from "react";
import { ENDPOINTS } from "../config.js";
import { handleError } from "../utils/handleError.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

const isNativeApp = window.Capacitor?.isNativePlatform?.() === true;

const TIER_RANK = { free: 0, signal: 1, signal_lifetime: 2, vantage: 3, vantage_lifetime: 4 };

const COLLAPSED_COUNT = 3;

// ── Plan definitions ──────────────────────────────────────────────────────────

const FREE_PLAN = {
  id: "free",
  tier: "free",
  label: "FREE",
  price: "$0",
  cadence: "/ FOREVER",
  tagline: "Score roles. Build your framework.",
  bullets: [
    "Score up to 3 roles per month",
    "5 core filters pre-loaded",
    "VQ score + overall recommendation",
    "VQ Advocate — first 3 patterns",
  ],
  purchasable: false,
};

const MONTHLY = [
  {
    id: "signal",
    iapId: "com.vettedai.app.signal.monthly",
    tier: "signal",
    label: "SIGNAL",
    price: "$24.99",
    cadence: "/ MO",
    tagline: "See the work. Score with rationale.",
    bullets: [
      "Everything in Free",
      "Per-filter rationale + JD evidence",
      "Full strengths and gaps",
      "Narrative bridge",
      "VQ Advocate — pattern detection",
      "Notes per scorecard",
      "Coaching tab + Compare",
      "PDF export · Resume parse",
    ],
    purchasable: true,
  },
  {
    id: "vantage",
    iapId: "com.vettedai.app.vantage.monthly",
    tier: "vantage",
    label: "VANTAGE",
    price: "$49.99",
    cadence: "/ MO",
    tagline: "The full read. For roles that matter.",
    bullets: [
      "Everything in Signal",
      "Coaching tab — moves + questions",
      "Compare two roles side-by-side",
      "PDF export — boardroom-ready",
      "Resume parse + auto pre-fill",
      "VQ Advocate — proactive coaching",
      "Market Pulse salary benchmarks",
      "Priority support · 4-hour response",
    ],
    purchasable: true,
  },
];

const LIFETIME = [
  {
    id: "signal_lifetime",
    iapId: "com.vettedai.app.signal.lifetime",
    tier: "signal",
    label: "SIGNAL",
    price: "$399.99",
    cadence: "ONE-TIME · LIFETIME",
    tagline: "See the work. Score with rationale.",
    slotsLabel: "183 OF 200 REMAINING",
    bullets: [
      "Everything in Free",
      "Per-filter rationale + JD evidence",
      "Full strengths and gaps",
      "Narrative bridge",
      "VQ Advocate — pattern detection",
      "Notes per scorecard",
      "Coaching tab + Compare",
      "PDF export · Resume parse",
    ],
    purchasable: true,
  },
  {
    id: "vantage_lifetime",
    iapId: "com.vettedai.app.vantage.lifetime",
    tier: "vantage",
    label: "VANTAGE",
    price: "$799.99",
    cadence: "ONE-TIME · LIFETIME",
    tagline: "The full read. For roles that matter.",
    slotsLabel: "71 OF 100 REMAINING",
    bullets: [
      "Everything in Signal",
      "Coaching tab — moves + questions",
      "Compare two roles side-by-side",
      "PDF export — boardroom-ready",
      "Resume parse + auto pre-fill",
      "VQ Advocate — proactive coaching",
      "Market Pulse salary benchmarks",
      "Priority support · 4-hour response",
    ],
    purchasable: true,
  },
];

// ── Tier helpers ──────────────────────────────────────────────────────────────

function heroTitle(userTier) {
  if (userTier === "signal" || userTier === "signal_lifetime") return "You're on Signal.";
  if (userTier === "vantage" || userTier === "vantage_lifetime") return "You're on Vantage.";
  return "You're on Free.";
}

function defaultSelected(userTier) {
  if (userTier === "signal" || userTier === "signal_lifetime") return "vantage";
  if (userTier === "vantage" || userTier === "vantage_lifetime") return "vantage";
  return "signal";
}

function fromLabel(userTier) {
  if (userTier === "signal" || userTier === "signal_lifetime") return "FROM SIGNAL";
  if (userTier === "vantage" || userTier === "vantage_lifetime") return "FROM VANTAGE";
  return "FROM FREE";
}

function isCurrentPlan(plan, userTier, billing) {
  if (plan.id === "free" && (!userTier || userTier === "free")) return true;
  if (billing === "monthly") {
    if (plan.tier === userTier) return true;
  } else {
    if (plan.id === userTier) return true;
  }
  return false;
}

function isRecommended(plan, userTier) {
  if ((!userTier || userTier === "free") && plan.tier === "signal") return true;
  if ((userTier === "signal" || userTier === "signal_lifetime") && plan.tier === "vantage") return true;
  return false;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PaywallModal({ authUser, onClose, contextCopy, userTier }) {
  const effectiveTier = userTier || "free";

  const [loading,        setLoading]        = useState(null);
  const [restoring,      setRestoring]      = useState(false);
  const [restoreMsg,     setRestoreMsg]     = useState("");
  const [error,          setError]          = useState("");
  const [selected,       setSelected]       = useState(() => defaultSelected(effectiveTier));
  const [billing,        setBilling]        = useState("monthly");
  const [expanded,       setExpanded]       = useState({});

  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, { onClose });

  // ── iOS StoreKit 2 ────────────────────────────────────────────────────────
  async function handleIAPUpgrade(plan) {
    if (loading) return;
    setLoading(plan.id); setError("");
    try {
      const plugin = window.Capacitor?.Plugins?.StoreKitPlugin;
      if (!plugin) throw new Error("StoreKit not available");
      const result = await plugin.purchase({ productId: plan.iapId });
      if (!result?.jws) throw new Error("No transaction returned from StoreKit");
      const res = await fetch(ENDPOINTS.appleIap, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jws: result.jws, appleId: authUser?.id, sessionToken: authUser?.sessionToken || "" }),
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "Invalid session" || data.error === "Authentication required") { setLoading(null); onClose("session_expired"); return; }
      }
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || `Validation failed (${res.status})`); }
      const { tier: confirmedTier } = await res.json();
      setLoading(null);
      onClose("iap_success", confirmedTier);
    } catch (err) {
      if (err?.message === "cancelled" || err?.message === "pending") { setLoading(null); return; }
      handleError(err, "iap_upgrade");
      setError(err?.message || "Purchase failed. Please try again.");
      setLoading(null);
    }
  }

  // ── Web Stripe ────────────────────────────────────────────────────────────
  async function handleStripeUpgrade(plan) {
    if (loading) return;
    setLoading(plan.id); setError("");
    try {
      const res = await fetch(ENDPOINTS.checkout, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: plan.id, appleId: authUser?.id, sessionToken: authUser?.sessionToken || "", isNative: false }),
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "Invalid session" || data.error === "Authentication required") { setLoading(null); onClose("session_expired"); return; }
      }
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Checkout session failed"); }
      const { url } = await res.json();
      if (url) window.location.href = url;
      else throw new Error("No checkout URL returned");
    } catch (err) {
      handleError(err, "stripe_upgrade");
      setError(err?.message || "Upgrade failed. Please try again.");
      setLoading(null);
    }
  }

  // ── Restore Purchases ─────────────────────────────────────────────────────
  async function handleRestorePurchases() {
    if (restoring || loading) return;
    setRestoring(true); setRestoreMsg(""); setError("");
    try {
      const plugin = window.Capacitor?.Plugins?.StoreKitPlugin;
      if (!plugin) throw new Error("StoreKit not available");
      const { transactions } = await plugin.restorePurchases();
      if (!transactions?.length) { setRestoreMsg("No prior purchases found."); setRestoring(false); return; }
      let bestTier = null;
      for (const tx of transactions) {
        try {
          const res = await fetch(ENDPOINTS.appleIap, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jws: tx.jws, appleId: authUser?.id, sessionToken: authUser?.sessionToken || "" }),
          });
          if (res.ok) {
            const { tier } = await res.json();
            if (tier && (TIER_RANK[tier] ?? 0) > (TIER_RANK[bestTier] ?? 0)) bestTier = tier;
          }
        } catch { /* skip */ }
      }
      if (bestTier) { setRestoring(false); onClose("iap_success", bestTier); }
      else { setRestoreMsg("Purchases found but could not be verified. Please contact support."); setRestoring(false); }
    } catch (err) {
      handleError(err, "restore_purchases");
      setError(err?.message || "Restore failed. Please try again.");
      setRestoring(false);
    }
  }

  function handleUpgrade(plan) {
    if (!plan?.purchasable) return;
    if (isNativeApp) handleIAPUpgrade(plan);
    else handleStripeUpgrade(plan);
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const paidPlans = billing === "monthly" ? MONTHLY : LIFETIME;
  const selectedPlan = paidPlans.find(p => p.tier === selected) || paidPlans[0];
  const allCards = billing === "monthly" ? [FREE_PLAN, ...MONTHLY] : LIFETIME;

  function ctaLabel() {
    if (!selectedPlan) return "UPGRADE";
    if (billing === "monthly") return `GO ${selectedPlan.label} · ${selectedPlan.price}/MO`;
    return `LOCK IN ${selectedPlan.label} · ${selectedPlan.price}`;
  }

  const isSelectedCurrent = isCurrentPlan(selectedPlan, effectiveTier, billing);

  // ── Card render ───────────────────────────────────────────────────────────
  function PlanCard({ plan }) {
    const isCurrent    = isCurrentPlan(plan, effectiveTier, billing);
    const recommend    = isRecommended(plan, effectiveTier);
    const isSelected   = plan.purchasable && plan.tier === selected;
    const isFree       = plan.id === "free";
    const isExpanded   = !!expanded[plan.id];
    const bullets      = plan.bullets || [];
    const showCount    = isSelected || isExpanded || billing === "lifetime" ? bullets.length : Math.min(COLLAPSED_COUNT, bullets.length);
    const hiddenCount  = bullets.length - showCount;

    const borderColor  = isCurrent
      ? "#8a6200"
      : isSelected
        ? "var(--ink)"
        : "var(--border)";
    const borderWidth  = (isCurrent || isSelected) ? "1.5px" : "0.5px";
    const bgColor      = isCurrent
      ? "#fdf3e0"
      : isSelected
        ? "var(--cream)"
        : "transparent";

    return (
      <button
        key={plan.id}
        onClick={() => {
          if (plan.purchasable) setSelected(plan.tier);
        }}
        style={{
          width: "100%", padding: "16px 16px", marginBottom: 10,
          borderRadius: 14, textAlign: "left",
          background: bgColor,
          border: `${borderWidth} solid ${borderColor}`,
          cursor: plan.purchasable ? "pointer" : "default",
          transition: "all 200ms ease",
        }}
      >
        {/* Badge row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.16em", color: "var(--ink)", textTransform: "uppercase", fontWeight: 600 }}>
            {plan.label}
          </span>
          {isCurrent && (
            <span style={{ padding: "2px 7px", borderRadius: 999, background: "#8a6200", color: "#fff", fontFamily: "var(--font-data)", fontSize: 8, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              CURRENT
            </span>
          )}
          {recommend && !isCurrent && (
            <span style={{ padding: "2px 7px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontFamily: "var(--font-data)", fontSize: 8, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              RECOMMENDED
            </span>
          )}
          {billing === "lifetime" && plan.slotsLabel && (
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-data)", fontSize: 8, letterSpacing: "0.10em", color: "#8a6200", textTransform: "uppercase", fontWeight: 600 }}>
              {plan.slotsLabel}
            </span>
          )}
        </div>

        {/* Price row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontFamily: "var(--font-prose)", fontSize: 13.5, fontStyle: "italic", color: "var(--muted)", lineHeight: 1.4 }}>
            {plan.tagline}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
            <span style={{ fontFamily: "var(--font-prose)", fontSize: 24, fontWeight: 500, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.01em" }}>
              {plan.price}
            </span>
            <div style={{ marginTop: 2, fontFamily: "var(--font-data)", fontSize: 8.5, letterSpacing: "0.10em", color: "#8A9A8A", textTransform: "uppercase" }}>
              {plan.cadence}
            </div>
          </div>
        </div>

        {/* Bullets */}
        {bullets.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid var(--border)" }}>
            {bullets.slice(0, showCount).map((text, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 9, padding: "4px 0",
                fontFamily: "var(--font-prose)", fontSize: 12.5,
                color: "var(--ink)", lineHeight: 1.45,
              }}>
                <span style={{ flexShrink: 0, paddingTop: 4 }}>
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {text}
              </div>
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [plan.id]: true })); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "5px 0 2px", display: "block",
                  fontFamily: "var(--font-data)", fontSize: 8.5,
                  letterSpacing: "0.12em", color: "#8A9A8A",
                  textTransform: "uppercase", fontWeight: 500,
                }}
              >
                + {hiddenCount} MORE · TAP TO SEE
              </button>
            )}
          </div>
        )}
      </button>
    );
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="paywall-title"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "var(--paper)", display: "flex", flexDirection: "column",
      }}
      ref={dialogRef}
    >
      {/* Top bar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 8px 6px 20px", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.18em", color: "var(--muted)", textTransform: "uppercase" }}>
          UPGRADE
        </div>
        <button onClick={() => onClose()} aria-label="Close" style={{ background: "transparent", border: "none", cursor: "pointer", width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      {/* Scrollable body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 140 }}>

        {/* Hero */}
        <div style={{ padding: "12px 20px 16px" }}>
          <h1 id="paywall-title" style={{ fontFamily: "var(--font-prose)", fontSize: 26, fontWeight: 500, color: "var(--ink)", lineHeight: 1.2, margin: 0, letterSpacing: "-0.005em" }}>
            {heroTitle(effectiveTier)}
          </h1>
          <p style={{ margin: "10px 0 0", fontFamily: "var(--font-prose)", fontSize: 14, fontStyle: "italic", color: "var(--muted)", lineHeight: 1.5 }}>
            {billing === "lifetime"
              ? "183 founding Signal seats remain. 71 for Vantage. Pay once, own it forever."
              : contextCopy
                ? contextCopy.replace(/[\.\s]*(Signal|Vantage) feature\.?$/i, "").trim()
                : "Unlimited scoring. Full AI analysis. Cancel anytime."}
          </p>
        </div>

        {/* Billing toggle */}
        <div style={{ padding: "4px 20px 14px" }}>
          <div style={{ display: "inline-flex", padding: 3, background: "var(--cream)", borderRadius: 999, border: "0.5px solid var(--border)" }}>
            {[
              { id: "monthly",  label: "MONTHLY" },
              { id: "lifetime", label: "FOUNDING · LIFETIME" },
            ].map(b => {
              const active = b.id === billing;
              return (
                <button key={b.id} onClick={() => setBilling(b.id)} style={{
                  padding: "8px 12px", borderRadius: 999,
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "#F4F8F0" : "#8A9A8A",
                  border: "none", cursor: "pointer",
                  fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 500,
                  letterSpacing: "0.13em", textTransform: "uppercase", whiteSpace: "nowrap",
                }}>{b.label}</button>
              );
            })}
          </div>
        </div>

        {/* Founding banner (lifetime tab only) */}
        {billing === "lifetime" && (
          <div style={{ margin: "0 20px 14px", padding: "12px 16px", background: "var(--gold)", borderRadius: 10 }}>
            <div style={{ fontFamily: "var(--font-data)", fontSize: 9.5, letterSpacing: "0.16em", fontWeight: 700, color: "#1A1F18", textTransform: "uppercase", marginBottom: 4 }}>
              FOUNDING MEMBER · 254 OF 300 LEFT
            </div>
            <div style={{ fontFamily: "var(--font-prose)", fontSize: 12.5, color: "#2a2200", lineHeight: 1.5 }}>
              Pay once, own it forever. Signal $399.99 · Vantage $799.99
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div style={{ padding: "0 20px 18px" }}>
          {allCards.map(plan => <PlanCard key={plan.id} plan={plan} />)}
        </div>

        {/* How it works */}
        <div style={{ margin: "0 20px 18px", padding: "14px 0", borderTop: "0.5px solid var(--border)", borderBottom: "0.5px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em", color: "#8A9A8A", textTransform: "uppercase", fontWeight: 500, marginBottom: 10 }}>HOW IT WORKS</div>
          {[
            "Cancel anytime. No retention dance, no win-back emails.",
            "All your past scores stay yours, even on Free.",
            "Founding is one-time — own the tier for life.",
            "Features unlock instantly — no waiting period.",
          ].map((line, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "5px 0", fontFamily: "var(--font-prose)", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>
              <span style={{ flexShrink: 0, width: 5, height: 1, background: "var(--muted)", marginTop: 9 }}/>
              {line}
            </div>
          ))}
        </div>

        {/* Legal footer */}
        <div style={{ padding: "0 20px 12px", textAlign: "center" }}>
          {isNativeApp && (
            <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6, marginBottom: 8 }}>
              Payment will be charged to your Apple ID at confirmation of purchase. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.
            </p>
          )}
          <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6, marginBottom: 10 }}>
            {isNativeApp ? "Vetted · Career Intelligence Subscription" : "Payment processed securely by Stripe. Cancel anytime."}
          </p>
          <p style={{ fontSize: 11, color: "var(--muted)" }}>
            <a href={ENDPOINTS.privacy} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)", textDecoration: "underline" }}>Privacy Policy</a>
            <span style={{ margin: "0 8px" }}>·</span>
            <a href={ENDPOINTS.terms} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)", textDecoration: "underline" }}>Terms of Use</a>
          </p>
          {isNativeApp && (
            <button onClick={handleRestorePurchases} disabled={restoring || !!loading} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 12, textDecoration: "underline", fontFamily: "inherit", padding: "4px 8px", minHeight: 36, marginTop: 6 }}>
              {restoring ? "Restoring…" : "Restore Purchases"}
            </button>
          )}
        </div>

        {error && (
          <div role="alert" style={{ margin: "0 20px 12px", background: "var(--warn-bg)", color: "var(--gold)", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{error}</div>
        )}
        {restoreMsg && (
          <p role="status" style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", padding: "0 20px 10px" }}>{restoreMsg}</p>
        )}
      </div>

      {/* Sticky CTA */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 20px 34px", background: "linear-gradient(to top, rgba(250,250,248,0.98) 70%, rgba(250,250,248,0))" }}>
        <button
          onClick={() => {
            if (!isSelectedCurrent) handleUpgrade(selectedPlan);
          }}
          disabled={!!loading || isSelectedCurrent}
          style={{
            width: "100%", padding: "18px 20px", borderRadius: 999,
            background: loading ? "#C8D4C5" : isSelectedCurrent ? "#C8D4C5" : "var(--ink)",
            color: "#F4F8F0", border: "none",
            cursor: (loading || isSelectedCurrent) ? "not-allowed" : "pointer",
            fontFamily: "var(--font-data)", fontSize: 12, fontWeight: 500,
            letterSpacing: "0.16em", textTransform: "uppercase",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          {loading
            ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" /> Starting…</>
            : isSelectedCurrent
              ? `YOU'RE ON ${selectedPlan?.label || "THIS PLAN"}`
              : <>
                  {ctaLabel()}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M8 3L11 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
          }
        </button>
        {!loading && !isSelectedCurrent && (
          <div style={{ marginTop: 6, textAlign: "center", fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em", color: "#8A9A8A", textTransform: "uppercase" }}>
            {fromLabel(effectiveTier)} · {isNativeApp ? "SECURED BY APPLE" : "SECURED BY STRIPE"}
          </div>
        )}
        {(loading || isSelectedCurrent) && (
          <div style={{ marginTop: 6, textAlign: "center", fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em", color: "#8A9A8A", textTransform: "uppercase" }}>
            {isNativeApp ? "SECURED BY APPLE · CANCEL ANYTIME" : "SECURED BY STRIPE · CANCEL ANYTIME"}
          </div>
        )}
      </div>
    </div>
  );
}
