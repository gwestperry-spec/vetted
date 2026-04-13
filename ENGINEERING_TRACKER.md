# Vetted: Career Intelligence — Engineering Tracker
**Gap Closure Roadmap · April 2026**
_Last updated: April 10, 2026_

---

## Status Key

| Symbol | Meaning |
|---|---|
| ✅ | Complete |
| 🔄 | In progress |
| ⏳ | Staged / ready to ship |
| 🔲 | Not started |
| 🚫 | Blocked |

---

## Timeline Summary

| Sprint | Priorities | Progress | Est. Dev Time | Calendar Target | Business Unlock |
|---|---|---|---|---|---|
| **Immediate** | P2 — Build 22 / 3.1.2(c) | ✅ 100% | Complete | ✅ Submitted Apr 11 | Revenue — IAP live |
| **Sprint 1** | P1 — VQ streaming · P3 — RLS | ✅ 100% · ✅ 100% | Complete | ✅ Complete | Retention · Security |
| **Sprint 2** | P4 — JWS cert chain · P6 — Server Notifications | ✅ 100% · ✅ 100% | Complete | ✅ Complete | Fraud prevention · Revenue integrity |
| **Sprint 3** | P7 — Staging · P5 — App.jsx decomposition | 65% · 75% | ~2.5 weeks | May 12 – May 30 | Operational safety · Acquirability |
| **Sprint 4** | P8 — Accessibility · P9 — Automated testing | 0% · 0% | ~2 weeks | Jun 2 – Jun 13 | Market expansion · Deployment confidence |
| **Full roadmap complete** | | | **~6 weeks remaining** | **~June 13, 2026** | |

> **Assumptions:** Solo or 1–2 developer team. Focused sprint execution with no parallel feature work. Apple review time estimated at 1–3 days (bug fix history). Sprint 3 decomposition begins but may extend into Sprint 4 given 2,846-line scope.

---

## Sprint Estimates — Detail

### Immediate — P2 (Build 22)
**Hands-on work:** 30–45 minutes
- `npm run build` — ~5 min
- `npx cap sync ios` — ~2 min
- Xcode Archive + upload — ~20 min
- App Store Connect submission — ~10 min

**Apple review:** 1–3 days (bug fix build with prior review history typically clears in 24 hours)

**Risk:** Apple could re-reject if they find another 3.1.2(c) gap. Build 22 is a surgical compliance-only submission — minimize that risk by not bundling any feature changes.

---

### Sprint 1 — P1 (VQ Streaming) · ~4–6 days + P3 (RLS) · ~3–4 days
**Total: ~2 weeks** (sequentially; streaming first, then RLS)

**P1 breakdown:**
- Back end (`netlify/functions/anthropic.js` — currently 14KB): implement SSE or chunked transfer headers, stream Claude API response token-by-token — 1–2 days
- Front end (App.jsx scoring flow + VQLoadingScreen): consume ReadableStream, render results progressively filter-by-filter — 2–3 days
- iOS testing (Capacitor): EventSource is not natively supported in Capacitor's WKWebView — will need `fetch` + `ReadableStream` or a polyfill rather than native SSE. Budget extra half-day for this — 0.5–1 day

**P3 breakdown:**
- Schema audit — identify owner column on all 3 tables (`profiles`, `filter_frameworks`, `opportunities`) — 0.5 day
- Write and apply RLS policies — 1 day
- Test all query paths (scoring, history, filters, compare) — 1.5–2 days

**Sequencing note:** P3 (RLS) ideally runs against a staging environment (P7, Sprint 3). Doing it in Sprint 1 means testing against a dedicated Supabase dev project or a branch copy. Do not enable RLS on production until every query path has returned correct results in at least one non-production environment. If standing up a quick Supabase staging project in Sprint 1 adds less than a day, do it now rather than waiting for Sprint 3.

---

### Sprint 2 — P4 (JWS cert chain) · ~2–3 days + P6 (Server Notifications) · ~3–4 days
**Total: ~1.5 weeks** (can partially overlap — both are back-end only)

