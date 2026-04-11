# Vetted: Career Intelligence — Error Report & Fix Log
**Compiled:** April 6, 2026
**Versions covered:** v1.0 through v2.0.3 (build 16)
**Source:** Full development chat history

---

## Error 1 — Scoring calling Anthropic API directly
**Build:** v1.0
**Symptom:** `Preflight response is not successful. Status code: 400` in Safari console. Scoring failed silently.
**Root cause:** App.jsx was calling `https://api.anthropic.com/v1/messages` directly from the frontend, exposing the API key and triggering CORS rejection.
**Fix:** Replaced direct API call with `/.netlify/functions/anthropic` proxy. Moved API key to Netlify environment variable `ANTHROPIC_KEY`. Switched Netlify function from `node-fetch` to native `https` module to avoid runtime import errors.
**Deployed:** v1.0 — commit "switch to native https module"

---

## Error 2 — Netlify functions folder case sensitivity
**Build:** v1.0
**Symptom:** Functions not deploying. Netlify couldn't find the `anthropic.js` function.
**Root cause:** Folder was named `Netlify/functions` (capital N). Netlify's Linux runtime is case-sensitive and requires `netlify/functions`.
**Fix:** Renamed folder via git: `rename {Netlify => netlify}/functions/anthropic.js`
**Deployed:** v1.0 — commit "fix netlify folder case"

---

## Error 3 — ANTHROPIC_KEY missing from Netlify environment
**Build:** v1.0
**Symptom:** Functions deploying but scoring returning 500 errors.
**Root cause:** API key was set on the old Netlify site, not the new one. Environment variable `ANTHROPIC_KEY` was absent.
**Fix:** Added `ANTHROPIC_KEY` to Netlify → Site Settings → Environment Variables. Triggered redeploy without cache.
**Deployed:** v1.0

---

## Error 4 — App.jsx not overwriting correctly
**Build:** v1.0
**Symptom:** Title still showing "Opportunity Filter" after edits. GitHub confirmed old file still in repo.
**Root cause:** Edits were being made to `~/Downloads/opportunity-scorer-fixed.jsx`, not the actual `~/Desktop/vetted/src/App.jsx`.
**Fix:** `cp ~/Downloads/opportunity-scorer-fixed.jsx ~/Desktop/vetted/src/App.jsx`
**Deployed:** v1.0 — commit "rebrand to Vetted, fix max tokens, fix recommendation language"

---

## Error 5 — iOS app scoring failing (relative URL)
**Build:** v1.0.1
**Symptom:** Scoring worked on Netlify web preview but failed completely inside the iOS App Store build.
**Root cause:** Fetch call used relative URL `/.netlify/functions/anthropic`. Relative URLs work when served from Netlify but fail inside the Capacitor iOS WebView since there is no Netlify host context.
**Fix:** Replaced relative URL with full absolute URL `https://celebrated-gelato-56d525.netlify.app/.netlify/functions/anthropic` in App.jsx.
**Deployed:** v1.0.1 — commit "fix API URL for iOS app"

---

## Error 6 — CocoaPods migration blocked by Ruby version
**Build:** v1.2 development
**Symptom:** `gem install cocoapods` failed. Error: `ffi requires Ruby version >= 3.0, < 4.1. The current ruby version is 2.6.10`
**Root cause:** macOS system Ruby is 2.6 — too old for CocoaPods 1.16+.
**Fix:** Installed Homebrew → `brew install libyaml` → `rbenv install 3.3.0` → `rbenv global 3.3.0` → `gem install cocoapods`. Updated RubyGems to 4.0.9.
**Deployed:** v1.2 infrastructure

---

## Error 7 — CocoaPods could not find Xcode project
**Build:** v1.2 development
**Symptom:** `pod install` failing with "Could not automatically select an Xcode project."
**Root cause:** Podfile had no explicit project reference. Two `.xcodeproj` files existed (`App.xcodeproj` and `Vetted.xcodeproj`), causing ambiguity.
**Fix:** Added `project 'App.xcodeproj'` to Podfile explicitly.
**Deployed:** v1.2 infrastructure

---

## Error 8 — Sign in with Apple: ASAuthorizationError code 1000
**Build:** v1.2 development
**Symptom:** Apple auth sheet appeared but returned `ASAuthorizationError error 1000 (unknown)`.
**Root cause:** Sign in with Apple capability was missing from Xcode target Signing & Capabilities tab.
**Fix:** Added Sign in with Apple capability via Xcode → target → Signing & Capabilities → + Capability.
**Deployed:** v1.2 development session

---

## Error 9 — Sign in with Apple: Invalid audience
**Build:** v1.2 development
**Symptom:** Netlify function log showed `Apple auth error: Invalid audience: com.vettedai.app`.
**Root cause:** `APPLE_CLIENT_ID` environment variable in Netlify was set to wrong value (included `.web` suffix or incorrect string).
**Fix:** Updated `APPLE_CLIENT_ID` to `com.vettedai.app` exactly in Netlify environment variables. Redeployed without cache.
**Deployed:** v1.2

---

## Error 10 — Sign in with Apple plugin not registering (Capacitor v8 / SPM conflict)
**Build:** v1.2 development
**Symptom:** `window.Capacitor.Plugins.SignInWithApplePlugin` undefined. `isNativePlatform()` returning false intermittently. Plugin not visible in available plugins list.
**Root cause:** Capacitor v8 with Swift Package Manager does not publicly expose the `bridge` property needed to register local custom plugins. Community plugin version incompatible with Capacitor v8.
**Fix:** Migrated iOS project from SPM to CocoaPods. Wrote custom native Swift plugin (`SignInWithApple.swift`) implementing `CAPBridgedPlugin` protocol directly. Registered via `AppDelegate.swift`.
**Deployed:** v1.2

---

## Error 11 — Server verification failed after token returned
**Build:** v1.2 development
**Symptom:** Apple auth sheet fired and returned real identity token. JS then threw `Server verification failed`. Netlify log showed `Invalid audience`.
**Root cause:** Two-part issue: (1) `APPLE_CLIENT_ID` env var not yet updated, (2) JS error handling was resolving on error responses instead of rejecting, masking the real failure.
**Fix:** Corrected `APPLE_CLIENT_ID` in Netlify. Fixed JS to check for `error: true` flag in response before proceeding to token verification.
**Deployed:** v1.2

---

## Error 12 — Supabase profile/filter save returning 403
**Build:** v1.2
**Symptom:** Opportunities saved successfully. Profile and filter saves returned 403 Forbidden.
**Root cause:** Supabase Row Level Security (RLS) policies on `profiles` and `filter_frameworks` tables were not configured to allow authenticated inserts/updates.
**Status:** Known open item — partially mitigated in v1.2, full resolution pending.

---

