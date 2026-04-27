// ─── RoleCard ──────────────────────────────────────────────────────────────
// Individual role card in the workspace.
// Layout (approved design):
//   • 4px left border, color-coded by verdict
//   • Verdict hero block: dark bg, large centered VQ score + verdict label
//   • Title / Company centered below hero
//   • 4 action buttons in CSS grid (1fr each) spanning full card width
//
// Props:
//   role             — workspace role object
//   reminders        — array of reminders for this role
//   userTier         — string tier
//   compareMode      — bool — workspace is in compare-selection mode
//   selectedForCompare — Set of role_ids currently in compare queue
//   onResume         — () => void — view full analysis (Signal+ only)
//   onToggleCompare  — () => void — add/remove from compare queue (Vantage+ only)
//   onArchive        — () => void
//   onUnarchive      — () => void
//   onSetReminder    — () => void — open reminder modal (Signal+ only)
//   onOpenPaywall    — (contextCopy) => void
//   onCompleteReminder — (reminderId) => void
//   onMarkApplied    — () => void
//   onUnmarkApplied  — () => void

import { useState } from "react";

// ── Verdict palette ────────────────────────────────────────────────────────
// hero: dark bg for the score block
// border: left accent strip
// badge: light pill for the small status badge
const VERDICT_THEME = {
  pursue: {
    heroBg:   "#1A3A1A",
    heroText: "#FFFFFF",
    border:   "#3A7A3A",
    badgeBg:  "#EAF3DE",
    badgeColor: "#27500A",
  },
  monitor: {
    heroBg:   "#4A3000",
    heroText: "#FFFFFF",
    border:   "#B8A030",
    badgeBg:  "#FAEEDA",
    badgeColor: "#633806",
  },
  pass: {
    heroBg:   "#252B25",
    heroText: "#FFFFFF",
    border:   "#5A6A5A",
    badgeBg:  "#EEF0EE",
    badgeColor: "#3A4A3A",
  },
  applied: {
    heroBg:   "#1A3A1A",
    heroText: "#FFFFFF",
    border:   "#3A7A3A",
    badgeBg:  "#DFF0DF",
    badgeColor: "#27500A",
  },
  archived: {
    heroBg:   "#2A2A2A",
    heroText: "#CCCCCC",
    border:   "#888888",
    badgeBg:  "#F5F5F5",
    badgeColor: "#666666",
  },
  queued: {
    heroBg:   "#1A2E1A",
    heroText: "#CCDDCC",
    border:   "#4A6A4A",
    badgeBg:  "#F0F4F0",
    badgeColor: "#1A2E1A",
  },
};

function getTheme(role) {
  if (role.status === "applied")   return VERDICT_THEME.applied;
  if (role.status === "archived")  return VERDICT_THEME.archived;
  const rec = role.framework_snapshot?.recommendation || role.status;
  return VERDICT_THEME[rec] || VERDICT_THEME.queued;
}

// ── Lock icon ──────────────────────────────────────────────────────────────
function LockIcon({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
    </svg>
  );
}

// ── Relative timestamp ─────────────────────────────────────────────────────
function relativeTime(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 2) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Format reminder time ───────────────────────────────────────────────────
function formatReminderTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// ── Paywall copy fallbacks ─────────────────────────────────────────────────
const PAYWALL_EN = {
  carousel:  "Your complete breakdown — every filter scored and explained. Upgrade to Signal.",
  reminders: "Never miss a follow-up. Set reminders on any role. Upgrade to Signal.",
  compare:   "Compare roles side by side. See exactly which one fits better. Upgrade to Vantage.",
};

