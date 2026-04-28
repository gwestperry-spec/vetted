// ─── Vetted AI — Central Configuration ───────────────────────────────────────
// All environment-specific values live here.
// Never hardcode URLs or secrets anywhere else in the codebase.

export const API_BASE = "https://celebrated-gelato-56d525.netlify.app";

export const ENDPOINTS = {
  anthropic:       `${API_BASE}/.netlify/functions/anthropic`,
  anthropicStream: `${API_BASE}/.netlify/functions/anthropic-stream`,
  appleAuth:    `${API_BASE}/.netlify/functions/apple-auth`,
  supabase:     `${API_BASE}/.netlify/functions/supabase`,
  checkout:     `${API_BASE}/.netlify/functions/create-checkout-session`,
  appleIap:     `${API_BASE}/.netlify/functions/verify-apple-iap`,
  parseResume:  `${API_BASE}/.netlify/functions/parse-resume`,
  salaryLookup: `${API_BASE}/.netlify/functions/salary-lookup`,
  behavioralIntelligence: `${API_BASE}/.netlify/functions/behavioral-intelligence`,
  marketPulse:  `${API_BASE}/.netlify/functions/market-pulse`,
  fetchJd:      `${API_BASE}/.netlify/functions/fetch-jd`,
  githubAuth:   `${API_BASE}/.netlify/functions/github-auth`,
  privacy:      `${API_BASE}/privacy`,
  terms:        "https://tryvettedai.com/terms",
};
