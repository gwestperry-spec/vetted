// ─── sanitizePromptField — server-side sanitization for long-form prompt fields ──
// Used wherever user-controlled text is embedded in AI prompts (Claude, Perplexity).
// Unlike sanitizeTitle (which rejects bad input), this module STRIPS and NEUTRALIZES
// so surrounding legitimate content is preserved.
//
// Attack vectors addressed:
//   • XML/HTML tag injection  → could close prompt delimiters like </job_description>
//   • Prompt injection phrases → "ignore previous instructions", "act as", etc.
//   • Template injection       → {{ }} Mustache-style markers
//   • Control characters       → null bytes, CR, escape sequences
//   • Oversized input          → token exhaustion, cost inflation

const MAX_LENGTHS = {
  short:  200,    // currentTitle, company, role_title in BI context
  medium: 1000,   // filter names/descriptions, target industries, location prefs
  long:   5000,   // background summaries, career goals, hard constraints
  jd:    12000,   // job descriptions (mirrors MAX_JD on the client)
  resume: 40000,  // resume text (mirrors MAX_TEXT_BYTES in parse-resume)
};

// Injection phrases → replaced with [removed] so surrounding text stays intact
const INJECTION_SUBS = [
  [/ignore\s+(previous|all|above|prior|the)\s+instructions?/gi, "[removed]"],
  [/disregard\s+(previous|all|above|prior)\s+instructions?/gi,  "[removed]"],
  [/forget\s+(previous|all|above)\s+instructions?/gi,           "[removed]"],
  [/override\s+(previous|all|above)\s+instructions?/gi,         "[removed]"],
  [/you\s+are\s+now\s+(a|an|the)\b/gi,                          "[removed]"],
  [/\bact\s+as\s+(a|an|the)\b/gi,                               "[removed]"],
  [/pretend\s+(you\s+are|to\s+be)\b/gi,                         "[removed]"],
  [/\bsystem\s*prompt\b/gi,                                     "[removed]"],
  [/\{\{[^}]{0,200}\}\}/g,                                      "[removed]"],  // {{ template }}
];

// XML/HTML close-tag patterns that could break prompt delimiters
// Replace with the stripped tag name so content reads naturally
const TAG_STRIP_RE = /<\/?[a-zA-Z][^>]{0,500}>/g;

/**
 * Sanitize a long-form user-controlled string for safe embedding in an AI prompt.
 *
 * @param {string} raw - Raw input value
 * @param {number} maxLen - Maximum character length (use MAX_LENGTHS constants)
 * @returns {string} Sanitized string (never throws, always returns a string)
 */
function sanitizePromptField(raw, maxLen = MAX_LENGTHS.medium) {
  if (!raw || typeof raw !== "string") return "";

  // 1. Strip control characters (null bytes, CR, ESC, etc.)
  let s = raw.replace(/[\x00-\x1F\x7F]/g, " ");

  // 2. Hard length cap — prevents token exhaustion regardless of frontend limits
  s = s.slice(0, maxLen);

  // 3. Strip ALL HTML/XML tags — they could close our prompt structure delimiters
  //    e.g. "</job_description>" or "</resume>" embedded in user text
  s = s.replace(TAG_STRIP_RE, "");

  // 4. Neutralize injection phrases — replace with [removed] token
  for (const [pattern, replacement] of INJECTION_SUBS) {
    s = s.replace(pattern, replacement);
  }

  // 5. Collapse runs of whitespace introduced by stripping
  s = s.replace(/\s{3,}/g, "  ").trim();

  return s;
}

/**
 * Sanitize an array of short strings (e.g. targetIndustries, locationPrefs).
 * Filters empty items and deduplicates.
 *
 * @param {any} rawArr - Input value (should be array of strings)
 * @param {number} maxItems - Maximum array length to accept
 * @param {number} itemMaxLen - Per-item character cap
 * @returns {string[]} Cleaned array of strings
 */
function sanitizeStringArray(rawArr, maxItems = 20, itemMaxLen = MAX_LENGTHS.short) {
  if (!Array.isArray(rawArr)) return [];
  return rawArr
    .slice(0, maxItems)
    .map(item => sanitizePromptField(String(item ?? ""), itemMaxLen))
    .filter(Boolean);
}

module.exports = { sanitizePromptField, sanitizeStringArray, MAX_LENGTHS };
