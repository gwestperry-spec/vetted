const LANG_OPTIONS = [
  { code: "en", label: "EN", full: "English" },
  { code: "es", label: "ES", full: "Español" },
  { code: "zh", label: "中文", full: "中文" },
  { code: "fr", label: "FR", full: "Français" },
  { code: "ar", label: "عربي", full: "العربية" },
  { code: "vi", label: "VI", full: "Tiếng Việt" },
];

export default function LangSwitcher({ lang, setLang }) {
  return (
    <nav aria-label="Language selection">
      <div className="lang-switcher">
        {LANG_OPTIONS.map(l => (
          <button
            key={l.code}
            className={`lang-btn ${lang === l.code ? "active" : ""}`}
            onClick={() => setLang(l.code)}
            aria-pressed={lang === l.code}
            aria-label={`${l.full}${lang === l.code ? " (current)" : ""}`}
          >{l.label}</button>
        ))}
      </div>
    </nav>
  );
}
