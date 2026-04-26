const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "vi", label: "Tiếng Việt" },
];

// ── compact=true  →  fits inline (workspace header, scoring header)
// ── compact=false →  full-width, centred (home / sign-in / onboarding)
export default function LangSwitcher({ lang, setLang, compact = false }) {
  return (
    <label
      aria-label="Select language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Globe icon */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: compact ? 7 : 10,
          pointerEvents: "none",
          fontSize: compact ? 11 : 13,
          lineHeight: 1,
          color: "#1A2E1A",
          zIndex: 1,
        }}
      >
        ⊕
      </span>

      <select
        value={lang}
        onChange={e => setLang(e.target.value)}
        aria-label="Language"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          background: compact ? "transparent" : "#fff",
          border: "1px solid #D8E8D8",
          borderRadius: 20,
          paddingLeft:  compact ? 22 : 28,
          paddingRight: compact ? 20 : 24,
          paddingTop:    compact ? 4  : 7,
          paddingBottom: compact ? 4  : 7,
          fontFamily: "var(--font-data)",
          fontSize:   compact ? 10 : 12,
          fontWeight: 500,
          letterSpacing: ".06em",
          color: "#1A2E1A",
          cursor: "pointer",
          minHeight: compact ? 28 : 36,
          // hide default arrow; we add our own chevron via after
        }}
      >
        {LANG_OPTIONS.map(l => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>

      {/* Chevron */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: compact ? 7 : 10,
          pointerEvents: "none",
          fontSize: compact ? 8 : 9,
          color: "#1A2E1A",
          lineHeight: 1,
        }}
      >
        ▾
      </span>
    </label>
  );
}
