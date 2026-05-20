# Claude Handoff — Vetted iOS App

**Purpose:** This document is read by the next Claude session when this
conversation's context compacts. It provides full operational knowledge
needed to continue work without re-investigating the codebase from
scratch and without repeating the mistakes catalogued in `ERROR_LOG.md`.

**Read order on session start:**
1. This file (architectural + operational state)
2. `ERROR_LOG.md` (171+ documented mistakes — never repeat the patterns)
3. `BUILD_30_SUBMISSION.md` (submission paperwork — release notes, privacy
   disclosure, screenshot list)
4. `git log --oneline -30` (recent commit history)

---

## Project identity

- **App:** Vetted: Career Intelligence
- **Bundle ID:** `com.vettedai.app`
- **Legal entity:** Vetted AI LLC (Apple transfer approved May 2026)
- **Stack:** Capacitor 6 (iOS) wrapping a React + Vite SPA
- **Backend:** Netlify Functions (serverless) → Supabase Postgres
- **Auth:** Apple Sign in (Capacitor plugin) + optional GitHub OAuth (web only)
- **Push:** APNs HTTP/2 via the `apn` npm library
- **LLM:** Anthropic Claude (model `claude-haiku-4-5-20251001`) + Perplexity Sonar
- **Payments:** Apple StoreKit IAP (free / signal / vantage / lifetime tiers)
- **Analytics:** PostHog (existing) + Firebase Analytics (added Build 30)
- **Repository:** `https://github.com/gwestperry-spec/vetted.git` (main branch)
- **Production URL:** `https://tryvettedai.com` (Netlify)
- **Current version:** 2026.05.001 build 30 — ready for App Store Connect upload as of session end
- **Versioning scheme:** date-based `YYYY.MM.NNN`. `2026.05.001` = first
  build shipped in May 2026. Do not revert to semver. Apple compares
  versions component-by-component so this cleanly supersedes the prior
  semver `2.2.4`. Future builds bump NNN within the same month, or roll
  to `YYYY.MM.001` in a new month. `CURRENT_PROJECT_VERSION` (build
  number) stays sequential at 30 and increments by 1 per App Store
  submission, regardless of marketing version.

---

## Brand voice — non-negotiable

- **Single typeface:** Libre Baskerville for everything. The "mono" eyebrow
  look comes from tracking (`letterSpacing: 0.22em`) + uppercase, NOT
  from Inter. Never re-introduce Inter for editorial copy.
- **Surface palette:**
  - **Forest dark** for ritual moments — Sign-in, Scoring, Resolve hub,
    Profile plate, Market Pulse cohort plate
  - **Paper light** for action moments — Score entry, Workspace, Filters
- **Gold accent** `#fbbf24` — emphasis only. Target markers, EDIT chevrons,
  gold halo on dark disks. Never decoration.
- **Verdict pill colors:** PURSUE green, MONITOR amber, PASS clay-red.
  Never bright primary colors anywhere.
- **No gamification language.** Forbidden words: badges, tokens, accolades,
  trophies, levels, XP, points. Use "milestones" in user copy and "rungs"
  internally. Match the editorial credential vocabulary, not Duolingo's.
- **"Cohort"** is the canonical word for the user's peer set on Pulse —
  not "peer group", not "your set", not "people like you".
- **"VQ Advocate"** is deprecated everywhere. Don't reintroduce. The
  feature was replaced by the Behavioral Insights pod in Build 30.
- **No emojis in app copy** unless the user explicitly requests them.
  Even in notification bodies, prefer text. The one exception today is
  `📅` in `notify-reminders.js` (now retired anyway).

---

## Architecture map

### Frontend (React + Vite)

