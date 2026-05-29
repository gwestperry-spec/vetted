import { useEffect, useMemo, useState, useCallback } from "react";

// ─── Design tokens (inline; this file ships separately from the SPA bundle) ──
const C = {
  ink: "#1a1a1a",
  muted: "#6b6b6b",
  paper: "#fafaf7",
  cream: "#ffffff",
  border: "#e8e2d4",
  brand: "#2d6a4f",
  brandSoft: "#e7f1ec",
  good: "#2d6a4f",
  warn: "#b8894d",
  bad: "#b04545",
};
const F = {
  serif: "'Libre Baskerville', Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, Menlo, monospace",
};

// ─── Targets — edit these to recalibrate stage gates ─────────────────────────
const TARGETS = {
  installToSignin: 0.7, // 70%
  firstScoreRate: 0.5,  // 50%
  totalScores: 200,     // descriptive
  d7Retention: 0.2,
  repeatScoring: 1.5,
  crashFree: 0.99,
  mrr: 1000,            // $1,000 MRR
  paidConversion: 0.05, // 5%
  monthlyChurn: 0.10,   // <10%
  jdFetchSuccess: 0.85, // 85% across all providers
};

// Status: green if >= target, amber if within 20% below, red if further below.
function statusFor(value, target, { higherIsBetter = true } = {}) {
  if (value == null || target == null) return "neutral";
  if (higherIsBetter) {
    if (value >= target) return "good";
    if (value >= target * 0.8) return "warn";
    return "bad";
  } else {
    // lower is better (e.g., churn)
    if (value <= target) return "good";
    if (value <= target * 1.2) return "warn";
    return "bad";
  }
}

const fmt = {
  pct: (v, digits = 1) => (v == null || isNaN(v) ? "—" : `${(v * 100).toFixed(digits)}%`),
  num: (v) => (v == null || isNaN(v) ? "—" : Math.round(v).toLocaleString("en-US")),
  money: (v) => (v == null || isNaN(v) ? "—" : `$${Math.round(v).toLocaleString("en-US")}`),
  decimal: (v, digits = 2) => (v == null || isNaN(v) ? "—" : v.toFixed(digits)),
  time: (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    } catch { return "—"; }
  },
};