## Error 13 — Sign in with Apple broken on iOS 26 (presentationAnchor)
**Build:** v1.3 — flagged by Apple Review (Submission f712e112)
**Symptom:** Sign in with Apple displayed error on iPhone 17 Pro Max running iOS 26.4. Auth sheet never appeared.
**Root cause:** `presentationAnchor` function in `SignInWithApple.swift` used `#if compiler(>=5.9)` + `#available(iOS 26.0, *)` conditional block. On iOS 26, `ws.windows` (deprecated) returned empty array, causing the function to return a detached `UIWindow()` with no scene. Apple auth sheet failed to present.
**Fix:** Removed `#if compiler` and `#available` blocks entirely. Replaced with a single unified path using `ws.keyWindow` (works iOS 15 through iOS 26+) with `ws.windows.first` fallbacks.
**Deployed:** v1.3 (build 4) — commit "v1.3 — fix Sign in with Apple on iOS 26"

---

## Error 14 — VQ scoring not loading (VITE_VETTED_SECRET missing)
**Build:** v1.3 / v1.4 development
**Symptom:** VQ scoring spinner ran indefinitely. Netlify function log showed 3.79ms duration — too fast to have called Claude. Function returning 403 immediately.
**Root cause:** `VITE_VETTED_SECRET` environment variable was missing from Netlify build environment. App compiled with empty string token. Server-side `VETTED_SECRET` validation rejected every request with 403 Forbidden.
**Fix:** Added `VITE_VETTED_SECRET` to Netlify environment variables with same value as `VETTED_SECRET`. Redeployed without cache.
**Deployed:** v1.4 (build 5, then build 6)

---

## Error 15 — VQ scoring too slow (25+ seconds)
**Build:** v1.3
**Symptom:** VQ score took 25–30 seconds to return. Unacceptable for consumer mobile app.
**Root cause:** Two issues: (1) Netlify function `anthropic.js` was set to `claude-sonnet-4-20250514` — most capable but slowest model. (2) App.jsx was hardcoding `model: "claude-sonnet-4-20250514"` and `max_tokens: 2000` in the fetch body, overriding the function's model setting entirely.
**Fix:** Updated `anthropic.js` model to `claude-haiku-4-5-20251001` and max_tokens default to 500. Removed hardcoded model and max_tokens from App.jsx fetch call so function settings take effect.
**Deployed:** v1.4 (build 6) — commit "v1.4.1 — remove hardcoded model/max_tokens from client". Result: 25s → 12s.

---

## Error 16 — All API URLs pointing to wrong domain
**Build:** v1.4 development
**Symptom:** Accidental deployment of API calls pointing to `tryvettedai.com` instead of `celebrated-gelato-56d525.netlify.app`. Caused 9.09% error rate visible in Netlify Observability.
**Root cause:** Attempted to consolidate URLs to `tryvettedai.com` without confirming it was the same Netlify site. `tryvettedai.com` is a separate Netlify site — it does not host the serverless functions.
**Fix:** Immediately reverted all 6 URL instances back to `celebrated-gelato-56d525.netlify.app` via `sed` command.
**Deployed:** v1.4.1 — commit "v1.4.1 — revert API URLs back to celebrated-gelato"

---

## Error 17 — JSON truncation (max_tokens set too low)
**Build:** v1.4 (build 6)
**Symptom:** `JSON Parse error: Unterminated string` on VQ scoring. Confirmed by real user on App Store build.
**Root cause:** max_tokens was set to 500 in `anthropic.js` to improve speed. The full structured JSON response — five filter scores, rationale fields, strengths, gaps, narrative bridge, honest fit summary — requires more than 500 tokens for longer job descriptions.
**Fix:** Restored max_tokens to 2000 in `anthropic.js`. Original 2000 value was set intentionally in an earlier session after seeing truncation — lowering it to 500 was a regression.
**Deployed:** v1.5 (build 7) — commit "v1.4.2 — restore max_tokens to 2000, fix JSON truncation"

---

## Error 18 — Sign in with Apple broken after secret rotation (stale baked secret)
**Build:** v1.5 (build 7) live on App Store
**Symptom:** All API calls returning 403 Forbidden after secret was rotated. Sign in appeared to work (Apple auth sheet fired) but loadUserData failed immediately after with DB error 403.
**Root cause:** `VITE_VETTED_SECRET` is baked into the frontend at build time. Build 7 was archived before the secret was rotated today. The old secret was baked into the binary. Netlify had the new secret. They didn't match — every API call was rejected by the token validation middleware.
**Fix:** Rebuilt and resubmitted as v1.6.0 (build 8) after rotating the secret, so the new value bakes correctly into the build.
**Deployed:** v1.6.0 (build 8)
**Lesson:** Any secret rotation requires a new iOS archive and App Store submission. This is documented in ENV.md under Rotation Policy.

---

## Error 19 — Supabase 403 on loadUserData (wrong service key)
**Build:** v1.5 (build 7) / v1.6.0 (build 8) development
**Symptom:** Sign in with Apple succeeded natively but app showed "Sign in failed" — `loadUserData` returning DB error 403.
**Root cause:** `VT_DB_KEY` in Netlify environment variables contained the wrong Supabase key. The anon key was set instead of the service_role key, or the key had been regenerated in Supabase without updating Netlify.
**Fix:** Replaced `VT_DB_KEY` in Netlify with the correct service_role key from Supabase → Project Settings → API. Redeployed without cache.
**Deployed:** v1.6.0 (build 8)

---

## Error 20 — iOS crash on scoring (safeProfile outside try/catch)
**Build:** v2.0 development
**Symptom:** App crashed to welcome screen every time "Score This Opportunity" was tapped. No error message shown. `finally { setLoading(false) }` never executed.
**Root cause:** `safeProfile`, `profileSummary`, `filterDefs`, and `safeJd` were computed outside the try/catch block in `scoreOpportunity`. If any of these threw (e.g. `resolveLang(null, lang)` when a filter field was null), the catch block was bypassed and the finally block never ran, leaving the app in a broken loading state.
**Fix:** Moved all four variables inside the try block. Added null guard to `resolveLang`: `if (!field) return ""`.
**Deployed:** v2.0 development

---

## Error 21 — iOS crash persisted after Error 20 fix (null filter_scores)
**Build:** v2.0 development
**Symptom:** App still crashed to welcome screen after Error 20 fix. Crash happened when rendering a previously scored opportunity.
**Root cause:** Two separate issues: (1) `opp.filter_scores.map(...)` in ScoreResult.jsx threw when `filter_scores` was null/undefined on opportunities restored from localStorage. (2) No ErrorBoundary existed — any render throw produced a blank white screen with no recovery path.
**Fix:** Added null guard in ScoreResult: `(opp.filter_scores || []).map(...)`. Added `ErrorBoundary` class component exported from App.jsx, wrapped `<App>` in main.jsx. Added opportunity normalization in `restoreSession` to ensure `filter_scores`, `strengths`, and `gaps` always default to arrays.
**Deployed:** v2.0 development