**P4 breakdown:**
- Parse `x5c` chain from JWS header — 0.5 day
- Implement leaf → intermediate → Apple Root CA verification using Node.js `crypto` — 1–1.5 days
- Test with valid and forged tokens — 0.5–1 day
- `verify-apple-iap.js` is 11KB — change is contained to this one file

**P6 breakdown:**
- New Netlify function (`apple-server-notifications.js`) — register endpoint with Apple in App Store Connect, wire up JWS parsing (reuses P4 work) — 1 day
- Handle 5 notification types (`DID_RENEW`, `DID_FAIL_TO_RENEW`, `CANCEL`, `REFUND`, `EXPIRED`) with Supabase state updates — 1.5 days
- Idempotency logic (store notification ID, skip duplicate delivery) — 0.5 day
- Test with Apple's sandbox notification tool — 0.5–1 day

**Note:** P6 benefits directly from P4 — the JWS parsing and chain verification done for P4 can be extracted into a shared util and reused in the server notification handler. Completing P4 first saves a day on P6.

---

### Sprint 3 — P7 (Staging) · ~2–3 days + P5 (App.jsx decomposition, begins) · ~2 weeks
**Total: ~2.5 weeks** (staging is fast; decomposition is the long pole)

**P7 breakdown:**
- Supabase staging project: create, copy schema, seed test data — 1 day
- Netlify staging environment: new deploy context in `netlify.toml`, separate env vars pointing to staging Supabase — 0.5 day
- Smoke test: run the defined checklist against staging, fix any config gaps — 0.5–1 day

**P5 breakdown (2,846-line App.jsx):**
- CompareView.jsx already exists as a file — audit whether it is already fully extracted from App.jsx or still entangled. Resolve whatever remains — 0.5–1 day
- Extract Market Pulse — 2–3 days (identify boundaries, extract, define props interface, test)
- Extract filter management UI — 2–3 days
- Extract scoring submission flow — 2–3 days
- Auth flow + session management — carries highest risk due to global state; leave for Sprint 4 if time runs short

**Target App.jsx size after Sprint 3:** under 1,200 lines (down from 2,846)
**Target App.jsx size after Sprint 4:** under 400 lines

**Note:** Full decomposition will likely spill into Sprint 4. This is expected — the roadmap says "begins" in Sprint 3. Do not rush individual extractions. Each must be tested before the next begins.

---

### Sprint 4 — P8 (Accessibility) · ~7–8 days + P9 (Automated testing) · ~4–5 days
**Total: ~2 weeks** (can partially overlap — accessibility is manual/code, testing is tooling setup)

**P8 breakdown:**
- Focus trap on all modals (PaywallModal, WalkthroughModal, CompareView) — 1–2 days
- `aria-live` region on filter carousel — 1 day
- WCAG 2.1 AA color contrast audit using automated tool (axe-core or Storybook a11y) + manual fixes — 2 days
- Alt text on non-decorative images — 0.5 day
- VoiceOver full flow test on iOS device — 1–2 days (needs physical device or Simulator with Accessibility Inspector)

**P9 breakdown:**
- Playwright or Cypress setup + Netlify deploy preview integration — 1 day
- E2E test 1: Sign in with Apple + session persistence — Note: Apple's auth UI cannot be automated; will require a stub or test-mode credential. Budget extra time for mock setup — 1.5–2 days
- E2E test 2: Job description submission + VQ score return — 1 day
- E2E test 3: Paywall display + subscription gate enforcement — 1 day

**Note on Sign in with Apple testing:** Apple does not allow automated interaction with their native auth sheet. The E2E test for auth will need to mock the Sign in with Apple response at the JS layer (intercept the plugin call, return a synthetic credential). This is achievable but requires careful setup so the mock does not leak into production builds.

---

---

## Priority 2 — Ship Build 22 / Resolve Guideline 3.1.2(c)
**Sprint:** Immediate · **Status:** ✅ Complete — submitted Apr 11, 2026

**Business context:** Missing Terms of Use and Privacy Policy links on the paywall are an active Apple rejection risk on the build currently in review (build 21). No Founding Member lifetime purchase is possible until this clears. The seat counter is creating urgency the product cannot yet fulfill.

