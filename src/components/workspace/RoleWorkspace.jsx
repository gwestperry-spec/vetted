// ─── RoleWorkspace ─────────────────────────────────────────────────────────
// Primary home screen — single landing for all users post sign-in.
// Contains: inline scoring, Top Matches carousel, Intelligence strip,
// MarketPulse (Vantage), Today, In Progress (applied), Active, Archived.

import { useState, useRef } from "react";
import RoleCard from "./RoleCard.jsx";
import CompareQueue from "./CompareQueue.jsx";
import WorkspaceEmptyState from "./WorkspaceEmptyState.jsx";
import WorkspaceReminderModal from "./WorkspaceReminderModal.jsx";
import LangSwitcher from "../LangSwitcher.jsx";
import MarketPulseCard from "../MarketPulse.jsx";
import { ScoringProgress as ScoringProgressComponent } from "../VQLoadingScreen.jsx";
import { ENDPOINTS } from "../../config.js";
import CoachMark from "../CoachMark.jsx";
import { VQAdvocateCard } from "../VQAdvocate.jsx";

// ── URL helpers (mirrors Dashboard.jsx) ────────────────────────────────────
const MAX_JD  = 12000;
const MAX_URL = 2048;
function sanitizeUrl(value) {
  const trimmed = (value || "").trim().slice(0, MAX_URL);
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" ||
      host.startsWith("192.168.") || host.startsWith("10.") ||
      host.startsWith("172.16.") || host.endsWith(".internal") ||
      host === "metadata.google.internal"
    ) return "";
    return trimmed;
  } catch { return ""; }
}
const TRACKING_PARAMS = [
  "utm_source","utm_medium","utm_campaign","utm_content","utm_term",
  "utm_id","refId","trackingId","domain","src","ref","mcid","cid","gclid","fbclid","li_fat_id",
];
function stripTrackingParams(urlStr) {
  try {
    const u = new URL(urlStr);
    TRACKING_PARAMS.forEach(p => u.searchParams.delete(p));
    return u.searchParams.size === 0 ? u.origin + u.pathname : u.toString();
  } catch { return urlStr; }
}
const isUrl      = (val) => /^https?:\/\//i.test(val.trim());
const isLinkedIn = (val) => /linkedin\.com\/jobs/i.test(val.trim());
const isJsGatedAts = (val) => /oraclecloud\.com|taleo\.net|icims\.com|greenhouse\.io\/gdpr|myworkday\.com\/wday\/authgwy/i.test(val.trim());

// ── Application status config (mirrors Dashboard.jsx) ────────────────────
export const STAGE_ORDER  = ["applied","phone_screen","interview","final_round"];
export const STAGE_LABELS = {
  applied:"Applied", phone_screen:"Phone Screen", interview:"Interview",
  final_round:"Final Round", offer:"Offer Extended", rejected:"Rejected", withdrew:"Withdrew",
};
const STAGE_STYLE = {
  applied:     { bg:"#DFF0DF", color:"#27500A" },
  phone_screen:{ bg:"#E8F4FF", color:"#0C447C" },
  interview:   { bg:"#FFF0E0", color:"#7A3A00" },
  final_round: { bg:"#E8EEF8", color:"#3A4A8A" },
  offer:       { bg:"#D0EED0", color:"#1A4A1A" },
  rejected:    { bg:"#F8ECEC", color:"#C05050" },
  withdrew:    { bg:"#F0F4F0", color:"#1A2E1A" },
};

// ── Section label ─────────────────────────────────────────────────────────
function SectionLabel({ children, count }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:8,
      fontFamily:"var(--font-data)", fontSize:9, letterSpacing:".12em",
      color:"#1A2E1A", textTransform:"uppercase", marginBottom:10,
    }}>
      {children}
      <div style={{ flex:1, height:0.5, background:"#D8E8D8" }} />
      {count != null && <span style={{ fontFamily:"var(--font-data)", fontSize:9, color:"#1A2E1A" }}>{count}</span>}
    </div>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────
