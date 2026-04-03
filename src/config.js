// ─── Vetted AI — Central Configuration ───────────────────────────────────────
// All environment-specific values live here.
// Never hardcode URLs or secrets anywhere else in the codebase.

export const API_BASE = "https://celebrated-gelato-56d525.netlify.app";

export const ENDPOINTS = {
  anthropic: `${API_BASE}/.netlify/functions/anthropic`,
  appleAuth: `${API_BASE}/.netlify/functions/apple-auth`,
  supabase:  `${API_BASE}/.netlify/functions/supabase`,
  privacy:   `${API_BASE}/privacy`,
};
