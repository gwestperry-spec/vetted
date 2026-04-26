// ─── Input sanitisation ───────────────────────────────────────────────────
export const MAX_SHORT = 200;
export const MAX_LONG  = 2000;
export const MAX_JD    = 12000;

// Injection phrases → neutralized client-side (mirrors backend sanitizePromptField.js)
const INJECTION_SUBS = [
  [/ignore\s+(previous|all|above|prior|the)\s+instructions?/gi, "[removed]"],
  [/disregard\s+(previous|all|above|prior)\s+instructions?/gi,  "[removed]"],
  [/forget\s+(previous|all|above)\s+instructions?/gi,           "[removed]"],
  [/override\s+(previous|all|above)\s+instructions?/gi,         "[removed]"],
  [/you\s+are\s+now\s+(a|an|the)\b/gi,                          "[removed]"],
  [/\bact\s+as\s+(a|an|the)\b/gi,                               "[removed]"],
  [/pretend\s+(you\s+are|to\s+be)\b/gi,                         "[removed]"],
  [/\bsystem\s*prompt\b/gi,                                     "[removed]"],
  [/\{\{[^}]{0,200}\}\}/g,                                      "[removed]"],
];

export function sanitizeText(value, maxLen = MAX_SHORT) {
  if (typeof value !== "string") return "";
  // Strip HTML/XML tags, control chars, and carriage returns
  let s = value
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/<[^>]{0,500}>/g, "")
    .replace(/\r/g, "")
    .slice(0, maxLen)
    .trim();
  // Neutralize prompt injection phrases
  for (const [pattern, replacement] of INJECTION_SUBS) {
    s = s.replace(pattern, replacement);
  }
  return s;
}
