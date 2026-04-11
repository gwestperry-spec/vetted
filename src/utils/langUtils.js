// ─── Language resolution helper ───────────────────────────────────────────
// Resolves a translatable field (string or { en, es, zh, fr, ar, vi } map)
// to the user's current language, falling back to English.
export function resolveLang(field, lang) {
  if (!field) return "";
  return typeof field === "string" ? field : (field[lang] || field["en"] || "");
}
