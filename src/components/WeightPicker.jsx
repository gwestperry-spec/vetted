// ─── WeightPicker ─────────────────────────────────────────────────────────
// Replaces native <select> so text is centered on iOS (WKWebView renders
// native selects misaligned). Step ‹/› buttons cycle through WEIGHT_OPTIONS.
export const WEIGHT_OPTIONS = [
  { value: 0.5, label: "Minor" },
  { value: 1.0, label: "Standard" },
  { value: 1.2, label: "Relevant" },
  { value: 1.3, label: "Important" },
  { value: 1.5, label: "Critical" },
  { value: 2.0, label: "Critical +" },
];

const WEIGHT_T_KEYS = {
  0.5: "weightMinor", 1.0: "weightStandard", 1.2: "weightRelevant",
  1.3: "weightImportant", 1.5: "weightCritical", 2.0: "weightCriticalPlus",
};

export default function WeightPicker({ value, onChange, ariaLabel, t }) {
  const idx = WEIGHT_OPTIONS.findIndex(w => w.value === value);
  const safeIdx = idx < 0 ? 1 : idx;
  function step(dir) {
    const next = (safeIdx + dir + WEIGHT_OPTIONS.length) % WEIGHT_OPTIONS.length;
    onChange(WEIGHT_OPTIONS[next].value);
  }
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "flex", alignItems: "center", width: 164, height: 44,
        border: "1.5px solid var(--border)", borderRadius: "var(--r)",
        background: "var(--paper)", overflow: "hidden", flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Decrease weight"
        style={{
          width: 36, height: "100%", background: "none", border: "none",
          borderRight: "1px solid var(--border)", cursor: "pointer", fontSize: 16,
          color: "var(--muted)", display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
        }}
      >‹</button>
      <span
        style={{
          flex: 1, textAlign: "center", fontSize: 12, fontWeight: 600,
          color: "var(--ink)", fontFamily: "var(--font-data)",
          letterSpacing: ".01em", lineHeight: 1.2, padding: "0 2px",
        }}
      >
        {(t && t[WEIGHT_T_KEYS[WEIGHT_OPTIONS[safeIdx].value]]) || WEIGHT_OPTIONS[safeIdx].label}
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Increase weight"
        style={{
          width: 36, height: "100%", background: "none", border: "none",
          borderLeft: "1px solid var(--border)", cursor: "pointer", fontSize: 16,
          color: "var(--muted)", display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
        }}
      >›</button>
    </div>
  );
}
