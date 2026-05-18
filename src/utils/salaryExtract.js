// ── salaryExtract.js ──────────────────────────────────────────────────────
// Extracts a salary range from raw JD text. Conservative — only matches
// well-formed dollar ranges to avoid false positives that would mislead
// the Pay pill.
//
// Returns { low, high, currency } if found, else null.
// Always normalizes to whole-dollar numbers (e.g. $185,000 → 185000).

const CURRENCY_SYMBOLS = { "$": "USD", "€": "EUR", "£": "GBP" };

// $XXX,XXX – $YYY,YYY  or  $XXXk – $YYYk  (with -, –, —, "to", "—")
const RANGE_RE = /([$€£])\s?([\d.,]+)\s?(k|K|,000)?\s*(?:-|–|—|to)\s*([$€£]?)\s?([\d.,]+)\s?(k|K|,000)?/g;

function parseAmount(numText, kMark) {
  const cleaned = String(numText || "").replace(/,/g, "");
  let n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  if (kMark === "k" || kMark === "K") n *= 1000;
  return Math.round(n);
}

export function extractSalaryFromJd(jdText) {
  if (!jdText || typeof jdText !== "string") return null;
  const text = jdText.length > 12000 ? jdText.slice(0, 12000) : jdText;
  RANGE_RE.lastIndex = 0;

  let best = null;
  let match;
  while ((match = RANGE_RE.exec(text)) !== null) {
    const symbol = match[1];
    const low = parseAmount(match[2], match[3]);
    const high = parseAmount(match[5], match[6]);
    if (low == null || high == null) continue;
    // Sanity: must be reasonable executive comp ranges (10k–10M)
    if (low < 10000 || high < 10000 || low > 10000000 || high > 10000000) continue;
    // Order check: low < high
    if (low > high) continue;

    const range = { low, high, currency: CURRENCY_SYMBOLS[symbol] || "USD" };
    // Keep the largest mid-point — best signal of actual senior comp
    if (!best || (range.low + range.high) / 2 > (best.low + best.high) / 2) {
      best = range;
    }
  }
  return best;
}

export function formatRange(range) {
  if (!range) return "";
  const sym = range.currency === "EUR" ? "€" : range.currency === "GBP" ? "£" : "$";
  const lowK = Math.round(range.low / 1000);
  const highK = Math.round(range.high / 1000);
  return `${sym}${lowK}K – ${sym}${highK}K`;
}

export function midpoint(range) {
  if (!range) return null;
  return Math.round((range.low + range.high) / 2);
}