function todayIso() { return new Date().toISOString().slice(0,10); }
function formatWorkspaceDate() {
  const d = new Date();
  const days   = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()} · ${d.getFullYear()}`;
}

// ── Score color ───────────────────────────────────────────────────────────
function scoreColor(score, onDark = false) {
  if (score >= 4.0) return onDark ? "#7AB87A" : "#3A7A3A";
  if (score >= 3.0) return "#B8A030";
  return "#C05050";
}

// ── Verdict pill ──────────────────────────────────────────────────────────
function verdictPill(rec, onDark = false) {
  if (rec === "pursue") return onDark ? { bg:"#C8E8C0", color:"#1A4A10" } : { bg:"#EAF3DE", color:"#27500A" };
  if (rec === "monitor") return onDark ? { bg:"rgba(212,168,64,0.25)", color:"#F0D090" } : { bg:"#FAEEDA", color:"#633806" };
  return onDark ? { bg:"rgba(192,80,80,0.25)", color:"#F0A0A0" } : { bg:"#F8ECEC", color:"#C05050" };
}

// ── Reconstruct opp from workspace role ──────────────────────────────────
function workspaceRoleToOpp(role) {
  const snap = role.framework_snapshot || {};
  return {
    id:                      role.role_id,
    role_title:              role.title || "Untitled Role",
    company:                 role.company || "",
    overall_score:           role.vq_score != null ? Number(role.vq_score) : null,
    recommendation:          snap.recommendation || role.status,
    recommendation_rationale: snap.recommendation_rationale || "",
    filter_scores:           snap.filter_scores || [],
    strengths:               snap.strengths || [],
    gaps:                    snap.gaps || [],
    narrative_bridge:        snap.narrative_bridge || "",
    honest_fit_summary:      snap.honest_fit_summary || "",
    jd:                      snap.jd || "",
  };
}

// ══════════════════════════════════════════════════════════════════════════
export default function RoleWorkspace({
  workspaceRoles = [],
  workspaceReminders = [],
  userTier,
  authUser,
  devTierOverride,
  onDevUnlock,
  onViewRole,
  onCompare,
  onArchive,
  onUnarchive,
  onRemoveRole,
  onSaveReminder,
  onCompleteReminder,
  onOpenPaywall,
  onMarkApplied,
  onUnmarkApplied,
  // Navigation
  onEditProfile,
  onEditFilters,
  // Scoring
  onScore,
  loading,
  scoringPhase,
  streamingFilters,
  error,
  // Data for MarketPulse + Intelligence
  profile = {},
  filters = [],
  behavioralInsight,
  onDismissInsight,
  onActedOnInsight,
  onOpenAdvocate,
  // Header
  onOpenMenu,
  // i18n
  t,
  lang,
  setLang,
}) {
  const effectiveTier = devTierOverride || userTier;
  const isVantage = ["vantage","vantage_lifetime"].includes(effectiveTier);
  const isSignal  = ["signal","signal_lifetime","vantage","vantage_lifetime"].includes(effectiveTier);

  // ── Guide slides ──────────────────────────────────────────────────────────
  const GUIDE_SLIDES = [
    { icon:"◎",   title: t?.guide1Title || "Score any role", body: t?.guide1Body || "Paste a job description or drop a URL — Vetted scores it against your framework." },
    { icon:"⊟",   title: t?.guide2Title || "Filter-first scoring", body: t?.guide2Body || "Every score is weighted by the criteria that matter most to you." },
    { icon:"3.8", title: t?.guide3Title || "The VQ Score", body: t?.guide3Body || "A single number that reflects fit against your framework. Above your threshold = pursue.", mono: true },
    { icon:"→",   title: t?.guide4Title || "Track your search", body: t?.guide4Body || "Mark roles as Applied and follow your pipeline without leaving the app." },
    { icon:"◫",   title: t?.guide5Title || "Compare roles", body: t?.guide5Body || "Stack two roles side-by-side to see exactly where one wins and the other falls short." },
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  const [searchQuery,        setSearchQuery]        = useState("");
  const [filterVerdict,      setFilterVerdict]      = useState("ALL");
  const [compareMode,        setCompareMode]        = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState(new Set());
  const [reminderTarget,     setReminderTarget]     = useState(null);
  const [showArchived,       setShowArchived]       = useState(false);
  const [showScoringPanel,   setShowScoringPanel]   = useState(false);
  const [inputVal,           setInputVal]           = useState("");
  const [fetching,           setFetching]           = useState(false);
  const [fetchError,         setFetchError]         = useState("");
  const [linkedInGuide,      setLinkedInGuide]      = useState(false);
  const [urlCleaned,         setUrlCleaned]         = useState(false);
  const [carouselIdx,        setCarouselIdx]        = useState(0);
  const carouselStartX = useRef(0);
  const [editingStatusId,    setEditingStatusId]    = useState(null);

  // Guide
  const [showGuide, setShowGuide] = useState(() => {
    try { return !localStorage.getItem("vetted_guide_seen"); } catch { return false; }
  });
  const [guideStep, setGuideStep] = useState(0);
  function openGuide()  { setGuideStep(0); setShowGuide(true); }
  function closeGuide() { setShowGuide(false); try { localStorage.setItem("vetted_guide_seen","1"); } catch {} }
  function guideNext()  { if (guideStep < GUIDE_SLIDES.length - 1) setGuideStep(s => s+1); else closeGuide(); }
  function guidePrev()  { if (guideStep > 0) setGuideStep(s => s-1); }

  // Dev tap
  const devTapRef = useRef(0);
  const devTapTimerRef = useRef(null);
  function handleDevTap() {
    devTapRef.current += 1;
    clearTimeout(devTapTimerRef.current);
    devTapTimerRef.current = setTimeout(() => { devTapRef.current = 0; }, 1500);
    if (devTapRef.current >= 7) { devTapRef.current = 0; onDevUnlock?.(); }
  }

  // ── Section split ─────────────────────────────────────────────────────────
  const today = todayIso();
  const todayRoles    = workspaceRoles.filter(r => r.status !== "archived" && r.next_action_at && r.next_action_at.slice(0,10) === today);
  const appliedRoles  = workspaceRoles.filter(r => r.status === "applied");
  const activeRoles   = workspaceRoles.filter(r =>
    r.status !== "archived" && r.status !== "applied" &&
    !todayRoles.find(t => t.role_id === r.role_id)
  );
  const archivedRoles = workspaceRoles.filter(r => r.status === "archived");

  // ── Top Matches carousel (top 5 scored non-archived/queued roles) ─────────
  const scoredRoles = workspaceRoles
    .filter(r => r.vq_score != null && r.status !== "archived" && r.status !== "queued")
    .sort((a,b) => b.vq_score - a.vq_score)
    .slice(0, 5);
  const CAROUSEL_MAX = scoredRoles.length;

  function carouselGo(dir) { setCarouselIdx(i => Math.max(0, Math.min(CAROUSEL_MAX-1, i+dir))); }
  function onTouchStart(e) { carouselStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e)   { const dx = e.changedTouches[0].clientX - carouselStartX.current; if (Math.abs(dx) > 30) carouselGo(dx < 0 ? 1 : -1); }
  function onMouseDown(e)  { carouselStartX.current = e.clientX; }
  function onMouseUp(e)    { const dx = e.clientX - carouselStartX.current; if (Math.abs(dx) > 20) carouselGo(dx < 0 ? 1 : -1); }

  // ── Compare handlers ──────────────────────────────────────────────────────
  function toggleCompare(roleId) {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else if (next.size < 4) next.add(roleId);
      return next;
    });
  }
  function launchCompare() {
    const ids = [...selectedForCompare];
    if (ids.length < 2) return;
    const [roleA, roleB] = ids.map(id => workspaceRoles.find(r => r.role_id === id)).filter(Boolean);
    if (roleA && roleB) onCompare(workspaceRoleToOpp(roleA), workspaceRoleToOpp(roleB));
  }
  function clearCompare() { setSelectedForCompare(new Set()); setCompareMode(false); }

  // ── Reminder helpers ──────────────────────────────────────────────────────
  function openReminderModal(role, existing = null) { setReminderTarget({ role, existing }); }
  async function handleSaveReminder(reminder) { await onSaveReminder(reminder); setReminderTarget(null); }

  // ── Resume helper ─────────────────────────────────────────────────────────
  function handleResume(role) { onViewRole(workspaceRoleToOpp(role)); }

  // ── Scoring input handler ─────────────────────────────────────────────────
  async function handleAnalyze() {
    const val = inputVal.trim();
    if (!val) return;

    if (isLinkedIn(val)) { setLinkedInGuide(true); setUrlCleaned(false); return; }

    if (isUrl(val)) {
      const cleaned = stripTrackingParams(val);
      if (cleaned !== val) { setInputVal(cleaned); setUrlCleaned(true); } else { setUrlCleaned(false); }
      const safeUrl = sanitizeUrl(cleaned);
      if (!safeUrl) { setFetchError(t?.urlFetchError || "Couldn't fetch this URL."); return; }
      setFetching(true); setFetchError(""); setLinkedInGuide(false);
      try {
        const res = await fetch(ENDPOINTS.fetchJd, {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ url: safeUrl, appleId: authUser?.id || "", sessionToken: authUser?.sessionToken || "" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "fetch_failed");
        if (!data.jd) throw new Error("empty_response");
        onScore(data.jd, safeUrl);
        setInputVal(""); setShowScoringPanel(false);
      } catch (err) {
        setFetchError(err?.message || t?.urlFetchError || "Couldn't fetch this URL.");
      } finally { setFetching(false); }
    } else {
      setLinkedInGuide(false);
      onScore(val, "");
      setInputVal(""); setShowScoringPanel(false);
    }
  }

  // ── Render role cards ─────────────────────────────────────────────────────
  function renderCards(roles) {
    return roles.map(role => (
      <RoleCard
        key={role.role_id}
        role={role}
        reminders={workspaceReminders}
        userTier={effectiveTier}
        compareMode={compareMode}
        selectedForCompare={selectedForCompare}
        t={t}
        onResume={() => handleResume(role)}
        onToggleCompare={() => toggleCompare(role.role_id)}
        onArchive={() => onArchive(role.role_id)}
        onUnarchive={() => onUnarchive(role.role_id)}
        onRemove={() => onRemoveRole?.(role.role_id)}
        onSetReminder={() => openReminderModal(role)}
        onOpenPaywall={onOpenPaywall}
        onCompleteReminder={onCompleteReminder}
        onMarkApplied={() => onMarkApplied(role.role_id)}
        onUnmarkApplied={() => onUnmarkApplied(role.role_id)}
      />
    ));
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const oppsList = workspaceRoles.filter(r => r.vq_score != null).map(workspaceRoleToOpp);
  const firstName = (profile.name || authUser?.displayName || "").split(" ")[0];
  const pursueRoles = workspaceRoles.filter(r =>
    r.status !== "archived" && r.framework_snapshot?.recommendation === "pursue"
  );
  const totalScored = workspaceRoles.filter(r => r.vq_score != null && r.status !== "archived").length;
  const headline = pursueRoles.length === 0
    ? "Your workspace is ready."
    : pursueRoles.length === 1
    ? `You have 1 Pursue lead${firstName ? `, ${firstName}` : ""}.`
    : `You have ${pursueRoles.length} Pursue leads${firstName ? `, ${firstName}` : ""}.`;

  const now = Date.now();
  const allVisible   = workspaceRoles.filter(r => r.status !== "archived");
  const filteredRoles = allVisible.filter(r => {
    const rec = (r.framework_snapshot?.recommendation || "").toLowerCase();
    if (filterVerdict !== "ALL" && rec !== filterVerdict.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!`${r.title || ""} ${r.company || ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const thisWeekRoles = filteredRoles.filter(r =>
    r.created_at && (now - new Date(r.created_at).getTime()) < 7 * 24 * 3600 * 1000
  );
  const earlierRoles = filteredRoles.filter(r =>
    !r.created_at || (now - new Date(r.created_at).getTime()) >= 7 * 24 * 3600 * 1000
  );
  const verdictCounts = {
    ALL:     allVisible.length,
    PURSUE:  allVisible.filter(r => r.framework_snapshot?.recommendation === "pursue").length,
    MONITOR: allVisible.filter(r => r.framework_snapshot?.recommendation === "monitor").length,
    PASS:    allVisible.filter(r => r.framework_snapshot?.recommendation === "pass").length,
  };

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <main id="main-content" aria-label="Role workspace" style={{ background: "var(--paper)", minHeight: "100%" }}>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 8px 6px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            onClick={handleDevTap}
            style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink)", textTransform: "uppercase", userSelect: "none", cursor: "default" }}
          >VETTED</span>
          {devTierOverride && (
            <span style={{ fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", background: "#e74c3c", color: "#fff", padding: "1px 5px", borderRadius: 20 }}>DEV</span>
          )}
        </div>
        {onOpenMenu && (
          <button onClick={onOpenMenu} aria-label="Open menu" style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", color: "var(--ink)", WebkitTapHighlightColor: "transparent" }}>
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <line x1="3.5" y1="7"  x2="18.5" y2="7"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="3.5" y1="11" x2="18.5" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="3.5" y1="15" x2="18.5" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </header>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div style={{ paddingBottom: 100 }}>

        {/* Title block */}
        <div style={{ padding: "14px 20px 18px" }}>
          <p style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
            WORKSPACE{firstName ? ` · ${firstName.toUpperCase()}` : ""}
          </p>
          <h1 style={{ fontFamily: "var(--font-prose)", fontSize: 26, fontWeight: 500, color: "var(--ink)", lineHeight: 1.18, margin: 0, letterSpacing: "-0.005em" }}>
            {headline}
          </h1>
        </div>

        {/* Stat strip */}
        <div style={{ padding: "0 20px 18px", display: "flex", gap: 6 }}>
          <WsKpiTile value={String(pursueRoles.length)} label="PURSUE" color="var(--accent)" />
          <WsKpiTile value={String(totalScored)} label="SCORED" />
          <WsKpiTile value={profile.threshold ? String(profile.threshold) : "—"} label="THRESHOLD" color="var(--gold)" />
        </div>

        {/* VQ Advocate card */}
        <VQAdvocateCard
          opportunities={workspaceRoles}
          profile={profile}
          onOpen={() => onOpenAdvocate?.()}
        />

        {/* Hero card — top match */}
        {scoredRoles[0] && (
          <div style={{ padding: "0 20px 22px" }}>
            <p style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8A9A8A", marginBottom: 8 }}>TOP MATCH</p>
            <div
              onClick={() => handleResume(scoredRoles[0])}
              style={{ background: "var(--ink)", borderRadius: 12, padding: "16px 18px 18px", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <div style={{ width: "66%", textAlign: "center", paddingBottom: 8, borderBottom: "0.5px solid rgba(168,192,168,0.35)", fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em", color: "#A8C0A8", textTransform: "uppercase" }}>
                  TOP MATCH · {(scoredRoles[0].company || "").toUpperCase()} · {wsAgoLabel(scoredRoles[0].created_at)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-prose)", fontSize: 22, fontWeight: 500, color: "#F4F8F0", lineHeight: 1.18, letterSpacing: "-0.01em" }}>{scoredRoles[0].title}</div>
                  <div style={{ fontFamily: "var(--font-data)", fontSize: 11, color: "#C4D8C0", marginTop: 6, letterSpacing: "0.04em" }}>{scoredRoles[0].company}</div>
                </div>
                <div style={{ fontFamily: "var(--font-prose)", fontSize: 56, fontWeight: 500, color: "#F4F8F0", lineHeight: 0.92, letterSpacing: "-0.02em", flexShrink: 0 }}>
                  {Number(scoredRoles[0].vq_score).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Score history header */}
        <div style={{ padding: "0 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>
            SCORE HISTORY · {allVisible.length}
          </p>
          {isVantage && (
            <button
              onClick={() => setCompareMode(x => !x)}
              style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: compareMode ? "var(--accent)" : "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >{compareMode ? "DONE" : "COMPARE"}</button>
          )}
        </div>

        {/* Search + filter bar */}
        <div style={{ padding: "4px 20px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "0.5px solid var(--border)", borderRadius: 999, padding: "0 14px", height: 36, marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.4" stroke="#8A9A8A" strokeWidth="1.3"/>
              <path d="M9.4 9.4L12 12" stroke="#8A9A8A" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search roles…"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-prose)", fontSize: 14, color: "var(--ink)", padding: 0 }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} aria-label="Clear" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, lineHeight: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" fill="var(--border)"/><path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {[
              { id: "ALL", label: "ALL" },
              { id: "pursue", label: "PURSUE" },
              { id: "monitor", label: "MONITOR" },
              { id: "pass", label: "PASS" },
            ].map(chip => {
              const active = filterVerdict === chip.id;
              const count  = verdictCounts[chip.id === "ALL" ? "ALL" : chip.id];
              return (
                <button key={chip.id} onClick={() => setFilterVerdict(chip.id)} style={{ flex: "0 0 auto", padding: "6px 12px", borderRadius: 999, background: active ? "var(--ink)" : "transparent", color: active ? "#F4F8F0" : "var(--ink)", border: `0.5px solid ${active ? "var(--ink)" : "var(--border)"}`, fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                  {chip.label}
                  <span style={{ fontFamily: "var(--font-data)", fontSize: 9, color: active ? "#A8C0A8" : "var(--muted)" }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hairline */}
        <div style={{ height: "0.5px", background: "var(--border)", margin: "0 20px" }} />

        {/* CompareQueue tray */}
        <CompareQueue
          selected={selectedForCompare}
          workspaceRoles={workspaceRoles}
          userTier={effectiveTier}
          onToggle={toggleCompare}
          onCompare={launchCompare}
          onClear={clearCompare}
          onOpenPaywall={onOpenPaywall}
          t={t}
        />

        {/* THIS WEEK */}
        {thisWeekRoles.length > 0 && (
          <>
            <WsSubHeader label="THIS WEEK" count={thisWeekRoles.length} />
            <WsOppsList roles={thisWeekRoles} onResume={handleResume} compareMode={compareMode} onToggleCompare={toggleCompare} selectedForCompare={selectedForCompare} t={t} />
          </>
        )}

        {/* EARLIER */}
        {earlierRoles.length > 0 && (
          <>
            <WsSubHeader label="EARLIER" count={earlierRoles.length} />
            <WsOppsList roles={earlierRoles} onResume={handleResume} faded compareMode={compareMode} onToggleCompare={toggleCompare} selectedForCompare={selectedForCompare} t={t} />
          </>
        )}

        {/* Empty state */}
        {allVisible.length === 0 && (
          <WorkspaceEmptyState section="active" onScoreNewRole={() => {}} t={t} />
        )}
        {filteredRoles.length === 0 && allVisible.length > 0 && (
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-prose)", fontSize: 15, color: "var(--ink)", marginBottom: 14 }}>No matches found.</p>
            <button onClick={() => { setSearchQuery(""); setFilterVerdict("ALL"); }} style={{ padding: "8px 16px", borderRadius: 999, background: "transparent", border: "0.5px solid var(--border)", color: "var(--ink)", cursor: "pointer", fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" }}>CLEAR FILTERS</button>
          </div>
        )}

        {/* Archived (collapsible) */}
        {archivedRoles.length > 0 && (
          <div style={{ borderTop: "0.5px solid var(--border)", margin: "20px 20px 0", paddingTop: 14 }}>
            <button onClick={() => setShowArchived(x => !x)} aria-expanded={showArchived} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
              <span>{showArchived ? "▼" : "▶"}</span>
              {t?.wsSectionArchived || "Archived"} · {archivedRoles.length}
            </button>
            {showArchived && <div style={{ marginTop: 12 }}>{renderCards(archivedRoles)}</div>}
          </div>
        )}

      </div>

      {/* ── Reminder modal ── */}
      {reminderTarget && (
        <WorkspaceReminderModal
          role={reminderTarget.role}
          existing={reminderTarget.existing}
          onSave={handleSaveReminder}
          onClose={() => setReminderTarget(null)}
          t={t}
        />
      )}

      {/* ── Guide modal ── */}
      {showGuide && (() => {
        const slide = GUIDE_SLIDES[guideStep];
        const isLast = guideStep === GUIDE_SLIDES.length - 1;
        return (
          <div role="dialog" aria-modal="true" aria-label="Workspace guide" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,20,10,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) closeGuide(); }}>
            <div style={{ background: "var(--paper)", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, padding: "28px 24px 36px", boxShadow: "0 -4px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <span style={{ fontFamily: "var(--font-data)", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--ink)" }}>{guideStep + 1} of {GUIDE_SLIDES.length}</span>
                <button onClick={closeGuide} aria-label="Close guide" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
              </div>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontFamily: slide.mono ? "var(--font-data)" : "var(--font-prose)", fontSize: slide.mono ? 36 : 40, fontWeight: 700, color: "var(--ink)", marginBottom: 16, lineHeight: 1 }}>{slide.icon}</div>
                <h3 style={{ fontFamily: "var(--font-prose)", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>{slide.title}</h3>
                <p style={{ fontFamily: "var(--font-prose)", fontSize: 15, color: "var(--ink)", lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>{slide.body}</p>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
                {GUIDE_SLIDES.map((_, i) => (<button key={i} onClick={() => setGuideStep(i)} aria-label={`Slide ${i + 1}`} style={{ width: i === guideStep ? 20 : 8, height: 8, borderRadius: 4, background: i === guideStep ? "var(--ink)" : "var(--border)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.25s ease" }} />))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {guideStep > 0 && (<button onClick={guidePrev} style={{ flex: 1, minHeight: 48, borderRadius: 10, background: "var(--cream)", color: "var(--ink)", border: "0.5px solid var(--border)", fontSize: 15, fontFamily: "var(--font-prose)", cursor: "pointer" }}>← Back</button>)}
                <button onClick={guideNext} style={{ flex: 2, minHeight: 48, borderRadius: 10, background: "var(--ink)", color: "#F4F8F0", border: "none", fontSize: 15, fontFamily: "var(--font-prose)", cursor: "pointer" }}>{isLast ? "Got it" : "Next →"}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}

// ── Workspace sub-components ──────────────────────────────────────────────

function WsKpiTile({ value, label, color }) {
  return (
    <div style={{ flex: 1, padding: "12px 12px 10px", background: "var(--cream)", borderRadius: 10, border: "0.5px solid var(--border)" }}>
      <div style={{ fontFamily: "var(--font-prose)", fontSize: 24, fontWeight: 500, color: color || "var(--ink)", lineHeight: 1, letterSpacing: "-0.01em", marginBottom: 6 }}>{value}</div>
      <div style={{ fontFamily: "var(--font-data)", fontSize: 8.5, letterSpacing: "0.14em", color: "#8A9A8A", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function WsSubHeader({ label, count }) {
  return (
    <div style={{ padding: "14px 20px 6px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.16em", color: "#8A9A8A", textTransform: "uppercase", fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.10em", color: "#A8B8A8", textTransform: "uppercase" }}>{count}</div>
    </div>
  );
}

function wsScoreColor(score) {
  if (score >= 4.0) return "#3A7A3A";
  if (score >= 3.0) return "#8A6A10";
  return "#5A6A5A";
}

function wsAgoLabel(dateStr) {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 3600 * 1000));
  if (days < 1)  return "TODAY";
  if (days < 7)  return `${days}D AGO`;
  if (days < 14) return "1W AGO";
  if (days < 30) return `${Math.round(days / 7)}W AGO`;
  if (days < 60) return "1MO AGO";
  return `${Math.round(days / 30)}MO AGO`;
}

function WsVerdictPill({ rec }) {
  const r = (rec || "").toLowerCase();
  const s = r === "pursue"
    ? { bg: "#EAF3DE", color: "#27500A" }
    : r === "monitor"
    ? { bg: "#FAEEDA", color: "#633806" }
    : { bg: "#F4F4F0", color: "#5A6A5A" };
  const label = r === "pursue" ? "PURSUE" : r === "monitor" ? "MONITOR" : r ? "PASS" : "—";
  return (
    <span style={{ flexShrink: 0, fontFamily: "var(--font-data)", fontSize: 9, fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", background: s.bg, color: s.color, padding: "4px 10px", borderRadius: 999 }}>{label}</span>
  );
}

function WsOppsList({ roles, onResume, faded = false, compareMode, onToggleCompare, selectedForCompare, t }) {
  const queuedRole = roles.find(r => r.status === "queued" && r.vq_score == null);
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: "0 20px" }}>
      {roles.map((role, i) => {
        const isQueued   = role.status === "queued" && role.vq_score == null;
        const isSelected = selectedForCompare?.has(role.role_id);
        const rec        = role.framework_snapshot?.recommendation || "";
        return (
          <li key={role.role_id}
            role={isQueued ? undefined : "button"}
            tabIndex={isQueued ? undefined : 0}
            style={{ padding: "14px 0", borderBottom: i === roles.length - 1 ? "none" : "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 14, cursor: isQueued ? "default" : "pointer", opacity: faded ? 0.66 : 1, WebkitTapHighlightColor: "transparent" }}
            onClick={isQueued ? undefined : () => onResume(role)}
            onKeyDown={isQueued ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") onResume(role); }}>
            {/* Compare checkbox */}
            {compareMode && !isQueued && (
              <button onClick={e => { e.stopPropagation(); onToggleCompare(role.role_id); }} style={{ width: 20, height: 20, borderRadius: 4, border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`, background: isSelected ? "var(--accent)" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            )}
            {/* Score */}
            <div style={{ width: 44, textAlign: "right", flexShrink: 0, fontFamily: "var(--font-prose)", fontSize: 22, fontWeight: 500, color: isQueued ? "var(--border)" : wsScoreColor(role.vq_score || 0), lineHeight: 1, letterSpacing: "-0.01em" }}>
              {isQueued ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: "inline-block" }} /> : Number(role.vq_score).toFixed(1)}
            </div>
            {/* Title + company */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-prose)", fontSize: 15, fontWeight: 500, color: "var(--ink)", lineHeight: 1.2, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{role.title || "Scoring…"}</div>
              <div style={{ fontFamily: "var(--font-data)", fontSize: 10, color: "#8A9A8A", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {(role.company || "").toUpperCase()}{role.created_at ? ` · ${wsAgoLabel(role.created_at)}` : ""}
                {role.status === "applied" && <span style={{ marginLeft: 6, background: "#DFF0DF", color: "#27500A", padding: "1px 7px", borderRadius: 999, fontSize: 8, letterSpacing: "0.08em" }}>APPLIED</span>}
              </div>
            </div>
            {/* Verdict pill */}
            {!isQueued && <WsVerdictPill rec={rec} />}
          </li>
        );
      })}
    </ul>
  );
}
