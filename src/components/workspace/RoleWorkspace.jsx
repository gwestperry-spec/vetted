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

  // ── Opportunities list for MarketPulse ────────────────────────────────────
  const oppsList = workspaceRoles
    .filter(r => r.vq_score != null)
    .map(workspaceRoleToOpp);

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <main id="main-content" aria-label="Role workspace">

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div style={{ background:"#FAFAF8", borderBottom:"0.5px solid #D8E8D8", padding:"14px 20px 10px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {/* Wordmark */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span onClick={handleDevTap} style={{
              fontFamily:"var(--font-data)", fontSize:13, fontWeight:500,
              letterSpacing:".14em", color:"#1A2E1A", userSelect:"none", cursor:"default",
            }}>VETTED</span>
            {devTierOverride && (
              <span style={{
                fontFamily:"var(--font-data)", fontSize:10, fontWeight:700,
                letterSpacing:".1em", textTransform:"uppercase",
                background:"#e74c3c", color:"#fff", padding:"1px 6px", borderRadius:20,
              }}>DEV</span>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{
              fontFamily:"var(--font-data)", fontSize:9, letterSpacing:".08em",
              color:"#1A2E1A", textTransform:"uppercase",
            }}>{formatWorkspaceDate()}</span>
            <button onClick={openGuide} aria-label="Open guide" style={{
              width:28, height:28, borderRadius:"50%",
              background:"#F0F4F0", border:"1px solid #D8E8D8",
              color:"#1A2E1A", fontSize:12, fontWeight:600,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            }}>?</button>
            {setLang && <LangSwitcher lang={lang} setLang={setLang} compact={true} />}
            {isVantage && (
              <button
                onClick={() => setCompareMode(x => !x)}
                aria-pressed={compareMode}
                style={{
                  fontFamily:"var(--font-data)", fontSize:9, letterSpacing:".1em",
                  textTransform:"uppercase", color:"#1A2E1A",
                  background: compareMode ? "#D8E8D8" : "transparent",
                  border:"1px solid #D8E8D8", borderRadius:20,
                  padding:"4px 10px", cursor:"pointer", minHeight:28,
                }}
              >{compareMode ? (t?.wsComparing || "Comparing") : (t?.wsCompare || "Compare")}</button>
            )}
          </div>
        </div>

        {/* Stats + CTA */}
        <div style={{ marginTop:10, marginBottom:2, display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontFamily:"var(--font-prose)", fontSize:18, fontWeight:700, color:"#1A2E1A", marginBottom:2 }}>
              {workspaceRoles.filter(r => r.status !== "archived").length > 0
                ? (t?.workspaceTitle || "Your Workspace")
                : (t?.workspaceStart || "Start your search")}
            </p>
            {/* Stats band */}
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontFamily:"var(--font-data)", fontSize:10, color:"#1A2E1A" }}>
                {activeRoles.length + appliedRoles.length} {t?.wsActive || "active"}
              </span>
              {appliedRoles.length > 0 && (
                <span style={{ fontFamily:"var(--font-data)", fontSize:10, color:"#27500A" }}>
                  · {appliedRoles.length} applied
                </span>
              )}
              <span style={{ fontFamily:"var(--font-data)", fontSize:10, color:"#1A2E1A" }}>
                · {archivedRoles.length} {t?.wsArchived || "archived"}
              </span>
              <span style={{ fontFamily:"var(--font-data)", fontSize:10, color:"#D8E8D8" }}>·</span>
              <button
                onClick={() => onEditProfile?.()}
                style={{
                  background:"none", border:"none", padding:0, cursor:"pointer",
                  fontFamily:"var(--font-data)", fontSize:10, color:"#4A6A4A",
                  letterSpacing:".04em", textDecoration:"underline", textDecorationColor:"#C8DDB8",
                  minHeight:0,
                }}
              >Profile</button>
              <button
                onClick={() => onEditFilters?.()}
                style={{
                  background:"none", border:"none", padding:0, cursor:"pointer",
                  fontFamily:"var(--font-data)", fontSize:10, color:"#4A6A4A",
                  letterSpacing:".04em", textDecoration:"underline", textDecorationColor:"#C8DDB8",
                  minHeight:0,
                }}
              >Filters</button>
            </div>
          </div>
          <button
            onClick={() => setShowScoringPanel(x => !x)}
            aria-label={showScoringPanel ? "Close scoring panel" : "Score a new role"}
            style={{
              fontFamily:"var(--font-prose)", fontSize:13, fontWeight:600,
              color: showScoringPanel ? "#1A2E1A" : "#E8F0E8",
              background: showScoringPanel ? "#F0F4F0" : "#1A2E1A",
              border: showScoringPanel ? "1px solid #D8E8D8" : "none",
              borderRadius:6, padding:"8px 14px", cursor:"pointer",
              minHeight:44, textAlign:"center", lineHeight:1.2,
              maxWidth:160,
            }}
          >
            {showScoringPanel ? "✕ Close" : (t?.workspaceScoreBtn || "+ Score a Role")}
          </button>
        </div>
      </div>

      {/* ── Scoring input panel (collapsible) ────────────────────────────── */}
      {showScoringPanel && (
        <div style={{
          background:"#F0F4F0", borderBottom:"1px solid #D8E8D8",
          padding:"16px 20px",
        }}>
          {loading && <ScoringProgressComponent phase={scoringPhase} />}
          {!loading && (
            <>
              <CoachMark
                storageKey="vetted_cm_workspace"
                title={t?.cmWorkspaceTitle}
                body={t?.cmWorkspaceBody}
                dir={t?.dir}
              />
              <textarea
                value={inputVal}
                onChange={e => { setInputVal(e.target.value); setFetchError(""); setUrlCleaned(false); }}
                placeholder={t?.scorePlaceholder || "Paste a job description or drop a URL — Vetted handles both."}
                maxLength={MAX_JD}
                rows={4}
                autoFocus
                style={{
                  width:"100%", padding:"10px 12px",
                  borderRadius:8, border:"0.5px solid #D8E8D8",
                  background:"#fff", color:"#1A2E1A",
                  WebkitTextFillColor:"#1A2E1A",
                  fontSize:16, fontFamily:"var(--font-prose)",
                  lineHeight:1.5, resize:"none", outline:"none",
                  boxSizing:"border-box", display:"block",
                }}
              />

              {urlCleaned && !fetching && (
                <div role="status" style={{
                  background:"#F0FDF4", border:"1px solid #BBF7D0",
                  borderRadius:6, padding:"8px 12px", marginTop:8,
                  display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
                }}>
                  <span style={{ fontSize:12, color:"#166534", lineHeight:1.4 }}>✓ Tracking params removed — fetching the clean URL</span>
                  <button onClick={() => setUrlCleaned(false)} aria-label="Dismiss" style={{ background:"none", border:"none", cursor:"pointer", color:"#86EFAC", fontSize:16, lineHeight:1, padding:0 }}>×</button>
                </div>
              )}

              {linkedInGuide && (
                <div role="alert" style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:8, padding:"14px 16px", marginTop:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:"#1E40AF", margin:0 }}>LinkedIn blocks automated access — paste the JD text instead:</p>
                    <button onClick={() => setLinkedInGuide(false)} aria-label="Dismiss" style={{ background:"none", border:"none", cursor:"pointer", color:"#93C5FD", fontSize:18, lineHeight:1, padding:"0 0 0 8px" }}>×</button>
                  </div>
                  <ol style={{ margin:0, padding:"0 0 0 18px", display:"flex", flexDirection:"column", gap:6 }}>
                    <li style={{ fontSize:13, color:"#1E3A8A", lineHeight:1.5 }}>Open the LinkedIn job posting in your browser</li>
                    <li style={{ fontSize:13, color:"#1E3A8A", lineHeight:1.5 }}>Expand "About the job" and copy the full description</li>
                    <li style={{ fontSize:13, color:"#1E3A8A", lineHeight:1.5 }}>Paste it here and hit Score</li>
                  </ol>
                </div>
              )}

              {fetchError && (
                <div role="alert" style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:6, padding:"10px 14px", marginTop:8 }}>
                  {isJsGatedAts(inputVal) ? (
                    <>
                      <p style={{ fontSize:13, color:"#C05050", margin:"0 0 6px", fontWeight:600 }}>This portal uses JavaScript — copy the JD text and paste it here.</p>
                    </>
                  ) : (
                    <p style={{ fontSize:13, color:"#C05050", margin:0, fontWeight:600 }}>Couldn't fetch this page. Copy the JD text and paste it instead.</p>
                  )}
                </div>
              )}

              {error && (
                <div role="alert" style={{ background:"#FEF2F2", color:"#C05050", fontSize:13, borderRadius:6, padding:"8px 12px", marginTop:8 }}>{error}</div>
              )}

              <p style={{ fontSize:11, color:"#6A8A6A", marginTop:8, marginBottom:0, lineHeight:1.5 }}>
                {t?.langScoringHint || "VQ insights appear in English — select your language before scoring for translated analysis."}
              </p>

              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={!inputVal.trim() || fetching}
                aria-busy={fetching}
                style={{ marginTop:10, width:"100%", fontFamily:"var(--font-data)", letterSpacing:".08em" }}
              >
                {fetching ? "Fetching…" : isUrl(inputVal) && !isLinkedIn(inputVal) ? "FETCH & ANALYZE" : (t?.btnScore || "SCORE")}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div style={{ padding:"16px 20px 80px" }}>

        {/* ── TOP MATCHES carousel ── */}
        {scoredRoles.length > 0 && (
          <section aria-labelledby="carousel-heading" style={{ marginBottom:24 }}>
            <h2 className="sr-only" id="carousel-heading">Top Matches</h2>
            <SectionLabel>{t?.sectionTopMatches || "Top Matches"}</SectionLabel>
            <div
              style={{ overflow:"hidden", borderRadius:12, cursor:"grab", userSelect:"none" }}
              onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
              onMouseDown={onMouseDown} onMouseUp={onMouseUp}
              aria-roledescription="carousel"
            >
              <div style={{ display:"flex", transform:`translateX(-${carouselIdx * 100}%)`, transition:"transform 0.3s ease" }}>
                {scoredRoles.map((role, idx) => {
                  const isHero = idx === 0;
                  const vp = verdictPill(role.framework_snapshot?.recommendation || role.status, isHero);
                  const sc = scoreColor(role.vq_score, isHero);
                  const isApplied = role.status === "applied";
                  return (
                    <div key={role.role_id} style={{
                      minWidth:"100%", flexShrink:0,
                      background: isHero ? "#1A2E1A" : "#F0F4F0",
                      border: isHero ? "none" : "0.5px solid #D8E8D8",
                      borderRadius:12, padding:"16px 18px",
                    }}>
                      <button
                        onClick={() => handleResume(role)}
                        aria-label={`${role.title} at ${role.company}. Score ${Number(role.vq_score).toFixed(1)}.`}
                        style={{ display:"block", width:"100%", textAlign:"left", background:"none", border:"none", padding:0, cursor:"pointer" }}
                      >
                        <div style={{
                          fontFamily:"var(--font-data)", fontSize:9, letterSpacing:".12em",
                          color: isHero ? "#8AB89A" : "#1A2E1A", marginBottom:5, textTransform:"uppercase",
                        }}>
                          {(role.framework_snapshot?.recommendation || role.status)?.toUpperCase()} · {role.company?.toUpperCase()}
                        </div>
                        <div style={{
                          fontFamily:"var(--font-prose)", fontSize: isHero ? 16 : 15,
                          fontWeight:500, color: isHero ? "#E8F0E8" : "#1A2E1A",
                          lineHeight:1.2, marginBottom:3,
                        }}>{role.title}</div>
                        <div style={{
                          fontFamily:"var(--font-data)", fontSize:11,
                          color: isHero ? "#8AB89A" : "#1A2E1A", marginBottom:14,
                        }}>{role.company}</div>
                        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                          <span style={{
                            fontFamily:"var(--font-data)", fontSize: isHero ? 36 : 32,
                            fontWeight:500, color: isHero ? "#E8F0E8" : sc, lineHeight:1,
                          }}>{Number(role.vq_score).toFixed(1)}</span>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                            <span style={{
                              fontFamily:"var(--font-data)", fontSize:10, fontWeight:500,
                              letterSpacing:".1em", textTransform:"uppercase",
                              background:vp.bg, color:vp.color,
                              padding:"4px 14px", borderRadius:20,
                            }}>{(role.framework_snapshot?.recommendation || role.status)?.toUpperCase()}</span>
                            {isApplied && (
                              <span style={{
                                fontFamily:"var(--font-data)", fontSize:9,
                                background: isHero ? "#253C25" : "#DFF0DF",
                                color: isHero ? "#8AB89A" : "#27500A",
                                padding:"2px 10px", borderRadius:20,
                              }}>{t?.wsApplied || "Applied"}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            {CAROUSEL_MAX > 1 && (
              <div style={{ display:"flex", justifyContent:"center", gap:5, marginTop:8 }}>
                {scoredRoles.map((_, i) => (
                  <button key={i} onClick={() => setCarouselIdx(i)} aria-label={`Go to match ${i+1}`} style={{
                    width: i===carouselIdx ? 20 : 6, height:6, borderRadius:3,
                    background: i===carouselIdx ? "#3A7A3A" : "#D8E8D8",
                    border:"none", cursor:"pointer", padding:0, transition:"all 0.25s ease",
                  }} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── MARKET PULSE (Vantage) ── */}
        <MarketPulseCard
          t={t}
          profile={profile}
          authUser={authUser}
          userTier={effectiveTier}
          opportunities={oppsList}
        />

        {/* ── INTELLIGENCE strip ── */}
        {behavioralInsight && (
          <div style={{
            marginBottom:20,
            background:"#fff",
            border:"1px solid #D8E8D8",
            borderLeft:"3px solid #3A7A3A",
            borderRadius:"0 10px 10px 0",
            padding:"14px 16px",
          }}>
            <div style={{
              fontFamily:"var(--font-data)", fontSize:9, fontWeight:700,
              color:"#1A2E1A", letterSpacing:".15em", textTransform:"uppercase", marginBottom:8,
            }}>INTELLIGENCE</div>
            <p style={{ fontFamily:"var(--font-prose)", fontSize:13, color:"#1A2E1A", lineHeight:1.65, marginBottom:12 }}>
              {behavioralInsight.insight_text}
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => onDismissInsight?.(behavioralInsight.id)} style={{
                fontFamily:"var(--font-data)", fontSize:11, color:"#1A2E1A",
                background:"transparent", border:"1px solid #D8E8D8",
                borderRadius:20, padding:"5px 14px", cursor:"pointer",
              }}>Dismiss</button>
              <button onClick={() => onActedOnInsight?.(behavioralInsight.id)} style={{
                fontFamily:"var(--font-data)", fontSize:11, color:"#1A2E1A",
                background:"#E0F0E0", border:"1px solid #C8E0C8",
                borderRadius:20, padding:"5px 14px", cursor:"pointer",
              }}>Got it</button>
            </div>
          </div>
        )}


        {/* ── CompareQueue tray ── */}
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

        {/* ── TODAY section ── */}
        {todayRoles.length > 0 && (
          <section aria-label="Today's roles" style={{ marginBottom:8 }}>
            <SectionLabel count={todayRoles.length}>{t?.wsToday || "Today"}</SectionLabel>
            {renderCards(todayRoles)}
          </section>
        )}

        {/* ── IN PROGRESS (applied) section ── */}
        {appliedRoles.length > 0 && (
          <section aria-labelledby="applied-heading" style={{ marginBottom:8 }}>
            <h2 className="sr-only" id="applied-heading">In Progress</h2>
            <SectionLabel count={appliedRoles.length}>{t?.sectionInProgress || "In Progress"}</SectionLabel>
            <div style={{ background:"#F0F4F0", borderRadius:10, overflow:"hidden" }}>
              {appliedRoles.map((role, i) => {
                const sc = scoreColor(role.vq_score || 0);
                const isEditing = editingStatusId === role.role_id;
                return (
                  <div key={role.role_id} style={{ borderBottom: i < appliedRoles.length-1 ? "0.5px solid #D8E8D8" : "none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <button onClick={() => handleResume(role)} style={{ background:"none", border:"none", padding:0, cursor:"pointer", textAlign:"left", width:"100%" }}>
                          <div style={{ fontFamily:"var(--font-prose)", fontSize:13, fontWeight:500, color:"#1A2E1A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{role.title}</div>
                          <div style={{ fontFamily:"var(--font-data)", fontSize:10, color:"#1A2E1A", marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{role.company}</div>
                        </button>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
                        <span style={{
                          fontFamily:"var(--font-data)", fontSize:9, fontWeight:500,
                          letterSpacing:".08em", textTransform:"uppercase",
                          background:"#DFF0DF", color:"#27500A",
                          borderRadius:20, padding:"3px 10px",
                        }}>{t?.wsApplied || "Applied"}</span>
                        {role.vq_score != null && (
                          <span style={{ fontFamily:"var(--font-data)", fontSize:11, color:sc }}>{Number(role.vq_score).toFixed(1)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingStatusId(isEditing ? null : role.role_id)}
                        aria-label={isEditing ? "Close" : "Update status"}
                        style={{ background:"none", border:"none", cursor:"pointer", color:"#1A2E1A", fontSize:14, minWidth:36, minHeight:36, display:"flex", alignItems:"center", justifyContent:"center" }}
                      >{isEditing ? "✕" : "✎"}</button>
                    </div>
                    {isEditing && (
                      <div style={{ padding:"0 14px 12px" }}>
                        <div style={{ background:"#fff", borderRadius:8, padding:"10px 12px", border:"0.5px solid #D8E8D8" }}>
                          <div style={{ fontFamily:"var(--font-data)", fontSize:9, color:"#1A2E1A", letterSpacing:".12em", textTransform:"uppercase", marginBottom:8 }}>{t?.labelActions || "Actions"}</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                            <button onClick={() => { onUnmarkApplied(role.role_id); setEditingStatusId(null); }} style={{
                              fontFamily:"var(--font-data)", fontSize:11, letterSpacing:".06em",
                              background:"#F8ECEC", color:"#C05050", border:"1px solid #E8D0D0",
                              borderRadius:20, padding:"4px 12px", cursor:"pointer", minHeight:36,
                            }}>{t?.wsRemoveFromProgress || "Remove from In Progress"}</button>
                            <button onClick={() => { onArchive(role.role_id); setEditingStatusId(null); }} style={{
                              fontFamily:"var(--font-data)", fontSize:11, letterSpacing:".06em",
                              background:"transparent", color:"#1A2E1A", border:"0.5px solid #D8E8D8",
                              borderRadius:20, padding:"4px 12px", cursor:"pointer", minHeight:36,
                            }}>Archive</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── ACTIVE section ── */}
        <section aria-label="Active roles" style={{ marginBottom:8 }}>
          <SectionLabel count={activeRoles.length}>{t?.wsSectionActive || "Active"}</SectionLabel>
          {activeRoles.length === 0 && appliedRoles.length === 0
            ? <WorkspaceEmptyState section="active" onScoreNewRole={() => setShowScoringPanel(true)} t={t} />
            : renderCards(activeRoles)
          }
        </section>

        {/* ── ARCHIVED section ── */}
        {archivedRoles.length > 0 && (
          <section aria-label="Archived roles">
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <button
                onClick={() => setShowArchived(x => !x)}
                aria-expanded={showArchived}
                style={{
                  display:"flex", alignItems:"center", gap:6,
                  fontFamily:"var(--font-data)", fontSize:9, letterSpacing:".12em",
                  textTransform:"uppercase", color:"#1A2E1A",
                  background:"none", border:"none", cursor:"pointer", padding:0, minHeight:28,
                }}
              >
                <span>{showArchived ? "▼" : "▶"}</span>
                {t?.wsSectionArchived || "Archived"}
              </button>
              <div style={{ flex:1, height:0.5, background:"#D8E8D8" }} />
              <span style={{ fontFamily:"var(--font-data)", fontSize:9, color:"#1A2E1A" }}>{archivedRoles.length}</span>
            </div>
            {showArchived && <div id="archived-roles-list">{renderCards(archivedRoles)}</div>}
          </section>
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
          <div role="dialog" aria-modal="true" aria-label="Workspace guide" style={{
            position:"fixed", inset:0, zIndex:1000,
            background:"rgba(10,20,10,0.7)",
            display:"flex", alignItems:"flex-end", justifyContent:"center",
            padding:"0 0 env(safe-area-inset-bottom, 0)",
          }} onClick={e => { if (e.target === e.currentTarget) closeGuide(); }}>
            <div style={{
              background:"#FAFAF8", borderRadius:"16px 16px 0 0",
              width:"100%", maxWidth:480, padding:"28px 24px 36px",
              boxShadow:"0 -4px 32px rgba(0,0,0,0.18)",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <span style={{ fontFamily:"var(--font-data)", fontSize:11, letterSpacing:".18em", textTransform:"uppercase", color:"#1A2E1A" }}>{guideStep+1} of {GUIDE_SLIDES.length}</span>
                <button onClick={closeGuide} aria-label="Close guide" style={{ background:"none", border:"none", cursor:"pointer", color:"#1A2E1A", fontSize:20, lineHeight:1, padding:4 }}>✕</button>
              </div>
              <div style={{ textAlign:"center", marginBottom:32 }}>
                <div style={{ fontFamily: slide.mono ? "var(--font-data)" : "var(--font-prose)", fontSize: slide.mono ? 36 : 40, fontWeight:700, color:"#1A2E1A", marginBottom:16, lineHeight:1 }}>{slide.icon}</div>
                <h3 style={{ fontFamily:"var(--font-prose)", fontSize:20, fontWeight:700, color:"#1A2E1A", marginBottom:12 }}>{slide.title}</h3>
                <p style={{ fontFamily:"var(--font-prose)", fontSize:15, color:"#1A2E1A", lineHeight:1.7, maxWidth:320, margin:"0 auto" }}>{slide.body}</p>
              </div>
              <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:24 }}>
                {GUIDE_SLIDES.map((_, i) => (
                  <button key={i} onClick={() => setGuideStep(i)} aria-label={`Slide ${i+1}`} style={{
                    width: i===guideStep ? 20 : 8, height:8, borderRadius:4,
                    background: i===guideStep ? "#1A2E1A" : "#D8E8D8",
                    border:"none", cursor:"pointer", padding:0, transition:"all 0.25s ease",
                  }} />
                ))}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                {guideStep > 0 && (
                  <button onClick={guidePrev} style={{ flex:1, minHeight:48, borderRadius:10, background:"#F0F4F0", color:"#1A2E1A", border:"1px solid #D8E8D8", fontSize:15, fontFamily:"var(--font-prose)", cursor:"pointer" }}>← Back</button>
                )}
                <button onClick={guideNext} style={{ flex:2, minHeight:48, borderRadius:10, background:"#1A2E1A", color:"#E8F0E8", border:"none", fontSize:15, fontFamily:"var(--font-prose)", cursor:"pointer" }}>
                  {isLast ? "Got it" : "Next →"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