**Technical directive:** Surgical compliance fix only. Do not bundle additional features. Build 22 must contain:
- Visible tappable link to Terms of Use (Apple Standard EULA)
- Visible tappable link to Privacy Policy
- Auto-renewal disclosure language meeting Guideline 3.1.2(c)

**What's done:**
- [x] `PaywallModal.jsx` — auto-renewal disclosure paragraph added (iOS only)
- [x] `PaywallModal.jsx` — Privacy Policy link added (`ENDPOINTS.privacy`)
- [x] `PaywallModal.jsx` — Terms of Use link added (Apple Standard EULA)
- [x] `config.js` — `terms` endpoint added
- [x] App Store Connect — Privacy Policy URL populated
- [x] App Store Connect — EULA field set to Apple Standard EULA
- [x] Apple Resolution Center — bug fix approval requested for build 21
- [x] Subscription group images — all 4 rejected optional images deleted
- [x] `CURRENT_PROJECT_VERSION` set to 22 in `project.pbxproj`

**Remaining:**
- [ ] `npm run build`
- [ ] `npx cap sync ios`
- [ ] Xcode Archive → build 22
- [ ] Upload to App Store Connect
- [ ] Submit for review

**Acceptance criteria:**
- [ ] Apple Review approves without a 3.1.2(c) rejection
- [ ] IAP subscriptions and lifetime purchases are purchasable by end users

---

## Priority 1 — Stream the VQ Score Response
**Sprint:** 1 · **Status:** ✅ Complete · **Progress: 100%**

**Business context:** The 12-second full-screen wait is the single largest conversion risk in the product. Senior professionals make the subscribe decision in the first 2–3 uses. Streaming eliminates doubt by making the product feel intelligent and real-time.

**What exists today:** Full streaming pipeline is implemented and code-complete. `netlify/functions/anthropic-stream.mjs` is a Netlify v2 ESM function that proxies Anthropic's SSE stream token-by-token with full auth, IP rate limiting, tier enforcement, and session verification. `scoreOpportunity()` in App.jsx tries the stream endpoint first, falls back silently to the buffered endpoint on any error. `VQLoadingScreen` now accepts a `streamingFilters` prop and renders filter cards progressively with 80ms staggered fade-in as each one arrives. The SSE parser (`consumeStream()`) uses a field-order-independent regex that works regardless of how Claude orders JSON fields. Single remaining item: iOS physical device test on WKWebView.

**Steps and progress:**
- [x] 100% — Back end: `anthropic-stream.mjs` — Netlify v2 ESM streaming function with SSE pipe from Anthropic API
- [x] 100% — Back end: `stream: true` in Anthropic request body; SSE events piped as raw bytes through `ReadableStream`
- [x] 100% — Back end: `X-Accel-Buffering: no` header to prevent nginx CDN buffering
- [x] 100% — Front end: `consumeStream()` reads response body via `getReader()` + `TextDecoder`; field-order-independent JSON parser for `filter_scores` objects
- [x] 100% — Front end: `scoreOpportunity()` streaming-first with silent fallback to buffered endpoint
- [x] 100% — Front end: `VQLoadingScreen` — `streamingFilters` prop triggers progressive `StreamingFilterCard` reveal (staggered 80ms per card)
- [x] 100% — Front end: `VQLoadingScreen` extracted to `src/components/VQLoadingScreen.jsx`
- [x] 100% — iOS test: streaming confirmed working in production build 22 — filter cards render progressively on physical device

**Acceptance criteria:**
- [ ] First filter result begins rendering within 2 seconds of job description submission
- [ ] Complete VQ score and verdict appear within natural Claude completion time
- [ ] No additional wait after Claude response completes

---

## Priority 3 — Enable Supabase Row Level Security
**Sprint:** 1 · **Status:** ✅ Complete · **Progress: 100%**

**What exists today:** RLS confirmed live in production via SQL verification (Apr 11, 2026). All four tables return `rowsecurity = true`. Policies are scoped to `apple_id` at the row level. Service role key (used by all Netlify Functions) bypasses RLS by design — correct. Anon key is fully restricted.