// ─── KPI card ────────────────────────────────────────────────────────────────
function Card({ label, value, target, status = "neutral", note = null }) {
  const dot = {
    good: C.good,
    warn: C.warn,
    bad: C.bad,
    neutral: "transparent",
  }[status];

  return (
    <div
      style={{
        background: C.cream,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "20px 22px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 8,
          height: 8,
          borderRadius: 999,
          background: dot,
          border: status === "neutral" ? `1px solid ${C.border}` : "none",
        }}
        aria-label={`status ${status}`}
      />
      <div
        style={{
          fontFamily: F.mono,
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: F.mono,
          fontSize: 32,
          fontWeight: 600,
          color: C.ink,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {target && (
        <div
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            color: C.muted,
            marginTop: 8,
            letterSpacing: "0.04em",
          }}
        >
          target · {target}
        </div>
      )}
      {note && (
        <div
          style={{
            fontFamily: F.sans,
            fontSize: 12,
            color: C.muted,
            marginTop: 8,
            lineHeight: 1.4,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontFamily: F.serif,
          fontWeight: 700,
          fontSize: 18,
          color: C.ink,
          letterSpacing: "-0.005em",
          margin: "0 0 14px 0",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {children}
      </div>
    </section>
  );
}

// ─── Password gate ───────────────────────────────────────────────────────────
function Gate({ onAuth, error }) {
  const [pw, setPw] = useState("");
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAuth(pw);
        }}
        style={{
          background: C.cream,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: 32,
          maxWidth: 360,
          width: "100%",
        }}
      >
        <div
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: C.brand,
            marginBottom: 16,
          }}
        >
          Vetted · Internal
        </div>
        <h1
          style={{
            fontFamily: F.serif,
            fontWeight: 700,
            fontSize: 22,
            color: C.ink,
            margin: "0 0 24px 0",
          }}
        >
          Dashboard
        </h1>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 14px",
            fontFamily: F.sans,
            fontSize: 15,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            background: C.paper,
            color: C.ink,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {error && (
          <div style={{ color: C.bad, fontFamily: F.sans, fontSize: 13, marginTop: 12 }}>{error}</div>
        )}
        <button
          type="submit"
          style={{
            marginTop: 20,
            width: "100%",
            padding: "12px 16px",
            background: C.brand,
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontFamily: F.mono,
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Unlock
        </button>
      </form>
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [password, setPassword] = useState(() => sessionStorage.getItem("vetted_dash_pw") || "");
  const [authError, setAuthError] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [appStoreDownloads, setAppStoreDownloads] = useState(() => {
    const v = parseInt(localStorage.getItem("vetted_dash_downloads") || "76", 10);
    return Number.isFinite(v) ? v : 76;
  });
  const [signalLifetimeSold, setSignalLifetimeSold] = useState(() =>
    parseInt(localStorage.getItem("vetted_dash_signal_life_sold") || "0", 10)
  );
  const [vantageLifetimeSold, setVantageLifetimeSold] = useState(() =>
    parseInt(localStorage.getItem("vetted_dash_vantage_life_sold") || "0", 10)
  );

  useEffect(() => {
    localStorage.setItem("vetted_dash_downloads", String(appStoreDownloads));
  }, [appStoreDownloads]);
  useEffect(() => {
    localStorage.setItem("vetted_dash_signal_life_sold", String(signalLifetimeSold));
  }, [signalLifetimeSold]);
  useEffect(() => {
    localStorage.setItem("vetted_dash_vantage_life_sold", String(vantageLifetimeSold));
  }, [vantageLifetimeSold]);

  const fetchData = useCallback(
    async (pw) => {
      const usePw = pw ?? password;
      if (!usePw) return;
      setLoading(true);
      setAuthError("");
      try {
        const res = await fetch("/.netlify/functions/dashboard-data", {
          headers: { "X-Dashboard-Password": usePw },
        });
        if (res.status === 401) {
          setAuthError("Wrong password.");
          setPassword("");
          sessionStorage.removeItem("vetted_dash_pw");
          setData(null);
          return;
        }
        if (!res.ok) {
          setAuthError(`Server returned ${res.status}.`);
          return;
        }
        const json = await res.json();
        setData(json);
        setRefreshedAt(new Date().toISOString());
        sessionStorage.setItem("vetted_dash_pw", usePw);
        setPassword(usePw);
      } catch (e) {
        setAuthError(`Network error: ${e.message}`);
      } finally {
        setLoading(false);
      }
    },
    [password]
  );

  // Auto-fetch on mount if password already in session.
  useEffect(() => {
    if (password && !data) fetchData(password);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Derived metrics ──────────────────────────────────────────────────────
  const m = useMemo(() => {
    if (!data) return null;
    const supa = data.supabase || {};
    const stripe = data.stripe || {};
    const posthog = data.posthog || {};

    const installToSignin =
      appStoreDownloads > 0 && supa.totalProfiles != null
        ? supa.totalProfiles / appStoreDownloads
        : null;

    const firstScoreRate =
      supa.totalProfiles && supa.totalProfiles > 0 && supa.profilesWithAtLeastOneScore != null
        ? supa.profilesWithAtLeastOneScore / supa.totalProfiles
        : null;

    const d7Retention =
      supa.profilesActive7d != null && supa.profilesOlderThan7d
        ? supa.profilesActive7d / supa.profilesOlderThan7d
        : null;

    const paidConversion =
      supa.totalProfiles && supa.totalProfiles > 0 && supa.paidProfiles != null
        ? supa.paidProfiles / supa.totalProfiles
        : null;

    const churn =
      stripe.cancelledLast30d != null && stripe.activeSubscriptions != null
        ? stripe.cancelledLast30d /
          Math.max(1, stripe.activeSubscriptions + stripe.cancelledLast30d)
        : null;

    // JD fetch observability
    const jdAttempts = supa.jdAttempts7d ?? 0;
    const jdSuccessRate = jdAttempts > 0 ? (supa.jdSuccess7d ?? 0) / jdAttempts : null;
    const jdPerplexityShare = jdAttempts > 0 ? (supa.jdPerplexitySuccess7d ?? 0) / jdAttempts : 0;
    const jdScrapingBeeShare = jdAttempts > 0 ? (supa.jdScrapingBeeSuccess7d ?? 0) / jdAttempts : 0;
    const jdFailedShare =
      jdAttempts > 0 ? Math.max(0, 1 - jdPerplexityShare - jdScrapingBeeShare) : 0;

    return {
      installToSignin,
      firstScoreRate,
      totalScores: supa.totalScores,
      d7Retention,
      repeatScoring: supa.avgScoresPerActiveUser,
      crashFree: posthog.crashFreeRate,
      mrr: stripe.mrrUsd,
      paidConversion,
      churn,
      tierCounts: supa.tierCounts || {},
      tierBreakdownStripe: stripe.tierBreakdown || {},
      activeSubs: stripe.activeSubscriptions,
      cancelledLast30d: stripe.cancelledLast30d,
      stripeOk: stripe.ok,
      posthogOk: posthog.ok,
      posthogReason: posthog.reason,
      jdAttempts,
      jdSuccessRate,
      jdPerplexityShare,
      jdScrapingBeeShare,
      jdFailedShare,
    };
  }, [data, appStoreDownloads]);

  // ─── Stage logic ──────────────────────────────────────────────────────────
  const stage = useMemo(() => {
    if (!m) return "Loading…";
    const a1 = m.installToSignin != null && m.installToSignin >= TARGETS.installToSignin * 0.8;
    const a2 = m.firstScoreRate != null && m.firstScoreRate >= TARGETS.firstScoreRate * 0.8;
    const r1 = m.d7Retention != null && m.d7Retention >= TARGETS.d7Retention * 0.8;
    if (!(a1 && a2)) return "Stage 1 · Activation";
    if (!r1) return "Stage 2 · Retention";
    return "Stage 3 · Monetization";
  }, [m]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!password || !data) {
    return <Gate onAuth={(pw) => fetchData(pw)} error={authError} />;
  }

  const lifetimeSignalSold = m.tierCounts.signal_lifetime ?? signalLifetimeSold;
  const lifetimeVantageSold = m.tierCounts.vantage_lifetime ?? vantageLifetimeSold;

  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink }}>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 32,
            paddingBottom: 24,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: C.brand,
                  marginBottom: 8,
                }}
              >
                Vetted · KPI Dashboard
              </div>
              <h1
                style={{
                  fontFamily: F.serif,
                  fontWeight: 700,
                  fontSize: 28,
                  margin: 0,
                  letterSpacing: "-0.015em",
                }}
              >
                {stage}
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: "0.04em" }}>
                refreshed · {fmt.time(refreshedAt)}
              </div>
              <button
                onClick={() => fetchData()}
                disabled={loading}
                style={{
                  padding: "8px 14px",
                  background: C.brand,
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontFamily: F.mono,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* Manual inputs row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              padding: "16px 18px",
              background: C.brandSoft,
              borderRadius: 6,
            }}
          >
            <ManualInput
              label="App Store downloads (manual)"
              value={appStoreDownloads}
              onChange={setAppStoreDownloads}
            />
            <ManualInput
              label="Signal lifetime sold (override)"
              value={signalLifetimeSold}
              onChange={setSignalLifetimeSold}
              note={`auto-source: ${m.tierCounts.signal_lifetime ?? "—"}`}
            />
            <ManualInput
              label="Vantage lifetime sold (override)"
              value={vantageLifetimeSold}
              onChange={setVantageLifetimeSold}
              note={`auto-source: ${m.tierCounts.vantage_lifetime ?? "—"}`}
            />
          </div>
        </header>

        {/* Activation */}
        <Section title="Activation">
          <Card
            label="Total profiles"
            value={fmt.num(data.supabase?.totalProfiles)}
            note={`+${fmt.num(data.supabase?.profilesNew7d ?? 0)} / 7d`}
            status="neutral"
          />
          <Card
            label="Install → sign-in"
            value={fmt.pct(m.installToSignin)}
            target={`${(TARGETS.installToSignin * 100).toFixed(0)}%`}
            status={statusFor(m.installToSignin, TARGETS.installToSignin)}
            note={`${fmt.num(data.supabase?.totalProfiles)} of ${appStoreDownloads} downloads`}
          />
          <Card
            label="First-score rate"
            value={fmt.pct(m.firstScoreRate)}
            target={`${(TARGETS.firstScoreRate * 100).toFixed(0)}%`}
            status={statusFor(m.firstScoreRate, TARGETS.firstScoreRate)}
            note={`${fmt.num(data.supabase?.profilesWithAtLeastOneScore)} of ${fmt.num(data.supabase?.totalProfiles)} profiles`}
          />
          <Card
            label="Total scores run"
            value={fmt.num(m.totalScores)}
            target={fmt.num(TARGETS.totalScores)}
            status={statusFor(m.totalScores, TARGETS.totalScores)}
          />
        </Section>

        {/* Retention */}
        <Section title="Retention">
          <Card
            label="D7 retention"
            value={fmt.pct(m.d7Retention)}
            target={`${(TARGETS.d7Retention * 100).toFixed(0)}%`}
            status={statusFor(m.d7Retention, TARGETS.d7Retention)}
            note="active in last 7d / cohort > 7d old"
          />
          <Card
            label="Repeat scoring / wk"
            value={fmt.decimal(m.repeatScoring)}
            target={fmt.decimal(TARGETS.repeatScoring)}
            status={statusFor(m.repeatScoring, TARGETS.repeatScoring)}
            note={`${fmt.num(data.supabase?.scores7d)} scores / ${fmt.num(data.supabase?.activeScorers7d)} active scorers`}
          />
          <Card
            label="Crash-free sessions"
            value={m.crashFree == null ? "—" : fmt.pct(m.crashFree)}
            target={`${(TARGETS.crashFree * 100).toFixed(1)}%`}
            status={statusFor(m.crashFree, TARGETS.crashFree)}
            note={m.posthogOk ? null : (m.posthogReason || "PostHog not configured")}
          />
        </Section>

        {/* Monetization */}
        <Section title="Monetization">
          <Card
            label="Paid profiles"
            value={fmt.num(data.supabase?.paidProfiles)}
            note={`${fmt.num(data.supabase?.totalProfiles)} total · ${fmt.num(m.activeSubs ?? 0)} active Stripe`}
            status="neutral"
          />
          <Card
            label="MRR"
            value={fmt.money(m.mrr)}
            target={fmt.money(TARGETS.mrr)}
            status={statusFor(m.mrr, TARGETS.mrr)}
            note={
              m.stripeOk
                ? `${m.activeSubs ?? 0} active subscriptions`
                : "Stripe unavailable"
            }
          />
          <Card
            label="Paid conversion"
            value={fmt.pct(m.paidConversion)}
            target={`${(TARGETS.paidConversion * 100).toFixed(0)}%`}
            status={statusFor(m.paidConversion, TARGETS.paidConversion)}
            note={`${fmt.num(data.supabase?.paidProfiles)} of ${fmt.num(data.supabase?.totalProfiles)} profiles`}
          />
          <Card
            label="Monthly churn"
            value={fmt.pct(m.churn)}
            target={`< ${(TARGETS.monthlyChurn * 100).toFixed(0)}%`}
            status={statusFor(m.churn, TARGETS.monthlyChurn, { higherIsBetter: false })}
            note={`${fmt.num(m.cancelledLast30d)} cancelled / 30d`}
          />
          <Card
            label="Tier breakdown"
            value={
              <TierGrid
                tiers={[
                  { name: "Signal", n: m.tierCounts.signal },
                  { name: "Vantage", n: m.tierCounts.vantage },
                  { name: "Signal·Life", n: m.tierCounts.signal_lifetime },
                  { name: "Vantage·Life", n: m.tierCounts.vantage_lifetime },
                ]}
                total={data.supabase?.paidProfiles}
              />
            }
            note={`${fmt.num(data.supabase?.paidProfiles)} paid total`}
          />
        </Section>

        {/* Quality */}
        <Section title="Quality">
          <Card
            label="VQ quality (manual)"
            value="9.54"
            note="Build 31 — May 20, 2026"
            status="good"
          />
          <Card
            label="JD fetch success"
            value={m.jdAttempts > 0 ? fmt.pct(m.jdSuccessRate) : "—"}
            target={`${(TARGETS.jdFetchSuccess * 100).toFixed(0)}%`}
            status={statusFor(m.jdSuccessRate, TARGETS.jdFetchSuccess)}
            note={
              m.jdAttempts > 0
                ? `${fmt.num(m.jdAttempts)} attempts / 7d`
                : "No fetch attempts in last 7 days"
            }
          />
          <Card
            label="JD providers used (7d)"
            value={
              <ProvidersGrid
                perplexity={m.jdPerplexityShare}
                scrapingbee={m.jdScrapingBeeShare}
                failed={m.jdFailedShare}
              />
            }
            note={`${fmt.num(m.jdAttempts)} attempts · Perplexity is tier-1, ScrapingBee is fallback`}
          />
          <Card
            label="Founding seats remaining"
            value={
              <SeatsGrid
                signalLeft={Math.max(0, 200 - lifetimeSignalSold)}
                vantageLeft={Math.max(0, 100 - lifetimeVantageSold)}
              />
            }
            note={`Signal sold: ${lifetimeSignalSold} / 200 · Vantage sold: ${lifetimeVantageSold} / 100`}
          />
        </Section>

        {/* Footer */}
        <footer
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted }}>
            Internal · Vetted AI LLC · {new Date().getFullYear()}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.muted }}>
            generated · {fmt.time(data.generatedAt)}
          </div>
        </footer>
      </main>
    </div>
  );
}