```
src/
├── App.jsx                                # Top-level state, routing, auth gate
├── main.jsx                               # Vite entry + PostHog init
├── i18n/translations.js                   # 7 languages: en, es, zh, fr, ar, vi, pt
├── config.js                              # ENDPOINTS map for Netlify functions
├── hooks/
│   ├── useAuth.js                         # Apple Sign in, session restore, dbCall
│   ├── usePushNotifications.js            # APNs token registration bridge
│   └── useReviewPrompt.js                 # SKStoreReviewController trigger logic
├── utils/
│   ├── analytics.js                       # PostHog wrapper + Firebase wrapper
│   ├── salaryExtract.js                   # JD comp-range regex
│   └── handleError.js                     # Central error reporter
├── components/
│   ├── SignInGate.jsx                     # Forest backdrop + verdict seal
│   ├── ScoreEntry.jsx                     # LEGACY — kept for rollback only
│   ├── ScoreResult.jsx                    # Router for hub / insights / filters / etc.
│   ├── PaywallModal.jsx                   # IAP tiers
│   ├── TabBarV2.jsx                       # Bottom 5-tab nav
│   ├── FiltersStep.jsx                    # Filter framework editor (also onboarding)
│   ├── FrameworkPicker.jsx                # Horizontal scroll carousel of templates
│   ├── MarketPulse.jsx                    # LEGACY — kept for rollback only
│   ├── workspace/
│   │   ├── RoleWorkspace.jsx              # Workspace door (KPI + pod + history)
│   │   ├── RoleCard.jsx                   # Per-role card (still used in archived)
│   │   ├── WorkspaceReminderModal.jsx     # ORPHANED — retired in cdb1645
│   │   ├── WorkspaceEmptyState.jsx        # Zero-state
│   │   └── CompareQueue.jsx               # Vantage compare flow
│   └── redesign/                          # Build-30 editorial vocabulary
│       ├── VerdictSeal.jsx                # Rotating PURSUE◆MONITOR◆PASS ring
│       ├── TopBar.jsx                     # Back arrow + title
│       ├── Tile.jsx                       # Editorial card primitive
│       ├── NextPrompt.jsx                 # Bottom navigation hint
│       ├── ThoughtCard.jsx                # Modal overlay for tile-tap detail
│       ├── Pod.jsx                        # Horizontal scroll-snap carousel
│       ├── TimeRangeChip.jsx              # 24h / 7d / 14d / 30d / All
│       ├── IconSet.jsx                    # SVG icon library
│       ├── scoring/
│       │   ├── ScoringScreen.jsx          # Portal-rendered full-screen ritual
│       │   ├── AnchorPairCycle.jsx        # Cycling Q/A pairs during scoring
│       │   └── StepTrail.jsx              # FETCH · READ · WEIGH · CALL
│       ├── score-result/
│       │   ├── ResolveHub.jsx             # Portal-rendered hub with 4 pills
│       │   ├── InsightsLanding.jsx        # 4 tiles + ThoughtCard overlays
│       │   ├── FiltersLanding.jsx         # Filter score cards
│       │   ├── CoachLanding.jsx           # Interview prep + cover letter entry
│       │   ├── PayLanding.jsx             # Market range + leverage
│       │   └── CoverLetterDraft.jsx       # AI cover letter, localStorage persisted
│       ├── insights/
│       │   ├── BehavioralInsightsPod.jsx  # Swipeable pod, 4 cards
│       │   ├── SpectrumCard.jsx           # Floor margin
│       │   ├── FilterSignalCard.jsx       # Lagging filter
│       │   ├── PreferenceDriftCard.jsx    # Stated vs revealed drift
│       │   └── SynthesisCard.jsx          # This-week synthesis
│       ├── market/
│       │   └── MarketPulseV2.jsx          # Cohort plate + live findings
│       └── profile/
│           └── ProfileLanding.jsx         # Forest plate with manifesto
```

### Backend (Netlify Functions)

```
netlify/functions/
├── apple-auth.js                          # Sign in with Apple verification
├── github-auth.js                         # GitHub OAuth (web only)
├── supabase.js                            # Generic Supabase proxy (PostgREST)
├── register-device.js                    # APNs token + notif prefs upsert
├── send-notification.js                  # Manual push send
├── notify-test.js                        # Dev diagnostic (gated behind dev-tap)
├── notify-pipeline.js                    # CRON: staleness + timeline (daily 14:00 UTC)
├── notify-weekly.js                      # CRON: Sunday recap (15:00 UTC)
├── notify-reminders.js                   # ORPHANED — no longer scheduled in netlify.toml
├── workspace-sweep.js                    # CRON: clean queued rows (hourly)
├── anthropic.js                          # Main scoring proxy (with retry)
├── anthropic-stream.mjs                  # Streaming scoring variant
├── behavioral-insights.js                # Pod data aggregation
├── behavioral-intelligence.js            # Pattern detection LLM call
├── cover-letter.js                       # Coach drafts (with retry + friendly errors)
├── market-pulse.js                       # Per-role salary brief
├── market-findings.js                    # Sonar live findings for cohort plate
├── fetch-jd.js                           # URL → JD scraping
├── parse-resume.js                       # Upload PDF → profile fields
├── salary-lookup.js                      # Static comp band lookup
├── create-checkout-session.js            # Stripe (web tier — not used today)
├── verify-apple-iap.js                   # StoreKit receipt verification
├── apple-server-notifications.js         # IAP webhook
├── stripe-webhook.js                     # Stripe webhook (web tier)
├── seats.js                              # Lifetime tier seat counter
├── dashboard-data.js                     # Internal KPI dashboard
├── notif-copy.js                         # 7-language push body strings
├── sanitizeTitle.js                      # Title sanitizer (anti-injection)
└── sanitizePromptField.js                # Free-text sanitizer
```

