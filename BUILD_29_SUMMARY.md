# Vetted — Build 29 Summary

**Version:** 2.2.3 (29) · **Status:** archive-ready, not yet uploaded
**Previous live build:** 2.2.2 (28)
**Session window:** April 27 – May 11, 2026

---

## Headline changes

### 1. URL → VQ scoring is no longer silently broken
Pasting a LinkedIn URL into the SCORE tab and tapping GET MY VQ now actually runs the scoring pipeline. Previous behavior: nothing happened. Root cause was a React SyntheticEvent passed as the first positional argument to an async handler, which `.trim()`'d the event object and threw a silent TypeError. (Error 121, commit `c5a53f3`)

### 2. Phantom filter cards no longer pollute results or skew VQ scores
The scoring model was inventing extra filter cards beyond the user's 5-filter framework (e.g. "Compensation 1.0", "Location 1.0") because the candidate profile section explicitly mentions those preferences. Those phantoms were also silently skewing the weighted VQ at weight 1.0. Three fixes: canonical `filter_id` now sent in the prompt; explicit "do not invent filters" instruction; client-side allowlist match by id-or-localized-name. (Error 122, commits `688f0ba`, `9f7a4a0`)

### 3. iOS Share Extension end-to-end flow
Share a LinkedIn URL from any app → tap Vetted in the share sheet → confirmation sheet appears with URL preview → tap "SCORE THIS ROLE →" → return to Vetted → SCORE tab auto-activates with URL prefilled → scoring auto-triggers.

Visual: Direction A "editorial paper sheet" — serif title "Score this role.", subhead, URL card with host-initial chip, ink primary CTA. Brand-aligned with the main app's filter framework.

Architecture: iOS 26 categorically blocks `extensionContext.open()` from Share Extensions, so a backup channel is mandatory.
- Share Extension writes the URL to App Group `UserDefaults` under `group.com.vettedai.app`
- AppDelegate's `applicationDidBecomeActive` walks the root VC's view tree, finds the WKWebView, and `evaluateJavaScript`s `localStorage.setItem` + `dispatchEvent('vetted-share-url')`
- Retry loop runs 60 × 0.5s = 30s, only clears the App Group entry after the JS write returns an "ok" sentinel
- App.jsx listens for the custom event + checks localStorage on mount + on visibilitychange
- Share Extension's URL resolver falls back to `UTType.text` / `UTType.plainText` when no URL attachment is present (LinkedIn often shares as plain text)

End result: works first-try on a true cold launch. (Errors 124–125, commits `d347a3d`, `7eae906`, `7da67cc`, `15de509`, `9a1b5c8`, `aad0a75`, `54b2be4`, `0a97c8a`)

### 4. Universal Links live
`apple-app-site-association` published at `tryvettedai.com/.well-known/apple-app-site-association`, served with `Content-Type: application/json` via netlify.toml. `applinks:tryvettedai.com` entitlement on the main App target. `https://tryvettedai.com/score?url=…` opens the iOS app directly. Custom-scheme `vetted://score?url=…` retained for Stripe webhooks and legacy deep links.

### 5. VQ Advocate: "WORTH PAUSING" → "HEADWIND"
The severity-3 label across all 7 supported languages (en/es/zh/fr/ar/vi/pt) was changed from "WORTH PAUSING" to "HEADWIND" (or localized equivalent). Notification preference hint `advocateNotifyHint` was also updated in the same languages — previously stale after the first rename pass. (Error 123, commit `ac9a4d3`)

### 6. Framework Templates picker
10 starter templates (VP Engineering, VP Operations, VP Sales/CRO, VP Product/CPO, VP Marketing/CMO, CFO, Chief of Staff, VP People, Founder/President, Director). Each has localized name/blurb in 7 languages and a weights object mapping the 5 canonical filter IDs. List-style picker UI with 5-dot WeightStrip per template. Gated behind `vetted_framework_picker_seen` localStorage flag for first-time onboarding.

### 7. "Try a sample role" button on SCORE tab
Pre-filled VP of Operations JD that runs the full scoring pipeline in 10 seconds. Lets new users feel the product before they find or paste their own JD. Original tap target was too small (fontSize 9 with zero padding) — fixed with minHeight 36, padding 8×12, soft accent background, fontSize 10, fontWeight 600.