**Steps and progress:**
- [x] 100% — Audit `profiles`, `filter_frameworks`, `opportunities` table schemas
- [x] 100% — Write RLS policy for `profiles` — SELECT/INSERT/UPDATE own row, DELETE blocked
- [x] 100% — Write RLS policy for `filter_frameworks` — full CRUD for own rows
- [x] 100% — Write RLS policy for `opportunities` — full CRUD for own rows
- [x] 100% — Write RLS policy for `notification_log` — no anon access (service role only)
- [x] 100% — Applied to production Supabase — verified via `pg_tables` query Apr 11, 2026

**Acceptance criteria:**
- [x] RLS enabled on all tables in production ✅ Verified
- [x] Scoring, history retrieval, filter management, compare view all return correct results ✅
- [x] No cross-user data leakage possible ✅

---

## Priority 4 — Complete JWS Certificate Chain Verification
**Sprint:** 2 · **Status:** ✅ Complete · **Progress: 100%**

**Business context:** Current implementation parses JWS but does not verify the full chain from leaf → intermediate → Apple Root CA. As subscription revenue grows, the financial incentive to exploit this gap increases proportionally.

**What exists today:** `verify-apple-iap.js` `decodeAndVerifyJWS()` now performs full 4-step chain verification: ECDSA signature, leaf issuer === intermediate subject, intermediate issuer === root subject, and root fingerprint pinned to hardcoded Apple Root CA G3 SHA-256 fingerprint (`63:34:3A:BF:...`). The same logic is also implemented in `apple-server-notifications.js` (P6). A compromised intermediate cannot forge a valid chain.

**Steps and progress:**
- [x] 100% — Extract `x5c` array from JWS header and validate it is present (≥3 certs)
- [x] 100% — Parse leaf certificate as `crypto.X509Certificate`
- [x] 100% — Verify ECDSA P-256 signature using leaf cert's public key
- [x] 100% — Parse intermediate certificate from `header.x5c[1]`
- [x] 100% — Verify leaf cert's `issuer` matches intermediate cert's `subject`
- [x] 100% — Parse root certificate from `header.x5c[2]`
- [x] 100% — Verify intermediate cert's `issuer` matches root cert's `subject`
- [x] 100% — Pin Apple Root CA G3 fingerprint — reject any chain that does not terminate at it

**Acceptance criteria:**
- [x] JWS verification rejects tokens with invalid or unverifiable certificate chains
- [x] Tokens with valid Apple-issued chains continue to pass
- [x] No change to user-facing behavior

---

## Priority 6 — Add App Store Server Notifications
**Sprint:** 2 · **Status:** 🔄 In progress · **Progress: 80%**

**Business context:** Subscription state changes (renewals, cancellations, refunds, billing failures) are not known to the server until the next user app open. A cancelled subscriber can retain Vantage access; silent billing failures become silent churn with no intervention opportunity.

**What exists today:** `netlify/functions/apple-server-notifications.js` is code-complete. Handles full outer + inner JWS verification (same 4-step chain as P4). Grant logic fires on `SUBSCRIBED`, `DID_RENEW`, `OFFER_REDEEMED`. Revoke logic (→ free tier) fires on `EXPIRED`, `DID_FAIL_TO_RENEW`, `GRACE_PERIOD_EXPIRED`, `CANCEL`, `REFUND`, `REVOKE`. Idempotency is enforced via `notification_log` table (DDL in `supabase/rls-policies.sql`). Returns HTTP 500 on tier-update failure so Apple retries. Informational notification types ACK with 200 and no state change.

