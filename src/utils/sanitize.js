// ─── Input sanitisation ───────────────────────────────────────────────────
export const MAX_SHORT = 200;
export const MAX_LONG = 2000;
export const MAX_JD = 12000;

export function sanitizeText(value, maxLen = MAX_SHORT) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>"]/g, "").replace(/\r/g, "").slice(0, maxLen).trim();
}
