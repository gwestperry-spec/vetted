// ─── WorkspaceReminderModal ───────────────────────────────────────────────
// Create or edit a reminder on a workspace role.
// Signal+ tier only — caller is responsible for tier gate; this modal
// assumes the user is already entitled.
//
// Props:
//   role         — workspace role object { role_id, title, company }
//   existing     — existing reminder object to edit, or null for create
//   onSave       — (reminder) => void — called with { role_id, remind_at, label }
//   onClose      — () => void

import { useRef, useState } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";

// ── Helpers ────────────────────────────────────────────────────────────────
// Returns "YYYY-MM-DDTHH:MM" string for <input type="datetime-local"> default
function toLocalDatetimeInput(isoString) {
  if (!isoString) {
    // Default to tomorrow 9 AM
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }
  const d = new Date(isoString);
  // Convert to local time for the input
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d - offset).toISOString().slice(0, 16);
}

// Returns ISO string from datetime-local input value
function fromLocalDatetimeInput(localStr) {
  if (!localStr) return null;
  return new Date(localStr).toISOString();
}

// ── Component ──────────────────────────────────────────────────────────────
export default function WorkspaceReminderModal({ role, existing, onSave, onClose, t }) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, { onClose });

  const [remindAt, setRemindAt] = useState(
    toLocalDatetimeInput(existing?.remind_at || null)
  );
  const [label, setLabel]     = useState(existing?.label || "");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  async function handleSave(e) {
    e.preventDefault();
    if (!remindAt) { setError(t?.rmErrTime || "Please choose a date and time."); return; }
    const isoRemindAt = fromLocalDatetimeInput(remindAt);
    if (!isoRemindAt || new Date(isoRemindAt) <= new Date()) {
      setError(t?.rmErrFuture || "Reminder time must be in the future.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        id:       existing?.id || null,
        role_id:  role.role_id,
        remind_at: isoRemindAt,
        label:    label.trim() || null,
      });
      onClose();
    } catch {
      setError(t?.rmErrSave || "Couldn't save reminder. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Set Reminder"
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(15,14,12,0.60)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} style={{
        background: "#FAFAF8", borderRadius: 10,
        width: "100%", maxWidth: 380,
        padding: "24px 22px",
        boxShadow: "0 6px 32px rgba(15,14,12,0.22)",
        position: "relative",
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close reminder dialog"
          style={{
            position: "absolute", top: 14, right: 14,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: "#1A2E1A", lineHeight: 1,
            minWidth: 32, minHeight: 32, padding: 4,
          }}
        >×</button>

        {/* Header */}
        <p style={{
          fontFamily: "var(--font-data)", fontSize: 9,
          letterSpacing: ".14em", textTransform: "uppercase",
          color: "#1A2E1A", marginBottom: 6,
        }}>
          {existing ? (t?.rmEditTitle || "Edit Reminder") : (t?.rmSetTitle || "Set Reminder")}
        </p>
        <h2 id="reminder-modal-title" style={{
          fontFamily: "var(--font-prose)", fontSize: 16, fontWeight: 600,
          color: "#1A2E1A", marginBottom: 4,
        }}>
          {role.title || "Role"}
        </h2>
        {role.company && (
          <p style={{
            fontFamily: "var(--font-prose)", fontSize: 12, color: "#1A2E1A", marginBottom: 18,
          }}>
            {role.company}
          </p>
        )}

        <form onSubmit={handleSave}>
          {/* Date + time */}
          <label style={{
            display: "block", fontFamily: "var(--font-data)", fontSize: 10,
            letterSpacing: ".1em", textTransform: "uppercase",
            color: "#1A2E1A", marginBottom: 6,
          }}>
            {t?.rmRemindOn || "Remind me on"}
          </label>
          <input
            type="datetime-local"
            value={remindAt}
            onChange={e => setRemindAt(e.target.value)}
            required
            style={{
              width: "100%", padding: "9px 12px",
              fontFamily: "var(--font-prose)", fontSize: 14,
              border: "1px solid #D8E8D8", borderRadius: 6,
              background: "#fff", color: "#1A2E1A",
              marginBottom: 14, boxSizing: "border-box",
              minHeight: 44,
            }}
          />

          {/* Label */}
          <label style={{
            display: "block", fontFamily: "var(--font-data)", fontSize: 10,
            letterSpacing: ".1em", textTransform: "uppercase",
            color: "#1A2E1A", marginBottom: 6,
          }}>
            {t?.rmNote || "Note"} <span style={{ fontWeight: 400, textTransform: "none", color: "#1A2E1A" }}>{t?.rmOptional || "optional"}</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value.slice(0, 120))}
            placeholder={t?.rmPlaceholder || "e.g. Follow up with recruiter"}
            style={{
              width: "100%", padding: "9px 12px",
              fontFamily: "var(--font-prose)", fontSize: 14,
              border: "1px solid #D8E8D8", borderRadius: 6,
              background: "#fff", color: "#1A2E1A",
              marginBottom: 18, boxSizing: "border-box",
              minHeight: 44,
            }}
          />

          {error && (
            <p role="alert" style={{
              fontSize: 12, color: "#C05050",
              marginBottom: 12, lineHeight: 1.5,
            }}>{error}</p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "10px 0",
                fontFamily: "var(--font-prose)", fontSize: 13,
                background: "transparent", border: "1px solid #D8E8D8",
                borderRadius: 6, color: "#1A2E1A",
                cursor: "pointer", minHeight: 44,
              }}
            >{t?.rmCancel || "Cancel"}</button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2, padding: "10px 0",
                fontFamily: "var(--font-prose)", fontSize: 13, fontWeight: 600,
                background: "#1A2E1A", color: "#E8F0E8",
                border: "none", borderRadius: 6,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.75 : 1,
                minHeight: 44,
              }}
            >
              {saving
                ? (t?.rmSaving  || "Saving…")
                : existing
                  ? (t?.rmUpdate || "Update Reminder")
                  : (t?.rmSave   || "Set Reminder")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
