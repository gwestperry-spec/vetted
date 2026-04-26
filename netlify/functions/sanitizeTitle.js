// ─── sanitizeTitle — shared job-title sanitization for Vetted API functions ───
// Used by market-pulse.js and salary-lookup.js.
// Defends against: prompt injection, oversized input, HTML/script injection,
// bracket commands, control characters, and non-title content.

const TITLE_MAX_LEN = 120;

// Valid job title characters: Unicode letters/numbers, space, hyphen, comma,
// period, ampersand, slash, parentheses, apostrophe.
// Everything else (HTML tags, curly braces, backticks, etc.) is stripped.
const ALLOWED_RE = /[^\p{L}\p{N}\s\-,\.&/()']+/gu;

// Prompt injection openers — reject the whole input if any match
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above|prior|the)/i,
  /disregard\s+(previous|all|above|prior)/i,
  /forget\s+(previous|all|above)/i,
  /you\s+are\s+now\b/i,
  /act\s+as\b/i,
  /pretend\s+(you|to)/i,
  /system\s*prompt/i,
  /\{\{.*\}\}/,          // template injection {{ }}
  /<[a-z\/!][^>]{0,50}>/i, // HTML tags
  /```/,                  // code blocks
  /\bexec\b|\beval\b/i,  // code execution keywords
];

/**
 * Sanitize a raw title string for safe embedding in AI prompts and DB queries.
 * Returns { ok: true, title } on success, { ok: false, reason } on rejection.
 */
function sanitizeTitle(raw) {
  if (!raw || typeof raw !== "string") {
    return { ok: false, reason: "empty" };
  }

  // Hard length cap — independent of any frontend limit
  const trimmed = raw.trim().slice(0, TITLE_MAX_LEN);

  // Must have at least 2 meaningful characters
  if (trimmed.length < 2) {
    return { ok: false, reason: "too_short" };
  }

  // Strip control characters
  const noControl = trimmed.replace(/[\x00-\x1F\x7F]/g, "");

  // Reject on injection patterns before stripping — catch attempts that rely
  // on special chars being present (e.g. "{{ignore all}}")
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(noControl)) {
      console.warn("[sanitizeTitle] injection attempt blocked:", noControl.slice(0, 80));
      return { ok: false, reason: "injection" };
    }
  }

  // Strip disallowed characters (rather than hard-rejecting, so "VP & GM" still works)
  const clean = noControl.replace(ALLOWED_RE, "").replace(/\s{2,}/g, " ").trim();

  // After stripping, must still be meaningful
  if (clean.length < 2) {
    return { ok: false, reason: "invalid_chars" };
  }

  // Must contain at least one letter (rejects "123", "---", etc.)
  if (!/\p{L}/u.test(clean)) {
    return { ok: false, reason: "no_letters" };
  }

  // Repetition guard: reject strings where one char is >60% of the input
  // (catches "aaaaaaa", "VP!!!!!!!!!!", etc.)
  const charFreq = {};
  for (const c of clean.replace(/\s/g, "")) {
    charFreq[c] = (charFreq[c] || 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(charFreq));
  if (clean.replace(/\s/g, "").length > 4 && maxFreq / clean.replace(/\s/g, "").length > 0.6) {
    return { ok: false, reason: "repetition" };
  }

  return { ok: true, title: clean };
}

module.exports = { sanitizeTitle, TITLE_MAX_LEN };