---

## Error 22 — URL paste tab missing from opportunity form
**Build:** v2.0 development (regression from v1.x)
**Symptom:** Only "Paste JD" tab visible. "From URL" tab and URL input field completely absent.
**Root cause:** URL tab button was accidentally dropped during component extraction refactor in an earlier session.
**Fix:** Restored missing tab button in OpportunityForm.jsx.
**Deployed:** v2.0 development

---

## Error 23 — 403 on scoring after new Xcode build (sessionToken not persisted)
**Build:** v2.0 development
**Symptom:** Every fresh Xcode install prompted the user to sign in again. After signing in, scoring returned 403 immediately.
**Root cause:** `sessionToken` was intentionally excluded from `localStorage` (XSS protection) but was not being stored anywhere that survived a cold app relaunch. On fresh install, `sessionStorage` was empty, so the restored `authUser` had no `sessionToken`, causing every HMAC-validated API call to return 403.
**Fix:** Implemented sessionStorage bridge: `sessionStorage.setItem("vetted_session_token", ...)` on sign-in, `sessionStorage.getItem(...)` on session restore, `sessionStorage.removeItem(...)` on sign-out. sessionStorage survives background/foreground but is cleared on cold relaunch, forcing re-auth only when truly needed.
**Deployed:** v2.0 development

---

## Error 24 — PaywallModal spinner stuck on iOS (wrong isNativeApp detection)
**Build:** v2.0 development
**Symptom:** Tapping "Subscribe to Vantage" showed spinner indefinitely on iOS. Web worked correctly.
**Root cause:** isNativeApp detection used `typeof window.SignInWithApplePlugin !== "undefined"` which returned false on iOS because the Capacitor plugin is at `window.Capacitor.Plugins.SignInWithApplePlugin`, not `window.SignInWithApplePlugin`. As a result, the iOS Stripe flow tried to navigate `window.location.href` to the checkout URL while also calling `onClose("pending")`, leaving the spinner running.
**Fix:** Replaced detection with `window.Capacitor?.isNativePlatform?.() === true` — the canonical Capacitor check. Applied consistently across PaywallModal and App.jsx.
**Deployed:** v2.0 development

---

## Error 25 — Stripe webhook not updating Supabase tier (setImmediate in serverless)
**Build:** v2.0 development
**Symptom:** Payment completed in Stripe test mode. Tier remained "free" in Supabase. Netlify function logs showed webhook received but no PATCH executed.
**Root cause:** `processEvent()` was called via `setImmediate()` after the 200 response was returned. In Netlify serverless, the execution context is frozen immediately after the response — queued callbacks never execute.
**Fix:** Replaced `setImmediate(() => processEvent(...))` with `await processEvent(stripeEvent)` before returning 200. Stripe's 30-second timeout gives sufficient headroom for the ~200ms Supabase PATCH.
**Deployed:** v2.0 development

---

## Error 26 — Stripe webhook signature verification always failing (replay window too short)
**Build:** v2.0 development
**Symptom:** Webhook events received but rejected with "Invalid signature" on all retries. First delivery sometimes succeeded, all subsequent retries failed.
**Root cause:** Replay window was set to 300 seconds (5 minutes). Stripe retries use the original event timestamp, not the retry timestamp. After 5 minutes, all retries exceeded the window and failed signature verification.
**Fix:** Extended replay window from 300s to 86400s (24 hours) to cover Stripe's full retry schedule. Added diagnostic logging for timestamp age, body length, and HMAC values.
**Deployed:** v2.0 development

---

## Error 27 — Stripe test mode vs Sandbox confusion (wrong environment keys)
**Build:** v2.0 development
**Symptom:** Vantage checkout initiated successfully but webhook received an unrecognized price ID. Supabase tier not updated. Stripe dashboard showed requests routing to wrong account.
**Root cause:** Stripe "Test Mode" and "Sandbox" are separate, isolated environments with separate API keys, price IDs, and webhook secrets. `STRIPE_SECRET_KEY` was pointing to one environment while price IDs were from the other.
**Fix:** Confirmed all 5 Stripe env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SIGNAL_PRICE_ID`, `STRIPE_VANTAGE_PRICE_ID`, and later lifetime IDs) sourced from the same Stripe Test Mode environment. Deleted and recreated broken Vantage price. Re-revealed and repasted webhook secret from active endpoint.
**Deployed:** v2.0 development

---

## Error 28 — Netlify deploy failure (accidental gitlinks / submodule entries)
**Build:** v2.0 development
**Symptom:** Netlify deploy failed with: `Error checking out submodules: fatal: No url found for submodule path 'ios/App/App.xcodeproj/.claude/worktrees/...'`
**Root cause:** `.claude/worktrees` directories inside `ios/App/App.xcodeproj/` were committed as gitlinks (mode 160000) — Git's submodule marker. Netlify attempted to resolve them as actual submodules and failed.
**Fix:** `git rm --cached` for both gitlink entries. Added `.claude/`, `**/.claude/`, and `ios/App/App.xcodeproj/.claude/` patterns to `.gitignore`.
**Deployed:** v2.0 development — commit "remove accidental gitlinks, update .gitignore"

---

## Error 29 — Tier auto-apply timed out (visibilitychange unreliable)
**Build:** v2.0 development
**Symptom:** After completing Stripe checkout in Safari and returning to the app, the "waiting for payment confirmation" spinner ran for 2 minutes then showed timeout error. Tier was correctly set in Supabase but app never detected it.
**Root cause:** `visibilitychange` event fired once on return from Safari but the webhook hadn't updated Supabase at that exact millisecond. No retry logic existed — if the first check missed, the spinner hung forever.
**Fix:** Replaced single `visibilitychange` check with a 3-second polling loop (up to 2-minute timeout). Each iteration calls `dbCall("load")` and checks if `tier !== "free"`. On success, applies tier in-place without sign-out.
**Deployed:** v2.0 development

---

## Error 30 — Stripe redirecting to website instead of app after checkout (iOS)
**Build:** v2.0 development
**Symptom:** After completing Stripe payment in Safari, user was taken to `tryvettedai.com` instead of back to the Vetted app.
**Root cause:** `success_url` in `create-checkout-session.js` was hardcoded to `https://tryvettedai.com?upgrade=success` for all platforms. iOS native apps require a custom URL scheme deep link for Safari to auto-return to the app.
**Fix:** Added `isNative` flag to checkout request body. On iOS native: `success_url = "vetted://upgrade-success"`, `cancel_url = "vetted://upgrade-cancelled"`. Registered `vetted://` URL scheme in `ios/App/App/Info.plist`. Added `appUrlOpen` listener in App.jsx to handle the deep link and trigger tier polling.
**Deployed:** v2.0 development