### Schema (Supabase)

Critical column names — **drift between these and the code is the
single most common source of 502s** (see Errors 167, 169):

| Table | Key columns |
|---|---|
| `profiles` | `apple_id`, `display_name`, `current_title`, `background`, `career_goal`, `target_roles[]`, `target_industries[]`, `compensation_min`, `compensation_target`, `location_prefs[]`, `hard_constraints`, `threshold`, `timeline`, `country`, `currency`, `lang`, `tier` |
| `workspace_roles` | `apple_id`, `role_id`, `company`, `title`, `source_url`, `status` (enum: queued, scored, pursue, monitor, pass, applied, archived), `vq_score`, `framework_snapshot` (jsonb), `last_viewed_at`, `next_action`, `next_action_at`, `notes`, `created_at`, `updated_at` |
| `workspace_reminders` | ORPHANED in Build 30 — no UI writes rows. Table retained for git history. |
| `user_devices` | `apple_id`, `token`, `platform`, `lang`, `notif_reminders`, `notif_follow_up`, `notif_staleness`, `notif_timeline`, `notif_digest`, `updated_at`. Upsert key: (apple_id, token). |
| `user_notification_log` | `id`, `apple_id`, `type`, `context`, `sent_at`. Used by cron functions for dedup. |
| `filters` | `apple_id`, `filter_id`, `name`, `description`, `weight`, `is_core` |
| `opportunities` | LEGACY pre-Build-29 table. Has `application_status` + `status_updated_at`. Do NOT query for new functionality — use `workspace_roles` instead. |

Stored procedures (Postgres functions):
- `users_not_scored_since(days_ago int)` — returns apple_ids idle ≥N days

### iOS native (Capacitor)

```
ios/App/
├── App.xcworkspace                        # ALWAYS open this, never the .xcodeproj
├── App.xcodeproj/project.pbxproj          # objectVersion = 56 (NOT 70 — see Error 167)
├── Podfile                                # CapacitorFirebaseAnalytics/Analytics (NOT Lite)
├── Podfile.lock                           # Reproducibility
├── App/
│   ├── AppDelegate.swift                  # FirebaseApp.configure() + push token bridge
│   ├── Info.plist                         # SKAdNetworkItems + URL schemes + bundle config
│   ├── GoogleService-Info.plist           # Firebase config — registered in build phase
│   ├── MainViewController.swift           # Capacitor bridge
│   ├── SignInWithApple.swift              # Custom Capacitor plugin
│   ├── StoreKitPlugin.swift               # SKStoreReviewController + IAP
│   ├── PrintPlugin.swift                  # PDF export bridge
│   └── public/                            # Vite build output (Capacitor copies here)
└── VettedShareExtension/                  # iOS Share Extension target
    └── ShareViewController.swift          # vetted://score?url= deep link via App Group
```

---

## Critical safe-build rules (do NOT relearn the hard way)

These are the patterns that cost engineering hours in the 171 catalogued
errors. Treat them as immutable.

### Environment variables