**Steps and progress:**
- [x] 100% — Register endpoint URL in App Store Connect → App Information → App Store Server Notifications (`https://tryvettedai.com/.netlify/functions/apple-server-notifications`) ✅ Completed pre-build 22
- [x] 100% — `netlify/functions/apple-server-notifications.js` — POST handler, JSON parse, outer/inner JWS verification
- [x] 100% — JWS verification: same 4-step chain as P4 (ECDSA signature, issuer chain, Apple Root CA G3 fingerprint pin)
- [x] 100% — Handle `SUBSCRIBED` / `DID_RENEW` / `OFFER_REDEEMED` — grant tier in Supabase
- [x] 100% — Handle `DID_FAIL_TO_RENEW` / `GRACE_PERIOD_EXPIRED` — revoke to free tier
- [x] 100% — Handle `CANCEL` / `EXPIRED` / `REFUND` / `REVOKE` — revoke to free tier
- [x] 100% — Idempotency — `notification_log` table stores `notificationUUID`; duplicate deliveries return 200 without re-processing
- [x] 100% — Returns HTTP 500 on tier-update failure (triggers Apple retry)
- [ ] 0% — Test with Apple's sandbox notification tool (available in App Store Connect)

**Files affected:**
- `netlify/functions/apple-server-notifications.js` — new function ✅
- `supabase/rls-policies.sql` — includes `notification_log` table DDL ✅
- App Store Connect — endpoint URL registration (manual step, pending)

**Acceptance criteria:**
- [ ] Subscription state in Supabase reflects real-time Apple status within 60 seconds of a state change event
- [ ] State updates fire independently of user app activity

---

## Priority 7 — Introduce a Staging Environment
**Sprint:** 3 · **Status:** 🔄 In progress · **Progress: 65%**

**Business context:** All current deployments go directly to production. As paid subscribers grow, tolerance for production downtime drops to near zero — a broken scoring function during peak hours (7–9 AM Tue–Thu) is a churn event and reputation risk.

**What exists today:** `netlify.toml` now has a full `[context.staging]` block with `publish`, `functions`, and `NODE_ENV = "production"`. Inline comments document the 4-step activation process (Supabase project, git branch, Netlify dashboard, env vars). `supabase/rls-policies.sql` is ready to apply to a staging Supabase project. Remaining items are all manual dashboard/CLI steps, not code changes.

**Steps and progress:**
- [x] 100% — `netlify.toml` — `[context.staging]` block added with `publish`, `functions`, `NODE_ENV`
- [x] 100% — `netlify.toml` — inline comments document all 4 activation steps
- [x] 100% — `supabase/rls-policies.sql` — ready to apply to staging Supabase project
- [ ] 0% — Create Supabase staging project — copy production schema using commands below, then apply RLS policies separately

**Schema copy commands (run once staging project is active):**
```bash
# 1. Dump public schema only — excludes Supabase-managed schemas (auth, storage, etc.)
supabase db dump \
  --db-url "postgresql://postgres:<password>@<prod-host>:5432/postgres" \
  --schema public \
  --schema-only \
  -f schema.sql

# 2. Apply schema to staging — stop on first error
psql "postgresql://postgres:<password>@<staging-host>:5432/postgres" \
  -v ON_ERROR_STOP=1 -f schema.sql

# 3. Apply RLS policies separately (avoids duplicate policy errors from dump)
psql "postgresql://postgres:<password>@<staging-host>:5432/postgres" \
  -v ON_ERROR_STOP=1 -f supabase/rls-policies.sql
```

**Validate after apply:**
```bash
psql "<staging-url>" -c "\dt public.*"     # confirms tables exist
psql "<staging-url>" -c "\dRp+"            # confirms RLS policies applied
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'; -- all four = true
```
- [x] 100% — Create `staging` branch in git; push to remote ✅ (origin/staging live)
- [ ] 0% — Netlify dashboard → Deploys → Branch deploys → add `staging` branch
- [ ] 0% — Set staging env vars in Netlify dashboard (staging context): `VT_DB_URL`, `VT_DB_KEY`, `ANTHROPIC_KEY`, `VETTED_SECRET`
- [ ] 0% — Run smoke test checklist against staging deploy and resolve any config gaps

**Smoke test checklist:**
- [ ] Sign in with Apple completes successfully
- [ ] Job description submission returns a VQ score
- [ ] Subscription gate enforces correctly (free tier limit)
- [ ] Score history persists and retrieves correctly
- [ ] Paywall displays with functioning Terms of Use and Privacy Policy links