---

## Error 31 — Weight selector text not centered on iOS (native select control)
**Build:** v2.0 development
**Symptom:** Filter weight labels (Minor, Standard, Critical, etc.) left-aligned in the dropdown despite `text-align: center` CSS applied to the `.weight-select` class.
**Root cause:** On iOS WKWebView, `<select>` elements are rendered by the OS as native controls. CSS `text-align` and `text-align-last` have no effect on native-rendered select elements.
**Fix:** Replaced `<select className="weight-select">` with a custom `WeightPicker` React component — a centered label flanked by `‹` and `›` step buttons. Fully styled, no OS rendering involved.
**Deployed:** v2.0 development

---

## Error 32 — CocoaPods not installed (cap sync failure)
**Build:** v2.0 development
**Symptom:** `npx cap sync ios` failed with: `CocoaPods is not installed.`
**Root cause:** CocoaPods had not been installed on the development machine since the last OS or environment change.
**Fix:** `sudo gem install cocoapods` failed due to system Ruby 2.6. Fallback: `brew install cocoapods` succeeded. `brew link --overwrite cocoapods` required to resolve symlink conflict with existing `xcodeproj` binary.
**Deployed:** v2.0 development

---

## Error 33 — StoreKitPlugin compile error (jwsRepresentation on wrong type)
**Build:** v2.0.2 (build 15) development
**Symptom:** Xcode build failed with: `Value of type 'Transaction' has no member 'jwsRepresentation'` at two locations in `StoreKitPlugin.swift`.
**Root cause:** `jwsRepresentation` is a property of `VerificationResult<Transaction>` (the wrapper), not of `Transaction` itself. The initial implementation called it on the unwrapped `transaction` after pattern matching on `.verified(let transaction)`, by which point the `VerificationResult` wrapper was no longer accessible.
**Fix:** Captured `verification.jwsRepresentation` and `result.jwsRepresentation` before the `switch` pattern match in both `purchase()` and `restorePurchases()` respectively, then passed the captured value into the resolve call.
**Deployed:** v2.0.2 (build 15) development

---

## Error 34 — Sign In with Apple failing in production (audience mismatch)
**Build:** v2.0.1 (build 14) — App Store
**Symptom:** Login failed on every production sign-in attempt. `apple-auth` Netlify log would have shown `Invalid audience: com.vettedai.app`.
**Root cause:** `apple-auth.js` validAudiences array contained `"com.vetted.app"` — missing the `ai` in the bundle identifier. Apple sets `aud` = bundle ID in the identity token. Production bundle ID is `com.vettedai.app`, so every token was rejected.
**Fix:** Changed hardcoded fallback from `"com.vetted.app"` to `"com.vettedai.app"` in validAudiences.
**Deployed:** v2.0.2 (build 15) — commit "Fix Sign In with Apple audience mismatch"

---

## Error 35 — Profile blank on every cold launch (sessionStorage cleared by iOS)
**Build:** v2.0.1 (build 14)
**Symptom:** User signed in successfully, set up profile, closed app fully, reopened — profile gone, back to onboarding.
**Root cause:** `sessionToken` was stored only in `sessionStorage`. iOS WKWebView clears `sessionStorage` on cold launch (full kill + reopen). On restore, `restoredToken = ""` → Supabase call sent no token → server returned 403 → profile never loaded → `setStep("onboard")`.
**Fix:** Also persist `sessionToken` to `localStorage` at sign-in (`localStorage.setItem("vetted_session_token", ...)`). On restore, fall back: `sessionStorage.getItem(...) || localStorage.getItem(...) || ""`. Clear both on sign-out.
**Deployed:** v2.0.2 (build 15) — commit "Fix session restore 403..."

---

## Error 36 — loadUserData 403 immediately after fresh sign-in (stale React state race)
**Build:** v2.0.1 (build 14)
**Symptom:** After signing in, `[load_user_data] DB error 403` error logged immediately. Profile never loaded even on fresh sign-in.
**Root cause:** React state updates are asynchronous. `setAuthUser(user)` queued the update but `await loadUserData(user.id)` ran immediately after — before React had settled the new state. `dbCall` read `authUser?.sessionToken` from state and got `null`. Empty token → 403.
**Fix:** `loadUserData` now accepts an explicit `sessionToken` parameter. `dbCall` accepts a `tokenOverride` 4th argument. At the call site: `loadUserData(user.id, user.sessionToken)` passes the fresh token directly, bypassing stale state. `dbCall` also now injects `sessionToken` into the request body on every call.
**Deployed:** v2.0.2 (build 15) — commit "Fix session restore 403..."

---

## Error 37 — restoreSession using wrong DB column name (p.name vs p.display_name)
**Build:** v2.0.1 (build 14)
**Symptom:** After cold launch restore (when auth succeeded), profile name was blank even though it was saved in Supabase.
**Root cause:** `restoreSession` mapped `p.name` to the profile name field. The actual Supabase column is `display_name`. `p.name` is always undefined — name was always blank on restore. The fresh sign-in path (`loadUserData`) correctly used `savedProfile.display_name`.
**Fix:** Changed `restoreSession` mapping from `p.name` to `p.display_name`. Also corrected `p.comp_min/comp_max` → `p.compensation_min/compensation_target` and `p.location` → `p.location_prefs?.[0]` to match the actual column names.
**Deployed:** v2.0.2 (build 15) — commit "Fix session restore 403..."

---

## Error 38 — Filter breakdown carousel and section panels absent from v2.0.1
**Build:** v2.0.1 (build 14) — App Store
**Symptom:** VQ result page showed original continuous scroll layout — no swipeable filter carousel, no tabbed section panels (Honest Assessment, Strengths, Gaps, etc.).
**Root cause:** Both carousel components were developed and committed after the v2.0.1 Xcode archive was built. `npx cap sync` was not re-run before archiving, so the iOS bundle still contained the pre-carousel JS.
**Fix:** Rebuilt with `npm run build && npx cap sync` after all carousel commits were merged. v2.0.2 archive includes both `FilterCarousel` and `SectionCarousel`.
**Deployed:** v2.0.2 (build 15)

---

## Error 39 — Sign In with Apple sheet never appears on fresh App Store install
**Build:** v2.0.2 (build 15) — App Store
**Symptom:** After deleting and reinstalling from App Store, tapping "Sign in with Apple" showed no auth sheet and no error. No activity in `apple-auth` Netlify log. Wife's existing install continued to work.
**Root cause:** Race condition in `AppDelegate.swift`. Plugin registration ran in `applicationDidBecomeActive` — but `vc.bridge` was `nil` on cold launch (bridge not yet initialized). Optional chaining silently skipped `registerPluginInstance(...)`. Critically, `pluginRegistered = true` was set regardless, permanently blocking all retry attempts on future activations.
**Fix:** Wrapped registration in `if let bridge = vc.bridge` — `pluginRegistered` now only sets to `true` when the bridge is confirmed non-nil, allowing retry on next `applicationDidBecomeActive`. Also added JS guard: checks `window.Capacitor.Plugins.SignInWithApplePlugin` exists before calling `.authorize()`, logs to Sentry if missing.
**Deployed:** v2.0.3 (build 16)