| Var | Used by | Notes |
|---|---|---|
| `ANTHROPIC_KEY` | Every LLM-backed function | **NOT** `ANTHROPIC_API_KEY` — that was Error 145. Always check `anthropic.js` for the canonical pattern. |
| `VETTED_SECRET` | HMAC base for session tokens | Server-side ONLY. Never logged. Used by every authenticated endpoint to validate `sessionToken === HMAC-SHA256(VETTED_SECRET, appleId)`. |
| `VT_DB_URL` / `VT_DB_KEY` | Supabase service role | Prefer these over `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` (legacy fallbacks). Server-side ONLY. |
| `APNS_KEY` | APNs JWT signing | Base64-encoded .p8 contents per Error 137 — decode at runtime. Backward-compatible with PEM-format paste if `BEGIN PRIVATE KEY` is detected. |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` | APNs config | Apple Developer Portal IDs. Must match the .p8 the key was generated for. |
| `PERPLEXITY_API_KEY` | `market-pulse.js`, `market-findings.js` | Sonar API. |
| `STRIPE_SECRET_KEY` | `create-checkout-session.js`, `stripe-webhook.js` | Web tier — IAP is the production path. |
| `WORKSPACE_SWEEP_SECRET` | `workspace-sweep.js` | Manual-invocation auth secret. Falls back to `VETTED_SECRET`. |

### Supabase access

- **NEVER use `@supabase/supabase-js`** — Error 131, Error 142. The Netlify
  Functions v2 bundler cannot reliably resolve it. Every function uses raw
  `fetch` to PostgREST instead. If you see `import { createClient } from
  "@supabase/supabase-js"`, that function is broken on deploy.
- Pattern: `fetch(SB_URL + "/rest/v1/<table>", { headers: { apikey: SB_KEY,
  Authorization: "Bearer " + SB_KEY }, … })`. See `supabase.js` or
  `notify-pipeline.js` for the canonical pattern.

### Scheduled (cron) functions

**Every scheduled function MUST follow this structure** (lesson from Error
169 → 7211f0d sweep):

```js
export default async function handler(req) {
  let totalSent = 0;
  const stageErrors = [];
  let provider = null;
  try {
    // ── STAGE 1 ────────────────────────────────────────
    let results = [];
    try {
      results = await sbGet(/* … */);
    } catch (err) {
      stageErrors.push({ stage: "stage_1", error: err?.message });
    }
    // … process results …

    // ── STAGE 2 ────────────────────────────────────────
    // each stage in its own try/catch so one failure doesn't kill others

  } catch (err) {
    // Outer fallback — never let a throw reach Netlify's runtime, which
    // returns 502 and the scheduler treats the run as a complete failure.
    console.error("[function-name] fatal:", err?.stack || err?.message);
    stageErrors.push({ stage: "outer", error: err?.message || String(err) });
  } finally {
    try { provider?.shutdown(); } catch { /* already shut down */ }
  }
  return new Response(JSON.stringify({ sent: totalSent, stageErrors }), { status: 200 });
}
```

The four currently-scheduled functions all follow this pattern as of
commit 7211f0d: `notify-pipeline.js`, `notify-reminders.js` (now orphaned),
`notify-weekly.js`, `workspace-sweep.js`.

### LLM-backed functions

**Retry transient errors before bubbling up** (lesson from Errors 145,
154). Pattern from `cover-letter.js` and `anthropic.js`:

```js
const RETRIABLE = new Set([429, 500, 502, 503, 504, 529]);
const MAX_ATTEMPTS = 3;
let lastStatus = 0;
let lastBody = "";
for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
  const r = await singleAnthropicRequest(payload);
  if (r.statusCode < 400) return { statusCode: r.statusCode, body: r.body };
  lastStatus = r.statusCode;
  lastBody = r.body;
  if (!RETRIABLE.has(r.statusCode) || attempt === MAX_ATTEMPTS - 1) break;
  await new Promise(r => setTimeout(r, 800 + attempt * 1000));
}
// Map upstream status → friendly user-facing message in `error`,
// raw status + truncated body in `detail` for ops.
```

**Retrofit pending in B31:** `anthropic-stream.mjs`,
`behavioral-intelligence.js`, `parse-resume.js`, `market-pulse.js`,
`market-findings.js`. Only `cover-letter.js` and `anthropic.js` have it today.

### iOS WebView fullscreen surfaces

Any surface that must render edge-to-edge **MUST portal to
`document.body`** via `createPortal` (lesson from Errors 146, 148, 152,
157). CSS-only `position: fixed` inside `#root` doesn't escape the
containing block created by `#root`'s `display: flex` + `border-inline`.

Currently portal-rendered: `ScoringScreen`, `ResolveHub`, `ProfileLanding`,
`ScoreEntryV2`, `SignInGate`. The pattern:

```jsx
const body = (
  <div style={{
    position: "fixed", inset: 0,
    width: "100vw", height: "100dvh",
    paddingTop: "calc(env(safe-area-inset-top, 0px) + Npx)",
    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + Npx)",
    // …
  }}>{/* surface contents */}</div>
);
return typeof document !== "undefined" ? createPortal(body, document.body) : body;
```

**Sticky vs portal-fixed:** prefer `position: fixed` over `position:
sticky` for chrome inside WKWebView (Error 163). Sticky is unreliable
inside `<main>` elements in WKWebView. For headers that must pin while
content scrolls behind, use `position: fixed` with reserved padding on the
parent main.

### Scroll bars (iOS look)

Editorial vocabulary forbids native scroll tracks on auto/scroll regions.
Apply the `.no-scrollbar` utility class (defined in `src/index.css`) to
every auto/scroll region. Pattern:

```jsx
<div className="no-scrollbar" style={{ overflowY: "auto" }}>...</div>
```

The class provides `scrollbar-width: none` (Firefox) + `::-webkit-scrollbar
{ display: none }` (WebKit) + `-ms-overflow-style: none` (legacy Edge).

### Capacitor plugin Lite mode

When adding a `@capacitor-firebase/*` or similar Lite-mode plugin, the
plugin's pod target only sees deps declared in its own podspec.
Host-target pods do NOT satisfy plugin-target deps (lesson from Error 167).
Check the podspec for subspec definitions — use the explicit subspec
form in the Podfile:

```ruby
# CORRECT — pulls FirebaseAnalytics into the plugin's pod target
pod 'CapacitorFirebaseAnalytics/Analytics', :path => '…'

# WRONG — installs Lite subspec, plugin can't find FirebaseCore
pod 'CapacitorFirebaseAnalytics', :path => '…'
```

### Xcode project.pbxproj objectVersion

The project file uses `objectVersion = 56` (NOT 70). Xcode 16+ writes
`70` but brew-bundled CocoaPods 1.16.2 can't parse it. If a `pod install`
fails with "Unable to find compatibility version string for object version
`70`", `sed -i '' 's/objectVersion = 70;/objectVersion = 56;/' ios/App/App.xcodeproj/project.pbxproj`
fixes it. Xcode 16 reads 56 without complaint.

### GoogleService-Info.plist registration