**Acceptance criteria:**
- [ ] No code change reaches production without first running in staging
- [ ] Promotion from staging to production is a deliberate one-click action, not default deploy behavior

---

## Priority 5 — App.jsx Component Decomposition
**Sprint:** 3 · **Status:** 🔄 In progress · **Progress: 75%**

**Business context:** A 2,800-line single file is the first thing a technical reviewer flags in an acquisition conversation. It signals fragility and founder dependency — both of which suppress acquisition valuations.

**What exists today:** App.jsx is 1,601 lines (down from 2,846 — 44% reduction). 12 components/utils have been extracted into dedicated files. Remaining inlined: `Dashboard` (~170 lines), `RegionGate` + `OnboardStep` (~190 lines), and the `App` main component with global state/auth (~700+ lines). The Sprint 3 target of under 1,200 lines requires ~400 more lines extracted.

**Extracted (complete):**
- [x] `LangSwitcher.jsx` ✅
- [x] `SignInGate.jsx` ✅
- [x] `ScoreResult.jsx` ✅
- [x] `CompareView.jsx` ✅
- [x] `WalkthroughModal.jsx` ✅
- [x] `OpportunityForm.jsx` ✅
- [x] `PaywallModal.jsx` ✅
- [x] `VQLoadingScreen.jsx` + `ScoringProgress` ✅ (P1 prerequisite)
- [x] `src/i18n/translations.js` — all 6-language strings ✅ (~520 lines removed)
- [x] `src/components/WeightPicker.jsx` + `WEIGHT_OPTIONS` ✅
- [x] `src/components/FiltersStep.jsx` ✅ (~115 lines removed from App.jsx)
- [x] `src/components/MarketPulse.jsx` ✅ (~340 lines removed from App.jsx)
- [x] `src/utils/langUtils.js` — `resolveLang()` ✅
- [x] Dead code removed: COACHING_PAIRS block (~255 lines) ✅

**Still inlined in App.jsx (remaining work):**

| Component | Approx. lines | Difficulty | Notes |
|---|---|---|---|
| `RegionGate` + `OnboardStep` | ~190 lines | Medium | Reads profile state |
| `Dashboard` | ~170 lines | Medium | Orchestrates above components |
| `App` (main component) | ~700+ lines | Hard | Global state, auth, session — highest regression risk |

**Extraction sequence (remaining):**
- [x] 100% — Translation strings → `src/i18n/translations.js`
- [x] 100% — `VQLoadingScreen` + `ScoringProgress` → `src/components/VQLoadingScreen.jsx`
- [x] 100% — `WeightPicker` → `src/components/WeightPicker.jsx`
- [x] 100% — `MarketPulseCard` → `src/components/MarketPulse.jsx`
- [x] 100% — `FiltersStep` → `src/components/FiltersStep.jsx`
- [x] 100% — `resolveLang` → `src/utils/langUtils.js`
- [x] 100% — `RegionGate` + `OnboardStep` → `src/components/Onboarding.jsx` ✅
- [x] 100% — `Dashboard` → `src/components/Dashboard.jsx` ✅
- [x] 100% — `sanitizeText` + MAX constants → `src/utils/sanitize.js` ✅
- [x] 100% — `buildCss` → `src/utils/buildCss.js` ✅
- [x] 100% — Auth/session logic within `App` → `src/hooks/useAuth.js` ✅

**Current line count:** 695 (was 2,846) · **Sprint 3 target:** under 1,200 ✅ · **Final target:** under 400 ✅

**Acceptance criteria:**
- [ ] App.jsx reduced by at least 60% of original line count (below 1,140 lines after Sprint 3)
- [ ] Each extracted component has a clearly defined props interface
- [ ] No regression in any user-facing feature

---

## Priority 8 — Accessibility Remediation
**Sprint:** 4 · **Status:** 🔄 In progress · **Progress: 55%**

**Business context:** ADA compliance is required for any enterprise or B2B sales motion. Increasingly scrutinized in App Store review. A premium product built for discerning professionals should meet the same standards those professionals expect from enterprise tools.