---

## Error 40 — IAP products returning "Product not found" (not configured in App Store Connect)
**Build:** v2.0.2 (build 15) — App Store
**Symptom:** Tapping any subscription or lifetime purchase button showed "Product not found" error for all four product IDs.
**Root cause:** Monthly subscription products (`com.vettedai.app.signal.monthly`, `com.vettedai.app.vantage.monthly`) had never been created in App Store Connect. Lifetime products (`com.vettedai.app.signal.lifetime`, `com.vettedai.app.vantage.lifetime`) existed but were in "Missing Metadata" state — StoreKit will not serve products in this state.
**Fix:** Created subscription group "Vetted Plans" in App Store Connect with both monthly products. Completed metadata (display name, description, price, review screenshot) on all four products. Corrected subscription group order: Vantage (Level 1) → Signal (Level 2) per Apple's highest-to-lowest tier requirement.
**Deployed:** v2.0.3 (build 16) — all four IAP products submitted for review alongside build

---

## Error 41 — Market Pulse salary data silently swallowed by Claude timeout
**Build:** v2.1 development
**Symptom:** Market Pulse showed "Market data unavailable" even when server returned valid salary JSON. Salary fetch was succeeding; the error appeared to be in the function itself.
**Root cause:** A single `try/catch` block wrapped both the salary fetch and the Claude (Anthropic) fetch. Claude has a 25-second timeout enforced via `AbortController`. When Claude timed out, the `catch` block fired, set the error state, and returned — discarding the salary data that had already been fetched successfully.
**Fix:** Split into two independent `try/catch` blocks. Salary fetch is fatal: on failure, show error and return. Claude fetch is non-fatal: on failure, log warning and continue. `setData(salaryJson)` is called immediately after a successful salary fetch, before the Claude call begins. Salary data is visible to the user whether or not Claude returns insights.
**Deployed:** v2.1 development

---