// ══════════════════════════════════════════════════════════════════════════
export default function RoleCard({
  role,
  reminders = [],
  userTier,
  compareMode,
  selectedForCompare,
  onResume,
  onToggleCompare,
  onArchive,
  onUnarchive,
  onRemove,
  onSetReminder,
  onOpenPaywall,
  onCompleteReminder,
  onMarkApplied,
  onUnmarkApplied,
  t,
}) {
  const [expanded, setExpanded] = useState(false);

  const isSignal  = ["signal", "signal_lifetime", "vantage", "vantage_lifetime"].includes(userTier);
  const isVantage = ["vantage", "vantage_lifetime"].includes(userTier);
  const isFree    = !isSignal;

  const inCompareQueue = selectedForCompare?.has(role.role_id);
  const isArchived     = role.status === "archived";
  const isQueued       = role.status === "queued";
  const isApplied      = role.status === "applied";

  const theme   = getTheme(role);
  const hasScore = role.vq_score != null;
  const scoreStr = hasScore ? Number(role.vq_score).toFixed(1) : null;

  // Pending reminders for this role
  const pendingReminders = reminders.filter(r => r.role_id === role.role_id && !r.completed);

  const PAYWALL = {
    carousel:  t?.paywallCarousel  || PAYWALL_EN.carousel,
    reminders: t?.paywallReminders || PAYWALL_EN.reminders,
    compare:   t?.paywallCompare   || PAYWALL_EN.compare,
  };

  // ── Verdict label ─────────────────────────────────────────────────────────
  const verdictLabel = {
    pursue:   t?.verdictPursue   || "PURSUE",
    monitor:  t?.verdictMonitor  || "MONITOR",
    pass:     t?.verdictPass     || "PASS",
    applied:  t?.verdictApplied  || "APPLIED",
    archived: t?.verdictArchived || "ARCHIVED",
    queued:   t?.verdictQueued   || "SCORING",
  }[role.status] || (
    role.framework_snapshot?.recommendation
      ? (role.framework_snapshot.recommendation.toUpperCase())
      : "—"
  );

  // ── Action handlers ───────────────────────────────────────────────────────
  function handleResume() {
    if (isFree) { onOpenPaywall(PAYWALL.carousel); } else { onResume(); }
  }
  function handleReminder() {
    if (!isSignal) { onOpenPaywall(PAYWALL.reminders); } else { onSetReminder(); }
  }
  function handleCompare() {
    if (!isVantage) { onOpenPaywall(PAYWALL.compare); } else { onToggleCompare(); }
  }

  return (
    <div style={{
      background: "#FFFFFF",
      border: inCompareQueue ? "1.5px solid #1A2E1A" : "1px solid #E0E8E0",
      borderLeft: `4px solid ${theme.border}`,
      borderRadius: 12,
      marginBottom: 10,
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}>

      {/* ── DARK HERO: eyebrow + title/score — matches design spec ── */}
      <div style={{
        background: theme.heroBg,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}>
        {/* Eyebrow: 66.6% width, centered, hairline as border-bottom */}
        <p style={{
          width: "66.6667%",
          margin: "0 auto",
          textAlign: "center",
          fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 400,
          letterSpacing: ".16em", textTransform: "uppercase",
          color: "#A8C0A8", lineHeight: 1.4,
          borderBottom: "0.5px solid rgba(244,248,240,0.15)",
          paddingBottom: 10,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {verdictLabel}
          {role.company ? ` · ${role.company}` : ""}
          {relativeTime(role.updated_at || role.created_at)
            ? ` · ${relativeTime(role.updated_at || role.created_at)}`
            : ""}
        </p>

        {/* Body: title/company left, score right — align-items: end */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 24,
          alignItems: "end",
        }}>
          {/* Left: role title + company meta */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{
              fontFamily: "var(--font-display)", fontStyle: "normal",
              fontSize: 22, fontWeight: 700, lineHeight: 1.2,
              color: "#F4F8F0",
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              margin: 0,
            }}>
              {role.title || "Untitled Role"}
            </p>
            <p style={{
              fontFamily: "var(--font-display)", fontStyle: "normal",
              fontSize: 11, fontWeight: 400, letterSpacing: ".10em",
              textTransform: "uppercase", color: "#C4D8C0",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              margin: 0,
            }}>
              {role.company || "—"}
              {role.source_url && (
                <span>
                  {" · "}
                  <a
                    href={role.source_url}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: "#A8C0A8", textDecoration: "none" }}
                    onClick={e => e.stopPropagation()}
                  >
                    {t?.wsViewPosting || "View ↗"}
                  </a>
                </span>
              )}
            </p>
          </div>

          {/* Right: VQ score — white on dark, 56px */}
          <div style={{ flexShrink: 0 }}>
            {hasScore ? (
              <span style={{
                fontFamily: "var(--font-display)", fontStyle: "normal",
                fontSize: 56, fontWeight: 700, lineHeight: 1,
                letterSpacing: "-0.02em", color: "#F4F8F0",
                display: "block",
              }}>
                {scoreStr}
              </span>
            ) : isQueued ? (
              <span style={{
                fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 400,
                color: "rgba(244,248,240,0.45)", letterSpacing: ".06em",
              }}>
                {t?.wsScoring || "Scoring…"}
              </span>
            ) : (
              <span style={{
                fontFamily: "var(--font-display)", fontSize: 36,
                color: "rgba(244,248,240,0.25)", lineHeight: 1,
              }}>—</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Pending reminders ── */}
      {pendingReminders.length > 0 && (
        <div style={{ padding: "8px 14px 0" }}>
          {pendingReminders.map(rem => (
            <div key={rem.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#FAEEDA", borderRadius: 4, padding: "4px 8px", marginBottom: 6,
            }}>
              <span style={{ fontFamily: "var(--font-prose)", fontSize: 11, color: "#633806" }}>
                🔔 {rem.label || "Reminder"} · {formatReminderTime(rem.remind_at)}
              </span>
              <button
                onClick={() => onCompleteReminder(rem.id)}
                aria-label="Mark reminder as done"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#633806", fontSize: 13, padding: 0,
                  minWidth: 28, minHeight: 28, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >✓</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Next action ── */}
      {role.next_action && (
        <div style={{ padding: "6px 14px 0" }}>
          <p style={{
            fontFamily: "var(--font-prose)", fontSize: 11, color: "#1A2E1A",
            background: "#F0F4F0", borderRadius: 4, padding: "4px 8px",
            display: "inline-block",
          }}>
            ↻ {role.next_action}
            {role.next_action_at && (
              <span style={{ color: "#4A6A4A" }}>{" · "}{formatReminderTime(role.next_action_at)}</span>
            )}
          </p>
        </div>
      )}

      {/* ── Expanded notes ── */}
      {expanded && role.notes && (
        <div style={{ padding: "8px 14px 0" }}>
          <p style={{
            fontFamily: "var(--font-prose)", fontSize: 12, color: "#1A2E1A",
            lineHeight: 1.6, background: "#FAFAF8", borderRadius: 4, padding: "8px 10px",
          }}>
            {role.notes}
          </p>
        </div>
      )}

      {/* ── ACTION BUTTONS — 4-column grid, full card width ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isArchived
          ? "1fr 1fr"               // archived: Restore + Remove
          : (hasScore ? "1fr 1fr 1fr 1fr" : "1fr 1fr"),
        gap: 0,
        borderTop: "1px solid #EEF4EE",
        marginTop: 10,
      }}>

        {/* REVIEW */}
        {!isArchived && hasScore && (
          <button
            onClick={handleResume}
            aria-label={isFree ? "Review full analysis (requires Signal)" : "Review full analysis"}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 3,
              fontFamily: "var(--font-data)", fontSize: 9,
              letterSpacing: ".1em", textTransform: "uppercase",
              color: theme.heroBg,
              background: theme.badgeBg,
              border: "none",
              borderRight: "1px solid #EEF4EE",
              padding: "11px 6px",
              cursor: "pointer", minHeight: 44,
            }}
          >
            {isFree && <LockIcon size={11} color={theme.heroBg} />}
            <span>{t?.wsReview || "Review"}</span>
          </button>
        )}

        {/* REMINDER */}
        {!isArchived && (
          <button
            onClick={handleReminder}
            aria-label={!isSignal ? "Reminders require Signal" : "Set a reminder"}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 3,
              fontFamily: "var(--font-data)", fontSize: 9,
              letterSpacing: ".1em", textTransform: "uppercase",
              color: "#4A6A4A",
              background: "#F8FAF8",
              border: "none",
              borderRight: "1px solid #EEF4EE",
              padding: "11px 6px",
              cursor: "pointer", minHeight: 44,
            }}
          >
            {!isSignal && <LockIcon size={11} color="#4A6A4A" />}
            <span style={{ fontSize: 14 }}>🔔</span>
          </button>
        )}

        {/* ARCHIVE / RESTORE */}
        {!isArchived ? (
          <button
            onClick={onArchive}
            aria-label="Archive this role"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 3,
              fontFamily: "var(--font-data)", fontSize: 9,
              letterSpacing: ".1em", textTransform: "uppercase",
              color: "#4A6A4A",
              background: "#F8FAF8",
              border: "none",
              borderRight: hasScore ? "1px solid #EEF4EE" : "none",
              padding: "11px 6px",
              cursor: "pointer", minHeight: 44,
            }}
          >
            <span style={{ fontSize: 14 }}>📁</span>
            <span>{t?.wsArchiveBtn || "Archive"}</span>
          </button>
        ) : (
          <>
            <button
              onClick={onUnarchive}
              aria-label="Restore this role from archive"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 3,
                fontFamily: "var(--font-data)", fontSize: 9,
                letterSpacing: ".1em", textTransform: "uppercase",
                color: "#27500A",
                background: "#EAF3DE",
                border: "none",
                borderRight: "1px solid #D8E8D8",
                padding: "13px 6px",
                cursor: "pointer", minHeight: 44,
              }}
            >
              {t?.wsRestoreBtn || "Restore"}
            </button>
            <button
              onClick={onRemove}
              aria-label="Permanently remove this role"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 3,
                fontFamily: "var(--font-data)", fontSize: 9,
                letterSpacing: ".1em", textTransform: "uppercase",
                color: "#7A3A3A",
                background: "transparent",
                border: "none",
                padding: "13px 6px",
                cursor: "pointer", minHeight: 44,
              }}
            >
              {t?.wsDeleteBtn || "Delete"}
            </button>
          </>
        )}

        {/* I APPLIED */}
        {!isArchived && hasScore && (
          isApplied ? (
            <button
              onClick={onUnmarkApplied}
              aria-label="Unmark as applied"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 3,
                fontFamily: "var(--font-data)", fontSize: 9,
                letterSpacing: ".1em", textTransform: "uppercase",
                color: "#27500A",
                background: "#DFF0DF",
                border: "none",
                padding: "11px 6px",
                cursor: "pointer", minHeight: 44,
              }}
            >
              <span style={{ fontSize: 14 }}>✓</span>
              <span>{t?.wsApplied || "Applied"}</span>
            </button>
          ) : (
            <button
              onClick={onMarkApplied}
              aria-label="Mark as applied"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 3,
                fontFamily: "var(--font-data)", fontSize: 9,
                letterSpacing: ".1em", textTransform: "uppercase",
                color: "#4A6A4A",
                background: "#F8FAF8",
                border: "none",
                padding: "11px 6px",
                cursor: "pointer", minHeight: 44,
              }}
            >
              <span style={{ fontSize: 13 }}>◎</span>
              <span>{t?.wsMarkApplied || "I Applied"}</span>
            </button>
          )
        )}
      </div>

      {/* ── Compare toggle (only visible in compare mode, below main buttons) ── */}
      {!isArchived && compareMode && (
        <button
          onClick={handleCompare}
          aria-label={
            !isVantage ? "Compare requires Vantage"
              : inCompareQueue ? "Remove from compare queue"
              : "Add to compare queue"
          }
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "var(--font-data)", fontSize: 10,
            letterSpacing: ".1em", textTransform: "uppercase",
            color: !isVantage ? "#4A6A4A" : inCompareQueue ? "#fff" : "#1A2E1A",
            background: !isVantage ? "#F0F4F0" : inCompareQueue ? "#1A2E1A" : "#EAF3DE",
            border: "none",
            borderTop: "1px solid #EEF4EE",
            padding: "10px 16px",
            cursor: "pointer", minHeight: 40,
          }}
        >
          {!isVantage && <LockIcon size={11} color="#4A6A4A" />}
          {inCompareQueue
            ? `✓ ${t?.wsSelected || "Selected for Compare"}`
            : (t?.wsAddToCompare || "Add to Compare")}
        </button>
      )}

      {/* ── Notes expand toggle ── */}
      {role.notes && (
        <button
          onClick={() => setExpanded(x => !x)}
          aria-label={expanded ? "Collapse notes" : "Expand notes"}
          style={{
            width: "100%",
            fontFamily: "var(--font-data)", fontSize: 9,
            letterSpacing: ".1em", textTransform: "uppercase",
            color: "#4A6A4A", background: "transparent",
            border: "none", borderTop: "1px solid #EEF4EE",
            cursor: "pointer", padding: "8px 16px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {expanded ? "▲ Collapse" : "▼ Notes"}
        </button>
      )}
    </div>
  );
}