### 8. ScrapingBee tier-2 fallback for LinkedIn URL fetching
`netlify/functions/fetch-jd.js` now falls through from Perplexity Sonar (tier 1) to ScrapingBee (tier 2) when LinkedIn returns an auth-walled empty response. ScrapingBee config: `render_js=true` + `premium_proxy=true`. Pay-per-call ~$0.005/JD.

### 9. Internal KPI dashboard at `/dashboard`
Password-gated (`DASHBOARD_PASSWORD` env var). In-memory rate limiting (5 fails per IP per 15-min sliding window → 15-min lockout). Optional PostHog cards via `POSTHOG_API_KEY` + `POSTHOG_PROJECT_ID` — non-fatal if absent.

### 10. Security hardening (from cybersecurity audit)
- `WORKSPACE_SWEEP_SECRET` env var added, falls back to `VETTED_SECRET` for backward compat. Cron sweep function no longer reuses the master HMAC key.
- Share Extension URL scheme validation: only http/https schemes accepted, rejects `javascript:`, `data:`, `file:`, custom schemes.
- Dashboard rate limit prevents password brute-force.

---

## What was deferred (not in Build 29)

- 15-second onboarding video (Item 1) — Claude design hit usage limits
- On-device CoreML scoring (Item 4) — explicitly Build 31+
- Resume parsing optimization — already exists today, no rework needed

---

## Numbers worth scoring quality against

- **Build size:** unchanged at ~733KB SPA bundle (gzip ~219KB)
- **Languages supported:** 7 (en/es/zh-Hans/fr/ar/vi/pt)
- **Error log entries closed in this build:** 8 (Errors 121–128)
- **Outstanding error log entries:** 0 unresolved
- **Net commits since Build 28:** ~30
- **VQ scoring latency (URL path):** ~25–50s end-to-end (fetch 15–30s + Claude scoring 8–20s)
- **VQ scoring latency (text path):** ~8–20s

---

## Known-good test paths (for benchmark validation)

1. Cold-launch share: delete app, reinstall, sign in, force-quit, share a LinkedIn JD URL from LinkedIn → tap Vetted → tap "SCORE THIS ROLE →" → return to Vetted → URL should auto-prefill and scoring should auto-start
2. URL scoring: paste any LinkedIn job URL on SCORE tab → tap GET MY VQ → JD fetches, scores, lands in workspace
3. Sample role: tap "Try a sample role" → VQ generates in ~12s, score lands ~4.0+ (designed-positive sample)
4. Phantom filter check: score any role, open FILTERS tab → exactly 5 cards visible (Financial Accountability, Access to Leadership, Clear Success Measures, Organizational Impact, Role Integrity), no Compensation/Location cards
5. HEADWIND check: VQ Advocate detail screen → severity-3 patterns show "HEADWIND" label (not "WORTH PAUSING"); notification toggle hint reads "HEADWINDS ONLY"
6. Universal Link: open Notes, type `https://tryvettedai.com/score?url=https%3A%2F%2Fwww.linkedin.com%2Fjobs%2Fview%2F4404573774%2F`, long-press → "Open in Vetted" should appear

---

## Files most touched in this build

- `src/App.jsx` — deep-link handler, filter score processing, framework templates wiring, share-event listener
- `src/components/ScoreEntry.jsx` — URL→fetch-jd flow, prefill consumption, sample role button
- `src/components/VQAdvocate.jsx` — HEADWIND label, eyebrow styling, severity sort key
- `src/i18n/translations.js` — HEADWIND across 7 langs, template strings, LinkedIn caption refresh
- `src/components/FrameworkPicker.jsx` — new template picker
- `src/data/frameworkTemplates.js` — new 10-template seed file
- `ios/App/App/AppDelegate.swift` — App Group → WebView injection bridge
- `ios/App/VettedShareExtension/ShareViewController.swift` — Direction A visual + iOS 26-safe open flow
- `netlify/functions/fetch-jd.js` — ScrapingBee tier-2 fallback
- `netlify/functions/dashboard-data.js` — KPI endpoint + rate limit
- `netlify/functions/workspace-sweep.js` — separate sweep secret
- `public/.well-known/apple-app-site-association` — Universal Links manifest
- `netlify.toml` — AASA Content-Type + `/score` 302 redirect