## Error 42 — "Director of Procurement" returning CEO salary ($290K) — substring collision
**Build:** v2.1 development
**Symptom:** Pasting a Director of Procurement role into Market Pulse returned CEO / President salary ($250K–$600K) from Robert Half instead of procurement director data from Kinsa.
**Root cause:** The keyword matching function used `.includes()` to test whether a keyword appeared in the job title. `"cto"` is a literal substring of `"director"` (dir**ecto**r contains the letters c-t-o sequentially — actually `dire**c**tor` contains the substring? No: "dirECTOr" → positions 4-6 are "ect" not "cto". Actually "dire**cto**r" — d-i-r-e-c-t-o-r. "cto" appears at positions 4-6 (c=4, t=5, o=6). So `"director".includes("cto")` returns `true`. This caused every "Director of X" role to match the CTO keyword row and return CTO salary.
**Fix:** Replaced `.includes()` with word-boundary regex `\b${escaped}\b` in `matchTable()`. `\bcto\b` requires "cto" to appear as a complete word (surrounded by word boundaries), so it cannot match inside "director".
**Deployed:** v2.1 development

---

## Error 43 — All director-level salary lookups broken after tier priority fix
**Build:** v2.1 development
**Symptom:** After the initial tier ordering fix (Robert Half → Kinsa → O*NET), all director-level roles returned "No salary data found." Roles that previously worked (Director of Finance, Director of Marketing) also failed.
**Root cause:** Same word-boundary bug as Error 42, present throughout the entire `matchTable()` function before it was written. The `.includes()` approach caused collisions in multiple directions once the table order changed. The fix for Error 42 used `\b` regex globally, which also fixed all director-role matching.
**Fix:** Implemented `matchTable()` with word-boundary regex and longest-match logic (longest matching keyword wins). Applied to both `matchRobertHalf()` and `matchKinsa()`.
**Deployed:** v2.1 development

---

## Error 44 — Apple Review rejection (build 17) — Sign in with Apple non-functional on iPad
**Build:** v2.0.3 (build 17) — Apple Review rejection, Guideline 2.1(a)
**Symptom:** Apple reviewer reported Sign in with Apple failed on iPad. Auth sheet never appeared. No error message shown.
**Root cause:** `presentationAnchor(for:)` in `SignInWithApple.swift` fell through to the `UIWindow()` fallback — a detached window with no frame, no scene, and no connection to the display hierarchy. On iPad, `ASAuthorizationController` requires a valid, visible window anchor. An unattached `UIWindow()` causes the auth sheet to be silently discarded.
**Fix:** Rewrote `presentationAnchor` with a three-level fallback: (1) `self.bridge?.viewController?.view?.window` — the Capacitor bridge window, most reliable on both iPhone and iPad; (2) scene-based `keyWindow` / `windows.first` iteration for multi-window iPadOS; (3) `UIApplication.shared.windows.first` as legacy final fallback. The detached `UIWindow()` is never returned.
**Deployed:** v2.1 (build 18) development

---

## Error 45 — Black screen after plugin registration moved to MainViewController (wrong lifecycle hook)
**Build:** v2.1 (build 18) development
**Symptom:** App launched to a completely black screen after `MainViewController` was introduced and the storyboard was updated to use it.
**Root cause (part 1):** `AppDelegate` had been stripped of plugin registration on the assumption that `CAPBridgedPlugin` conformance auto-registers local plugins. It does not. Local plugins must be registered manually.
**Root cause (part 2):** `MainViewController.viewDidLoad()` was overriding the UIKit lifecycle method and calling `super.viewDidLoad()` first. In Capacitor 8, `CAPBridgeViewController.viewDidLoad()` calls `loadWebView()`, which begins loading `index.html`. Plugin registration via `registerPluginInstance()` was called after `loadWebView()` — too late in the Capacitor 8 lifecycle. Plugins are expected to be registered before web content loads; calling `registerPluginInstance()` (which calls `JSExport.exportJS()`) after `loadWebView()` has fired produces undefined behavior, manifesting as a black screen.
**Fix:** Changed `MainViewController` to override `capacitorDidLoad()` instead of `viewDidLoad()`. In Capacitor 8, `capacitorDidLoad()` is called from `loadView()` — before `viewDidLoad()` and therefore before `loadWebView()`. The bridge and web view are both live at this point; web content has not started loading. This is the documented and correct hook for local plugin registration.
**Deployed:** v2.1 (build 18) development

---

## Error 46 — "Unknown class MainViewController in Interface Builder file"
**Build:** v2.1 (build 18) development
**Symptom:** App crashed at launch with runtime error: "Unknown class MainViewController in Interface Builder file." Storyboard could not instantiate the view controller.
**Root cause:** When a Capacitor iOS project uses `use_frameworks!` in the Podfile, Swift classes may be registered in the Objective-C runtime with module-qualified names (e.g., `App.MainViewController`) rather than the bare class name (`MainViewController`). The storyboard uses `NSClassFromString("MainViewController")` to find the class at runtime — if the ObjC runtime name includes the module prefix, the lookup fails.
**Fix:** Added `@objc(MainViewController)` to the class declaration. This explicitly pins the Objective-C runtime name to `"MainViewController"` regardless of module context. This is the same pattern used by every other plugin in the project (`@objc(SignInWithApplePlugin)`, `@objc(StoreKitPlugin)`, `@objc(PrintPlugin)`).
**Deployed:** v2.1 (build 18) development

---

## Error 47 — Multiple food industry roles returning "No salary data found"
**Build:** v2.1 development
**Symptom:** Five distinct role types in Market Pulse returned "No salary data found" — logging confirmed the server received the titles and searched both tables with no match.

**Five failures and their individual root causes:**

1. **"Director of Dairy Procurement"** — The keyword `"director of procurement"` requires the words to appear contiguously. The word "dairy" between "director of" and "procurement" breaks the phrase. Word-boundary regex cannot match a non-contiguous sequence. **Fix:** Added `"dairy procurement"` and `"director of dairy procurement"` as explicit keywords to the procurement row.

2. **"Senior Vice President, Foodservice Business Unit"** — The CEO row contained `"president"` as a keyword. `\bpresident\b` matches inside "vice president" and "senior vice president" because "president" is a complete word at the end of both phrases. The keyword length for `"president"` (9) was shorter than needed to be overridden. **Fix:** Removed `"president"` from CEO keywords entirely. Added a new SVP row (`"senior vice president"`, `"executive vice president"`, `"evp"`, `"svp"`) that now correctly matches these titles. SVP row added to Robert Half table before the CEO row.

3. **"Director of Catering Strategy"** — Neither the Robert Half table nor the Kinsa table contained any keyword for catering or foodservice director roles. **Fix:** Added a new Kinsa row with keywords including `"director of catering"`, `"catering director"`, `"catering strategy"`, `"foodservice director"`, `"food service director"`.

4. **"Senior Manager, Culinary Innovation & Commercialization"** — No keywords existed for culinary innovation or food product commercialization manager roles. **Fix:** Added a new Kinsa row with keywords including `"culinary innovation"`, `"culinary manager"`, `"commercialization manager"`, `"culinary development manager"`.

5. **"Regional Senior Director, Operations"** — The existing keyword `"director of operations"` (22 characters) requires "director" and "operations" to be adjacent. The comma in "Regional Senior Director, Operations" separates them. `\bdirector of operations\b` does not match. **Fix:** Added a new Kinsa row for Senior Director of Operations with keywords including `"senior director of operations"` and `"regional senior director"` — both of which match the title via word boundaries despite the comma.

**Deployed:** v2.1 development

---

## Error 48 — VQ loading screen had no meaningful loading visuals
**Build:** v2.1 development
**Symptom:** VQ loading screen displayed only a spinning circle and static text "Analyzing role against your framework…" on a blank background. No engagement, no context, no coaching during the wait.
**Root cause:** The loading screen was a minimal inline render — `<div className="spinner" /> <p>{t.loadingMsg}</p>` — with no dynamic content.
**Fix:** Replaced the inline render with a `VQLoadingScreen` component containing 60 coaching pairs (question + statement) drawn from across the emotional arc of a job search — encouraging, affirming, inquisitive, discerning, and reassuring. A random pair is selected on each mount; no pair repeats consecutively (tracked via module-level `_lastCoachingIdx`). The anchor pair ("What if this score — whatever it says — is exactly the information you needed today?" / "It is. That's why you're here.") is given 2× selection weight by appearing twice in the pool. Coaching content fades in with a 500ms delay so the spinner establishes context first. Question rendered in Playfair Display 17px/700. Statement in IBM Plex Mono 11px/400 muted. No new colors or fonts introduced.
**Deployed:** v2.1 development

---

## Error 49 — Build 19 failed Apple processing (ITSAppUsesNonExemptEncryption missing)
**Build:** v2.001.1 (build 19)
**Symptom:** Build 19 uploaded successfully from Xcode but showed "Failed" status in App Store Connect TestFlight. Never appeared as a processable build. Builds 17 and 18 processed correctly.
**Root cause:** `ITSAppUsesNonExemptEncryption` key was absent from `Info.plist`. Apple's processing servers require this key to determine export compliance. Without it, the build is rejected server-side during automated processing — after Xcode reports upload success but before App Store Connect shows the build. Builds 17 and 18 succeeded because the Xcode upload wizard prompted manual export compliance answers during those sessions; builds 19 and 20 used a flow where the prompt was bypassed.
**Fix:** Added `<key>ITSAppUsesNonExemptEncryption</key><false/>` to `Info.plist`. Declares that Vetted uses only standard HTTPS/TLS, which is exempt from US export regulations. Apple's servers now read this key and skip the manual compliance review.
**Deployed:** v2.001.1 (build 21) — fix included in build 21, currently In Review

---

## Error 50 — Build 20 upload rejected (TARGETED_DEVICE_FAMILY downgrade)
**Build:** v2.001.1 (build 20)
**Symptom:** Xcode upload completed but validation failed immediately with: "This bundle does not support one or more of the devices supported by the previous app version. Your app update must continue to support all devices previously supported."
**Root cause:** In response to repeated iPad Sign in with Apple rejections, `TARGETED_DEVICE_FAMILY` was changed from `"1,2"` (iPhone + iPad) to `"1"` (iPhone only) in `project.pbxproj`. Apple's App Store policy prohibits removing device support in an update. Once a version ships supporting iPad, all future versions must continue to support it.
**Fix:** Reverted `TARGETED_DEVICE_FAMILY` back to `"1,2"`. The iPad Sign in with Apple failure must be resolved in code, not by dropping device support.
**Deployed:** Reverted immediately. Build 21 used corrected setting.

---

## Error 51 — Build 21 initial validation failed (UISupportedInterfaceOrientations~ipad removed)
**Build:** v2.001.1 (build 21)
**Symptom:** Xcode upload validation failed with: "The 'UIInterfaceOrientationPortrait' orientations were provided for UISupportedInterfaceOrientations but you need to include all four orientations to support iPad multitasking."
**Root cause:** The `UISupportedInterfaceOrientations~ipad` key was removed from `Info.plist` in an earlier cleanup step (it was mistakenly treated as leftover iPad-specific metadata after the iPad removal attempt). This key is required for all apps supporting iPad — it declares that the app supports all four orientations, enabling iPadOS multitasking (Split View, Slide Over). Without it, Apple rejects the bundle at upload validation.
**Fix:** Restored `UISupportedInterfaceOrientations~ipad` with all four orientation values: Portrait, PortraitUpsideDown, LandscapeLeft, LandscapeRight.
**Deployed:** v2.001.1 (build 21) — fix applied and resubmitted as build 21; build is currently In Review

---

## Error 52 — iPad Sign in with Apple still failing after presentationAnchor rewrite (builds 17–18)
**Build:** v2.001.1 (build 22) — root cause analysis and fix
**Symptom:** Build 18 was rejected under Guideline 2.1(a) for the same iPad Sign in with Apple failure as build 17, despite the presentationAnchor rewrite in build 18.
**Root cause (newly identified — two compounding issues):**
1. **`ASAuthorizationController` premature deallocation.** The controller was created as a local variable inside `DispatchQueue.main.async { }`. Once `performRequests()` was called and the async block exited, ARC could release the controller before the iPad sheet completed its longer presentation path. On iPhone the presentation is faster and deallocation rarely races; on iPad the lifecycle is longer and the race is reproducible.
2. **`presentationAnchor` window priority incorrect for iPad multi-window.** The bridge window (`self.bridge?.viewController?.view?.window`) was checked first. On iPad in Split View or Stage Manager configurations, this can resolve to a window that is not the key active window, causing the auth sheet to be silently discarded despite a non-nil return.
**Fix:** (1) Stored `ASAuthorizationController` as a `private var authController` instance variable, retaining it for the full duration of the auth flow. `defer { authController = nil }` cleans up in both success and error handlers. (2) Reordered `presentationAnchor` to check the foreground-active scene's key window first — `UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive })` — before falling back to the bridge window. Scene-based foreground active window is the most reliable reference across all iPad configurations.
**Additionally:** Removed the `@capacitor-community/apple-sign-in` community plugin from `packageClassList` in `capacitor.config.json`. The community plugin had no `presentationContextProvider` implementation (auth sheet silently discarded on iPad in all configurations) and force-unwrapped `identityToken!` (crash risk if nil). It was never called from JS — our local `SignInWithApplePlugin` handled all auth — but its presence as an auto-registered plugin was an active latent risk.
**Deployed:** v2.001.1 (build 21) — fix included in build 21, currently In Review

---

## Error 53 — Guideline 3.1.2(c) rejection — subscription disclosure incomplete
**Build:** v2.001.1 (build 21) — identified during review
**Symptom:** Apple rejected the submission under Guideline 3.1.2(c): "The submission did not include all the required information for apps offering auto-renewable subscriptions." Specifically: missing functional links to Terms of Use (EULA) and Privacy Policy within the app's purchase flow, and missing EULA link in App Store metadata.
**Root cause:** The `PaywallModal` component displayed pricing, tier names, and feature lists but contained no links to Privacy Policy or Terms of Use. The Apple-required auto-renewal disclosure language ("Payment will be charged to your Apple ID at confirmation of purchase. Subscriptions automatically renew unless cancelled...") was also absent. App Store Connect did not have the Privacy Policy URL field populated.
**Fix applied in-app:** Added Privacy Policy link (`ENDPOINTS.privacy`) and Terms of Use link (Apple Standard EULA: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`) to the PaywallModal footer. Added standard Apple auto-renewal disclosure paragraph above the links. Added `terms` key to `ENDPOINTS` in `config.js`. All links are functional — open in system browser via `target="_blank"`.
**Fix applied in metadata:** Privacy Policy URL populated in App Store Connect → App Information. EULA field set to Apple Standard EULA.
**Resolution:** Apple offered bug-fix approval for the current build (21) without resubmission. Replied requesting approval. Full in-app disclosure staged in build 22.
**Deployed:** v2.001.1 (build 22) for in-app fix — staged, not yet submitted. Metadata fix (Privacy Policy URL, EULA link) applied immediately in App Store Connect without a new build.

---

## Error 54 — Salary table inconsistencies (duplicates and narrow ranges)
**Build:** v2.001.1 — identified during audit
**Symptom:** Three categories of incorrect salary data visible to users in Market Pulse:
1. Unrealistically narrow salary ranges on three roles: Plant Superintendent ($105K–$115K, a $10K spread), Project Engineer ($140K–$150K max), Plant Engineer ($135K–$150K max).
2. Duplicate `chief supply chain officer` entry in KINSA_TABLE — appeared at both the Supply Chain section (line 173) and the C-Suite section (line 257) with identical data. First match always won but the redundancy created maintenance risk.
3. Duplicate keyword `"director of logistics"` in two KINSA rows — appeared in both the Logistics Director row and the Logistics Manager row. Both rows matched the same keyword at equal length; first-in-array won, masking the bug.
**Fix:** Corrected Plant Superintendent to min: $85K / median: $110K / max: $155K. Corrected Project Engineer to min: $85K / median: $130K / max: $185K. Corrected Plant Engineer to min: $90K / median: $130K / max: $175K. Removed duplicate CSCO entry from the C-Suite section. Removed `"director of logistics"` from the Logistics Manager keywords (retained in Logistics Director row where it correctly belongs).
**Deployed:** v2.001.1 (build 22) — staged, not yet submitted

---

## Error 55 — MarketPulse salary lookup failing for geographic-qualified titles
**Build:** v2.001.1 (build 22) — live production
**Symptom:** "VP, Supply Chain North America" returned `{"error":"No salary data found"}` in Market Pulse logs. Salary data correctly existed in Kinsa table for "vp supply chain" but never matched.
**Root cause:** O*NET receives the raw title including "North America". O*NET's keyword search treats "North America" as a required job function term, returning zero occupation matches. The Kinsa table match also failed because the full normalized title "vp supply chain north america" did not contain the keyword phrase "vp supply chain" as a word-boundary match when geographic words were included.
**Fix:** Added geographic qualifier stripping before the O*NET call — regex removes North America, South America, EMEA, APAC, Global, Regional, National, and directional qualifiers (North, South, East, West, Midwest, etc.) before the title is sent to O*NET. Stripped title "VP Supply Chain" then correctly matches Kinsa keyword `"vp supply chain"`.
**Deployed:** v2.001.1 (build 22) — `netlify/functions/salary-lookup.js`

---

## Error 56 — MarketPulse compound/unusual director titles returning no salary data
**Build:** v2.001.1 (build 22) — live production
**Symptom:** "Director, Business Model Enablement" and "Director, Distribution and Field Service" both returned `{"error":"No salary data found"}`.
**Root cause (title 1):** "Business Model Enablement" has no keyword match in either table. O*NET keyword search for this highly specific title returns zero occupations.
**Root cause (title 2):** Kinsa table had `"distribution director"` as a keyword but the normalized title is `"director distribution and field service"` — phrase `\bdistribution director\b` requires those two words adjacent in that order, which doesn't match.
**Fix (three-part):**
1. Added `"director distribution"`, `"director of distribution"`, `"director field service"` as keywords to the Kinsa Logistics/Transportation Director row.
2. Added `"enablement director"`, `"business model director"`, `"director business model"`, `"director of transformation"` as keywords to the RH Director of Strategy row.
3. Added O*NET condensed-title retry: on null result, extract seniority + 2 core content words and retry (e.g., "Director Business Model" → cleaner O*NET query).
4. Added seniority-based salary fallback: if O*NET still returns null, return a benchmark range based on detected seniority level (C-Suite / VP / Director / Manager) labeled "Vetted Benchmark" — no more error states for valid seniority titles.
**Deployed:** v2.001.1 (build 22) — `netlify/functions/salary-lookup.js`

---

## Error 57 — Wife's device showing free tier despite account being Vantage
**Build:** v2.001.1 (build 22) — live production
**Symptom:** Market Pulse and Career Coaching not visible on secondary test device. App correctly showed paid features on primary device.
**Root cause:** The secondary device's Supabase `profiles` row had `tier = null` (never been updated). The app reads `p.tier` on sign-in and defaults to `"free"` if null. No code path automatically upgrades a profile row — tier must be set in Supabase explicitly.
**Fix:** Updated Supabase `profiles` row directly via SQL: `UPDATE profiles SET tier = 'vantage_lifetime' WHERE apple_id = '...'`. App detects tier on next cold launch without any code change.
**Deployed:** Supabase direct SQL — no code change required.

---

## Error 58 — App Store Connect upload timeout on build 22
**Build:** v2.001.1 (build 22)
**Symptom:** Xcode upload failed with "The request timed out. REQUEST CREATE CONTAINER (ASSET_UPLOAD) did not receive a response. Received status -19235."
**Root cause:** Apple's asset upload CDN server timed out — a transient server-side failure unrelated to the build or code.
**Fix:** Retry from the existing archive in Organizer. Build does not need to be recompiled. Resolved on second attempt.
**Deployed:** v2.001.1 (build 22) — submitted successfully on retry.

---

## Error 59 — Scorecard incorrectly flagged JWS and RLS as unresolved security gaps
**Build:** v2.001.1 (build 22) — scorecard audit
**Symptom:** Product scorecard scored Security at 4/10 with "JWS cert chain still partially verified" and "RLS still disabled" as the two blockers.
**Root cause (JWS):** `apple-auth.js` was not inspected before the scorecard was written. Code review confirmed full verification: RS256 algorithm check, key match by `kid`, `crypto.verify` with RSA-PKCS1 padding, issuer, expiry, and audience validation. The claim was incorrect.
**Root cause (RLS):** `rls-policies.sql` existed in the repo but it was not confirmed whether the SQL had been applied to the database. SQL query against `pg_tables` confirmed `rowsecurity = true` on all four tables — RLS is live in production.
**Fix:** Corrected scorecard Security score from 4 → 7. No code changes required. Both items were implemented in a prior sprint and simply had not been verified in this session.
**Deployed:** N/A — scorecard correction only.

---

## Open Items (updated April 11, 2026)

| Issue | Priority | Target Build |
|---|---|---|
| App Store Server Notifications — register endpoint URL in App Store Connect + sandbox test | High | v2.2 |
| Staging environment — create Supabase staging project + Netlify staging branch | Medium | v2.2 |
| App.jsx decomposition — RegionGate, OnboardStep, Dashboard, useAuth hook remaining | Medium | v2.2 |
| ADA — focus trap in modals, aria-live on filter carousel | Medium | v2.2 |
| Automated testing — Playwright E2E for 3 core flows | Medium | v2.2 |
| macOS Catalyst — make app available on MacBook | Low | v2.3 |
| Live mode Stripe env vars — swap when ready for real payments | Blocked on Apple approval | — |
| ~~Supabase RLS~~ | ~~Medium~~ | ~~v2.2~~ | ✅ Verified live Apr 11 |
| ~~Streaming AI responses~~ | ~~High~~ | ~~v2.2~~ | ✅ Complete — build 22 |
| ~~JWS certificate chain verification~~ | ~~Medium~~ | ~~v2.2~~ | ✅ Verified complete Apr 11 |
| ~~Subscription disclosure (Terms + Privacy links in paywall)~~ | ~~High~~ | ~~Build 22~~ | ✅ Complete |

---

## Build History Summary (updated April 9, 2026)

| Version | Build | Status | Key Changes |
|---|---|---|---|
| v1.0 | 1 | Superseded | Initial launch, scoring engine, Netlify backend |
| v1.0.1 | 2 | Superseded | iOS absolute URL fix |
| v1.1 | — | Superseded | Filter labels, VQ score display |
| v1.2 | 3 | Superseded | Sign in with Apple, Supabase, security hardening |
| v1.3 | 4 | Superseded | iOS 26 presentationAnchor fix |
| v1.4 | 5 | Cancelled | Superseded before review |
| v1.4 | 6 | Cancelled | 500 token truncation bug |
| v1.5 | 7 | Superseded | max_tokens 2000 restored — broken by secret mismatch |
| v1.6.0 | 8 | Superseded | Secret rotation fix, Supabase key fix, free tier gating, Sentry, config.js |
| v2.0 | 9–12 | Superseded | Paywall, Stripe integration, lifetime tiers, session bridge |
| v2.0 | 13 | Superseded | Incremented before submission |
| v2.0.1 | 14 | Accepted — login broken | Carousels missing (not synced), Sign In with Apple failing (bundle ID typo) |
| v2.0.2 | 15 | Approved — IAP not configured | Login fix, both carousels, session restore, Restore Purchases button |
| v2.0.3 | 16 | Submitted | AppDelegate plugin race fix, Market Pulse role toolbar, all 4 IAP products submitted |
| v2.0.3 | 17 | Rejected (2.1a) | iPad Sign in with Apple broken — presentationAnchor returned detached UIWindow() |
| v2.1 | 18 | Rejected (2.1a) | Same iPad Sign in with Apple failure — authController deallocation + wrong window priority |
| v2.001.1 | 19 | Failed processing | ITSAppUsesNonExemptEncryption missing from Info.plist |
| v2.001.1 | 20 | Rejected at upload | TARGETED_DEVICE_FAMILY changed to "1" — cannot remove iPad support |
| v2.001.1 | 21 | In review | All fixes applied (authController retain, foreground scene anchor, export compliance, iPad orientations) — resubmitted after orientation validation fix; awaiting Apple Review |
| v2.001.1 | 22 | Submitted Apr 11 | Typography system (IBM Plex Mono + Inter), sign-in polish, iOS safe area fix, salary lookup geo-qualifier fix, compound-title retry, seniority fallback, application status tracker, PaywallModal disclosure |
