// ─── CompareQueue ──────────────────────────────────────────────────────────
// Multi-select tray for choosing 2–4 roles to compare side-by-side.
// Vantage tier only. Free and Signal users see a locked state with PaywallModal.
//
// Props:
//   selected         — Set of role_ids currently selected
//   workspaceRoles   — full workspace role array (for name lookup)
//   userTier         — string tier identifier
//   onToggle         — (role_id) => void — add or remove from selection
//   onCompare        — () => void — launch compare with current selection
//   onClear          — () => void — clear selection and exit compare mode
//   onOpenPaywall    — (contextCopy) => void

// ── Shared lock icon ───────────────────────────────────────────────────────
function LockIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1A2E1A" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
    </svg>
  );
}

const VANTAGE_COPY_EN = "Compare roles side by side. Upgrade to Vantage.";

export default function CompareQueue({
  selected,
  workspaceRoles,
  userTier,
  onToggle,
  onCompare,
  onClear,
  onOpenPaywall,
  t,
}) {
  const isVantage = userTier === "vantage" || userTier === "vantage_lifetime";
  const selectedCount = selected.size;
  const canCompare = selectedCount >= 2 && selectedCount <= 4;

  // If no roles selected and user is Vantage, show nothing (tray is collapsed)
  if (isVantage && selectedCount === 0) return null;

  // ── Locked state (Free / Signal) ──────────────────────────────────────────
  if (!isVantage) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, padding: "10px 14px",
        background: "#F0F4F0", border: "1px solid #D8E8D8",
        borderRadius: 8, marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LockIcon size={13} />
          <span style={{
            fontFamily: "var(--font-prose)", fontSize: 12, color: "#1A2E1A",
          }}>
            {t?.wsCompareSide || "Compare roles side by side"}
          </span>
        </div>
        <button
          onClick={() => onOpenPaywall(t?.paywallCompare || VANTAGE_COPY_EN)}
          aria-label="Upgrade to Vantage to unlock Compare"
          style={{
            fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 600,
            letterSpacing: ".08em", textTransform: "uppercase",
            color: "#1A2E1A", background: "transparent",
            border: "1px solid #C8DDB8", borderRadius: 5,
            padding: "5px 10px", cursor: "pointer",
            minHeight: 30,
          }}
        >
          {t?.wsUpgrade || "Upgrade"}
        </button>
      </div>
    );
  }

  // ── Active tray (Vantage, roles selected) ────────────────────────────────
  const selectedRoles = [...selected]
    .map(id => workspaceRoles.find(r => r.role_id === id))
    .filter(Boolean);

  return (
    <div style={{
      background: "#1A2E1A", borderRadius: 8,
      padding: "12px 14px", marginBottom: 16,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: selectedCount > 0 ? 10 : 0,
      }}>
        <span style={{
          fontFamily: "var(--font-data)", fontSize: 9,
          letterSpacing: ".14em", textTransform: "uppercase",
          color: "#7ABB7A",
        }}>
          {t?.wsCompareQueue || "Compare Queue"} · {selectedCount} {t?.wsSelected || "selected"}
        </span>
        <button
          onClick={onClear}
          aria-label="Clear compare selection"
          style={{
            fontFamily: "var(--font-data)", fontSize: 9,
            letterSpacing: ".08em", color: "#7ABB7A",
            background: "none", border: "none",
            cursor: "pointer", padding: "4px 0",
            minHeight: 30, minWidth: 44,
          }}
        >
          {t?.wsClear || "Clear"}
        </button>
      </div>

      {/* Selected role chips */}
      {selectedRoles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {selectedRoles.map(r => (
            <div key={r.role_id} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.10)", borderRadius: 20,
              padding: "4px 10px",
            }}>
              <span style={{
                fontFamily: "var(--font-prose)", fontSize: 11, color: "#E8F0E8",
                maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {r.title || r.company || r.role_id}
              </span>
              <button
                onClick={() => onToggle(r.role_id)}
                aria-label={`Remove ${r.title || r.company || "role"} from compare`}
                style={{
                  background: "none", border: "none",
                  color: "#7ABB7A", cursor: "pointer",
                  fontSize: 14, lineHeight: 1,
                  padding: 0, minWidth: 18, minHeight: 18,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onCompare}
        disabled={!canCompare}
        aria-label={canCompare ? "Compare selected roles" : "Select 2 to 4 roles to compare"}
        style={{
          width: "100%", padding: "9px 0",
          fontFamily: "var(--font-prose)", fontSize: 13, fontWeight: 600,
          background: canCompare ? "#E8F0E8" : "rgba(255,255,255,0.12)",
          color: canCompare ? "#1A2E1A" : "#1A2E1A",
          border: "none", borderRadius: 6,
          cursor: canCompare ? "pointer" : "not-allowed",
          minHeight: 44,
          transition: "background 0.15s",
        }}
      >
        {canCompare
          ? `${t?.wsCompareRoles || "Compare Roles"} (${selectedCount})`
          : `${Math.max(0, 2 - selectedCount)} ${t?.wsSelectMore || "more to compare"}`}
      </button>
    </div>
  );
}