File lives at `ios/App/App/GoogleService-Info.plist` (NOT in a subfolder).
The xcodeproj file-ref `path` must be `'GoogleService-Info.plist'` with
`source_tree = '<group>'` (NOT `'App/GoogleService-Info.plist'` with
`source_tree = 'SOURCE_ROOT'` — see Error 167 root cause #2). The parent
group's path resolves the `App/` prefix; including it in the file path
produces double `App/App/` and a build failure.

---

## Security boundaries — strict

### Secrets management

- **Never log** raw `VETTED_SECRET`, `ANTHROPIC_KEY`, `APNS_KEY`,
  `PERPLEXITY_API_KEY`, `VT_DB_KEY`, `STRIPE_SECRET_KEY`, or any session
  token.
- **APNs device tokens** in logs: truncate to last-8 chars only
  (`token.slice(-8)`). See `notify-test.js` for the pattern.
- **Apple ID** (the opaque user identifier from Sign in with Apple) is NOT
  PII in the email/SSN sense but is still a personal identifier — never
  log alongside the session token to avoid creating an identity dossier.

### Session validation

Every authenticated endpoint MUST validate the session token:

```js
const expected = crypto.createHmac("sha256", process.env.VETTED_SECRET)
  .update(appleId).digest("hex");
const tokBuf = Buffer.from(sessionToken.padEnd(64, "0").slice(0, 64));
const expBuf = Buffer.from(expected.padEnd(64, "0").slice(0, 64));
if (!crypto.timingSafeEqual(tokBuf, expBuf)) {
  return { statusCode: 403, body: JSON.stringify({ error: "Invalid session" }) };
}
```

**Always `timingSafeEqual`**, never `===`. Constant-time comparison
prevents timing-attack token enumeration. Pad both buffers to a fixed
length before comparing — otherwise `timingSafeEqual` throws on
length-mismatch.

### CORS

Every Netlify Function explicitly allowlists origins. Never wildcard.
Canonical allowlist (current as of Build 30):

```js
const ALLOWED_ORIGINS = [
  "https://celebrated-gelato-56d525.netlify.app",  // preview/staging
  "https://tryvettedai.com",
  "https://vettedai.netlify.app",
  "https://app.vetted.ai",
  "capacitor://localhost",     // iOS app — DO NOT REMOVE
  "http://localhost:5173",     // vite dev
  "http://localhost:3000",     // alt dev port
];
```

If a new origin appears (e.g. mobile redesign at a new domain), add it
to **every** function's allowlist, not just one. Errors 133 and several
others trace to one function missing `capacitor://localhost`.

### Rate limiting

Every LLM-backed and otherwise expensive function enforces an in-memory
per-IP rate limit. Canonical pattern from `market-pulse.js`:

```js
const IP_RATE_MAP = new Map();
const WINDOW_MS   = 60 * 1000;
const MAX_CALLS   = 8; // or 6 for heavier functions

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = IP_RATE_MAP.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > WINDOW_MS) {
    IP_RATE_MAP.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= MAX_CALLS) return true;
  entry.count++;
  IP_RATE_MAP.set(ip, entry);
  return false;
}
```

Note: this is per-instance memory, so Netlify's autoscaling means each
warm container has its own counter. Acceptable for our scale today.
Replace with Upstash/Redis when traffic justifies it.

### Input sanitization

- **JD text** before sending to Anthropic: `sanitizePromptField(jd,
  MAX_LENGTHS.long)` from `sanitizePromptField.js`. Strips control chars,
  truncates to safe length, escapes prompt-injection sequences.
- **Title text** before sending to Sonar: `sanitizeTitle(title)` from
  `sanitizeTitle.js`. Rejects empty / oversize / garbage strings.
- **URL inputs** in `fetch-jd.js`: validate scheme is http(s), block
  private network hosts (`localhost`, `192.168.*`, `10.*`,
  `*.internal`, `metadata.google.internal`).

### App Privacy disclosure

Required by Apple. See `BUILD_30_SUBMISSION.md` for the canonical set.
Key types collected:
- Device ID (Firebase Analytics) — Linked to user · Analytics
- User ID (Apple opaque ID) — Linked to user · App Functionality
- Product Interaction (PostHog + Firebase) — Linked · Analytics
- Performance + Crash Data — Not linked · Analytics
- Email (when shared via Apple Sign in) — Linked · App Functionality
- Job descriptions (User Content) — Linked · App Functionality

**Never** ship a build that collects data not declared in the App Privacy
disclosure — automatic Apple Review rejection.

---

## Current state (as of session end)

### Build 30 — Ready to submit

- **Version:** 2.3.0, build 30
- **Bundle:** com.vettedai.app
- **Code state:** main HEAD is production-ready. Demo bootstrap fully reverted.
- **Screenshots:** 6 per device × 2 devices in
  `~/Desktop/Vetted App Store Screenshots/iPhone/EN/` and `iPad/EN/`.
  Also versioned in repo at `screenshots/build-30/`.
- **Submission paperwork:** `BUILD_30_SUBMISSION.md` has release notes,
  privacy disclosure, screenshot capture list.
- **App Store category** recommendation: Finance primary, Business
  secondary. See conversation history (or the marketing brief in
  `BUILD_30_SUBMISSION.md` if it landed there).

### Cleanup completed in this session

- **Notification feature retirement** (Reminders + Application Follow-Ups):
  removed from Settings UI; FOLLOW_UP stage stripped from
  `notify-pipeline.js`; `notify-reminders` cron schedule removed from
  `netlify.toml`. The two retired toggles never had functional UIs
  post-Build-30 redesign anyway; their removal hardens the brand
  positioning (Vetted is a decision layer, not a tracker).
- **Settings notification prefs persistence:** `useNotifPrefs` now POSTs
  toggle state to `register-device`, which upserts `user_devices.notif_*`
  columns. Before this commit, toggles were localStorage-only and the
  cron functions never saw user opt-out preferences.
- **Cron defensive sweep:** all four scheduled functions
  (`notify-pipeline`, `notify-reminders`, `notify-weekly`,
  `workspace-sweep`) now return HTTP 200 with `stageErrors[]` on every
  tick, regardless of internal failures. Netlify scheduler treats them
  as successful runs; ops can see stage-level failures by curling the
  endpoint.
- **Send Test Push button** gated behind 7-tap VETTED-wordmark dev unlock.
  End users never see it.

### Open items (deferred to Build 31 — explicitly NOT blocking submission)

| Item | Why deferred |
|---|---|
| Delete `WorkspaceReminderModal.jsx`, `notify-reminders.js`, the workspace_reminders Supabase table | Orphaned but harmless. Mass deletion is risky right before submission. |
| Strip the reminder bell button from `RoleCard.jsx` | Bell is only invoked via expanded archived section (collapsed by default). Edge-case visibility. |
| i18n cleanup of `notifReminders` / `notifFollowUp` keys across 7 langs | Orphaned strings don't break runtime; just dead i18n. |
| Milestone counter on Profile plate (`245 ROLES SCORED · 3.4 AVG VQ · 23% PURSUE`) | Designed but not built. See conversation history for the spec. ~4 hours. |
| Retrofit retry pattern in `anthropic-stream.mjs`, `behavioral-intelligence.js`, `parse-resume.js`, `market-pulse.js`, `market-findings.js` | Only `cover-letter.js` and `anthropic.js` have it today. Same Anthropic 529 risk applies to all five. |
| Size optimization (~500 KB reduction potential) | Drop `firebase` npm dep, lazy-load non-EN i18n, delete legacy components. Worth doing in B31 alongside the milestone counter. |
| Apply `status_updated_at` migration if Mark Applied UI ever returns | The `notify-pipeline.js` follow_up stage was removed; status_updated_at migration is moot until/unless tracking returns. |
| Cohort label LLM upgrade | Current heuristic produces editorial labels like "VP & Sr. Director · Ops + CS". An LLM call would be more natural but adds latency. |

### Build/deploy commands

```bash
# Build the iOS bundle (run from repo root)
npm run build
npx cap copy ios

# Open Xcode workspace (NOT xcodeproj)
npx cap open ios
# OR
open ios/App/App.xcworkspace

# Archive + upload via Xcode UI:
# Product → Archive → Distribute App → App Store Connect

# Verify before archive — these should all succeed:
node -c netlify/functions/anthropic.js          # syntax check
node -c netlify/functions/notify-pipeline.js
npm run build                                    # vite production build
LANG=en_US.UTF-8 npx cap copy ios               # sync /public

# CocoaPods (when adding/removing native deps):
cd ios/App && LANG=en_US.UTF-8 pod install
```

If `pod install` complains about `objectVersion = 70`:
```bash
sed -i '' 's/objectVersion = 70;/objectVersion = 56;/' \
  ios/App/App.xcodeproj/project.pbxproj
```

### Testing flows

- **iOS Simulator UDIDs we use:**
  - iPhone 17 Pro Max: `1F50240B-BF5C-4421-8DF5-1877840DA121`
  - iPad Pro 13-inch (M5): `318AE3D5-A0A5-481E-87F6-35A10600CF15`
- **Capture screenshots:** `./screenshots/build-30/capture.sh <slug>` —
  hits both simulators at once.
- **Verify cron functions are healthy:**
  ```
  curl -X POST https://tryvettedai.com/.netlify/functions/notify-pipeline \
    -H "Origin: capacitor://localhost"
  # Expect: {"sent":0,"stageErrors":[]} on a healthy run.
  ```

### iOS-side debugging

- **Safari Web Inspector** for the simulator's WKWebView:
  Safari → Develop → Simulator → choose the WebView. Full DevTools
  against the running app.
- **Physical device:** plug in, enable Settings → Safari → Advanced →
  Web Inspector ON, same Safari menu path.

---

## Anti-patterns — explicitly DO NOT do these

These are mistakes the conversation history has already paid for. Don't
re-pay.

1. **Don't overwrite files without reading them first.** Error 165 — I
   bash-heredoc'd a new `analytics.js` over the existing PostHog wrapper.
   13 import errors at build. Use `Read` before `Write` on existing files.

2. **Don't bypass the conversation summary's institutional knowledge.**
   Read `ERROR_LOG.md` if you're about to do anything that smells like:
   - Modify a Netlify function
   - Add a Capacitor plugin
   - Touch APNs / push notifications
   - Make a Supabase schema change
   - Modify a sign-in / auth flow
   - Add a new env var
   The log has 171+ entries. Most "new" bugs are repeats. Always grep
   first: `grep -i "<topic>" ERROR_LOG.md`.

3. **Don't introduce gamification language.** No "badges", "tokens",
   "accolades", "trophies", "levels", "XP", "points". The brand voice
   says no. See conversation history for the milestone counter spec
   (uses "rungs" internally, "milestones" externally).

4. **Don't reintroduce VQ Advocate.** Deprecated. Replaced by the
   Behavioral Insights pod.

5. **Don't add per-role reminders or application tracking.** Explicit
   product decision in this session: Vetted is the decision layer, not
   a pipeline tracker. Tracking lives in Huntr / Teal / inbox. Don't
   build it in.

6. **Don't ship demo / mock data switches without a clear revert.** The
   screenshot capture demo bootstrap was reverted via `git checkout`
   before commit. Same pattern any time you need to inject test data —
   use a separate branch or always revert before merge.

7. **Don't call StoreKit's review prompt out of the eligibility heuristic.**
   The heuristic in `useReviewPrompt.js` (3+ scores, positive verdict,
   2+ days, 14-day cooldown) is calibrated. Don't loosen.

8. **Don't change the model identifier from `claude-haiku-4-5-20251001`**
   without updating every LLM-backed function consistently. Drift causes
   "Anthropic 401" errors (Error 145).

9. **Don't use `@supabase/supabase-js`.** Raw `fetch` to PostgREST only.
   Errors 131, 142 are the receipts.

10. **Don't position fixed inside #root.** Portal to document.body.
    Errors 146, 148, 152, 157.

11. **Don't return 502 from a cron function.** Wrap in outer try/catch
    and return 200 with `stageErrors[]`. Error 169.

12. **Don't add new packages without checking bundle size impact.** The
    `firebase` npm package added ~250 KB to the bundle as a vite-resolve
    workaround. Always run `npm run build` and check `dist/_assets/*.js`
    sizes after adding a dependency.

---

## Conversation continuity

This session's work spans:
- App Store screenshots captured + Build 30 prep
- Notification pipeline debugging (502 → fix → verify)
- Settings toggles wired to DB (was localStorage-only)
- Reminders + Follow-Ups feature retirement
- Pre-submission omnibus (v2.3.0, SKAdNetwork, more events, retry, docs)
- Demo bootstrap → screenshot capture → revert
- Various hot-fixes (scroll bars, layout collisions, sticky vs fixed)

Critical commits (most recent first; check `git log --oneline -50` for full):
- `cdb1645` — retire Reminders + Follow-Ups
- `7211f0d` — cron sweep + ResolveHub rationale clamp
- `889b7c5` — notify-pipeline outer try/catch
- `2258bf8` — notify-pipeline follow_up schema fix + Settings prefs to DB
- `85f0c6d` — last application_status reference fix
- `b763761` — cover-letter retry + friendly errors
- `00afbff` — App Store screenshots full set
- `6ccd73c` — sign-in screenshots fix
- `81b5610` — pre-submission omnibus (v2.3.0)
- `f246f20` — sign-in seal matches scoring screen
- `aa5d4b9` — VerdictSeal compute letter-spacing
- `b0e700f` — SignInGate full forest
- `2c0ff3f` — Hub fullscreen + cover-letter env var + workspace door
- `1a9abad` — MarketPulseV2
- `2fb68d5` — ProfileLanding
- `35a9c25` — ResolveHub rebuilt to design
- `7b496a9` — scoring fullscreen + TimeRangeChip + cover-letter Save/Copy

---

## When in doubt

1. Read `ERROR_LOG.md` first.
2. Grep for the topic before adding new code.
3. If you're about to do something that touches: APNs, env vars,
   Supabase schema, fullscreen surfaces, Capacitor plugins, scheduled
   functions, or auth — re-read this file's "Critical safe-build rules"
   section.
4. Never ship code that bypasses the existing security patterns:
   timing-safe session compare, CORS allowlist, IP rate limit,
   sanitized inputs, no PII logging.
5. The brand voice is editorial. When tempted to write "achievements"
   or "level up", stop. Use the editorial vocabulary established in
   conversation history.
6. **Trust the error log over your prior training.** Anything that looks
   like a "best practice" but contradicts a logged lesson is wrong for
   this codebase.

Last updated: end of the May 19, 2026 session (Build 30 submission prep).