**What's done:**
- [x] `.sr-only` utility class added to buildCss.js
- [x] Section headings (`In Progress`, scored roles) switched from `display:none` to `.sr-only` — screen reader navigable
- [x] aria-labels added to all icon-only buttons (✎, ✕, →, ✓, ?)
- [x] `aria-pressed` added to status picker buttons
- [x] All touch targets enforced at 44pt minimum (guide button, edit toggle, status pills, Mark Applied, tag-remove, filter-delete-btn)
- [x] Recommendation badge: 11px/weight 500 → 16px/weight 700 (visual + accessibility improvement)
- [x] Xcode Accessibility Inspector audit run — hit area warnings resolved

**Remaining:**
- [ ] Focus trap on all modals (PaywallModal, WalkthroughModal, CompareView)
- [ ] `aria-live` region on filter carousel — announce position changes to screen readers
- [ ] WCAG 2.1 AA color contrast audit (muted text, score badges, disabled states)
- [ ] VoiceOver full flow test on iOS Simulator — sign in → score → navigate result

**Technical directive (remaining, in order):**
1. Add focus trap to all modals — keyboard and assistive tech users cannot navigate outside open modal
2. Add `aria-live` region to filter carousel — screen readers announce carousel position changes
3. Audit all interactive elements for WCAG 2.1 AA color contrast (4.5:1 normal text, 3:1 large text)
4. VoiceOver end-to-end flow test on Simulator

**Acceptance criteria:**
- [ ] VoiceOver navigation on iOS completes a full scoring flow — sign in → submit JD → receive VQ score → navigate filter breakdown — without dead ends or unannounced state changes

---

## Priority 9 — Implement Automated Testing Baseline
**Sprint:** 4 · **Status:** 🔲 Not started

**Business context:** Every deployment is currently a manual confidence exercise. As feature surface grows — coaching prompts, role comparison, resume parsing, market pulse, lifetime purchasing — the manual test surface grows faster than one person can cover.

**Technical directive:**
Implement E2E tests for the three highest-risk user flows using Playwright or Cypress. Tests run on every Netlify deploy preview before promotion to staging.

**Three required flows:**
1. Successful Sign in with Apple and session persistence
2. Job description submission and VQ score return
3. Paywall display and subscription gate enforcement

Unit tests are lower priority than E2E at this stage — test the flows users experience.

**Acceptance criteria:**
- [ ] Three E2E tests pass on every deploy preview
- [ ] A failing test blocks promotion to staging until resolved or explicitly overridden with documentation

---

## Blocked

| Item | Blocker |
|---|---|
| Live mode Stripe env vars | Apple approval of build with working IAP |

---

## Summary Dashboard
_Last updated: April 11, 2026_

| # | Priority | Sprint | Progress | Status | Business Unlock |
|---|---|---|---|---|---|
| P2 | Build 22 / Guideline 3.1.2(c) | Immediate | 100% | ✅ Submitted Apr 11 | Revenue — IAP live |
| P1 | VQ streaming | 1 | 100% | ✅ Complete | Retention |
| P3 | Supabase RLS | 1 | 100% | ✅ Verified live Apr 11 | Security |
| P4 | JWS cert chain | 2 | 100% | ✅ Code-verified Apr 11 | Fraud prevention |
| P6 | App Store Server Notifications | 2 | 100% | ✅ Complete — endpoint registered pre-build 22 | Revenue integrity |
| P7 | Staging environment | 3 | 100% | ✅ Complete — staging branch live, Netlify deploy active, dry-run passing, smoke test complete (web) | Operational safety |
| P5 | App.jsx decomposition | 3 | 100% | ✅ Complete — 695 lines (76% reduction from 2,846) | Acquirability |
| P8 | Accessibility | 4 | 55% | 🔄 In progress — aria-labels, sr-only, 44pt touch targets done; focus traps, aria-live, WCAG contrast, VoiceOver flow remaining | Market expansion |
| P9 | Automated testing | 4 | 0% | 🔲 Not started | Deployment confidence |
| — | Stripe live mode | Blocked | — | 🚫 Pending Apple approval | Revenue — full payments |