function ManualInput({ label, value, onChange, note }) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          fontFamily: F.mono,
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value || "0", 10);
          onChange(Number.isFinite(v) ? v : 0);
        }}
        style={{
          width: "100%",
          padding: "8px 12px",
          fontFamily: F.mono,
          fontSize: 16,
          fontWeight: 600,
          background: C.cream,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          color: C.ink,
          boxSizing: "border-box",
        }}
      />
      {note && (
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.muted, marginTop: 4 }}>{note}</div>
      )}
    </label>
  );
}

function TierGrid({ tiers, total }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
      {tiers.map((t) => {
        const n = t.n ?? 0;
        const pct = total ? ((n / total) * 100).toFixed(0) : "—";
        return (
          <div key={t.name}>
            <div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: "0.04em" }}>{t.name}</div>
            <div style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>
              {fmt.num(n)}
              <span style={{ fontSize: 11, color: C.muted, marginLeft: 6 }}>{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProvidersGrid({ perplexity, scrapingbee, failed }) {
  const rows = [
    { name: "Perplexity", v: perplexity, color: C.brand },
    { name: "ScrapingBee", v: scrapingbee, color: C.warn },
    { name: "Failed", v: failed, color: C.bad },
  ];
  return (
    <div style={{ marginTop: 4 }}>
      {rows.map((r) => (
        <div key={r.name} style={{ marginBottom: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: F.mono,
              fontSize: 11,
              color: C.muted,
              letterSpacing: "0.04em",
              marginBottom: 2,
            }}
          >
            <span>{r.name}</span>
            <span style={{ color: C.ink, fontWeight: 600 }}>{fmt.pct(r.v, 0)}</span>
          </div>
          <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, (r.v || 0) * 100))}%`,
                height: "100%",
                background: r.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SeatsGrid({ signalLeft, vantageLeft }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
      <div>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: "0.04em" }}>Signal</div>
        <div style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>{signalLeft}</div>
      </div>
      <div>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: "0.04em" }}>Vantage</div>
        <div style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>{vantageLeft}</div>
      </div>
    </div>
  );
}
