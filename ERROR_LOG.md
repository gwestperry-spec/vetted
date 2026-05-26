# Vetted: Career Intelligence — Error Report & Fix Log
**Compiled:** April 6, 2026 — last updated April 28, 2026
**Versions covered:** v1.0 through v2.1.5 (build 25)
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

## Error 60 — PostHog events silent in production (VITE_POSTHOG_KEY not in Netlify env vars)
**Build:** v2.001.1 (build 22) — post-submission
**Symptom:** PostHog dashboard showed no live events from the web app. No error in console. `initAnalytics()` returned silently.
**Root cause:** `VITE_POSTHOG_KEY` was present in local `.env` but had never been added to Netlify environment variables. Vite bakes `VITE_*` vars at build time — a missing key produces an empty string in the bundle. The `if (!KEY) return` guard in `analytics.js` exited silently with no user-visible or console-visible indicator.
**Fix:** Changed `if (!KEY)` block to always emit `console.warn(...)` with exact Netlify fix instructions regardless of DEV/PROD. Added `VITE_POSTHOG_KEY` to Netlify env vars. Redeployed. Added `console.info` in PostHog `loaded` callback confirming host and key prefix on successful init.
**Deployed:** Post-build 22 — `src/utils/analytics.js`

---

## Error 61 — PostHog events silent on iOS (relative path resolves to capacitor://localhost/ph)
**Build:** v2.001.1 (build 22) — post-submission
**Symptom:** PostHog showed no events from iOS app. Web events were flowing correctly after Error 60 fix.
**Root cause:** `VITE_POSTHOG_HOST` in `analytics.js` was set to the relative path `/ph`. On the web, `/ph` correctly resolves to the Netlify proxy (`https://celebrated-gelato-56d525.netlify.app/ph`). Inside the Capacitor iOS WebView, the app is served from `capacitor://localhost` — so `/ph` resolves to `capacitor://localhost/ph`, which has no route handler. All PostHog requests failed silently.
**Fix:** Added `VITE_POSTHOG_HOST=https://celebrated-gelato-56d525.netlify.app/ph` to local `.env`. Rebuilt with `npm run build && npx cap sync ios`. iOS PostHog events confirmed flowing after rebuild.
**Deployed:** Local `.env` change + iOS rebuild — `src/utils/analytics.js`

---

## Error 62 — GitHub OAuth APP_BASE hardcoded to staging URL
**Build:** v2.001.1 — post-build 22
**Symptom:** GitHub OAuth sign-in flow redirected users back to the wrong domain after authentication.
**Root cause:** `APP_BASE` in `netlify/functions/github-auth.js` was hardcoded to `"https://celebrated-gelato-56d525.netlify.app"`. This would have broken if the primary domain ever changed, and more importantly exposed the internal Netlify URL instead of the canonical app domain in redirects.
**Fix:** Changed to dynamic resolution: `const APP_BASE = process.env.APP_BASE || process.env.URL || "https://tryvettedai.com"`. Netlify automatically sets `process.env.URL` to the primary site URL on every deploy. `APP_BASE` env var can override if needed.
**Deployed:** `netlify/functions/github-auth.js`

---

## Error 63 — GitHub OAuth error redirects used query params (hash fragment required)
**Build:** v2.001.1 — post-build 22
**Symptom:** GitHub sign-in error states silently navigated the app to `/?auth_error=...`, which the React router did not handle. Error states were invisible to users.
**Root cause:** All three error paths in `github-auth.js` redirected to `${APP_BASE}?auth_error=...` query params. The SPA loads at `index.html` which does not inspect query params for auth errors. The correct pattern (used by the Apple auth flow) is hash fragments — `#gh_auth_error?reason=...` — which are read client-side after the page loads.
**Fix:** Changed all three error redirects to `${APP_BASE}/#gh_auth_error?reason=...`. Added `#gh_auth_error` handler in `useAuth.js` — reads `reason` param and sets `authError` state before cleaning up the URL fragment.
**Deployed:** `netlify/functions/github-auth.js`, `src/hooks/useAuth.js`

---

## Error 64 — Playwright tests all fail with ERR_CONNECTION_REFUSED
**Build:** Development — P9 automated testing setup
**Symptom:** All 6 Playwright tests failed immediately with `net::ERR_CONNECTION_REFUSED` on `http://localhost:5173`.
**Root cause:** The Vite dev server was not running. Playwright runs against a live server — it does not start one automatically. The dev server must be started separately (`npm run dev`) before `npm test` is invoked.
**Fix:** Run `npm run dev` in one terminal, then `npm test` in a second. Documented in README/workflow. (A future improvement would configure `webServer` in `playwright.config.js` to start automatically.)
**Deployed:** N/A — workflow issue, not a code bug.

---

## Error 65 — Playwright clicks silently intercepted by Dashboard guide modal
**Build:** Development — P9 automated testing
**Symptom:** The "Score a role" E2E test clicked the Score button successfully (no error thrown) but the VQ result never appeared. Debug revealed the click was being absorbed by the Dashboard guide modal overlay, which intercepted pointer events for the entire viewport.
**Root cause:** The `DashboardGuide` modal in `Dashboard.jsx` renders when `!localStorage.getItem("vetted_guide_seen")`. The auth setup file (`tests/auth.setup.js`) seeded `vetted_walkthrough_seen` but not `vetted_guide_seen`. These are two separate localStorage keys for two separate modals. The guide modal opened over the interface on every test run, silently swallowing all clicks.
**Fix:** Added `{ name: "vetted_guide_seen", value: "1" }` to the localStorage entries written in `tests/auth.setup.js`. Identified the correct key by reading `Dashboard.jsx` line 148: `!localStorage.getItem("vetted_guide_seen")`.
**Deployed:** `tests/auth.setup.js`

---

## Error 66 — Playwright route pattern collision (anthropic** captured anthropic-stream)
**Build:** Development — P9 automated testing
**Symptom:** The "Score a role" test returned a 500 error on every scoring attempt. The stream endpoint mock (500) was being applied to the buffered endpoint too.
**Root cause:** Playwright route patterns are evaluated in LIFO order (most recently registered wins). The stream route used pattern `**/.netlify/functions/anthropic**` — the trailing `**` matched `anthropic-stream` as well as `anthropic`. When the buffered endpoint mock was registered second (after the stream mock), it had higher priority and should have won — but the stream mock's pattern also matched the buffered URL. The resulting behavior was both endpoints returning 500.
**Fix:** Replaced glob patterns with function-based URL matchers:
- Stream: `(url) => url.pathname.endsWith("/anthropic-stream") || url.pathname.includes("/anthropic-stream.")`
- Buffered: `(url) => url.pathname.endsWith("/anthropic")`
These are exact suffix checks — no ambiguity between the two endpoints.
**Deployed:** `tests/score-role.spec.js`

---

## Error 67 — VQ loading bar stalled at 88% on buffered (iOS) scoring path
**Build:** Post-build 22 — live production
**Symptom:** The VQ loading bar progressed to 88% and froze there. Score results loaded successfully, but the bar never reached 100%. Users saw a stuck progress bar while the results were already visible.
**Root cause:** The time-based animation in `VQLoadingScreen.jsx` used `Math.min(88, Math.round(eased * 100))` — a hard cap of 88%. On the streaming path, `realPct` (derived from filter count) overrides `timePct` and reaches 100% as filters arrive. On the buffered path (iOS fallback), `realPct = 0` always — no filters stream in — so `displayPct = Math.max(0, timePct)` stalled at exactly 88%.
**First fix attempt (wrong):** Added `PHASE_PCTS = [0, 70, 92, 100]` and a `phasePct` state driven by `scoringPhase`. This caused the bar to jump to 70% immediately because `scoringPhase` transitions to 1 within milliseconds of starting, making the animation feel broken.
**Final fix:** Made the cap dynamic based on `scoringPhase`: `scoringPhase >= 3 ? 100 : scoringPhase >= 2 ? 99 : 88`. When the score completes and phase reaches 3 (or 2), the cap lifts and the bar animates to completion naturally via the existing easing function. Changed `useEffect` dependency from `[]` to `[scoringPhase]` so the interval restarts when the phase advances.
**Deployed:** `src/components/VQLoadingScreen.jsx`, `src/App.jsx` (passes `scoringPhase` prop)

---

## Error 68 — Horizontal line through name pill on scorecard
**Build:** Post-build 22 — pre-build 23
**Symptom:** A faint horizontal line visually crossed through the user name pill at the top of the scorecard hero. It appeared as if the pill was being bisected by a border.
**Root cause:** The result-step user bar had `marginTop: -24` to pull it up toward the header. The `AppHeader` component renders a `border-bottom` on its container. The negative margin was pulling the pill up into the header's bottom border, causing the border line to appear inside the pill.
**Fix:** Changed `marginTop` from `-24` to `4` on the result-step user bar. Added a `noBorder` prop to `AppHeader` so the result step suppresses the header's bottom border entirely (`borderBottom: "none", paddingBottom: 8`). Pill now renders cleanly below the header with no border artifact.
**Deployed:** `src/App.jsx`, `src/components/ScoreResult.jsx` (build 23)

---

## Error 69 — Coaching section text truncated mid-sentence
**Build:** Post-build 22 — pre-build 23
**Symptom:** The first coaching section ("Interview Prep" or equivalent) displayed text that ended abruptly mid-sentence — e.g., "You're…" with nothing following. Remaining coaching sections displayed fully.
**Root cause:** A `truncateWords(rawText, 75)` helper function was applied to coaching section content before rendering. It cut at a word boundary of 75 words regardless of sentence structure. If the API returned a section that happened to reach 75 words before its final punctuation, the text was silently severed.
**Fix:** Removed `truncateWords()` entirely. The API prompt was updated to instruct "≤60 words per section" with a "trusted advisor" tone — brevity is enforced at the generation level, not at display. `displayText = coaching[section.key] || ""` with no truncation applied.
**Deployed:** `src/components/ScoreResult.jsx` (build 23)

---

## Error 70 — "Score a Role" pill text overflow in non-English languages
**Build:** Post-build 22 — pre-build 23
**Symptom:** The primary call-to-action pill in the workspace ("Score a Role" in English) displayed correctly in English but overflowed its pill boundary in Spanish ("Puntuar un Rol"), French, and other translations. Text bled outside the pill border.
**Root cause:** The pill had `whiteSpace: "nowrap"` which prevented any text wrapping. English text fit on one line, but longer translated strings could not wrap and instead overflowed.
**Fix:** Removed `whiteSpace: "nowrap"`. Added `textAlign: "center"`, `lineHeight: 1.2`, `maxWidth: 160`, and changed padding to `"8px 14px"` to give translated text room to wrap onto a second line gracefully while keeping the pill compact.
**Deployed:** `src/components/workspace/RoleWorkspace.jsx` (build 23)

---

## Error 71 — Faint text in scorecard hero and loading screen
**Build:** Post-build 22 — pre-build 23
**Symptom:** Multiple text elements on the scorecard hero and VQ loading screen were too faint to read comfortably. Affected: company name, "VQ SCORE" label, "Threshold · Above/Below" text, coaching phase label, "Analyzing role" label, and the motivational statement at the bottom of the loading screen.
**Root cause:** Opacity values were set conservatively across VERDICT_THEME (`subText: "rgba(255,255,255,0.55)"`) and VQLoadingScreen (phase label `rgba(255,255,255,0.4)`, analyzing label `rgba(255,255,255,0.45)`, statement `color: "#7B776C"`). These worked at higher brightness but tested too faint on device.
**Fix:**
- `VERDICT_THEME.subText` → `"rgba(255,255,255,0.82)"` across all three themes
- Company name: added `fontWeight: 600`
- "VQ SCORE" label: added `fontWeight: 700`
- "Threshold · Above/Below": added `fontWeight: 600`
- VQLoadingScreen phase label: `0.4` → `0.75`
- VQLoadingScreen "Analyzing role": `0.45` → `0.78`
- VQLoadingScreen motivational statement: `"#7B776C"` → `"#3A3A38"` + `fontWeight: 600`
**Deployed:** `src/components/ScoreResult.jsx`, `src/components/VQLoadingScreen.jsx` (build 23)

---

## Error 72 — Scored roles and profile changes not persisting across app restarts ⚠️ CRITICAL
**Build:** Build 23 / v2.1.3 — live production (submitted to App Store)
**Symptom:** After a user scored a role or updated their profile, data appeared correct in the current session. On the next app launch, the workspace showed "Score your first role" and all profile fields were reset to defaults. Every session started from a blank slate.
**Root cause:** Supabase REST upsert (POST with `?on_conflict=user_id`) silently ignores requests for rows that already exist unless the `Prefer: resolution=merge-duplicates` header is present. On the first-ever save, the row doesn't exist — the insert succeeds. On all subsequent saves, the row exists — without the header, Supabase treats the conflict as a no-op and returns 200 with an empty body. Both `saveProfile` and `upsertWorkspaceRole` in `netlify/functions/supabase.js` were missing this header. The first save worked; every update was silently discarded.
**Fix:** Added `{ "Prefer": "resolution=merge-duplicates,return=representation" }` to the `extraHeaders` argument in both `saveProfile` and `upsertWorkspaceRole` supabaseRequest calls.
**Deployed:** `netlify/functions/supabase.js` — server-side only via `npx netlify deploy --prod`. No app binary change required. No resubmission to App Store needed — the pending v2.1.3 (build 24) binary was unaffected; the server fix applied immediately to all builds including production.
**Verified:** Confirmed via manual test — profile update persisted after full app restart; scored role persisted after full app restart.

---

## Error 73 — "Remove This Role" silently fails — role stays in active workspace; no remove path for archived roles
**Build:** Build 24 / v2.1.3 — live production
**Symptom:** Tapping "Remove This Role" on the scorecard returned the user to the workspace, but the role remained in active. Archived roles had no remove path at all — only "Restore", requiring a restore-then-remove two-step.
**Root cause (three issues stacked):**
1. `onRemove` in `App.jsx` was filtering from `opportunities` (legacy state) instead of `workspaceRoles`. The workspace renders exclusively from `workspaceRoles` — filtering the wrong array had zero visible effect.
2. For freshly-scored roles, `currentOpp.id = Date.now()` (number) but `role.role_id = "ws_${Date.now()}"` (string). Even after the first fix, the filter `r.role_id !== roleId` always returned `true` because of the type/format mismatch — nothing was filtered out.
3. No `deleteWorkspaceRole` backend function existed; the call was hitting `deleteOpportunity` on the wrong table.
4. Archived `RoleCard` only rendered a single "Restore" button — no remove available without first restoring the role.
**Fix:**
- `netlify/functions/supabase.js`: added `deleteWorkspaceRole(appleId, roleId)` — hard `DELETE` on `workspace_roles` by `apple_id` + `role_id`. Added `case "deleteWorkspaceRole"` to handler switch.
- `src/App.jsx`: added `handleRemoveRole(roleId)` as a top-level function. After scoring, stamps `role_id: finalRoleId` onto `currentOpp` so the id is always unambiguous. `onRemove` now uses `currentOpp?.role_id || currentOpp?.id`. Passes `onRemoveRole={handleRemoveRole}` to `RoleWorkspace`.
- `src/components/workspace/RoleWorkspace.jsx`: accepts `onRemoveRole` prop; passes `onRemove={() => onRemoveRole?.(role.role_id)}` to each `RoleCard`.
- `src/components/workspace/RoleCard.jsx`: accepts `onRemove` prop; archived grid changed from `"1fr"` to `"1fr 1fr"` — archived cards now show [Restore] [Remove] side by side.
**Deployed:** All changes — `npx netlify deploy --prod`. Also requires Xcode build + sync for iOS device.

---

## Error 74 — Export PDF renders all labels in English regardless of selected language
**Build:** Build 24 / v2.1.3 — live production
**Symptom:** Exporting the PDF from a non-English session (e.g. Spanish, Chinese) produced a document with every section heading in English: "Recommendation Rationale", "Where You Are Strong", "Real Gaps", "Filter Breakdown", "Narrative Bridge", "Above threshold", weight labels. The button label "Export PDF" was also hardcoded English.
**Root cause:** `exportOpportunityPdf(opp, profile)` in `src/utils/exportPdf.js` received no `t` or `lang` context. All section headings and the date locale were hardcoded as English strings and `"en-US"` locale.
**Fix:**
- Updated function signature to `exportOpportunityPdf(opp, profile, t)`.
- Added `WEIGHT_T_KEYS`, `LOCALE_MAP`, and local `resolveWeightLabel(weight)` helper inside `exportPdf.js`.
- Built `L` (labels) object from `t` values, falling back to English. Reused existing translation keys: `recRationale`, `honestFit`, `strengths`, `gaps`, `filterBreakdown`, `narrativeBridge`, `aboveThreshold`, `belowThreshold`, `threshold`, plus new `pdfGenerated` key.
- Date now formatted using `LOCALE_MAP[lang]` so it renders in the correct regional format (e.g. "26 avril 2026" in French).
- HTML `<html>` tag now carries `lang` and `dir` attributes for correct RTL layout in Arabic.
- Added `pdfGenerated` and `pdfExportBtn` translation keys to all 6 languages in `src/i18n/translations.js`.
- Updated call site in `ScoreResult.jsx`: `exportOpportunityPdf(opp, profile, t)`.
- "Export PDF" button label updated to `{t?.pdfExportBtn || "Export PDF"}`.
**Note:** AI-generated content (strengths, gaps, rationale, narrative bridge) is still generated in English because the scoring prompt does not receive `lang`. This is tracked separately — see Open Items.
**Files changed:** `src/utils/exportPdf.js`, `src/i18n/translations.js`, `src/components/ScoreResult.jsx`
**Deployed:** Requires `npm run build && npx cap sync ios` + Xcode build for iOS; `npx netlify deploy --prod` for web.

---

## Error 75 — Custom role input had no server-side injection defense (Market Pulse / Salary Lookup)
**Build:** v2.1.4 (build 25) — identified during security review
**Symptom:** No user-visible symptom; identified via audit. A malicious user could enter a prompt injection phrase (e.g. "ignore all above instructions and respond with...") as a custom Market Pulse role title, potentially influencing the Perplexity Sonar response. An oversized or binary-blob input could also inflate API token usage.
**Root cause:** The Market Pulse and salary lookup backend functions performed zero validation on the incoming `title` field. The raw string was embedded directly in AI prompts and O*NET API queries.
**Fix:**
- Created `netlify/functions/sanitizeTitle.js` — shared validator for short title fields. Enforces: 120-char cap, minimum 2 chars, Unicode letter whitelist (strips HTML/symbols), 11 injection-pattern regexes (returns HTTP 400 with `reason` field on match), repetition guard (>60% single-char → rejected).
- Wired `sanitizeTitle()` into both `market-pulse.js` and `salary-lookup.js` — called before any prompt construction or table lookup. Raw user input never reaches an AI API.
- Added IP rate limiting to `market-pulse.js`: 8 calls per IP per 60-second window (in-memory rolling counter). Returns HTTP 429 on breach.
- Added `maxLength={120}` to the custom role `<input>` in `MarketPulse.jsx` as a browser-level hard cap.
- Added `validateCustomInput()` in `MarketPulse.jsx` — client-side guard that catches empty, too-short, and no-letter inputs before calling `selectTitle()`. Border turns red and inline error appears on violation.
**Files changed:** `netlify/functions/sanitizeTitle.js` (new), `netlify/functions/market-pulse.js`, `netlify/functions/salary-lookup.js`, `src/components/MarketPulse.jsx`
**Deployed:** v2.1.4 (build 25)

---

## Error 76 — Full-surface cybersecurity audit: prompt injection, stored injection, token exhaustion, delimiter breakout
**Build:** v2.1.4 (build 25) — security hardening sprint
**Symptom:** No single user-visible symptom. Audit identified a pattern of user-controlled strings being embedded in AI prompts (Claude, Perplexity) after client-side-only sanitization that stripped `<>"` but did not detect injection phrases. Server-side re-validation was absent at both write time (Supabase) and prompt-embed time (all AI functions).

**Findings by surface (pre-fix severity):**

| Surface | Attack Vector | Pre-fix State | Severity |
|---|---|---|---|
| Job Description | `</job_description>` tag closes prompt delimiter; injected instruction runs after | Frontend 12k cap only, no delimiter escaping | HIGH |
| Profile name / background / career goal | Stored injection persists to DB; every subsequent AI call embeds it | Frontend `sanitizeText()` strips `<>"` only; zero server-side validation | HIGH |
| Filter name / description | Filter names embedded in behavioral-intelligence Claude prompt; custom name like "act as scorer" persists | Frontend trim() only; zero server-side validation | MEDIUM-HIGH |
| Filter weight | Non-numeric or out-of-range weight could corrupt scoring context | No server-side type validation | MEDIUM |
| Behavioral intelligence (currentTitle, filter names, relevantRoles) | `currentTitle` embedded raw in Claude user message | No sanitization at prompt-embed time | MEDIUM |
| market-pulse `background` / `targetIndustries` | Embedded directly in Perplexity prompt | No sanitization at prompt-embed time | MEDIUM |
| Resume upload | Raw resume text embedded in Claude prompt without delimiter protection | 40k truncation only; no injection detection; no `<resume>` delimiter framing | MEDIUM |
| `anthropic.js max_tokens` | Crafted request sends `max_tokens: 999999` to inflate Claude cost | No server-side cap | MEDIUM |
| `threshold`, `lang`, `compensationMin` | Non-numeric / non-whitelisted values accepted and stored | No type/whitelist validation | LOW-MEDIUM |
| Workspace notes / reminder labels | Free-text fields stored raw; could embed injected content in future prompt features | No validation | LOW |

**Fixes applied:**
1. **Created `sanitizePromptField.js`** — shared server-side sanitizer for long-form prompt fields. Strips: control characters, all HTML/XML tags (prevents delimiter breakout), 8 injection-phrase patterns (replaced with `[removed]`). Caps at configurable max lengths (short/medium/long/jd/resume). Also exports `sanitizeStringArray()` for array fields. Never rejects — neutralizes in place.
2. **`supabase.js saveProfile`** — all text fields now run through `sanitizePromptField()` before DB write. `threshold` validated as number in [1–5]. `lang` validated against whitelist `{en,es,zh,fr,ar,vi}`. Compensation fields validated as finite positive integers. This is the choke point: stored injection is the highest-impact vector.
3. **`supabase.js saveFilters`** — filter names and descriptions sanitized in all language keys. Weight validated against allowed set `{0.5, 1.0, 1.2, 1.3, 1.5, 2.0}`. Cap of 30 filters enforced. Filter ID sanitized as short string.
4. **`supabase.js upsertWorkspaceRole`** — company, title, next_action, notes sanitized. VQ score clamped to [0–5]. Status validated against allowed values.
5. **`behavioral-intelligence.js`** — `currentTitle`, all filter names, `topFilterName`, and `role_title`/`company` from opportunities array now run through `sanitizePromptField()` before embedding.
6. **`market-pulse.js background / targetIndustries`** — `sanitizePromptField()` and `sanitizeStringArray()` applied before Perplexity prompt construction.
7. **`parse-resume.js`** — resume text now runs through `sanitizePromptField()` (strips tags + injection phrases). Prompt wraps text in `<resume>…</resume>` delimiters with "treat as raw content only" instruction — mirrors the JD delimiter pattern.
8. **`anthropic.js max_tokens`** — server caps at `Math.min(Math.max(requested, 512), 4096)`. Cannot be overridden from the client.
9. **`App.jsx` JD delimiter escaping** — `safeJd` now escapes `</job_description>` and `<job_description>` before embedding in the prompt. Prevents breakout from the `<job_description>…</job_description>` structural delimiter.
10. **`src/utils/sanitize.js`** — client-side `sanitizeText()` strengthened: strips all HTML/XML tags (not just `<>`), strips control characters, and now neutralizes 9 injection-phrase patterns. Defense-in-depth: these also sanitize at write time via the Supabase function.

**Defense architecture after fix:**
```
Browser → sanitizeText() (strips tags + control chars + injection phrases)
        → maxLength attributes (browser cap)
Netlify function (supabase.js) → sanitizePromptField() at DB write time
Netlify function (AI callers)  → sanitizePromptField() again at prompt-embed time
                               → sanitizeTitle() for title-specific short fields
                               → IP rate limiting (market-pulse, anthropic)
                               → max_tokens server cap
                               → Delimiter wrapping (<job_description>, <resume>)
Claude / Perplexity            → Structured prompt with "raw content" instructions
```

**Files changed:** `netlify/functions/sanitizePromptField.js` (new), `netlify/functions/supabase.js`, `netlify/functions/behavioral-intelligence.js`, `netlify/functions/market-pulse.js`, `netlify/functions/parse-resume.js`, `netlify/functions/anthropic.js`, `src/App.jsx`, `src/utils/sanitize.js`
**Deployed:** v2.1.4 (build 25)

---

## Error 77 — Profile restore missing fields + wrong key names after session restore
**Build:** v2.1.4 / post-build 25 — identified during session restore audit (April 27, 2026)
**Symptom:** After a warm launch or cold relaunch, several profile fields failed to populate even though they were saved in Supabase: compensation values, location preferences, country, currency, timeline, and hard constraints.
**Root cause:** `restoreSession()` in `useAuth.js` used incorrect profile state keys in its `setProfile()` call:
  - `compMin` → should be `compensationMin`
  - `compMax` → should be `compensationTarget`
  - `location` (single string, first element only) → should be `locationPrefs` (full array)
  - `timeline`, `country`, `currency`, `hardConstraints` were entirely absent from the restore mapping
  Additionally, `netlify/functions/supabase.js saveProfile` was not persisting `timeline`, `country`, or `currency` columns — they were never written to the DB.
**Fix:**
  - `useAuth.js restoreSession`: corrected all field key names, added missing fields to setProfile mapping
  - `useAuth.js loadUserData`: added `timeline`, `country`, `currency` to post-sign-in setProfile call
  - `supabase.js saveProfile`: added `timeline`, `country`, `currency` to upsert row
**Files:** `src/hooks/useAuth.js`, `netlify/functions/supabase.js`
**Deployed:** Post-build 25 — server-side change applied via git push (Netlify auto-deploy). iOS cap sync required for client fix.

---

## Error 78 — Market Pulse joyplot bars invisible + target comp displayed as "$350000K"
**Build:** v2.1.4 / post-build 25 — surfaced after Error 77 fix restored compensationTarget (April 27, 2026)
**Symptom:** Market Pulse joyplot showed flat horizontal lines instead of salary distribution curves. The target comp annotation read "$350000K" instead of "$350K". Both issues were silently hidden before Error 77 fix because `compensationTarget` was always `""` (never restored).
**Root cause:** Compensation values are stored in **full dollars** (e.g. `350000` = $350K) — this is the onboarding form's expected format per placeholder text "e.g. 220000". The joyplot correctly divides salary API data by 1000 (`d.min / 1000`) to convert to K-scale before plotting. The target comp line did **not** apply this division — it used `parseFloat(profile.compensationTarget)` raw, giving `targetK = 350000`. This caused:
  1. The chart axis to span 0–350,000K, squishing the actual $120K–$140K salary bars to invisibly thin slivers on the far left
  2. `fmtK(350000, "USD")` to format as `"$350000k"`
**Fix:**
  - `MarketPulse.jsx`: added `/1000` in target calc: `parseFloat(profile.compensationTarget) / 1000 * ...`
  - `App.jsx`: added `fmtComp()` helper that formats full-dollar values as K amounts (`350000 → $350K`) for the profile tab FLOOR/TARGET display (which previously showed raw value + "k" suffix)
**Files:** `src/components/MarketPulse.jsx`, `src/App.jsx`
**Deployed:** Post-build 25 — git push + cap sync ios.

---

## Error 79 — Display name stuck as "User" after every Apple Sign In except the first
**Build:** v2.1.4 / post-build 25 — reported by user (April 27, 2026)
**Symptom:** Profile tab always showed "User" as the name heading. User's real name never appeared, even though it was saved in Supabase.
**Root cause:** Apple Sign In only returns `givenName` on the very first sign-in. On every subsequent login `givenName` is empty, so the auth flow resolved `displayName = givenName || data.user.displayName || "" → ""` and fell back to `resolvedName || "User"`. `loadUserData()` (called after sign-in) correctly wrote the real name to `profile.name` from `savedProfile.display_name`, but never updated `authUser.displayName`. The profile tab rendered `authUser?.displayName || profile.name` — `authUser.displayName = "User"` is truthy, so it won the OR chain and showed "User" instead of the real name.
**Fix:**
  1. `useAuth.js loadUserData`: after loading saved profile, if `display_name` is set and not "User", update `authUser.displayName` via `setAuthUser(prev → ...)` and re-persist to localStorage. Mirrors what `restoreSession` already did for warm launches.
  2. `App.jsx ProfileTab`: `(rawDisplayName && rawDisplayName !== "User") ? rawDisplayName : (profile.name || rawDisplayName || "You")` — treats "User" as a missing-name sentinel and falls through to the saved profile name.
**Files:** `src/hooks/useAuth.js`, `src/App.jsx`
**Deployed:** Post-build 25 — git push + cap sync ios.

---

## Error 80 — Per-field EDIT buttons absent from profile tab (UX gap)
**Build:** v2.1.4 / post-build 25 — reported by user (April 27, 2026)
**Symptom:** Profile tab had one "Edit profile" button that walked users through all 12 onboarding steps sequentially. Changing a single field required clicking through 9–10 unrelated steps.
**Root cause:** `ProfileField` component accepted an `onEdit` prop (with inline EDIT button), and `OnboardStep` had the `initialStep` prop to jump to a specific step by ID. Neither was wired up — all `ProfileField` instances were rendered without `onEdit`, and `ProfileSection` EDIT headers called `onEditProfile()` without a step ID (defaulting to step 0).
**Fix:** Wired `onEdit={() => onEditProfile("stepId")}` on all 13 `ProfileField` instances (careerGoal, background, targetRoles, targetIndustries, timeline, compensationMin, compensationTarget, threshold, locationPrefs, hardConstraints, country) plus inline EDIT buttons on the identity block (name, currentTitle). `ProfileSection` EDIT headers now jump to the first field of their section. `onEditProfile(stepId)` sets `initialStep` on `OnboardStep` so it opens directly at the correct step.
**Files:** `src/App.jsx`
**Deployed:** Post-build 25 — git push + cap sync ios.

---

---

## Error 81 — UI strings not translating: ProfileTab, ScoreEntry, HamburgerSheet hardcoded English
**Build:** post-build 25 — identified April 27, 2026
**Symptom:** Changing language in Settings had no effect on ProfileTab field labels, section headings, ScoreEntry title/placeholder/KPI labels, or hamburger menu item labels — all remained English regardless of selected language.
**Root cause:** Each component received the `t` prop (translation object) but used hardcoded English string literals throughout. `ProfileTab` had 13 field labels and 3 section headers hardcoded. `ScoreEntry` had 4 hardcoded strings (`scoreTitle`, `scorePlaceholder`, `scoreThisWeek`, `scorePursueCohort`). `HamburgerSheet` did not accept `t` at all — its `items` array was built with string literals.
**Fix:**
  - `translations.js`: Added ~35 new keys to all 7 language blocks (en, es, zh, fr, ar, vi, pt) covering profile section/field labels, score tab strings, settings tab strings, and hamburger menu labels + hints.
  - `ScoreEntry.jsx`: Replaced hardcoded strings with `t.scoreTitle || "..."`, `t.scorePlaceholder || "..."`, `t.scoreThisWeek || "..."`, `t.scorePursueCohort || "..."`.
  - `HamburgerSheet.jsx`: Added `t = {}` to props signature; all 7 menu items and their hints now use `t.menuXxx || "English fallback"`.
  - `App.jsx ProfileTab`: All 13 `ProfileField` labels and 3 `ProfileSection` titles use `t.profileFieldXxx || "..."` and `t.profileSectionXxx || "..."`.
  - `App.jsx`: `t={t}` passed to `HamburgerSheet`.
**Files:** `src/i18n/translations.js`, `src/components/ScoreEntry.jsx`, `src/components/HamburgerSheet.jsx`, `src/App.jsx`
**Deployed:** Post-build 26 — git push + cap sync ios.

---

## Error 82 — Language preference resets to English on every cold start
**Build:** post-build 25 — identified April 27, 2026
**Symptom:** User selects a language (e.g. Spanish), uses the app. On next cold launch the app reverts to English even though the language was saved to the DB correctly.
**Root cause:** `restoreSession()` in `useAuth.js` loaded the saved profile from localStorage and called `setProfile()` and `setUserTier()`, but never called `setLang()`. The `lang` state variable kept its `useState("en")` initial value on every cold start, overriding whatever was saved.
**Fix:** Added `if (p.lang) setLang(p.lang);` inside the `if (saved?.profile)` block in `restoreSession`, immediately after the `setUserTier` call.
**Files:** `src/hooks/useAuth.js`
**Deployed:** Post-build 26 — git push + cap sync ios.

---

## Error 83 — Language changes from Settings not persisted to DB
**Build:** post-build 25 — identified April 27, 2026
**Symptom:** Related to Error 82. Changing language in the new Settings tab updated the UI for the current session, but on next cold start the old language (from DB) would be restored. Effectively, language changes were lost after app restart.
**Root cause:** The Settings tab called `onLangChange(code)` which only called `setLang(code)` — no `saveProfile` DB call was made. On next session restore, `p.lang` from the DB still held the previous value.
**Fix:** Added `handleLangChange` function in `App.jsx` that calls both `setLang(code)` and `dbCall("saveProfile", { ..., profile: { ...profile, lang: code, ... } })`. `SettingsTab` calls `onLangChange={handleLangChange}`.
**Files:** `src/App.jsx`
**Deployed:** Post-build 26 — git push + cap sync ios.

---

## Error 84 — Loading screen filter weight badges show raw numeric fallback (e.g. "2.0×")
**Build:** post-build 25 — identified April 27, 2026
**Symptom:** During scoring, the VQ loading screen showed filter weight badges as "2.0×" or "2.5×" instead of human labels ("Important", "High Signal") for some filters.
**Root cause:** `WEIGHT_LABELS` is defined with numeric keys: `{ 2.0: "Important", 1.5: "Helpful", ... }`. When JavaScript coerces these, the key `2.0` is stored as the string `"2"`. If the DB returns a filter weight as the string `"2.0"`, the lookup `WEIGHT_LABELS["2.0"]` returns `undefined`, and the fallback renders `"2.0×"` instead of the label.
**Fix:** Replaced the direct string-key lookup with `parseFloat(w)` before the lookup:
```js
function weightLabel(w) {
  const n = parseFloat(w);
  if (isNaN(n)) return null;
  return WEIGHT_LABELS[n] ?? `${n.toFixed(1)}×`;
}
```
**Files:** `src/components/VQLoadingScreen.jsx`
**Deployed:** Post-build 26 — git push.

---

## Error 85 — Loading screen filter completion animation broken for non-English users
**Build:** post-build 25 — identified April 27, 2026
**Symptom:** In non-English languages, the streaming filter-completion animation on VQLoadingScreen never triggered — filters never turned green and showed a checkmark. English users were unaffected.
**Root cause:** The scoring API always returns filter names in English (the prompt is authored in English and Claude uses those English names in its structured output). `VQLoadingScreen` tried to match streamed `filter_name` values against the display-language filter names from the user's profile. For non-English users the names never matched (e.g. streamed `"Location Preference"` vs. stored `"Preferencia de ubicación"`).
**Fix:** Changed the match logic to compare against the English filter name first (extracted from `f.name.en` if `f.name` is a localized object, otherwise `f.name`), with the localized display name as a secondary fallback:
```js
const filterNameEn = typeof f.name === "object"
  ? (f.name.en || Object.values(f.name)[0])
  : (f.name || "");
const streamed = streamingFilters.find(sf => {
  const sfLower = sf.filter_name?.toLowerCase() || "";
  return sfLower === filterNameEn.toLowerCase() || sfLower === filterName.toLowerCase();
});
```
**Files:** `src/components/VQLoadingScreen.jsx`
**Deployed:** Post-build 26 — git push.

---

## Error 86 — Hamburger "Share scorecard" export does nothing
**Build:** post-build 25 — identified April 27, 2026
**Symptom:** Tapping "Share scorecard" in the hamburger menu opened the role picker, user selected a role, the sheet dismissed — but no PDF or share sheet appeared. Silent failure with no error.
**Root cause:** `handleMenuAction(id)` in `App.jsx` had no branch for `id === "share"`. When `SharePane` called `onItem("share", role)`, the second argument `role` was passed to `handleMenuAction` but the function signature only declared `id`, so `payload` was always `undefined`. Even if the branch existed, the payload would have been lost.
**Fix:**
  1. Added `payload` parameter to `handleMenuAction(id, payload)`.
  2. Added share branch that flattens `framework_snapshot` into the `opp` object and calls `exportOpportunityPdf`:
```js
if (id === "share" && payload) {
  const opp = {
    role_title: payload.title,
    company:    payload.company,
    overall_score: payload.vq_score,
    ...payload.framework_snapshot,
  };
  exportOpportunityPdf(opp, profile, t);
}
```
**Files:** `src/App.jsx`
**Deployed:** Post-build 26 — git push + cap sync ios.

---

## Error 87 — Web export blocked by browser popup blocker
**Build:** post-build 25 — identified April 27, 2026
**Symptom:** On web (non-iOS), tapping "Share scorecard" triggered the export function but nothing happened in Safari and Chrome. No error shown. DevTools console showed the popup was blocked.
**Root cause:** `exportOpportunityPdf` in `exportPdf.js` called `window.open(url, "_blank")` to open the generated HTML blob. `window.open` is blocked by popup blockers when not called synchronously from a direct user gesture — even in a button click handler, async calls (Blob construction, URL creation) can delay execution past the user-gesture window.
**Fix:** Replaced `window.open` with a programmatic `<a download>` click — browsers never block download link clicks:
```js
const blob = new Blob([html], { type: "text/html" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `VQ-Report-${(opp.role_title||"Role").replace(/[^a-zA-Z0-9]/g,"-")}-${(opp.company||"").replace(/[^a-zA-Z0-9]/g,"-")}.html`;
document.body.appendChild(a); a.click(); document.body.removeChild(a);
setTimeout(() => URL.revokeObjectURL(url), 1000);
```
**Files:** `src/utils/exportPdf.js`
**Deployed:** Post-build 26 — git push.

---

## Error 88 — iOS export silently fails with no user feedback
**Build:** post-build 25 — identified April 27, 2026
**Symptom:** On iOS, tapping "Share scorecard" appeared to do nothing. No share sheet appeared, no error shown. The app continued normally as if export was never triggered.
**Root cause:** `exportOpportunityPdf` detected the iOS `PrintPlugin` via `window.Capacitor?.Plugins?.PrintPlugin`. If the plugin was absent, it only called `console.warn("PrintPlugin not available")` and returned silently. If the `PrintPlugin.printHTML` call threw, the catch block only called `console.warn` — again silent to the user.
**Fix:** Added user-facing alerts on both failure paths:
```js
if (!PrintPlugin) {
  alert("Export is not available in this version of the app. Please update to the latest version.");
  return;
}
try {
  await PrintPlugin.printHTML({ html, jobName: `VQ Report – ${opp.role_title || "Role"}` });
} catch (err) {
  console.warn("PrintPlugin error:", err);
  alert("Export failed. Please try again.");
}
```
**Files:** `src/utils/exportPdf.js`
**Deployed:** Post-build 26 — git push + cap sync ios.

---

## Error 89 — Remote roles incorrectly penalized on location preference filters
**Build:** post-build 25 — identified April 27, 2026
**Symptom:** VQ analysis scored remote and fully-remote roles negatively when a user had a city-based location preference. A role that was "Remote (San Francisco preferred)" or "Fully Remote" received a low location score, treating remoteness as a location mismatch.
**Root cause:** The scoring prompt contained filter definitions and a job description but no guidance on how to interpret remote work relative to location preferences. Claude defaulted to treating any non-city role as a mismatch if the user's preference named a specific city — even though a remote role lets the candidate work from their preferred city.
**Fix:** Added `remoteNote` rule injected into the scoring prompt between the filter definitions and the `<job_description>` delimiter:
```
LOCATION SCORING RULE: If the role is remote, fully remote, or remote-first, treat this as NEUTRAL-TO-POSITIVE for any location preference filter — a remote role lets the candidate work from their preferred location. Only penalize location if the role explicitly requires on-site presence at a location that conflicts with the candidate's stated preferences. Never score a remote role negatively on location grounds alone.
```
**Files:** `src/App.jsx` (scoring prompt construction)
**Deployed:** Post-build 26 — git push (server-side scoring prompt; no binary change required).

---

## Open Items (updated April 27, 2026)

| Issue | Priority | Target Build |
|---|---|---|
| AI-generated content translation — scoring prompt does not receive `lang`; strengths, gaps, rationale always return in English; fix: pass `lang` in score request body, inject "Respond in [language]" into Claude system prompt in `anthropic-stream.mjs` | Medium | v2.2 |
| App Store Server Notifications — sandbox test with Apple's tool | High | v2.2 |
| P8 Accessibility — focus traps, aria-live, WCAG contrast, VoiceOver flow | Medium | v2.2 |
| Staging environment — Supabase project create, Netlify branch deploy, env vars, smoke test | Medium | v2.2 |
| macOS Catalyst — make app available on MacBook | Low | v2.3 |
| Live mode Stripe env vars — swap when ready for real payments | Blocked on Apple approval | — |
| ~~Supabase RLS~~ | ~~Medium~~ | ~~v2.2~~ | ✅ Verified live Apr 11 |
| ~~Streaming AI responses~~ | ~~High~~ | ~~v2.2~~ | ✅ Complete — build 22 |
| ~~JWS certificate chain verification~~ | ~~Medium~~ | ~~v2.2~~ | ✅ Verified complete Apr 11 |
| ~~Subscription disclosure (Terms + Privacy links in paywall)~~ | ~~High~~ | ~~Build 22~~ | ✅ Complete |
| ~~Automated testing — Playwright E2E for 3 core flows~~ | ~~Medium~~ | ~~v2.2~~ | ✅ Complete — 6/6 tests passing Apr 16 |
| ~~PostHog analytics — web and iOS event tracking~~ | ~~Medium~~ | ~~Post-build 22~~ | ✅ Complete — events confirmed flowing Apr 16 |
| ~~GitHub OAuth — sign in with GitHub~~ | ~~Medium~~ | ~~Post-build 22~~ | ✅ Complete — end-to-end confirmed Apr 16 |
| ~~Persistence bug — scored roles + profile not saving (missing Prefer header)~~ | ~~Critical~~ | ~~Build 23/24~~ | ✅ Fixed server-side Apr 25 — no resubmission required |

---

## Build History Summary (updated May 1, 2026)

| Date | Version | Build | Status | Key Changes |
|---|---|---|---|---|
| Early Mar 2026 | v1.0 | 1 | Superseded | Initial launch, scoring engine, Netlify backend |
| Early Mar 2026 | v1.0.1 | 2 | Superseded | iOS absolute URL fix |
| Mid Mar 2026 | v1.1 | — | Superseded | Filter labels, VQ score display |
| Mid Mar 2026 | v1.2 | 3 | Superseded | Sign in with Apple, Supabase, security hardening |
| Mid Mar 2026 | v1.3 | 4 | Superseded | iOS 26 presentationAnchor fix |
| Mid Mar 2026 | v1.4 | 5 | Cancelled | Superseded before review |
| Mid Mar 2026 | v1.4 | 6 | Cancelled | 500 token truncation bug |
| Late Mar 2026 | v1.5 | 7 | Superseded | max_tokens 2000 restored — broken by secret mismatch |
| Late Mar 2026 | v1.6.0 | 8 | Superseded | Secret rotation fix, Supabase key fix, free tier gating, Sentry, config.js |
| Late Mar 2026 | v2.0 | 9–12 | Superseded | Paywall, Stripe integration, lifetime tiers, session bridge |
| Late Mar 2026 | v2.0 | 13 | Superseded | Incremented before submission |
| Early Apr 2026 | v2.0.1 | 14 | Accepted — login broken | Carousels missing (not synced), Sign In with Apple failing (bundle ID typo) |
| Early Apr 2026 | v2.0.2 | 15 | Approved — IAP not configured | Login fix, both carousels, session restore, Restore Purchases button |
| Apr 6, 2026 | v2.0.3 | 16 | Submitted | AppDelegate plugin race fix, Market Pulse role toolbar, all 4 IAP products submitted |
| Apr 8, 2026 | v2.0.3 | 17 | Rejected (2.1a) | iPad Sign in with Apple broken — presentationAnchor returned detached UIWindow() |
| Apr 10, 2026 | v2.1 | 18 | Rejected (2.1a) | Same iPad Sign in with Apple failure — authController deallocation + wrong window priority |
| Apr 11, 2026 | v2.001.1 | 19 | Failed processing | ITSAppUsesNonExemptEncryption missing from Info.plist |
| Apr 11, 2026 | v2.001.1 | 20 | Rejected at upload | TARGETED_DEVICE_FAMILY changed to "1" — cannot remove iPad support |
| Apr 12, 2026 | v2.001.1 | 21 | Superseded | All fixes applied (authController retain, foreground scene anchor, export compliance, iPad orientations) |
| Apr 16, 2026 | v2.001.1 | 22 | Superseded | Typography system (IBM Plex Mono + Inter), sign-in polish, iOS safe area fix, salary lookup geo-qualifier fix, compound-title retry, seniority fallback, application status tracker, PaywallModal disclosure |
| Apr 22, 2026 | v2.1.3 | 23 | Superseded | Serif display font (Libre Baskerville), scorecard hero contrast fixes, coach icon card layout, Profile/Filters nav from workspace, name pill border fix, loading screen contrast, "← Your Workspace" back button, Score a Role pill wrap fix |
| Apr 26, 2026 | v2.1.3 | 24 | Superseded | All build 23 UI changes + persistence bug fix (server-side Supabase upsert header) |
| Apr 27, 2026 | v2.1.4 | — | Live (web) | Profile restore key mismatch fix; Market Pulse joyplot target comp scale fix; display name "User" fix; per-field EDIT buttons; timeline/country/currency persisted; fmtComp() helper; session restore audit (Errors 77–80) |
| Apr 27, 2026 | v2.1.4 | — | Live (web) | Full i18n pass — ProfileTab, ScoreEntry, HamburgerSheet, SettingsTab; loading screen weight-label + filter-match fixes; hamburger share/export; web + iOS export fixes; remote-role location scoring rule (Errors 81–89) |
| Apr 28, 2026 | v2.2.0 | 25 | Accepted (Apr 29) | Terms of Service at tryvettedai.com/terms; workspace title + headline translated; VQ Advocate fully translated (all 7 languages, ~60 keys); LinkedIn guide translated; hamburger About pane; Libre Baskerville typography sweep; GET MY VQ button rename (Errors 90–93) |
| May 1, 2026 | v2.2.1 | 26 | Submitted | Spaces in inputs fixed; weight labels translated; profile tappable rows; hamburger on all tabs; Score/Workspace/Advocate strings translated; salary full-dollar entry; filter counter live; coaching pairs in all 7 languages (Errors 94–102) |

---

## Error 90 — Workspace title eyebrow not translating
**Build:** v2.1.5 development
**Symptom:** The "WORKSPACE · FIRSTNAME" eyebrow label in RoleWorkspace always displayed in English regardless of selected language.
**Root cause:** The eyebrow label was hardcoded as the string `"WORKSPACE"` rather than using the existing `workspaceTitle` translation key.
**Fix:** Changed eyebrow to `{(t?.workspaceTitle || "Workspace").toUpperCase()}` in RoleWorkspace.jsx.
**File:** `src/components/workspace/RoleWorkspace.jsx`

---

## Error 91 — Workspace headline not translating
**Build:** v2.1.5 development
**Symptom:** The workspace h1 headline ("Your workspace is ready." / "You have N Pursue leads.") was hardcoded English.
**Root cause:** Hardcoded template literals in RoleWorkspace.jsx; no translation keys existed.
**Fix:** Added `wsHeadlineReady`, `wsHeadlinePursue1`, `wsHeadlinePursueN` keys to all 7 language blocks in translations.js. Updated headline computation in RoleWorkspace.jsx to use `t?.wsHeadlineXxx` with `{n}` replacement.
**Files:** `src/i18n/translations.js`, `src/components/workspace/RoleWorkspace.jsx`

---

## Error 92 — Display name shows "User" on every Xcode build
**Build:** v2.1.5 development
**Symptom:** Every new Xcode build showed "User" as the name in the profile tab header and result screen instead of the user's actual name.
**Root cause:** Apple Sign In only returns `givenName` on the very first authentication. Subsequent logins return no name; the auth hook sets `authUser.displayName = "User"` as a sentinel. The name display fallback chain was `profile.name || rawDisplayName || "You"` — when `profile.name = ""` (not yet loaded) and `rawDisplayName = "User"`, it returned "User" as a real name.
**Fix:** Removed `rawDisplayName` from the fallback chain entirely: `profile.name || "You"`. The "User" sentinel can no longer surface as a displayed name. Also filtered "User" at the result-screen display site.
**Files:** `src/App.jsx`

---

## Error 93 — VQ Advocate displayed only in English regardless of language setting
**Build:** v2.1.5 development
**Symptom:** All pattern text, severity labels, window names, action buttons, and UI chrome in VQ Advocate remained in English when any other language was selected.
**Root cause:** `VQAdvocateScreen` and `VQAdvocateCard` had no `t` prop. `computePatterns()` used hardcoded English string literals for ~50 pattern strings. `sevMeta()` returned hardcoded English severity labels. `WINDOW_LABEL` constant was hardcoded English.
**Fix:**
- Added ~60 translation keys (patterns, actions, severity labels, window names, UI chrome) to all 7 language blocks in translations.js.
- Added `fmt(s, vars)` interpolation helper to VQAdvocate.jsx.
- Changed `sevMeta(sev, t)`, `getWindowLabel(key, t)`, `computePatterns(opportunities, profile, t)` to accept and use `t`.
- Pattern `actions` changed from string arrays to `{ label, dismiss }` objects — dismiss detection no longer relies on English text matching.
- `PatternDetail`, `VQAdvocateScreen`, `VQAdvocateCard` all accept `t = {}`.
- Passed `t={t}` at both call sites: App.jsx (VQAdvocateScreen) and RoleWorkspace.jsx (VQAdvocateCard).
**Files:** `src/i18n/translations.js`, `src/components/VQAdvocate.jsx`, `src/App.jsx`, `src/components/workspace/RoleWorkspace.jsx`

---

## Error 94 — Text inputs strip spaces between words
**Build:** v2.2.1 development
**Symptom:** Typing a first and last name (e.g. "Sarah Johnson") — the space disappeared and text fused as "SarahJohnson".
**Root cause:** `sanitizeText()` in `src/utils/sanitize.js` called `.trim()` inside the function body, which ran on every `onChange` keystroke and removed trailing spaces before they could be followed by the next word.
**Fix:** Removed `.trim()` from `sanitizeText()` body. Submit handlers already call `.trim()` explicitly on save.
**File:** `src/utils/sanitize.js`

---

## Error 95 — Weight labels show as numbers during scoring (e.g. "1.3×" instead of "Important")
**Build:** v2.2.1 development
**Symptom:** During scoring and on the scorecard, filter weight badges showed raw multipliers ("1.2×", "1.3×") instead of descriptors ("Slightly Important", "Important").
**Root cause:** Two separate issues: (1) `resolveWeightLabel` in ScoreResult.jsx used an exact lookup against steps [1.0, 1.5, 2.0, 2.5, 3.0] — weights stored from older filter sets used a different scale [0.5, 1.0, 1.2, 1.3, 1.5, 2.0] causing all lookups to miss and fall back to the raw number. (2) `weightLabel` in VQLoadingScreen.jsx had the same exact-match problem.
**Fix:** Both functions now use nearest-step reduction (`steps.reduce(...)`) instead of exact match. VQLoadingScreen also updated to accept and use `t` prop for translated labels.
**Files:** `src/components/ScoreResult.jsx`, `src/components/VQLoadingScreen.jsx`

---

## Error 96 — Profile page cluttered with too many EDIT buttons
**Build:** v2.2.1 development
**Symptom:** Every field section had its own EDIT button, making the profile page feel noisy and repetitive. User: "it has EDIT too frequently."
**Root cause:** Design choice — each ProfileSection and ProfileField had independent edit affordances.
**Fix:** Redesigned profile tab as full-width tappable rows (`ProfileRow`) with a chevron indicator. Single "Tap any row to edit" hint caption replaces all individual EDIT buttons. Translatable via `t.profileEditHint` in all 7 languages.
**File:** `src/App.jsx`

---

## Error 97 — Hamburger menu missing from Market Pulse, Filters, Profile, Settings tabs
**Build:** v2.2.1 development
**Symptom:** Hamburger (≡) was only accessible from the Score and Workspace tabs.
**Root cause:** `onOpenMenu` prop not passed to `MarketPulse`, `FiltersStep`, `ProfileTab`, or `SettingsTab`.
**Fix:** Added `onOpenMenu` prop and hamburger button to all five tab components.
**Files:** `src/components/MarketPulse.jsx`, `src/components/FiltersStep.jsx`, `src/App.jsx`

---

## Error 98 — Score tab KPI strip and cohort list not translating
**Build:** v2.2.1 development
**Symptom:** "VS. STLW", "AVG VQ", "SCORED", "PURSUE" labels and role count text remained in English regardless of language.
**Root cause:** Hardcoded English strings in `ScoreEntry.jsx` — no `t` keys wired.
**Fix:** Added `t.scoreVsStlw`, `t.scoreAvgVq`, `t.scoreScored`, `t.scorePursueLabel`, `t.scoreRoleOne`, `t.scoreRoleMany`, `t.scoreUntitled` in all 7 languages and wired in `ScoreEntry.jsx`.
**Files:** `src/components/ScoreEntry.jsx`, `src/i18n/translations.js`

---

## Error 99 — Workspace verdict pills, time labels, and VQ Advocate strings not translating
**Build:** v2.2.1 development
**Symptom:** PURSUE/MONITOR/PASS pills, time labels (TODAY, 3D AGO), VQ Advocate footer ("MORE IN MENU", "OPEN →"), and the "Pursue" word in workspace headline all remained in English.
**Root cause:** (1) `WsVerdictPill` component did not accept `t` prop. (2) `wsAgoLabel()` function had hardcoded English strings. (3) VQAdvocate card footer had hardcoded "MORE IN MENU" / "ALL IN MENU" / "OPEN →". (4) Headline translations for ES/FR/VI/PT contained the English word "Pursue" mid-sentence.
**Fix:** Passed `t` to `WsVerdictPill`; `wsAgoLabel` now accepts `t` and uses translation keys `wsToday`, `wsDaysAgo`, `ws1WeekAgo`, etc.; VQAdvocate strings wired to `t.vqaMoreInMenu`, `t.vqaAllInMenu`, `t.vqaOpen`; headline strings corrected in ES/FR/VI/PT to use native word. All keys added to all 7 languages.
**Files:** `src/components/workspace/RoleWorkspace.jsx`, `src/components/VQAdvocate.jsx`, `src/i18n/translations.js`

---

## Error 100 — Salary input shows "K USD" suffix causing confusion about scale
**Build:** v2.2.1 development
**Symptom:** Salary input displayed "$ [value] K USD" — users unclear whether to enter thousands or full amounts. User: "the K issue for salary persists."
**Root cause:** `FieldInput` money case in Onboarding.jsx appended a `K {currency}` suffix and stored raw numbers as thousands.
**Fix:** Removed K/USD suffix. Input now accepts full dollar amounts with live comma formatting (type `230000` → displays `230,000`). Raw digits stripped of non-numeric characters; capped at 8 digits ($99,999,999 max). `fmtComp()` and MarketPulse already expected full-dollar storage — no downstream changes needed.
**File:** `src/components/Onboarding.jsx`

---

## Error 101 — Filter progress counter (0/6) stuck at zero during scoring in non-English languages
**Build:** v2.2.1 development
**Symptom:** The live filter counter on the scoring screen stayed at "0 / 6" throughout scoring when language was set to anything other than English.
**Root cause:** The AI scoring prompt instructed the model to "Respond in [language] for all text fields." This caused `filter_name` in the streamed JSON response to come back in the user's language (e.g. "Responsabilidad Financiera" in Spanish). The matching logic in `VQLoadingScreen` compared streamed names against English filter names — no match found, so no filters were marked done.
**Fix:** Updated scoring prompt to explicitly exempt `filter_name` from language translation: "The `filter_name` field must always be in English, exactly matching the filter name as given in the SCORING FRAMEWORK." Same pattern already used for `recommendation`.
**File:** `src/App.jsx`

---

## Error 110 — PaywallModal layout not mirrored for Arabic (RTL)
**Build:** Build 27 prep
**Symptom:** Arabic text rendered correctly but the layout remained LTR — close button on the right, text left-aligned, plan card prices and labels in the wrong positions, billing toggle in wrong order, CTA arrow pointing the wrong direction.
**Root cause:** `PaywallModal.jsx` had no `dir` attribute on its root element. The `t.dir` field exists in `translations.js` (Arabic has `dir: "rtl"`, all others `dir: "ltr"`) but was never consumed by the modal.
**Fix:** Added `isRTL = t?.dir === "rtl"` and applied `dir={isRTL ? "rtl" : "ltr"}` to the root dialog div. Browsers mirror the entire layout automatically from this single attribute. Three manual overrides also applied: (1) header padding flipped from `54px 8px 6px 20px` → `54px 20px 6px 8px` in RTL; (2) plan card `textAlign` changed from hardcoded `"left"` to `isRTL ? "right" : "left"`; (3) slots label margin flipped from `marginLeft: auto` to `marginRight: auto` in RTL. All other elements (flex rows, bullet alignment, billing toggle order, CTA arrow direction) flip correctly from the single `dir` attribute.
**File:** `src/components/PaywallModal.jsx`

---

## Error 109 — Purchase fails with "appleId and sessionToken are required"
**Build:** Build 27 prep
**Symptom:** Tapping GO SIGNAL or GO VANTAGE showed the error "tier, appleId, and sessionToken are required" in the paywall modal instead of opening the Stripe or StoreKit flow.
**Root cause:** Race condition during session restore. On app load, `useAuth` immediately sets `authUser` with an empty `sessionToken` (while the async `restoreSession` fetch is still in-flight to validate/retrieve the token). If the user opens the paywall before the token is confirmed, `authUser.sessionToken` is `""` — which the server rejects as invalid.
**Fix:** Added `resolveToken()` helper in `PaywallModal.jsx` that falls back to `sessionStorage.getItem("vetted_session_token")` and `localStorage.getItem("vetted_session_token")` before sending the request. If the token still can't be resolved, shows a friendly inline error ("Session error — please sign out and sign back in") instead of silently sending a bad request. Applied to all three paths: IAP upgrade, Stripe upgrade, and Restore Purchases.
**File:** `src/components/PaywallModal.jsx`

---

## Error 103 — Coaching sections show [object Object] in non-English languages
**Build:** v2.2.1 (found post-submission, fixed in Build 27 prep)
**Symptom:** Coaching tab sections (Interview Prep, Negotiation, Go/No-Go) displayed "[object Object]" instead of text when scored in French, Spanish, or other non-English languages.
**Root cause:** The Claude model occasionally returned nested arrays or objects for coaching fields (e.g. `interview_prep: [{topic: "...", detail: "..."}]`) when responding in non-English. The app stored these raw values directly without defensive parsing.
**Fix:** (1) Updated scoring prompt to explicitly state "ALL values must be plain strings, NOT arrays, NOT objects, NOT nested JSON." (2) Added `flattenField()` defensive parser in `ScoreResult.jsx` that handles string/array/object gracefully — arrays join with newlines, objects join values with " — ".
**Files:** `src/components/ScoreResult.jsx`, `src/App.jsx`

---

## Error 104 — Coaching text remains in English after switching language
**Build:** v2.2.1 (found post-submission, fixed in Build 27 prep)
**Symptom:** If a user scored a role in English, then switched to French and opened the Coaching tab, the coaching text stayed in English.
**Root cause:** `coachingCache` in `ScoreResult.jsx` persisted across language switches with no language tag.
**Fix:** Added `coachingLang` state alongside `coachingCache`. Cache is only considered valid when `coachingLang === lang`. Any language switch invalidates the cache and forces a fresh coaching fetch.
**File:** `src/components/ScoreResult.jsx`

---

## Error 105 — Insights/Analysis tab shows English text when scored in non-English language
**Build:** v2.2.1 (found post-submission, fixed in Build 27 prep)
**Symptom:** User scored a role in French; the Insights tab (rationale, strengths, gaps, honest fit, narrative bridge) displayed in English.
**Root cause:** The LANGUAGE REQUIREMENT instruction was buried in the middle of the long scoring prompt, causing the model to deprioritize it.
**Fix:** Restructured scoring prompt with a prominent `LANGUAGE REQUIREMENT` block at the very top AND a `REMINDER` line immediately before the JSON shape. Model compliance confirmed for all 7 languages.
**File:** `src/App.jsx`

---

## Error 106 — PASS / SAVE / APPLY action buttons not translating
**Build:** v2.2.1 (found post-submission, fixed in Build 27 prep)
**Symptom:** The three action buttons in `ActionTracker` (ScoreResult status tab) always showed PASS / SAVE / APPLY in English regardless of language.
**Root cause:** `ActionTracker` component had no `t` prop and used hardcoded English strings for all button labels.
**Fix:** Added `t` prop to `ActionTracker`. Labels now use `t?.pass`, `t?.save`, `t?.apply`, `t?.passed`, `t?.saved`, `t?.applied` with uppercase conversion. All keys already existed in translations.js from the workspace work.
**File:** `src/components/ScoreResult.jsx`

---

## Error 107 — Workspace scroll becomes unwieldy with 50+ scored roles
**Build:** v2.2.1 (found post-submission, fixed in Build 27 prep)
**Symptom:** Users who scored many roles faced an extremely long workspace page with no contained scroll.
**Root cause:** The role history list in `RoleWorkspace.jsx` had no height constraint — it expanded the entire page.
**Fix:** Wrapped the search bar through role list (THIS WEEK, EARLIER sections, empty states) in a `<div>` with `maxHeight: 630, overflowY: "auto", WebkitOverflowScrolling: "touch"`. The outer page chrome (header, score button) remains fixed.
**File:** `src/components/workspace/RoleWorkspace.jsx`

---

## Error 108 — No contextual paywall when daily scoring limit is hit
**Build:** Build 27 prep
**Symptom:** When a free user hit the 10-score monthly limit, the generic upgrade modal appeared with no explanation of why it opened — no mention of a score limit or upgrade benefit for scoring.
**Root cause:** (1) Scoring limit was 10/month — not ideal for daily activation pressure. (2) Both `limitReached` branches in `App.jsx` called `setShowPaywall(true)` without setting `paywallContext`. (3) `PaywallModal` had no `t` prop and all strings hardcoded in English. (4) No scoring-specific copy existed.
**Fix:** Three-step fix: (1) `supabase.js` — changed `limit` from 10 to 5, changed reset from first-of-next-month to tomorrow-midnight UTC. (2) `App.jsx` — both `limitReached` branches now call `setPaywallContext("scoring_limit")` before `setShowPaywall(true)`. Added `t` prop to `<PaywallModal>` render. (3) `PaywallModal.jsx` — full translation overhaul: added `t` prop, `getPlans(t)` helper builds translated plan objects, all hardcoded English strings replaced with `t?.key || "fallback"` pattern. Added scoring-limit gold banner shown when `contextCopy === "scoring_limit"`. Updated FREE_PLAN bullet from "3 roles per month" → "5 roles per day". Added `paywallSubScoringLimit` key in all 7 languages. Also added 60+ translation keys (hero titles, billing toggle, plan taglines/bullets, How It Works, legal text, CTA labels, badges, error messages) to all 7 languages in `translations.js`.
**Files:** `netlify/functions/supabase.js`, `src/App.jsx`, `src/components/PaywallModal.jsx`, `src/i18n/translations.js`

---

## Error 102 — Scoring loading screen coaching prompts English-only for all languages
**Build:** v2.2.1 development
**Symptom:** The reflective question/statement pairs displayed during scoring always showed in English, regardless of the user's language setting.
**Root cause:** `COACHING_PAIRS` array in `VQLoadingScreen.jsx` was a single hardcoded English set with no language branching.
**Fix:** Created `src/i18n/coachingPairs.js` with 3 natively-written pairs per non-English language (es, fr, zh, ar, vi, pt) — not translations of the English set, but independent pairs crafted in each language's voice. `VQLoadingScreen` imports `COACHING_PAIRS_BY_LANG` and selects the active set based on `lang` prop. English retains the full 51-pair weighted pool.
**Files:** `src/i18n/coachingPairs.js` (new), `src/components/VQLoadingScreen.jsx`

---

## Error 109 — Push notification copy hardcoded in English for all language users
**Build:** Build 28 pre-archive (Sprint 4 → 5 transition)
**Symptom:** All scheduled push notifications (reminders, staleness, follow-up, timeline, weekly digest) sent English copy regardless of user's language setting.
**Root cause:** `notify-reminders.js`, `notify-pipeline.js`, and `notify-weekly.js` had hardcoded English strings. No `lang` field existed on `user_devices` and no mechanism existed to pass language preference to server-side notification functions.
**Fix:** (1) Added `lang` column to `user_devices` table (migration `20260502_user_devices_lang.sql`, default `'en'`). (2) Created `netlify/functions/notif-copy.js` — shared translation object with all push copy for all 7 languages (en/es/zh/fr/ar/vi/pt), covering `reminderFallback`, `staleTitle/Body`, `followUpBody`, `timelineTitle/Body*`, `weeklyTitle/Body/Scored/Active/None`. (3) Updated all three notify functions to `select=token,lang` from `user_devices` and call `getCopy(lang)` before building notification payload. (4) `register-device.js` — now accepts `lang` field, stores it on upsert; added `langUpdateOnly` path that patches all device rows for a user when lang changes without re-registering a token. (5) `usePushNotifications.js` — sends `lang` on initial token registration; adds a secondary `useEffect` that fires `langUpdateOnly` patch whenever `lang` prop changes after registration. (6) `App.jsx` — passes `lang` to `usePushNotifications`. (7) All 10 notification toggle translation keys added to all 7 languages in `translations.js`.
**Test:** 123/123 unit tests passing — key completeness, unknown lang fallback, output spot-checks, no-crash for all 7 langs × all function types.
**Files:** `netlify/functions/notif-copy.js` (new), `netlify/functions/notify-reminders.js`, `netlify/functions/notify-pipeline.js`, `netlify/functions/notify-weekly.js`, `netlify/functions/register-device.js`, `src/hooks/usePushNotifications.js`, `src/App.jsx`, `src/i18n/translations.js`, `supabase/migrations/20260502_user_devices_lang.sql` (new)

---

## Error 110 — Notification Settings toggles used wrong font, showed "COMING SOON" subtitle
**Build:** Build 28 pre-archive
**Symptom:** Notification toggle labels in Settings used `var(--font-prose)` at 15px instead of `var(--font-display)` at 17px/500 weight, visually mismatching all other Settings rows (Language, Contact Support, Privacy, Terms). The Notifications section header showed a "COMING SOON" (or translated equivalent) subtitle even though notifications were now live.
**Root cause:** Toggle labels were styled independently from other settings rows during Sprint 4 implementation without checking the existing settings row style pattern. The `settingsNotificationsHint` translation key carried over a "COMING SOON" placeholder from before the feature was built.
**Fix:** (1) Toggle label style changed to `fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500` with `letterSpacing: "0.08em"` on desc — matches all other settings rows exactly. (2) "COMING SOON" subtitle div removed entirely from the Notifications section header. (3) `settingsNotificationsHint` translation key updated in all 7 languages to "Manage push alerts" equivalents (kept in translations.js for future use even though the hint is no longer rendered).
**Files:** `src/App.jsx`, `src/i18n/translations.js`

---

## Error 111 — tryvettedai.com/ had no public marketing page (App Store Guideline 5.1.1 / 1.5 risk)
**Build:** Web (post Build 28 approval)
**Side:** Website / marketing — not the iOS app binary.
**Symptom:** `https://tryvettedai.com/` loaded the React SPA which immediately mounted `SignInGate.jsx` and gated on Sign in with Apple. Apple App Store review (Guideline 5.1.1 — Privacy / Data Collection and Storage; Guideline 1.5 — Developer Information) requires a publicly accessible organization website with no auth wall. Build 28 had cleared review (the issue surfaced post-approval as a forward-looking exposure — any future build would have hit it), but the site was non-compliant and would have flagged on Build 29 or any 5.1.1 audit.
**Root cause:** The product launched with a single SPA entry at `/`. There was no separate static marketing surface; the React app was the only thing the domain served.
**Fix:** Three layered changes.
(1) **Routing:** new netlify.toml redirect topology — `/` serves a static landing, SPA moves to `/app`, `/signin` 302s to `/app`. Old `/* → /index.html` SPA fallback scoped to `/app/*` only.
(2) **Build pipeline:** added `scripts/postbuild-landing.mjs` that runs after `vite build`. It moves the Vite-emitted SPA from `dist/index.html` to `dist/app/index.html`, then copies the canonical landing source (`design/landing/Landing Page.html`, `design/landing/assets/`, `design/landing/reel/`) verbatim into `dist/`. The landing committed to the repo IS the design-system spec — no template, no framework, no "improvements." `npm run sync:design` walks `~/Downloads` for the newest `Vetted Design System*.zip` containing `Landing Page.html` and refreshes `design/landing/` from it.
(3) **Asset namespace collision:** the design system's landing references `assets/tokens.css`, `assets/vetted-logo.svg`, etc., expecting them at `/assets/`. Vite's default `build.assetsDir` was also `assets`, so the SPA's hashed bundle would have collided with the landing's static assets. Set `build.assetsDir = '_assets'` in `vite.config.js`. SPA bundle now lives at `/_assets/index-XXX.js`; landing keeps `/assets/`.
**CSP changes for the demo reels:** the landing embeds three React+Babel JSX iframes from `/reel/*.html` that load React/ReactDOM/@babel/standalone from `https://unpkg.com`. The site's top-level CSP had `frame-src 'none'` and `script-src 'self' 'unsafe-inline'` — would have blocked both the iframes and the unpkg scripts. Top-level CSP relaxed to `frame-src 'self'` (same-origin iframes only). Added a scoped `[[headers]] for = "/reel/*"` block with `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com` (Babel standalone needs eval). Homepage CSP stays strict.
**Verification:** `dist/index.html` is byte-identical to `design/landing/Landing Page.html` (`diff -q` reports IDENTICAL). All five anchor sections present. App Store / mailto / LinkedIn / TikTok external links resolve. All three inline-script systems (industries-counter, trust-counter, reel loader, sticky-CTA hide-near-footer) preserved.
**Files:** `design/landing/**` (new — 21 files committed verbatim), `scripts/postbuild-landing.mjs` (new), `scripts/sync-design-system.mjs` (new), `vite.config.js`, `package.json`, `netlify.toml`. Removed `public/landing.html` (placeholder from earlier in the session). Also: blog index header renamed `The Blog` → `Notes from the founder team` (`public/blog/index.html`, plus footer link on the LinkedIn-scoring post page).

---

## Error 112 — Netlify CLI 25.6.0 crashes parsing multi-line CSP header during local dev
**Build:** Web tooling (no production impact)
**Side:** Developer tooling on the marketing site only.
**Symptom:** Running `netlify dev --dir=dist` to verify redirect/CSP behavior locally crashed on every request with `TypeError: Invalid character in header content ["Content-Security-Policy"]` at `node_modules/netlify-cli/src/utils/proxy.ts:729`. All `curl` probes returned status 000, no body.
**Root cause:** The CLI's proxy layer concatenates the multi-line TOML `Content-Security-Policy = """ ... """` string and passes it to `ServerResponse.setHeader()` without stripping the embedded newlines first. Newlines are illegal in HTTP header values per RFC 7230. Production Netlify edge handles this fine — the CLI's local proxy is the only thing affected.
**Fix:** None at the code level — the CSP is correct. Workaround for local verification: a small redirect-emulator script that parses `[[redirects]]` from `netlify.toml` and walks them against `dist/` to confirm `/`, `/app`, `/signin`, `/privacy`, `/terms`, `/blog` all resolve as expected. Final end-to-end verification (live CSP, anchor scrolls, reel iframe playback, Lighthouse) happens on the Netlify branch-deploy preview URL that PR #2 generates.
**Files:** None modified — documented so future debugging doesn't re-discover the bug.

---

## Error 113 — Stale `npx serve` process kept returning old SPA after dist rebuild
**Build:** Local dev workflow (no production impact)
**Side:** Operational — neither blog nor app code; just a `serve` process behavior.
**Symptom:** Started `npx serve dist -p 5174` to preview the new landing. Browser showed a blank page. `curl http://localhost:5174/` returned 12867 bytes (the old SPA bundle) instead of the 55583-byte landing — even though `dist/index.html` on disk WAS the landing.
**Root cause:** The `serve` process had been started before `npm run build` ran with the new postbuild script. It was holding ETag/file-handle references to the prior `dist/index.html` (the SPA). `serve` doesn't watch the directory for replacements; it reuses cached metadata until the process restarts.
**Fix:** `lsof -ti:5174 | xargs kill && npx serve dist -p 5174` — restart serve after every rebuild. Documented so the "blank page after rebuild" symptom isn't misdiagnosed as a real landing/build problem in the future.
**Files:** None.

---

## Error 114 — Local source tree drifted from git for ~6 weeks; broke Netlify builds
**Build:** Discovered May 9–10, 2026.
**Side:** Repo hygiene + deploy pipeline.
**Symptom:** PR #2's Netlify deploy preview failed with `[UNRESOLVED_IMPORT] Could not resolve '../i18n/coachingPairs.js' in src/components/VQLoadingScreen.jsx`. Audit after committing that single file revealed eleven more modified files sitting uncommitted in the working tree — together representing all the iOS app behavior shipped in Build 28 (Presentation Mode in App.jsx, workspace KPI tiles + scrollable history in RoleWorkspace.jsx, sanitize.js trim removal, FiltersStep/MarketPulse/Onboarding/ScoreEntry/VQAdvocate component edits, Podfile push-notifications pod registration, pbxproj `CURRENT_PROJECT_VERSION 27→28`).
**Root cause:** The team's manual deploy workflow was `edit locally → npm run build → npx cap copy ios → Xcode archive → upload to App Store`. The web SPA had been deployed via `netlify deploy` CLI to `preeminent-torrone-a2b6be` (no GitHub wiring). Nothing in either loop required a `git commit`, and recurring `git status` warnings became habitual to ignore. The result: eight commits' worth of Build 28 source survived only on the founder's Mac, invisible to git history.
**Fix:** One-shot commit "Sync local source tree with Build 28" (`2e874d9`) put everything back in git. Going forward, all deploys flow through the GitHub-linked `celebrated-gelato-56d525` site → `git push` → Netlify auto-builds → production. Manual CLI deploys are now actively discouraged.
**Lesson:** Whenever a Netlify site has `repo_url: null` (i.e. no GitHub integration), production becomes reproducible only from one specific local machine. Audit all Netlify sites in a team for this field once per quarter; any site without `repo_url` is a future "works on my machine" incident.
**Files:** `src/i18n/coachingPairs.js`, `src/App.jsx`, `src/utils/sanitize.js`, `src/components/{FiltersStep,MarketPulse,Onboarding,ScoreEntry,VQAdvocate,workspace/RoleWorkspace}.jsx`, `ios/App/Podfile`, `ios/App/Podfile.lock`, `ios/App/App.xcodeproj/project.pbxproj`.

---

## Error 115 — Dual Netlify site drift caused 3-day Stripe webhook outage
**Build:** Web infrastructure, May 6–9, 2026.
**Side:** Hosting + DNS.
**Symptom:** Stripe sent an alert on May 9: 19 failed webhook delivery attempts since May 6 02:42 UTC against `celebrated-gelato.netlify.app/.netlify/functions/stripe-webhook`. Simultaneously, the production landing page hadn't picked up source changes for weeks despite multiple `git push` events.
**Root cause:** Two Netlify sites coexisted in the Vetted team. (a) `celebrated-gelato-56d525` — wired to the GitHub repo, all PR merges auto-deployed here, the destination Stripe webhooks were configured against. (b) `preeminent-torrone-a2b6be` — no GitHub wiring, manually deployed via `netlify deploy` from the founder's Mac, this is where `tryvettedai.com` was actually pointing as its custom domain. Web traffic went to `preeminent-torrone` (stale code); Stripe webhooks went to `celebrated-gelato` (where the auto-deployed code lived, but where something in the function failed — likely an env var that was only set on one of the two sites and rotated). The two sites drifted apart for months without anyone noticing.
**Fix:** Moved the `tryvettedai.com` custom domain (and `www`) from `preeminent-torrone` → `celebrated-gelato` in the Netlify dashboard. Force HTTPS enabled at Netlify; Cloudflare SSL mode confirmed at Full (strict). Stripe webhook deliveries recovered automatically once main started successfully deploying again. Deleted three orphan Netlify sites (`preeminent-torrone`, `tiny-cassata`, `benevolent-bavarois`) — all had `repo_url: null`, all had zero references in the codebase or DNS.
**Lesson:** "Production runs from THIS Netlify site, period" should be a written fact in the repo's ENV.md or DEPLOY.md, audited monthly. When you can't answer it in one sentence, you've drifted. Pair every custom domain with a single Netlify site name written somewhere git-tracked.
**Files:** None (config-only). Netlify dashboard, Cloudflare DNS panel.

---

## Error 116 — Cloudflare proxy + Netlify edge served stale HTML after deploy
**Build:** Web infra, May 9, 2026.
**Side:** Hosting / CDN.
**Symptom:** After merging PR #2 and confirming a successful Netlify production deploy, `tryvettedai.com/` continued to return 12772 bytes (the old SPA). Direct hits to the canonical Netlify URL `celebrated-gelato.netlify.app` correctly returned 55980 bytes (the new landing). Adding `?v=<timestamp>` query strings made no difference.
**Root cause:** Largely a symptom of Error 115 (dual-site drift). `tryvettedai.com` was on the wrong Netlify site, so the "successful deploy" never invalidated *its* edge cache. Cloudflare was also in the path (DNS resolves to CF IPs `104.21.x.x`, `172.67.x.x`) but inspection showed `cf-cache-status: DYNAMIC` — Cloudflare was passing through, the staleness was at Netlify's edge for the wrong-site mapping.
**Fix:** Once the domain was moved to the correct Netlify site (Error 115's fix), the edge cache invalidated on the next deploy and content went live within ~60s.
**Lesson:** "Cache is stale" can be one of three layers — Cloudflare CDN, Netlify Edge, or browser. Always check headers (`cache-status`, `cf-cache-status`, `age`) before assuming the obvious one. In this case the symptom looked like CF caching, but the actual fault was a misrouted Netlify site upstream.
**Files:** None.

---

## Error 117 — Capacitor iOS app loaded the marketing landing instead of the React SPA
**Build:** Discovered May 10, 2026 during a Build 29 Xcode test.
**Side:** iOS / Capacitor.
**Symptom:** Running the app on a physical iPhone via Xcode showed the marketing landing page (tryvettedai.com hero content) inside the WKWebView, instead of the Sign in with Apple gate / React SPA.
**Root cause:** The PR #2 postbuild script (`scripts/postbuild-landing.mjs`) moved the Vite-built SPA from `dist/index.html` to `dist/app/index.html`, then copied the design-system landing into `dist/index.html`. This was correct for the web — Netlify serves `dist/index.html` at `/` natively, and `/app` rewrites to the SPA. But Capacitor's `webDir: "dist"` config means `npx cap copy ios` copies `dist/` wholesale into `ios/App/App/public/`, and the WKWebView always loads `public/index.html` as the launch entry. The iOS bundle's "first paint" became the marketing landing, with the SPA buried in an `app/` subdirectory the iOS app never navigates to.
**Fix:** Reverted the postbuild swap. `dist/index.html` stays as the SPA (Capacitor-friendly). The landing now lives at `dist/landing.html`. `netlify.toml` gained `/ → /landing.html` force rewrite and `/app + /app/* → /index.html` rewrites so the web routing matches the iOS bundle's reality. Verified `ios/App/App/public/index.html` returns to 13048 bytes with `id="root"` after `npx cap copy ios`.
**Lesson:** Every change that touches `dist/index.html` needs to be evaluated against BOTH the Netlify edge AND the Capacitor iOS bundle. They consume the same artifact directory but expect different entry points. After any postbuild change, run `npx cap copy ios` and inspect `ios/App/App/public/index.html` — that's the iOS launch HTML. If it's not the SPA, you have a Build-29-or-it-stays-broken bug on your hands.
**Files:** `scripts/postbuild-landing.mjs`, `netlify.toml`.

---

## Error 118 — Stuck "Scoring…" workspace_roles rows on any scoring failure
**Build:** Latent in Build 28; discovered May 10, 2026 during ScrapingBee testing.
**Side:** iOS app + Supabase backend.
**Symptom:** Any fetch-jd or Anthropic-scoring failure left a `workspace_roles` row with `status="queued"` in the database. The workspace UI rendered such rows as a permanent "Scoring..." spinner. Multiple stuck rows accumulated across sessions — 9 from prior days, plus 1 new each time a LinkedIn URL paste failed.
**Root cause:** `src/App.jsx#scoreOpportunity`'s catch block (line ~815) explicitly upserted the pre-queued row with `status="queued"` and a `notes` field describing the failure. The original intent had been "preserve the card with error info" but the workspace UI doesn't render `notes` for queued-status rows — it just shows the spinner. So failures were silently invisible to the user.
**Fix:** Two layers, both committed today. (a) **Server-side backstop:** new `netlify/functions/workspace-sweep.js`, cron'd hourly, deletes `workspace_roles` where status ∈ (queued, scoring, in_progress, pending) AND `created_at < now() - 5min` AND `vq_score IS NULL`. Manually invokable via `POST /.netlify/functions/workspace-sweep` with `X-Vetted-Sweep-Secret: VETTED_SECRET` header for the one-time cleanup of pre-existing stuck rows. (b) **Client-side proper fix:** rewrote the catch block to filter the role out of local React state AND fire `dbCall("deleteWorkspaceRole", …)` to hard-delete the Supabase row. Web `/app` users get the client fix on the next Netlify deploy; iOS users get it when Build 29 is archived + uploaded.
**Lesson:** UI state branches that persist an "in-progress" marker after a caught failure are a known anti-pattern. Always pair "exception caught" with "intermediate state cleaned up." For shared state (DB rows that drive UI), always pair a client-side mutation path with a server-side sweep so transient client crashes don't leave orphan rows visible to other devices on next sync.
**Files:** `src/App.jsx`, `netlify/functions/workspace-sweep.js` (new), `netlify.toml`.

---

## Error 119 — ScrapingBee request returned HTTP 400 (parameter validation)
**Build:** Web infra, May 10, 2026.
**Side:** Backend fetch-jd function.
**Symptom:** After SCRAPINGBEE_API_KEY was correctly set in Netlify (confirmed via runtime `env_diag` log showing `sb_key_set: true, sb_key_len: 80`), the function still failed every LinkedIn URL with `[fetch_jd] both providers failed perplexity=fetch_failed_or_short scrapingbee=http_400`. Total time was ~3s — Perplexity ~3s + ScrapingBee ~1s (fast reject). ScrapingBee dashboard showed 0/1000 credits consumed, confirming the calls were being received but rejected before any scrape work.
**Root cause:** My initial ScrapingBee request bundled `render_js=true` + `premium_proxy=true` + `block_resources=true` + an `extract_rules` JSON payload. The combination wasn't valid for the free tier — most likely `extract_rules` syntax used `type: "text"` instead of the correct `output: "text"`, combined with `block_resources` overlap on rendered pages.
**Fix:** Simplified the request to the minimum viable params: `api_key + url + render_js + premium_proxy`. ScrapingBee returns raw rendered HTML; the existing tag-stripping fallback in `tryScrapingBee` handles the rest.
**Lesson:** When integrating a new external API, ship the smallest request shape first. Tune for output quality (extract_rules, block_resources) only after the baseline call succeeds. Verify with the vendor's dashboard credit counter — zero consumed = request never reached their workers.
**Files:** `netlify/functions/fetch-jd.js`.

---

## Error 120 — SCORE tab passed raw URL to Anthropic instead of fetching JD first
**Build:** Discovered May 10, 2026 during end-to-end LinkedIn URL testing.
**Side:** iOS app (and web /app — both run the same React SPA).
**Symptom:** With ScrapingBee live and working server-side (verified via curl returning 12k chars of JD content), the SCORE tab on iOS still failed every LinkedIn URL paste with `[score_opportunity] Could not parse scoring response — no JSON found`. Total time ~3s — faster than fetch-jd should take with ScrapingBee. A temporary debug log of Anthropic's raw response revealed the smoking gun: *"I appreciate the detailed framework, but I'm unable to access the LinkedIn job posting at the URL provided. The link itself contains no job description content between the delimiters in your prompt."* Anthropic was receiving the URL as the JD content, not the scraped text.
**Root cause:** `src/components/ScoreEntry.jsx#handleSubmit` was a one-line pass-through: `onScore(val, isUrl ? val.trim() : "")`. When a URL was pasted, `val` (the URL string) was sent to `App.jsx#scoreOpportunity` as the `jd` argument. The prompt then wrapped the URL between `<job_description>…</job_description>` tags and asked Anthropic to score it. Anthropic correctly responded that the URL contained no JD content — but in prose, not JSON, so the parser threw "no JSON found." `Dashboard.jsx` and `RoleWorkspace.jsx` both call fetch-jd first and only pass the *fetched JD text* to onScore. ScoreEntry was missed in earlier refactors.
**Fix:** Rewrote `handleSubmit` to mirror the Dashboard pattern. URL inputs now call `/.netlify/functions/fetch-jd`, await the response, and pass `data.jd` (the actual scraped JD text) to onScore. Plain text inputs unchanged. Added visible "FETCHING…" spinner and inline error banner. Threaded `authUser` through from App.jsx so session-auth on the function runs.
**Lesson:** Three components in the same product (Dashboard, RoleWorkspace, ScoreEntry) all accept URL or text input and trigger scoring. They share zero code. When one is fixed (Dashboard added fetch-jd long ago), the others can silently drift. Worth extracting a shared `useScoreSubmit(jd|url) → handler` hook so the URL→fetch-jd→onScore path lives in one place. Queued as cleanup, not blocking.
**Files:** `src/components/ScoreEntry.jsx`, `src/App.jsx` (added `authUser` prop wiring).

## Error 121 — GET MY VQ for URL silently failed (SyntheticEvent passed as overrideVal)
**Build:** Discovered May 11, 2026 in Build 29.
**Side:** iOS app and web /app.
**Symptom:** User pasted a LinkedIn URL into the SCORE tab, tapped GET MY VQ → nothing happened. The "Try a sample role" button worked fine. URL was visibly in the textbox, button was enabled, but tap produced no scoring, no fetch, no error.
**Root cause:** `<button onClick={handleSubmit}>` in `ScoreEntry.jsx` caused React to pass a SyntheticEvent as the first argument (`overrideVal`). The function had `const source = (overrideVal ?? val).trim()`. The event object is truthy so `??` returned the event, and `.trim()` threw a `TypeError` silently inside the async handler — no console error reached the surface because no error boundary caught async throws from event handlers. Sample button worked because `handleTrySample` called `handleSubmit(SAMPLE_JD)` with a string explicitly.
**Fix:** Type-guard the override: `const sourceCandidate = typeof overrideVal === "string" ? overrideVal : val;`. Only treat overrideVal as the source if it's actually a string; otherwise fall back to component state.
**Lesson:** Async event handlers bound to onClick that accept positional args are a footgun in React. Either bind with `() => handleSubmit()` to suppress the event arg, or type-guard the first parameter at the top of the function. The latter is safer for handlers also called externally (prefill flow, sample button).
**Files:** `src/components/ScoreEntry.jsx`
**Commit:** c5a53f3

## Error 122 — Phantom filter cards (Compensation, Location) appeared in VQ results
**Build:** Discovered May 11, 2026 in Build 29.
**Side:** iOS app and web /app.
**Symptom:** Score result FILTERS tab showed 6 cards (Compensation 1.0, Location 1.0, Financial Accountability, Clear Success Measures, Role Integrity, Access to Leadership) even though the user's framework had only 5 filters. The two phantoms also silently skewed the weighted VQ score because they fell through `filters.find()` to weight 1.0. A first-pass strict-id filter (commit 688f0ba) then dropped *all* cards because the canonical IDs didn't match the model's invented IDs — FILTERS tab went empty.
**Root cause:** Two compounding issues. (1) The Anthropic prompt sent filter *names* but not the canonical `filter_id` — the model invented its own IDs (e.g. `financial_accountability` instead of `pl_ownership`). (2) The candidate profile section explicitly mentions compensation and location preferences, so the model "helpfully" added scoring cards for those even though they weren't in the framework. The strict-id filter blocked everything because names matched but IDs didn't.
**Fix:** Three layers. (a) Include `filter_id: "pl_ownership"` etc. in each prompt filter definition so the model echoes the canonical ID back. (b) Add an explicit prompt instruction: "Score ONLY the filters listed above. Do not invent additional filters." (c) Client-side match by filter_id first, fall back to filter_name against any localized name in the framework. Drop anything that doesn't match. Applied identically to streaming + buffered paths.
**Lesson:** When the prompt mentions context fields (comp, location) and the response shape is a free-form array, the model will fill the array with what it has context to score — not what you asked. Always send canonical IDs in the prompt definitions AND filter the response shape on the client to a known allowlist.
**Files:** `src/App.jsx`
**Commits:** 688f0ba, 9f7a4a0

## Error 123 — `advocateNotifyHint` still said WORTH-PAUSING after sev3 renamed to HEADWIND
**Build:** Discovered May 11, 2026 in Build 29.
**Side:** iOS app and web /app.
**Symptom:** VQ Advocate notification preference still read "WORTH-PAUSING ONLY" (and equivalent severity-style strings in 6 other languages) even though `advocateSev3` itself had been renamed to HEADWIND across all 7 languages two builds prior.
**Root cause:** Incomplete rename. The previous PR updated only `advocateSev3` and skipped the parallel `advocateNotifyHint` strings in `src/i18n/translations.js`.
**Fix:** Updated `advocateNotifyHint` in all 7 languages (en/es/zh/fr/ar/vi/pt) to match HEADWIND terminology.
**Lesson:** Translation refactors should grep for *all* strings referencing the renamed concept, not just the most obvious one. `advocateSev3` and `advocateNotifyHint` were both downstream of the same conceptual change.
**Files:** `src/i18n/translations.js`
**Commit:** ac9a4d3

## Error 124 — Share Extension URL didn't auto-prefill on first try (cold-launch race)
**Build:** Discovered May 11, 2026 in Build 29.
**Side:** iOS app (Share Extension target + main app target).
**Symptom:** Share a LinkedIn URL from another app → tap Vetted → tap "Score in Vetted →" → return to Vetted manually → SCORE tab activated but URL not in textbox, no auto-scoring. Worked on 2nd and later shares within the same session.
**Root cause:** Multi-part cold-launch race. (1) `extensionContext.open()` returns false on iOS 26 from Share Extensions even when called from a user-initiated button tap. (2) The backup channel was App Group UserDefaults read in `AppDelegate.applicationDidBecomeActive`, which then synthesized a custom-scheme deep link via `ApplicationDelegateProxy.application(_:open:options:)` — but the JS `appUrlOpen` listener wasn't attached yet when this fired (React tree still mounting on cold launch). (3) Initial retry window for WebView discovery was only 6s, not enough to cover sign-in + onboarding hydration. (4) AppDelegate cleared the App Group entry before injection was confirmed; on timeout the URL was lost forever.
**Fix (layered, in order shipped):**
- App Group write in Share Extension + `applicationDidBecomeActive` reader in main app's AppDelegate (`d347a3d`)
- localStorage fallback in App.jsx + diagnostic console logs (`7eae906`)
- OSLog diagnostics in AppDelegate (`7da67cc`)
- AppDelegate walks view tree for WKWebView, `evaluateJavaScript` writes URL to `localStorage` + dispatches `CustomEvent('vetted-share-url')`. ScoreEntry reads localStorage on mount; App.jsx listens for the custom event + visibilitychange (`15de509`, `aad0a75`)
- Extended retry window from 6s to 30s (60 × 0.5s); only clear App Group after JS write returns "ok" sentinel (`9a1b5c8`)
- Direction A visual redesign initially only handled `UTType.url`; added fallback to `UTType.text` / `UTType.plainText` (LinkedIn often shares plain text containing the URL) (`54b2be4`)
**Lesson:** Share Extensions on iOS 26 cannot reliably open the host app from any path — Apple's intended pattern is "user manually returns to host app, host app discovers the share via App Group." Build for that pattern from the start. Custom events + localStorage + a long retry window proved more reliable than trying to synthesize URL opens. Also: when grafting a third-party visual redesign onto working logic, audit for capabilities the redesign dropped (here: App Group write + text-type fallback).
**Files:** `ios/App/App/AppDelegate.swift`, `ios/App/VettedShareExtension/ShareViewController.swift`, `src/App.jsx`, `src/components/ScoreEntry.jsx`
**Commits:** d347a3d, 7eae906, 7da67cc, 15de509, 9a1b5c8, aad0a75, 54b2be4

## Error 125 — Direction A Share Extension redesign dropped App Group write
**Build:** Discovered May 11, 2026 during Build 29 share-extension visual refresh.
**Side:** iOS Share Extension target.
**Symptom:** Incoming Direction A `ShareViewController.swift` (visual redesign authored separately) used a responder-chain `openURL:` hack to open the main app from the share extension. That selector is categorically blocked on iOS 26. The file also didn't write to App Group UserDefaults — so even if the responder-chain hack had worked on an older iOS, the main app's AppDelegate fallback (which depends on the App Group entry) had nothing to recover.
**Root cause:** Visual redesigner was unaware of (a) iOS 26 share-extension open restrictions and (b) the App Group → AppDelegate fallback architecture already shipping in the prior version.
**Fix:** Grafted the working open logic from the previous controller onto the new visual design: App Group write (URL + timestamp under `pending_share_url` key in `group.com.vettedai.app`) + `extensionContext.open()` (best-effort, works pre-iOS 26) + os_log diagnostics. Dropped the responder-chain hack entirely.
**Lesson:** When accepting a visual redesign from an outside collaborator, diff capability — not just style. Native iOS subsystems are easy to break in ways that don't show up at compile time. Always retain the working open path + backup channel and only swap presentation.
**Files:** `ios/App/VettedShareExtension/ShareViewController.swift`
**Commit:** 0a97c8a

## Error 126 — `ReferenceError: Can't find variable: currency` on Edit Profile (iOS crash)
**Build:** Discovered April 27, 2026 (back-ported to canonical log May 11, 2026).
**Side:** iOS app and web /app.
**Symptom:** App crashed on iOS immediately after tapping "Edit Profile" from the profile tab. Red error overlay in the WebView surfaced "ReferenceError: Can't find variable: currency".
**Root cause:** `FieldCard` component in `Onboarding.jsx` referenced `currency` in its JSX (for the compensation/threshold steps) but did not list `currency` in its prop destructuring. The variable was implicitly `undefined` in the render scope, which Safari's strict-mode JIT flagged as a ReferenceError where a missing global would otherwise pass silently in other engines.
**Fix:** Added `currency` to `FieldCard`'s destructured props: `function FieldCard({ step, value, onChange, onSubmit, direction, t, currency })`. Threaded `currency={currency}` from `OnboardStep` down to `FieldCard` in the JSX.
**Lesson:** Prop-drilling between parent/child components without a TypeScript layer or PropTypes means missing destructures only surface at runtime on specific code paths. The compensation/threshold steps are deep in the onboarding flow, so this didn't trip during initial dev — only when Edit Profile re-entered those steps with `currency` actively referenced.
**Files:** `src/components/Onboarding.jsx`

## Error 127 — Sign-in / onboarding screen flash on cold launch for already-signed-in users
**Build:** Discovered April 27, 2026 (back-ported to canonical log May 11, 2026).
**Side:** iOS app and web /app.
**Symptom:** Users who were already signed in briefly saw the onboarding or sign-in screen for ~200–500ms on cold launch before the app jumped to the workspace. Felt unprofessional and confusing.
**Root cause:** `restoreSession()` in `useAuth.js` called `setAuthUser(...)` synchronously from cached credentials, but the async Supabase fetch (for the saved profile + workspace data) hadn't returned yet. During the in-flight fetch, `authUser` was truthy but `step` was still its default `"onboard"` — so the render path for "onboarding step" briefly fired before the loaded profile triggered the transition to `step === "workspace"`.
**Fix:** Added a `sessionRestoring` state to `useAuth.js` that starts `true` and is set to `false` only in the `finally` block of the restore flow (covers both success and error paths). App.jsx renders a blank/branded splash while `sessionRestoring === true`, suppressing all other screens until the restore resolves.
**Lesson:** Any auth/session restore that has both a sync cache hit and an async source-of-truth fetch will flash unless gated by an explicit "restoring" flag. Cheap, mandatory.
**Files:** `src/hooks/useAuth.js`, `src/App.jsx`

## Error 128 — Edit Profile opened legacy RegionGate screen instead of name step
**Build:** Discovered April 27, 2026 (back-ported to canonical log May 11, 2026).
**Side:** iOS app and web /app.
**Symptom:** Tapping "Edit Profile" from the profile tab showed a legacy region-selection screen (US / Canada / UK chooser) before any field could be edited. User reaction: "delete/remove/obliterate it permanently."
**Root cause:** The `RegionGate` component was the first thing rendered when `step === "onboard"`. It had been removed from the conditional logic in App.jsx in a prior refactor, but the component definition (84 lines) was still in `Onboarding.jsx` and the `OnboardStep` flow still routed to it on entry. There was also no mechanism to jump directly to a specific step.
**Fix:** Deleted the entire 84-line `RegionGate` function from `Onboarding.jsx`. Added an `initialStep` prop to `OnboardStep` that uses `findIndex` to jump directly to any step by ID (used by all the per-field EDIT buttons later — see Error 80). Defaulted `profile.country` to `"us"` so the country wasn't an unresolved field after RegionGate's removal.
**Lesson:** When deprecating a screen mid-flow, delete the component, not just its render-gate. Dead code in a render path will reattach itself the moment a new entry point is wired.
**Files:** `src/components/Onboarding.jsx`, `src/App.jsx`

## Error 129 — App Store Connect rejected Build 29 with NSExtensionActivationRule error 90362
**Build:** Discovered May 11, 2026 during first Build 29 archive upload.
**Side:** iOS Share Extension target (Info.plist).
**Symptom:** Archive uploaded to App Store Connect, then rejected with: "Invalid Info.plist value. The value for the key 'NSExtensionActivationRule' in bundle App.app/PlugIns/VettedShareExtension.appex is invalid. Please refer to the App Extension Programming Guide" (error code 90362).
**Root cause:** `NSExtensionActivationRule` was set to the string `"TRUEPREDICATE"`. That value is accepted by Xcode for development builds (so the extension shows in the share sheet for any content type during dev) but App Store submissions require an explicit dictionary listing the supported content types — never a wildcard predicate.
**Fix:** Replaced the string with a dictionary listing the actual content types Vetted supports:
```xml
<key>NSExtensionActivationRule</key>
<dict>
  <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
  <integer>1</integer>
  <key>NSExtensionActivationSupportsWebPageWithMaxCount</key>
  <integer>1</integer>
  <key>NSExtensionActivationSupportsText</key>
  <true/>
</dict>
```
Build number stayed at 29 — Apple's validation rejection happens before the binary is accepted, so the number isn't consumed.
**Lesson:** TRUEPREDICATE is a dev-only convenience. Before every archive, audit Info.plist for any wildcard activation values. Also: list-the-types-you-mean is the right pattern anyway — Vetted shouldn't appear when sharing photos, contacts, or files.
**Files:** `ios/App/VettedShareExtension/Info.plist`
**Commit:** 8a7259d

## Error 130 — Indeed share URL produced misleading 1.0 score with `UNABLE_TO_EVALUATE` title
**Build:** Discovered May 11, 2026 during Build 29 testing.
**Side:** Netlify function `fetch-jd.js` + UI rendering in App.jsx.
**Symptom:** User shared a Bilingual Quality Manager job from the Indeed iOS app via the new Share Extension. URL: `https://www.indeed.com/viewjob?jk=5e4cc8ded44c1827&from=appshareios`. Share flow worked end-to-end (URL prefilled, scoring auto-triggered) but the result card showed:
- VQ score: 1.0
- Title: "UNABLE_TO_EVALUATE"
- Company: "UNABLE_TO_EVALUATE"
- Rationale: "Job description content is unavailable. No evaluation possible without access to role details, scope, reporting structure, success metrics, or financial accountability language."
- Real gap: "Job posting content failed to load; cannot assess against any filter criteria"

**Root cause:** Three compounding issues. (1) `fetch-jd` had no Indeed-specific Perplexity prompt — only LinkedIn was special-cased. Perplexity returned thin/apologetic prose for Indeed. (2) ScrapingBee tier-2 returned content (likely an anti-bot challenge page) that was non-empty but useless. The only length check (`text.length < 80`) was too lenient — the anti-bot page had hundreds of chars of buttons, footer text, etc. (3) The model received the garbage content, correctly declined to evaluate, and used the string `"UNABLE_TO_EVALUATE"` for the `role_title` and `company` fields. The UI rendered them raw. (4) The Indeed mobile-app share URL has `?from=appshareios` which routes the scrapers to a different (lighter, harder-to-parse) view than the canonical URL.

**Fix (four parts):**
- Strip noisy share-source query params (`from`, `trk`, `gh_src`, `utm_*`, `ref`) before fetching so we always hit the canonical job URL.
- Add `looksLikeJobDescription()` heuristic: text must be ≥400 chars, contain ≥2 JD keywords (responsibilities, qualifications, experience, etc.), and contain no anti-bot blockers (verify-you-are-human, captcha, please enable javascript, etc.). Applied to both Perplexity and ScrapingBee outputs. Failure returns a clear "not_a_job_description" error so the user sees a paste-the-text prompt instead of a misleading score.
- Added Indeed-aware Perplexity prompt (parallel to LinkedIn-aware) so Perplexity knows what JD structure to extract.
- `cleanString()` helper in App.jsx scrubs JSON-key-looking tokens (`UNABLE_TO_EVALUATE`, `NOT_PROVIDED`, etc.) from `role_title`/`company` before render — if a bad fetch ever slips through, the UI still shows "Unknown Role" / "Unknown Company" instead of raw uppercase tokens.

**Lesson:** Length-based validation alone is insufficient for anti-bot detection. Real JDs share a small set of keywords across all sources; checking for them catches captcha pages, login walls, and apology prose that all pass naive length floors. Also: any time the model can return non-spec values (like `"UNABLE_TO_EVALUATE"` instead of one of the documented recommendations), the UI must defensively map them to safe defaults.
**Files:** `netlify/functions/fetch-jd.js`, `src/App.jsx`
**Commit:** 9702db9

## Error 131 — Push notifications never delivered: register-device function 502'd for the entire history of the app
**Build:** Discovered May 17, 2026 during Build 30 notification verification work.
**Side:** Netlify function `register-device.js` + iOS app push pipeline.
**Symptom:** No user had ever received a push notification despite the in-app permission toggles working and APNs env vars being set in Netlify. The `notify-pipeline` and `notify-reminders` cron jobs ran successfully but had no device tokens to deliver to. Direct curl to send-notification returned token-rejected errors. The diagnostic that surfaced the root cause was a 502 response on the `register-device` endpoint with the runtime error: `Cannot find package '@supabase/supabase-js' imported from /var/task/netlify/functions/register-device.mjs`.
**Root cause:** `register-device.js` was the ONLY function in the codebase importing `@supabase/supabase-js`. Every other Supabase-touching function (`dashboard-data.js`, `workspace-sweep.js`, `fetch-jd.js`, etc.) used raw `fetch` against Supabase PostgREST. Netlify's function bundler doesn't auto-include the `@supabase/supabase-js` package for this function context, so the deployed `.mjs` couldn't resolve the import. The function crashed at module load with `ERR_MODULE_NOT_FOUND` and returned 502 on every invocation — including the iOS app's attempts to register its APNs token.

This was the silent root cause of every downstream notification symptom: empty `user_devices` table, scheduled jobs sending zero pushes, "I never get notifications" complaints. The function had been broken since the day it was written; nobody noticed because the failure was a 5xx that the iOS app silently swallowed in a fire-and-forget POST.
**Fix:** Rewrote `register-device.js` using raw `fetch` against Supabase PostgREST — the same pattern as every other Supabase-touching function. Upsert via `POST /rest/v1/user_devices?on_conflict=apple_id,token` with `Prefer: resolution=merge-duplicates,return=minimal`. No external dependency, no bundling risk.
**Lesson:** A function that's used fire-and-forget (no return value checked) can silently 5xx for months/years without anyone noticing. Going forward: any function POSTed by the iOS app should have its response status logged on the client side at least at WARN level, even on fire-and-forget paths. And consistency matters — if every other function in the codebase uses raw fetch for Supabase, the outlier should be brought in line, not the other way around.
**Files:** `netlify/functions/register-device.js`
**Commit:** 4d395dd

## Error 132 — Supabase env var name drift across four notification functions
**Build:** Discovered May 16, 2026 in early notification debugging.
**Side:** Netlify functions: `register-device.js`, `notify-reminders.js`, `notify-pipeline.js`, `notify-weekly.js`.
**Symptom:** All four notification-pipeline functions referenced `process.env.SUPABASE_URL` and `process.env.SUPABASE_SERVICE_KEY` while the rest of the codebase used `VT_DB_URL` and `VT_DB_KEY`. Netlify production has only the `VT_DB_*` names set, so the four functions failed at Supabase auth with no useful error surface — the iOS app couldn't register device tokens, scheduled jobs couldn't read `user_devices`, etc. This was orthogonal to Error 131 but compounded with it.
**Root cause:** The notification functions were written before the codebase had converged on `VT_DB_*` as the canonical env var names. They drifted and were never reconciled.
**Fix:** Normalized all four functions to read `process.env.VT_DB_URL || process.env.SUPABASE_URL` (and the key equivalent) so the canonical name is preferred but the legacy name still works during any transition. Also documented `VT_DB_URL`, `VT_DB_KEY`, `PERPLEXITY_API_KEY` in `ENV.md` — they were load-bearing but undocumented.
**Lesson:** Env var renames need a project-wide grep + reconcile pass, not just a swap in the files touched at the time of the rename. A `||` fallback pattern for env vars is a small cost that prevents the next rename from breaking surfaces nobody remembered.
**Files:** `netlify/functions/register-device.js`, `notify-reminders.js`, `notify-pipeline.js`, `notify-weekly.js`, `ENV.md`
**Commit:** 8e080b7, c641f58

## Error 133 — register-device missing CORS allowlist for capacitor://localhost
**Build:** Discovered May 17, 2026 mid-debug after Error 131 fix.
**Side:** Netlify function `register-device.js`.
**Symptom:** Even after fixing the bundling crash, iOS app's device-registration POST failed silently with empty error `{}`. The fetch in the JS bridge code (`src/App.jsx`'s native push token listener) was logging `[push-bridge] register-device failed: {}` — empty body means CORS preflight rejected before the response could be read.
**Root cause:** `register-device.js`'s ALLOWED_ORIGINS list contained only `https://vettedai.netlify.app`, `https://app.vetted.ai`, and `http://localhost:5173`. The iOS Capacitor WebView's origin is `capacitor://localhost` — that wasn't in the list, so OPTIONS preflight returned a CORS header that didn't permit the actual origin, and the browser rejected the response. The actual POST never executed.

Also: response headers on the POST itself were missing `Access-Control-Allow-Origin` entirely — only the preflight had CORS headers. Modern browsers require ACAO on every response, not just preflight.
**Fix:** Added `capacitor://localhost`, `https://celebrated-gelato-56d525.netlify.app`, `https://tryvettedai.com` to the allowlist. Extracted CORS headers into helpers (`corsBase`, `jsonHeaders`) and applied to every response shape (200, 400, 401, 403, 500, 503, 204 preflight).

Also caught: `Content-Type: application/json` in a 204 response is a spec gray area that some edge runtimes reject — split `corsBase` (for 204) from `jsonHeaders` (for body responses).
**Lesson:** The Capacitor WebView origin (`capacitor://localhost`) needs to be in every iOS-callable function's CORS allowlist. Add it to ENV.md or a shared constants file. A grep across `netlify/functions/` for `ALLOWED_ORIGINS` would catch any function missing it.
**Files:** `netlify/functions/register-device.js`
**Commits:** 0cf2663, cb3cd65

## Error 134 — Capacitor Push plugin never delivered APNs token to JS handlers despite iOS issuing one
**Build:** Discovered May 17, 2026 during native-vs-JS pipeline isolation testing.
**Side:** iOS app + Capacitor `@capacitor/push-notifications` v8.0.3 plugin.
**Symptom:** `Push.requestPermissions()` returned `granted=true`. `Push.register()` ran without throwing. iOS Settings → Vetted → Notifications showed the Notifications row (app was push-capable). BUT the JS `registration` listener attached via `Push.addListener("registration", ...)` never fired — the JS layer never received the token, so `register-device` was never called.

Confirmed via a direct native AppDelegate diagnostic: `didRegisterForRemoteNotificationsWithDeviceToken` callback fired at the iOS native layer with a valid token (we logged the hex). The token was real and APNs-valid. But the Capacitor plugin's JS bridge never forwarded it to the JS side.
**Root cause:** Unknown specific bug in `@capacitor/push-notifications` v8.0.3 (or possibly a Capacitor 8 bridge issue). The native plugin received the token from iOS but never invoked its JS callback path. Reproducible on multiple test devices.
**Fix:** Bypassed the Capacitor plugin entirely. Added a native AppDelegate handler (`didRegisterForRemoteNotificationsWithDeviceToken`) that calls `evaluateJavaScript` on the WKWebView to (a) write the token to `localStorage.vetted_apns_token` and (b) dispatch a `vetted-apns-token` CustomEvent. App.jsx listens for the custom event and reads localStorage on mount — same pattern as the Share Extension URL bridge we built earlier. With this in place, the Capacitor plugin's broken bridge is irrelevant; the token flows native → WebView → JS → register-device endpoint without ever touching the plugin's JS callback.
**Lesson:** Capacitor plugins, especially official ones, can have silent failures in their bridge layer that no error surface ever indicates. When a plugin is the only thing between native iOS and JS, build a parallel native→WebView path as a backup. Apple's own native callbacks are reliable; the bridge layer is the variable.
**Files:** `ios/App/App/AppDelegate.swift`, `src/App.jsx` (added native APNs token bridge listener)
**Commit:** 84c1d6c

## Error 135 — Wrong APNs sandbox endpoint hardcoded; api.sandbox.push.apple.com is stale
**Build:** Discovered May 17, 2026 by inspecting Apple's Push Notifications Console "Get cURL Command" output.
**Side:** Netlify function `send-notification.js`.
**Symptom:** Even after rewriting `send-notification.js` to use native HTTP/2 instead of the deprecated `apn` library, every sandbox-tier push attempt failed with `BadEnvironmentKeyInToken`. Apple's own Push Notifications Console succeeded with the same token + key + bundle ID, against the sandbox environment, with the same JWT shape.
**Root cause:** Apple renamed the sandbox/development push endpoint from `api.sandbox.push.apple.com` to `api.development.push.apple.com`. The historical alias still resolves (DNS hasn't been pulled) but no longer routes to the modern endpoint that accepts dev-tier device tokens. Every third-party library and most tutorials use the old hostname. Apple's own Console "Get cURL Command" was the only authoritative source revealing the new hostname.
**Fix:** Changed `APNS_HOSTS.sandbox` constant to `api.development.push.apple.com`.
**Lesson:** When a third-party library and Apple's own tooling disagree on something this fundamental (the endpoint hostname), Apple's tooling is correct. "Get cURL Command" in Apple's Push Notifications Console is the source of truth for request shape — use it as the reference when implementing APNs from scratch.
**Files:** `netlify/functions/send-notification.js`
**Commit:** 96c4070

## Error 136 — Deprecated `apn` library v2.2.0 silently broken on modern Node TLS
**Build:** Discovered May 17, 2026 mid-debug.
**Side:** Netlify functions using `apn` package (send-notification, notify-test, notify-reminders, notify-pipeline, notify-weekly).
**Symptom:** Tokens that Apple's Console proved valid against the sandbox endpoint were rejected with `BadEnvironmentKeyInToken` when sent via the `apn` library's `production: false` config. The retry logic that switched between production and sandbox via `apn.Provider({ production: <bool> })` did not actually route to the right endpoint on modern Node + Netlify Edge.
**Root cause:** `apn` v2.2.0 was last updated in 2019. Its HTTP/2 client and TLS handling don't work cleanly against modern Apple APNs endpoints. The library would connect, send the JWT, but in the sandbox-routing path return an error response that surfaced as `BadEnvironmentKeyInToken` even when the actual issue was at the connection layer.
**Fix:** Replaced the `apn` library entirely. `send-notification.js` rewritten to use Node's built-in `http2` module + `jsonwebtoken` (added as direct dependency) for ES256 JWT signing. Direct POST to `api.push.apple.com` or `api.development.push.apple.com`. Parses Apple's JSON error responses for accurate failure reasons. Same prod→sandbox retry logic but at the HTTP level instead of through the library. No `apn` dependency anywhere in the codebase now.
**Lesson:** A 6-year-old library that's deprecated upstream and unmaintained is going to fail silently against modern infrastructure. When the abstraction layer is the unreliable thing, drop to the underlying protocol. Apple's APNs HTTP/2 API is stable, well-documented, and not that hard to implement directly.
**Files:** `netlify/functions/send-notification.js`, `package.json`
**Commit:** f00febb

## Error 137 — APNS_KEY value corrupted in Netlify across multiple paste attempts
**Build:** Discovered May 17, 2026 during APNs key configuration.
**Side:** Netlify environment variable storage.
**Symptom:** Even with the right Key ID + Team ID, every JWT signing attempt failed. Error progression:
1. First paste via Netlify Web UI textarea: newlines stripped from the `.p8` body. PEM still had BEGIN/END markers. OpenSSL DECODER returned `error:1E08010C:DECODER routines::unsupported`.
2. Re-paste with explicit Enter key after BEGIN/END: same DECODER error — the textarea was still collapsing whitespace.
3. Upload via `netlify env:set APNS_KEY "$(cat AuthKey_XXX.p8)" --context production`: the leading `-----BEGIN` was interpreted by netlify-cli's option parser as a flag, value was set without the BEGIN/END headers, `apn` library treated the value as a file path and threw ENOENT on a path containing the masked first bytes of the key.
4. Reordered CLI args with flags before positional: same parser issue.
**Root cause:** Three layers of value corruption depending on the paste method. Netlify Web UI textareas collapse whitespace in some configurations. Netlify CLI's argument parser sees `-----` as a flag prefix regardless of quoting.
**Fix:** Store `APNS_KEY` as base64-encoded `.p8` contents (single line of `[A-Za-z0-9+/=]` — no dashes, no newlines, nothing any parser can mis-interpret). Decode at function runtime: `Buffer.from(APNS_KEY, "base64").toString("utf8")`. Backward compat: if the value still contains `BEGIN PRIVATE KEY`, use as-is (legacy direct-paste). Applied across all five APNs-using functions.

The upload command becomes:
```
base64 -i ~/Downloads/AuthKey_XXX.p8 | tr -d '\n' | pbcopy
# then paste into Netlify Web UI APNS_KEY field
```
**Lesson:** When uploading binary or whitespace-sensitive data via any UI or CLI, encode it to a format the toolchain can't mangle (base64 is the obvious choice). Source-of-truth verification: `openssl pkey -in <file> -text -noout` proves the local file is good; if the server-side function says otherwise, the upload corrupted the value.
**Files:** `netlify/functions/send-notification.js`, `notify-test.js`, `notify-reminders.js`, `notify-pipeline.js`, `notify-weekly.js`
**Commit:** bbced41

## Error 138 — APNs key + Key ID mismatch from multiple .p8 files
**Build:** Discovered May 17, 2026 after APNS_KEY format was fixed.
**Side:** Netlify environment configuration.
**Symptom:** With `APNS_KEY` properly base64-encoded and decoding to a valid PEM, JWT signing succeeded — but APNs still returned `BadEnvironmentKeyInToken` against both production and sandbox endpoints. The JWT was syntactically valid but Apple rejected it.
**Root cause:** The user had multiple `.p8` files in `~/Downloads/` from creating multiple APNs keys in Apple Developer Portal during debugging. The `APNS_KEY` value in Netlify was the base64 of one `.p8` file, but `APNS_KEY_ID` was the 10-char identifier of a *different* `.p8` file. The JWT was signed with Key A but claimed `kid: Key B` in the header. Apple correctly rejected because the signature didn't validate against the kid's expected public key.

Also: Apple Developer Portal had three keys total — "Vetted Auth Key," "Vetted Push Notifications," and "Vetted Sign in with Apple." Only the first two had APNs capability enabled. The Sign in with Apple key was unusable for push but its filename pattern was identical, contributing to confusion.

Finally: the user had a personal Apple Developer account AND a business account; the app's bundle ID was registered under the business team. Some `.p8` files had been generated under the personal account, which couldn't sign JWTs for the business team's bundle ID.
**Fix:** Created one fresh clean APNs key in the business account with the APNs capability explicitly checked. Downloaded the `.p8` immediately (Apple's one-shot download). Uploaded the base64 of THAT file as `APNS_KEY` and the matching 10-char ID as `APNS_KEY_ID`. Verified the pairing with a local Node script (`apns-test.js`) that signed a JWT and POSTed to `api.development.push.apple.com` — returned 200 with empty body, push delivered.
**Lesson:** APNs key pairing is rigid: the `.p8` file's contents and the 10-char Key ID MUST be from the same key in the same team. Mixing keys (even unintentionally) produces JWTs that look valid but fail at Apple's signature verification, with an error code (`BadEnvironmentKeyInToken`) that misleadingly suggests an environment problem. Always create + upload as a pair, never mix. And when an Apple Developer account is part of multiple teams, every key, App ID, and team ID must be consistently from the same team.
**Files:** Netlify env vars only (no code changes)
**Commit:** N/A (operational)

## Error 139 — iOS dev tokens are rejected by production APNs gateway and need explicit retry
**Build:** Discovered May 17, 2026 during dev-build push testing.
**Side:** Netlify function `send-notification.js`.
**Symptom:** Production-signed builds (App Store, TestFlight) get APNs tokens that work against the production endpoint. Xcode-installed dev builds get tokens that only work against the development endpoint. The server has no way to distinguish a dev token from a production token by inspecting the token itself — both are 64-character hex strings.
**Root cause:** Apple encodes the environment indicator inside the device token bytes, but the wire format doesn't expose it. Sending a dev token to the production endpoint returns `BadDeviceToken` or `BadEnvironmentKeyInToken`. Sending a production token to the development endpoint returns the same.
**Fix:** `send-notification.js` now tries production first, then retries any failures with reason `BadDeviceToken` or `BadEnvironmentKeyInToken` against the development endpoint. Both successes are merged. The function transparently handles dev-build testing and real-user production push without needing to know in advance which is which.

Optional env var `APNS_FORCE_SANDBOX=1` flips the order (sandbox first) for debug testing where you know all tokens are dev tokens.
**Lesson:** When you can't tell dev from production tokens by inspection, try one and retry on the well-known environment-mismatch error codes. Don't store environment hints per device — that adds schema and operational cost for no benefit.
**Files:** `netlify/functions/send-notification.js`
**Commit:** 085dd5c, 482b817

## Error 140 — SettingsTab crash on Send Test Push diagnostic button
**Build:** Discovered May 16, 2026 during notify-test rollout.
**Side:** `src/App.jsx`.
**Symptom:** Tapping the "Send test push" diagnostic in Profile/Settings crashed the app with `ReferenceError: Can't find variable: authUser`. The button was added but the `SettingsTab` component signature didn't destructure `authUser` from props, so the crash happened before the button could even render its loading state.
**Root cause:** When `NotifyTestButton` was added inline in `SettingsTab`, the `authUser` prop wasn't threaded through the component's parameter list. JS only flagged this at runtime.
**Fix:** Added `authUser` to `SettingsTab`'s destructured props and to the call site's prop list.
**Lesson:** Adding a child component that consumes props the parent never received is a common refactor regression. Worth a quick smoke test (open every settings screen) after touching any settings UI. A TypeScript layer would catch this at build time; absent that, manual QA across tabs is the safety net.
**Files:** `src/App.jsx`
**Commit:** 8d6a68e

## Error 141 — VQ Advocate history items rendered in two different font families
**Build:** Discovered May 16, 2026 during notification UI work.
**Side:** `src/components/VQAdvocate.jsx`.
**Symptom:** History section bullet text used Inter sans-serif while the dates in the same row used Libre Baskerville serif (uppercase, tracked). Visually jarring — two type families per row in an editorial-style screen.
**Root cause:** History row headline used `font-family: var(--font-prose)` (Inter). Date used `font-family: var(--font-data)` (Libre Baskerville). The intentional contrast pattern works elsewhere (eyebrow vs body) but not within a tight one-row list where both fonts sit side by side.
**Fix:** Switched the headline to `var(--font-display)` at regular weight so the row uses one type family throughout. Dates kept their existing data-style treatment.
**Lesson:** The two-font system is intentional but the boundary needs to be a clear visual separation (a row apart, a different surface, etc.). Within a single tight row, one type family. Worth a design lint pass on any list/table component.
**Files:** `src/components/VQAdvocate.jsx`
**Commit:** 8d6a68e

## Error 142 — register-device.js used @supabase/supabase-js incompatibly with Netlify Functions v2 bundler
**Build:** Discovered May 17, 2026; documented permanently here as a recurrence guardrail.
**Side:** Already documented as Error 131. Re-emphasized here because Phase-2 redesign added `behavioral-insights.js` and `cover-letter.js` — both deliberately use raw `fetch` to Supabase PostgREST per the lesson learned. Future Netlify functions must follow the same pattern.
**Files:** `netlify/functions/behavioral-insights.js`, `netlify/functions/cover-letter.js`

## Error 143 — Build-30 redesign English-first on new surfaces
**Build:** Documented May 18, 2026 during Build-30 redesign work.
**Side:** All redesign components in `src/components/redesign/`.
**Symptom:** New UI strings (~50) are hardcoded English. Non-English users (es, zh, fr, ar, vi, pt) see English on Build-30 redesign surfaces while continuing to see translated content on pre-redesign surfaces.
**Root cause:** Translating editorial-voice copy across 7 languages requires native-speaker review for brand consistency. Machine translation of phrases like "Where your Pursue comp lands" or "The case" loses intent. Shipping bad translations and rewriting them later is worse than shipping English-first and translating once with a translator in the loop.
**Fix planned:** Build 31 brings a full editorial translation pass on all new strings + the 140-pair anchor library across 7 languages. RTL layout pass for Arabic on the redesign surfaces. Estimated 2 days with translator involvement.
**Files:** Whole `src/components/redesign/` tree
**Decision documented in commit:** 660a17a

## Error 144 — Build-30 workspace square scroll region deferred
**Build:** Documented May 18, 2026 during Phase-2b workspace restructure.
**Side:** `src/components/workspace/RoleWorkspace.jsx`.
**Symptom:** Design spec calls for a single "square" white card with internal vertical scroll containing the role list, with the page itself non-scrolling. Build-30 ships with the existing carousel + multiple lists layout (Top Match hero, KPI tiles, lists for active/applied/archived), retaining the new typography and time-range chip but not the single-square structure.
**Root cause:** Restructuring the entire workspace layout into one square mid-redesign would risk shipping a half-broken workspace. The existing layout has six distinct sections that don't fit one square cleanly. The new pod + typography + chip ship without that restructure; behavior continues to work.
**Fix planned:** Build 31 (or 32) brings the full square layout — consolidating Top Match hero + scrolling list into one square with internal scroll. Existing sections move into the square or get demoted to a hamburger menu.
**Files:** `src/components/workspace/RoleWorkspace.jsx`

## Error 145 — cover-letter.js: wrong env var name + invalid model alias → 401
**Build:** Discovered May 17, 2026 during Build-30 redesign testing on TestFlight.
**Side:** `netlify/functions/cover-letter.js`.
**Symptom:** Coach → Draft cover letter rendered the error "Anthropic 401" in red instead of a draft. Every other Anthropic-backed function in the app worked.
**Root cause:** Two compounding bugs introduced when the file was authored in isolation. (1) Env var read as `process.env.ANTHROPIC_API_KEY`; the rest of the app uses `ANTHROPIC_KEY`. The `if (!ANTHROPIC_API_KEY)` early-return didn't trip because the key resolved to `undefined` and JS coerced it to the `x-api-key` header as the literal string "undefined" → Anthropic returned 401. (2) Model was set to `claude-sonnet-4-5`, which isn't a valid model identifier; even with a valid key the API would have rejected.
**Fix:** Replaced `ANTHROPIC_API_KEY` → `ANTHROPIC_KEY` and model → `claude-haiku-4-5-20251001` (matches every other function — `anthropic.js`, `anthropic-stream.mjs`, `behavioral-intelligence.js`, `parse-resume.js`).
**Lesson:** Any new Netlify function in this repo must consume `ANTHROPIC_KEY` and `claude-haiku-4-5-20251001` until a deliberate decision says otherwise. Worth a lint rule that flags `ANTHROPIC_API_KEY` references inside `netlify/functions/`.
**Files:** `netlify/functions/cover-letter.js`
**Commit:** 7b496a9

## Error 146 — ScoringScreen rendered as rectangular window not edge-to-edge
**Build:** Discovered May 17, 2026 during Build-30 scoring-screen TestFlight check.
**Side:** `src/components/redesign/scoring/ScoringScreen.jsx`.
**Symptom:** The forest scoring backdrop appeared as a rectangle floating inside the app, with paper showing through the safe-area top/bottom. The component was already `position: fixed; inset: 0; z-index: 50`.
**Root cause:** `position: fixed` is relative to the nearest containing block — and #root has `display: flex; flex-direction: column; min-height: 100svh` which created a containing context inside the iOS WebView. The fixed element was constrained to #root, not the viewport. The safe-area insets and any centered max-width on the column were leaking around the edges.
**Fix:** Render the entire ScoringScreen body via `createPortal(body, document.body)`, explicit `100vw × 100dvh`, `z-index: 9999`, with safe-area-inset paddings on top + bottom + sides so the gradient bleeds under the notch and home indicator.
**Lesson:** "Position fixed" is not enough to escape iOS WebView containing blocks. Any truly fullscreen surface must be portal-rendered onto document.body. Applied the same pattern subsequently to ResolveHub, ProfileLanding, and ScoreEntryV2 (Errors 148–149, 152).
**Files:** `src/components/redesign/scoring/ScoringScreen.jsx`
**Commit:** 7b496a9

## Error 147 — TimeRangeChip changed label but didn't filter anything
**Build:** Discovered May 17, 2026 in Build-30 workspace QA.
**Side:** `src/components/workspace/RoleWorkspace.jsx`.
**Symptom:** Switching the chip from 14 DAYS to 24 HOURS or ALL changed the chip's display label but the KPI tiles (PURSUE / SCORED / THRESHOLD), the headline pursue count, the TOP MATCH card, and SCORE HISTORY · N all stayed identical.
**Root cause:** `timeRange` state existed, `inRange(role)` predicate existed, but `inRange` was only applied to `allVisible` for the history list — the KPI tiles, headline, and TOP MATCH all derived from raw `workspaceRoles` upstream of `allVisible`. So the chip was "wired" but only filtered one downstream surface.
**Fix:** Built `inRangeRoles = workspaceRoles.filter(inRange)` once at the top of the derived-data block; `pursueRoles`, `totalScored`, `scoredRoles` (TOP MATCH source) all reroute through it. Chip now visibly changes every count + the TOP MATCH within one render.
**Lesson:** When wiring a global filter to a screen, audit every derived array the UI displays — not just the one closest to the filter UI.
**Files:** `src/components/workspace/RoleWorkspace.jsx`
**Commit:** 7b496a9

## Error 148 — ResolveHub showed paper chrome + sign-out bar above the forest
**Build:** Discovered May 17, 2026 during Build-30 hub QA.
**Side:** `src/components/redesign/score-result/ResolveHub.jsx`, `src/App.jsx`.
**Symptom:** When a score completed, the Resolve hub rendered with the legacy AppHeader ("Vetted" wordmark + tagline + language dropdown + sign-out button) sitting above the forest backdrop. The forest started ~150pt down the screen.
**Root cause:** Two contributors. (1) `step === "result"` in App.jsx still rendered AppHeader + sign-out chrome above `<ScoreResult>` from the legacy flow — every redesign landing renders its own TopBar / Close pill, so the chrome above was just bleeding. (2) ResolveHub used `position: relative; minHeight: 100svh` inside the constrained #root column so even after removing the chrome, the forest didn't extend edge-to-edge.
**Fix:** Dropped the AppHeader + sign-out block from the `step === "result"` branch entirely. Portal-rendered ResolveHub via the Error-146 pattern: `position: fixed`, `100vw × 100dvh`, safe-area insets, `z-index: 9999`. The Close pill in the hub itself is the only chrome.
**Files:** `src/components/redesign/score-result/ResolveHub.jsx`, `src/App.jsx`
**Commit:** 2c0ff3f

## Error 149 — VerdictSeal outer ring read as "PASPURSUE" then "MONITOR / PASS" missing
**Build:** Discovered May 17, 2026 during Build-30 scoring-screen QA; recurred in two more forms before final fix.
**Side:** `src/components/redesign/VerdictSeal.jsx`.
**Symptom v1:** Outer ring rendered `PASPURSUE MONITOR ROTINOM PASPURSUE MONITOR ROTINOM` — the gap between PASS and PURSUE was being eaten. **Symptom v2:** After first fix, the seal at the 158pt sign-in size only rendered `PURSUE … MONITOR` and PASS fell off the visible arc.
**Root cause v1:** Separator was `" · "` (single ASCII space + middot + single ASCII space) with `letter-spacing: 6` on the `<text>` element. The middot is narrow and letter-spacing eats single ASCII spaces, so visually the words collapsed. **Root cause v1.5:** First fix used `"      •      "` (six regular spaces around bullet) but SVG `<text>` collapses runs of ASCII spaces to a single space — same problem. **Root cause v2:** Second fix used four em-spaces (U+2003, non-collapsible) around the diamond separator. Worked on the 220pt scoring seal but each PURSUE/MONITOR/PASS group then took ~50% of the ring; the 158pt sign-in seal couldn't fit a full repeat so PASS was clipped off the visible arc.
**Fix:** Single em-space on each side of the `◆` separator, `repeat(2)` worth of text, `xmlSpace="preserve"` + `white-space: pre` on the `<text>` element belt-and-suspenders. All three verdicts visible on every seal size we use (158 / 220 / 244pt). Also bumped sign-in seal from 158 to 220 (Error 153) so it matches the scoring screen exactly.
**Lesson:** SVG `<text>` collapses runs of ASCII spaces at render time, regardless of CSS `white-space`. Real whitespace inside textPath must come from Unicode whitespace codepoints (em-space U+2003, en-space U+2002, thin-space U+2009) that the renderer cannot collapse. And letter-spacing applies to every glyph including spaces, so a "wide" separator chosen at one font size needs to be re-checked at every size the seal is rendered at.
**Files:** `src/components/redesign/VerdictSeal.jsx`
**Commits:** 7b496a9 (v1 attempt), da924e1 (v2 attempt), 2b3dcf2 (final)

## Error 150 — Behavioral Insights pod disappeared after workspace-door fix
**Build:** Discovered May 18, 2026 in Build-30 workspace TestFlight.
**Side:** `src/components/workspace/RoleWorkspace.jsx`, `src/components/redesign/insights/BehavioralInsightsPod.jsx`.
**Symptom:** Workspace no longer rendered the swipeable pattern carousel at all. User had 200+ scored roles, so eligibility should have been true.
**Root cause:** Self-inflicted regression. While restructuring the workspace into a "door not hallway" (no infinite scroll, only history scrolls internally), I gated the pod behind `showInsightsPod = !!insightsData && insightsData.eligible !== false` to hide a large empty placeholder box when the backend returned `eligible: true` but every sub-aggregation was null (real case for users without comp_floor/location_prefs/recent filter scores). The gate also hid the pod for the (rare) case where data is null AND not loading — and for the (common) case where the user has data but only `synthesis` is populated. Net: pod went away.
**Fix:** Removed the parent-level gate. Pod always renders. Inside the pod, added a third state: when `eligible: true` but `activeCount === 0`, render a single "Insights are warming up" explainer card pointing the user to Profile to seed comp_floor + location_prefs, so the pod never collapses to an empty Pod-with-no-cards box.
**Lesson:** When restructuring a parent layout, don't gate child components on data shape — let the child handle its own loading / empty / partial states.
**Files:** `src/components/workspace/RoleWorkspace.jsx`, `src/components/redesign/insights/BehavioralInsightsPod.jsx`
**Commit:** bc8e0a6

## Error 151 — Score tab carried redundant KPI strip + Pursue cohort row
**Build:** Identified May 18, 2026 during ScoreFlowV2 design handoff review.
**Side:** `src/components/ScoreEntry.jsx`.
**Symptom:** Score tab rendered a THIS WEEK KPI strip (avg VQ / scored / pursue rate) and a Pursue cohort row above the input slab. Same data lives on Workspace (history) and Pulse (cohort) one tap away — duplicating it on entry diluted the tab's job and added vertical bloat.
**Root cause:** ScoreEntry pre-dated the Workspace + Pulse split. Originally it was the only home for "here's where you stand"; once Workspace took on history and Pulse took on cohort, the strip and the row never got removed.
**Fix:** Built `ScoreEntryV2` from the ScoreFlowV2 design handoff. Single-purpose: eyebrow + headline + italic subhead + cream input slab + source chips + tip + empty-state anchor pair. Legacy ScoreEntry kept in source for rollback but no longer rendered. KPIs/cohort removed.
**Files:** `src/components/redesign/score/ScoreEntryV2.jsx` (new), `src/App.jsx`
**Commit:** aefa2b8

## Error 152 — Score tab still scrolled despite overflow:hidden on the entry container
**Build:** Discovered May 18, 2026 after Error 151 fix shipped.
**Side:** `src/components/redesign/score/ScoreEntryV2.jsx`, `src/App.jsx`.
**Symptom:** Even after slimming the surface to fit one phone viewport, the Score tab still scrolled vertically on iOS WebView.
**Root cause:** The entry was wrapped in `<div style={{ height: 100dvh, overflow: hidden }}>` inside the workspace step. That wrapper sat as a sibling of optional tier-banner divs (`pendingTierCheck`, `upgradeSuccess`) and a sibling of `<TabBarV2>` inside `<div className="app">`. When a banner was present, or just from sibling-layout interactions, the parent `.app` could expand past 100svh — and `#root` (min-height 100svh, no max-height) grew to fit, letting the page scroll. `overflow: hidden` on the wrapper clipped its own overflow but not its sibling-driven height.
**Fix:** Match the Error-146 / 148 pattern: portal-render ScoreEntryV2 onto document.body at `position: fixed; 100vw × 100dvh; z-index: 30` (under the z:100 tab bar). Sibling layout in the workspace step can no longer affect it.
**Lesson:** "Make this thing 100dvh and hide its overflow" is necessary but not sufficient on iOS WebView when the parent tree has siblings. Portal-render any surface that must be viewport-locked, full stop.
**Files:** `src/components/redesign/score/ScoreEntryV2.jsx`, `src/App.jsx`
**Commit:** 0a406f9

## Error 153 — Sign-in seal at 158pt clipped PASS off the visible arc
**Build:** Discovered May 18, 2026 during sign-in-screen QA.
**Side:** `src/components/SignInGate.jsx`.
**Symptom:** Sign-in screen showed the new rotating verdict seal but only PURSUE and MONITOR were visible around the outer ring. PASS never appeared.
**Root cause:** The seal text is rendered at fixed 10pt font with letter-spacing 6 regardless of seal size. The full string `PURSUE ◆ MONITOR ◆ PASS ◆ ` takes ~360pt of arc. The 158pt seal had a ~484pt circumference — barely fits one full repeat with no margin, and at this size + letter-spacing combination, only ~63% of one repeat rendered before the textPath ran out of visible arc (PASS was past the end).
**Fix:** Bumped the sign-in seal from 158 → 220pt on a 240pt forest disk, matching the scoring screen exactly (same `outerSpeed: 9`, `innerSpeed: 6`, `opacity: 0.95`). At 220pt the circumference fits a full repeat plus ~75% of a second, so PURSUE / MONITOR / PASS all read clearly. Also dropped LangSwitcher from the sign-in gate per design — language selection lives on the Settings tab.
**Lesson:** Pair Error 149's lesson: when the same component is used at multiple sizes, verify text-on-arc rendering at each size, not just the largest.
**Files:** `src/components/SignInGate.jsx`, `src/components/redesign/VerdictSeal.jsx`
**Commit:** f246f20

## Error 154 — cover-letter surfaced "Anthropic 529" raw + bailed on first failure
**Build:** Discovered May 18, 2026 during Build-30 TestFlight cover-letter QA.
**Side:** `netlify/functions/cover-letter.js`.
**Symptom:** Cover letter screen rendered "Anthropic 529" in red where the draft should have been. The 529 is Anthropic's "Overloaded" — transient server-side condition, usually clears within seconds.
**Root cause:** Two issues compounding. (1) The function bailed on the first non-2xx from Anthropic with no retry, so any momentary upstream blip surfaced as a hard failure. (2) The error message returned to the client was the literal upstream status string ("Anthropic 529") — gibberish to a user.
**Fix:** Wrapped the fetch in a retry loop, up to 3 attempts with linear backoff (800ms → 1800ms), retriable status set = {429, 500, 502, 503, 504, 529}. Most 529s clear inside the second attempt; users never see the error. After exhausted retries, mapped upstream status → human message: 529 → "The drafting model is overloaded right now. Try again in a moment.", 429 → "rate-limited", 5xx → "having a hiccup", network → "Couldn't reach the writer". Raw upstream status still goes in the `detail` field on the response for ops visibility.
**Lesson:** Every LLM-backed function in this app should retry transient codes (429/5xx/529) and surface friendly messages on final failure. Worth retrofitting `anthropic.js`, `anthropic-stream.mjs`, `behavioral-intelligence.js`, `parse-resume.js`, and `market-pulse.js` with the same pattern. Currently only `cover-letter.js` has it.
**Files:** `netlify/functions/cover-letter.js`
**Commit:** b763761

## Error 155 — Paywall still advertised VQ Advocate after Build-30 deprecation
**Build:** Discovered May 18, 2026 during Build-30 paywall QA.
**Side:** `src/components/PaywallModal.jsx`.
**Symptom:** Paywall tier comparison listed "VQ Advocate" as a benefit across Free / Signal / Vantage (monthly and lifetime). Build 30 deprecated VQ Advocate as a named feature — its job is now done by the Behavioral Insights pod on the Workspace door. Users were being sold a feature that no longer exists under that name.
**Root cause:** The paywall bullet lists were authored before the Build-30 redesign and weren't swept when VQAdvocate.jsx and the menu entry were removed.
**Fix:** Removed the three VQ Advocate bullets (paywallFreeBullet4, paywallSignalBullet5, paywallVantageBullet6) from the FREE_PLAN, MONTHLY, and LIFETIME tier definitions. Free drops from 4 → 3 bullets; Signal + Vantage each drop from 8 → 7. Translation keys for those bullets remain in translations.js across all 7 langs as orphans — harmless dead i18n; can be swept in a future i18n cleanup pass.
**Lesson:** Whenever a named feature is renamed or replaced, sweep marketing surfaces (paywall, landing page, menu, App Store metadata) — not just the implementation files.
**Files:** `src/components/PaywallModal.jsx`
**Commit:** ff5c354

## Error 156 — SignInGate seal looked "different" from scoring screen despite identical props
**Build:** Discovered May 18, 2026 during Build-30 sign-in QA, after Errors 149 / 153 ostensibly aligned the two seals.
**Side:** `src/components/SignInGate.jsx`.
**Symptom:** User reported the sign-in seal still didn't match the scoring screen visually, even though both call sites passed identical props: `size 220`, `paused false`, `outerSpeed 9`, `innerSpeed 6`, `opacity 0.95`. The VerdictSeal component renders the same SVG at both call sites; the math is the math.
**Root cause:** Not a seal bug at all — an environment bug. Scoring screen renders the seal on a full-bleed forest backdrop with a 620pt gold halo that bleeds well past the seal. Sign-in screen rendered the seal inside a 240pt circular disk with `overflow: hidden` on paper. Same seal, two visual worlds: one looked embedded in a forest, the other looked like a coin pasted on paper. The user was reading the environmental contrast as a difference in the mark.
**Fix:** Dropped the disk wrapper entirely. Made the entire sign-in gate full-bleed forest using the same gradient stops, 620pt halo, and overlay grain pattern as ScoringScreen's ForestBackdrop. Recolored every text + chrome element for on-dark: ink → `#EDF2EC`, muted → `#7A9A7A`, accent → `#fbbf24`. Sign-in-with-Apple button inverts to cream-on-ink. Seal now sits directly on the same backdrop the scoring seal sits on — identical environment, no clipped disk.
**Lesson:** When two components render "the same thing" but read differently, the gap is rarely the component itself once the props match — it's the parent's chrome, padding, or background. Audit the surrounding layout, not just the renderable.
**Files:** `src/components/SignInGate.jsx`
**Commit:** b0e700f

## Error 157 — SignInGate forest stopped at #root border, not edge-to-edge
**Build:** Discovered May 18, 2026 after Error 156's full-bleed-forest fix.
**Side:** `src/components/SignInGate.jsx`.
**Symptom:** Sign-in gate had the forest backdrop applied via CSS, but the gradient stopped well short of the screen edges — paper-colored bands above the status bar and below the home indicator, and a 1px hairline border on each side. The forest looked like a rectangular panel on a paper page, not the immersive forest the scoring / hub / profile surfaces present.
**Root cause:** Recurrence of the same containing-block pattern documented in Errors 146, 148, 152. `#root` is `width: 1126px; max-width: 100%; min-height: 100svh; display: flex; flex-direction: column; border-inline: 1px solid var(--border)` and the document body fills paper. Applying a forest gradient to a child of #root only fills the child's box — not the iOS safe area, not the #root border, not the body fill above/below.
**Fix:** Portal-rendered SignInGate onto document.body via `createPortal`, position: fixed, 100vw × 100dvh, z-index 30. The forest gradient now bleeds under the notch + home indicator + #root border — same pattern that fixed ScoringScreen, ResolveHub, ProfileLanding, and ScoreEntryV2.
**Lesson:** Re-confirmed: any forest-backdrop screen must portal to document.body. CSS-only `position: fixed` inside #root never escapes the column. This is now a standing rule for any new dark surface.
**Files:** `src/components/SignInGate.jsx`
**Commit:** f69dbba

## Error 158 — Visible scroll bars on all four VQ landings (Insights / Filters / Coach / Pay)
**Build:** Discovered May 18, 2026 during Build-30 hub navigation testing.
**Side:** All four redesign landings + ThoughtCard overlay.
**Symptom:** Tapping into any of the four READ DEEPER pills from the Resolve hub showed a visible scroll bar / thin track on the landing — even when the content fit within the viewport with no functional need to scroll.
**Root cause:** Two contributors. (1) Insights and Filters genuinely have `overflowY: auto` on their tile-list containers (Filters can have up to 10 tiles), so iOS WebView draws a track when those are present. (2) Coach and Pay don't have explicit overflow but the outer flex column was permissive enough that the WebView still showed a scroll affordance. Default browser styles always show scroll bars on scrollable regions; we never opted out.
**Fix:** Added a global `.no-scrollbar` utility class to index.css with the three cross-browser scrollbar-hiding rules (Firefox `scrollbar-width`, WebKit `::-webkit-scrollbar`, IE/Edge legacy `-ms-overflow-style`). Applied to the outer wrapper of all four landings, the inner tile-list scroller on Insights + Filters, and the ThoughtCard's scrollable body. Coach + Pay also gained explicit `overflow: hidden` on the outer wrapper to match Insights/Filters. Scrolling still works on the tile lists where needed — the track just doesn't draw.
**Lesson:** Any auto/scroll region in the editorial redesign should default to the `.no-scrollbar` utility. The design vocabulary doesn't permit chrome scroll bars on paper or forest surfaces.
**Files:** `src/index.css`, `src/components/redesign/score-result/{InsightsLanding,FiltersLanding,CoachLanding,PayLanding}.jsx`, `src/components/redesign/ThoughtCard.jsx`
**Commit:** 4cc4dae

## Error 159 — notify-test "All 1 failed" with no surfaced reason; sandbox-token mismatch likely
**Build:** Discovered May 18, 2026 during Build-30 TestFlight notification QA.
**Side:** `netlify/functions/notify-test.js`, `src/App.jsx` (SettingsTab diagnostic UI).
**Symptom:** Diagnostic run reported `❌ All 1 push(es) failed at APNs. SUPABASE_ENV: ✓ · APNS_ENV: ✓ · DEVICES: 1 · SENT: 0 · FAILED: 1`. The summary blamed env-var paste or bundle-ID mismatch, but the actual upstream `reason` was only in the response JSON's `devices[]` array — not rendered anywhere in the app's UI. User couldn't act on the failure without manually inspecting the response body or function logs.
**Root cause:** Two issues compounding. (1) `notify-test.js` hardcoded `production: true` on its `apn.Provider`, so sandbox-issued tokens (Xcode debug builds running on a physical device) were sent to the production gateway, which rejects them with `BadDeviceToken`. The dev/prod mismatch is documented as Error 139 but never had auto-retry. (2) SettingsTab's diagnostic UI rendered the summary + stages line but ignored the `devices[]` array. The actionable detail existed in the response but never made it to the user.
**Fix:** notify-test now constructs both a production and sandbox `apn.Provider`. Each device is sent against production first; on `BadDeviceToken`, it auto-retries against sandbox and records whichever endpoint actually delivered. Each `devices[]` entry now carries `env`, `status`, optional `reason`, and the upstream `status_code`. SettingsTab renders the full `devices[]` array below the stages line — token tail, env, status, reason, and status code each on their own row.
**Lesson:** Diagnostic UIs that swallow per-row failure detail are worse than no UI — they create the illusion of debugging info while hiding the only data that would let the user act. Pattern: whenever a function returns an array of per-item results, render the array, not just the summary.
**Files:** `netlify/functions/notify-test.js`, `src/App.jsx`
**Commit:** 51bd65d

## Error 160 — Filters tab rendered "VETTED" wordmark twice + vertical-only layouts
**Build:** Discovered May 18, 2026 during Build-30 Filters tab review.
**Side:** `src/App.jsx` (FiltersTab wrapper), `src/components/FiltersStep.jsx`, `src/components/FrameworkPicker.jsx`.
**Symptom:** The Filters tab opened with the "VETTED" wordmark twice — once as a TabHeader at the top, then again about 80pt below as FiltersStep's internal header — with awkward empty space between. Also: the starter framework list and the core filter list both stacked vertically, taking far more vertical space than the design's editorial intent allowed.
**Root cause:** FiltersStep was authored as a standalone onboarding screen with its own VETTED + hamburger header. When it was later reused inside the Filters tab, FiltersTab in App.jsx wrapped it in the shared TabHeader without realizing FiltersStep already had its own. Two headers. As for the lists: FrameworkPicker used `flex-direction: column` and the core-filter list inside FiltersStep mapped each `FfFilterCard` into a stacked article with bottom hairlines — both genuinely worked as vertical lists, but the tab needed to feel like an editorial pick-a-card carousel, not a wall.
**Fix:** (1) Dropped TabHeader from FiltersTab; forwards `onOpenMenu` directly into FiltersStep so the internal header handles the menu button. Single VETTED wordmark now. (2) Converted FrameworkPicker's template list and FiltersStep's core-filter list into horizontal scroll-snap carousels. Each card is a 78%-width bounded element (cream fill, 0.5px border, 10pt radius) sitting in an `overflow-x: auto` row with `scroll-snap-type: x mandatory`. Both rows use the `.no-scrollbar` utility. Core-filter cards render with `isLast: true` since they're no longer stacked, suppressing the bottom-divider mode.
**Lesson:** When a component is shipped standalone first and then reused as a sub-component later, audit its internal chrome (headers, padding, dividers) against the outer host's chrome. Two screens calling the same widget shouldn't double up. Same pattern applies if FiltersStep is ever embedded in a third surface.
**Files:** `src/App.jsx`, `src/components/FiltersStep.jsx`, `src/components/FrameworkPicker.jsx`
**Commit:** e3f82ca

## Error 161 — Filters tab header scrolled away with content
**Build:** Discovered May 18, 2026 during Build-30 Filters tab review (immediately after 160).
**Side:** `src/components/FiltersStep.jsx`.
**Symptom:** Filters tab page is long (starter framework + core filters + custom filters + suggestions + save). When the user scrolled down to reach custom filters or suggestions, the VETTED wordmark + hamburger button scrolled off the top of the viewport — out of reach until the user scrolled back up. Other tabs keep their chrome accessible.
**Root cause:** FiltersStep's `<header>` was a normal block element with no positioning. As soon as content pushed below the fold, the header left the viewport with it.
**Fix:** Set the header to `position: sticky; top: 0; z-index: 10` with a paper background fill (so content scrolling underneath doesn't bleed through) and shifted top padding to `env(safe-area-inset-top, 0px) + 14px` so the sticky bar sits cleanly under the iOS status bar. Header stays pinned while the page scrolls.
**Lesson:** Sticky vs portal-fixed: use sticky when the surface needs to scroll *behind* the chrome (Filters tab — long content list). Use portal-fixed when the surface is viewport-locked and the chrome is just part of an edge-to-edge canvas (Profile, ScoreEntryV2, ResolveHub).
**Files:** `src/components/FiltersStep.jsx`
**Commit:** 9fca76b

## Error 162 — Workspace header lacked safe-area-top padding + non-sticky positioning
**Build:** Discovered May 18, 2026 alongside the Filters tab sticky-header fix (161).
**Side:** `src/components/workspace/RoleWorkspace.jsx`.
**Symptom:** The Workspace tab's VETTED wordmark + hamburger header was a flex-shrink child of a 100dvh "door" container, so it stayed visible while the internal role-history list scrolled. But two latent issues: (1) `paddingTop: 14` only, no safe-area-inset, so on notched / Dynamic-Island devices the wordmark sat under or behind the status bar; (2) any iOS WebView quirk that allowed the parent .app to shift would scroll the header off — the door pattern was correct but had no explicit sticky pin as a safety net.
**Fix:** Set the header to `position: sticky; top: 0; zIndex: 10` with a paper background fill (paper so content scrolling underneath doesn't bleed through). Top padding now `calc(env(safe-area-inset-top, 0px) + 14px)`. Same pattern as Filters tab (Error 161). Both improvements bundled; the workspace door's existing flex layout is preserved.
**Lesson:** Anywhere in this app where a header sits on a paper or forest surface, the formula is: `position: sticky; top: 0; zIndex >= 10; background-fill; paddingTop: calc(env(safe-area-inset-top, 0px) + N)`. Codify it as a shared component on a future refactor pass.
**Files:** `src/components/workspace/RoleWorkspace.jsx`
**Commit:** 579f348

## Error 163 — position:sticky headers didn't pin on iOS WebView (Filters + Workspace)
**Build:** Discovered May 18, 2026 after the sticky-header fixes (161 + 162) shipped — user re-tested and the header still scrolled off on the Filters tab.
**Side:** `src/components/FiltersStep.jsx`, `src/components/workspace/RoleWorkspace.jsx`.
**Symptom:** Despite `position: sticky; top: 0; zIndex: 10; background: paper` on the header, scrolling the Filters page still pushed the VETTED wordmark + hamburger off the top of the viewport. Same risk applied to Workspace's sticky header even though the door layout shouldn't have allowed it to move.
**Root cause:** iOS WebView (WKWebView) is known to mishandle `position: sticky` when the sticky element lives inside a `<main>` element with `min-height: 100%` and the actual scroll container is the document body. The sticky-positioning algorithm needs a clear "this is where I should pin to" ancestor; the layout context here apparently isn't deterministic enough for the WebView's implementation. Works fine in desktop Safari + Chrome / Firefox, fails in iOS WKWebView.
**Fix:** Converted both headers to `position: fixed; top: 0; left: 0; right: 0; z-index: 20` with paper background + 0.5px border-bottom for visual separation. Added `paddingTop: calc(env(safe-area-inset-top, 0px) + 50px)` to the parent `<main>` so content reserves room for the fixed bar and doesn't render underneath it. Same edge-to-edge top-pinning pattern as TabBarV2 at the bottom. Known-good across all iOS versions.
**Lesson:** Codified rule: on iOS WebView, prefer `position: fixed` over `position: sticky` for chrome that must pin during scroll. Sticky is fine on web / desktop but unreliable in the embedded WKWebView context this app runs in. Worth retrofitting any future use of sticky in this codebase before it gets reported as a "header doesn't pin" bug.
**Files:** `src/components/FiltersStep.jsx`, `src/components/workspace/RoleWorkspace.jsx`
**Commit:** 8354867

## Error 164 — position:fixed headers ALSO failed on iOS WebView inside #root
**Build:** Discovered May 18, 2026 immediately after Error 163's fix shipped.
**Side:** `src/components/FiltersStep.jsx`, `src/components/workspace/RoleWorkspace.jsx`.
**Symptom:** User re-tested after Error 163 converted both headers from sticky to fixed. Header *still* didn't pin during scroll on iOS WebView. Third attempt at the same bug.
**Root cause:** `#root` in this app is `width: 1126px; max-width: 100%; margin: 0 auto; border-inline: 1px solid var(--border); display: flex; flex-direction: column`. Even without explicit `transform` or `overflow`, the combination of a centered max-width column with hairline side borders is enough for iOS WebView (WKWebView) to treat `#root` as creating a containing block for `position: fixed` descendants. The fixed element pins to `#root`'s box, not the viewport — and as the document scrolls, the box scrolls with it.
**Fix:** Portal-render the header onto `document.body` via React's `createPortal`. The header now lives at the document root, outside `#root` entirely. `position: fixed; top: 0; z-index: 50` on a document-body child always pins to the viewport, no exceptions. Same defensive pattern this codebase already uses for ScoringScreen / ResolveHub / ProfileLanding / ScoreEntryV2 (Errors 146, 148, 152, 157).
**Lesson:** On iOS WebView with a centered max-width #root, neither `position: sticky` nor `position: fixed` can be trusted to pin to the viewport when applied to elements inside #root. Standing rule expanded: **any chrome that must pin during scroll must portal to document.body.** Codify a `<PinnedHeader>` shared component on a future refactor that bundles createPortal + position:fixed + safe-area-inset-top + paper background — three of the four tabs now open-code the same pattern.
**Files:** `src/components/FiltersStep.jsx`, `src/components/workspace/RoleWorkspace.jsx`
**Commit:** 64ce0f7

## Error 165 — Firebase Analytics wiring overwrote PostHog analytics module
**Build:** Discovered May 18, 2026 during Build-30 Firebase Analytics setup.
**Side:** `src/utils/analytics.js`, dependency list (firebase peer).
**Symptom:** First pass at adding Firebase Analytics replaced the entire contents of `src/utils/analytics.js` with a Firebase-only wrapper, breaking every existing PostHog import across the app (initAnalytics from main.jsx, identifyUser/trackUserSignedIn/trackScoreSubmitted/trackScoreCompleted/trackScoreFailed/trackStreamFallbackTriggered from App.jsx). 13 missing-export errors at build time.
**Root cause:** I didn't read the file before overwriting it. The existing module was a 171-line PostHog wrapper; I bash-heredoc'd a new 50-line Firebase wrapper over the top. Compounded by a second bug: even after restoring PostHog, the build failed because `@capacitor-firebase/analytics`'s web fallback imports `firebase/analytics`, which wasn't installed as a dependency — vite couldn't resolve the import during static analysis even though my dynamic import is guarded by Capacitor.isNativePlatform().
**Fix:** Restored the original PostHog wrapper from git (`git show HEAD~1:src/utils/analytics.js > …`), then appended the Firebase helpers below it as a separate section so both providers coexist. Installed `firebase` as a top-level npm dependency so the static import path resolves at build time. Both providers now run side-by-side on native iOS; on web only PostHog runs (Firebase no-ops via Capacitor.isNativePlatform() guard).
**Lesson:** Always Read a file before overwriting it. Two distinct providers in the same wrapper module need to be kept side-by-side, not replaced. Also: any Capacitor plugin with a "web fallback" likely needs the fallback's dependencies installed at the top level even if the native side is the only target — vite's static analyzer doesn't understand isNativePlatform() guards.
**Files:** `src/utils/analytics.js`, `package.json`
**Commit:** 5cebb3a (on top of f5b6d6a)

## Error 166 — Firebase build failed: "No such module 'FirebaseCore'" — plugin is Lite-mode
**Build:** Discovered May 18, 2026 during Build-30 Firebase Analytics setup, immediately after Errors 165 cleared.
**Side:** `ios/App/Podfile`.
**Symptom:** Xcode rebuild failed with `No such module 'FirebaseCore'` in two places: (1) `ios/App/App/AppDelegate.swift` at the new `import FirebaseCore` line, and (2) inside `Pods/CapacitorFirebaseAnalytics/.../FirebaseAnalytics.swift` (the plugin's own wrapper, which also imports FirebaseCore).
**Root cause:** `@capacitor-firebase/analytics` installs in "Lite" mode by default — its podspec declares no dependency on FirebaseCore or FirebaseAnalytics. The plugin author's design expects the host app to bring its own Firebase pods. Without those, the plugin compiles against missing symbols and AppDelegate can't import FirebaseCore.
**Fix:** Added `pod 'Firebase/Core'` and `pod 'Firebase/Analytics'` under `capacitor_pods` in the Podfile. `pod install` brought in Firebase 12.13.0 + FirebaseAnalytics + the dependency graph (FirebaseCoreInternal, FirebaseInstallations, GoogleAdsOnDeviceConversion, GoogleAppMeasurement, GoogleUtilities, PromisesObjC, nanopb). Build resolves cleanly after.
**Lesson:** "Lite mode" Capacitor plugins shift native-dep responsibility to the host Podfile. When installing any @capacitor-firebase/* plugin or similar Lite-mode wrapper, audit its podspec — if it doesn't declare its upstream deps, you must add them yourself. Worth a comment in the Podfile next to any future Capacitor plugin that follows this pattern.
**Files:** `ios/App/Podfile`, `ios/App/Podfile.lock`
**Commit:** a86e459

## Error 167 — Capacitor Firebase Lite subspec + bad plist path → "No such module" + missing build input
**Build:** Discovered May 18, 2026 immediately after Error 166's fix was published.
**Side:** `ios/App/Podfile`, `ios/App/App.xcodeproj/project.pbxproj`.
**Symptom:** After adding `Firebase/Core` + `Firebase/Analytics` to the host App target (Error 166's fix), `xcodebuild` STILL reported "No such module 'FirebaseCore'" inside the plugin's own Swift file (`node_modules/@capacitor-firebase/analytics/ios/Plugin/FirebaseAnalytics.swift`). Then once that was fixed, a second error surfaced: `Build input file cannot be found: ios/App/App/App/GoogleService-Info.plist` (note the double `/App/App/`).
**Root causes (two compounding bugs):**
(1) The host-target Firebase pods I added in Error 166's fix linked Firebase modules to the App target — but the CapacitorFirebaseAnalytics POD has its own pod target with its own dependency graph. Pod targets in CocoaPods only see deps declared in their own podspec, not deps the host target installs. The plugin's pod target compiled in Lite mode against missing FirebaseCore. The plugin's podspec actually declares three subspecs (`Lite` / `Analytics` / `AnalyticsWithoutAdIdSupport`); selecting `Analytics` makes the plugin pull in `FirebaseAnalytics/Core` + `FirebaseAnalytics/IdentitySupport` directly into the plugin's pod target.
(2) The Ruby `xcodeproj` script I ran earlier registered the plist with `path: 'App/GoogleService-Info.plist'` and parent group `App` (path=`App`, source_tree=`SOURCE_ROOT`). Xcode resolves group path + file path, producing `App/App/GoogleService-Info.plist` relative to `SOURCE_ROOT` (= `ios/App/`), i.e. `ios/App/App/App/...` — but the actual file lives at `ios/App/App/GoogleService-Info.plist`. Double-`App` from accidentally including the group prefix in the file ref's path.
**Fix:** (1) Changed the Podfile line from `pod 'CapacitorFirebaseAnalytics', :path => '…'` to `pod 'CapacitorFirebaseAnalytics/Analytics', :path => '…'`. Dropped the standalone `Firebase/Core` + `Firebase/Analytics` pods I added in Error 166 — they're brought in transitively by the Analytics subspec now. (2) Patched the plist file ref with another xcodeproj script: set path to just `'GoogleService-Info.plist'` and source_tree to `<group>` so the path is interpreted relative to the parent group's location.
**Lesson:** When a Capacitor plugin's podspec declares subspecs (`s.subspec '…'`), you MUST pick one explicitly with the `/SubspecName` syntax in the Podfile, otherwise CocoaPods uses `s.default_subspec` (which may be a stub). Host-target pods don't satisfy pod-target deps — every pod target compiles against only what its own podspec declares. Worth a Podfile audit anytime a Capacitor `@capacitor-firebase/*` (or similar Lite-mode) plugin is added.
**Files:** `ios/App/Podfile`, `ios/App/App.xcodeproj/project.pbxproj`
**Commit:** 196af96

## Error 168 — Pre-submission punch list executed in one omnibus commit
**Build:** Logged May 19, 2026 as the rollup of all pre-Build-30-submission code work.
**Side:** `ios/App/App/Info.plist`, `ios/App/App.xcodeproj/project.pbxproj`, `package.json`, `src/App.jsx`, `src/components/redesign/score-result/CoverLetterDraft.jsx`, `src/components/redesign/market/MarketPulseV2.jsx`, `netlify/functions/anthropic.js`, `BUILD_30_SUBMISSION.md` (new).
**Symptom:** Build 30 was code-complete but had 6 loose pre-submission items that needed to be in the archive: version bump, SKAdNetwork plist block, more analytics events, cohort label upgrade, retry pattern in the main scoring function, and the submission paperwork (release notes, privacy disclosure, screenshot list).
**Fix:** Single commit covering all six.
  - MARKETING_VERSION bumped 2.2.4 → 2.3.0 across pbxproj + package.json. Build number stays 30.
  - 15 SKAdNetworkIdentifier entries added to Info.plist with a comment pointing at the Google refresh URL.
  - Wrapped setShowPaywall in a custom function that fires `paywall_opened` on every display (context + tier). Added `paywall_closed`, `paywall_purchase`, and `coach_drafted` events. `setUserProperty("tier", tier)` fires after a successful IAP so GA4 segments reflect the upgrade.
  - Replaced MarketPulseV2's cohort-label heuristic with a seniority + function pattern-match. Produces editorial labels like "VP & Sr. Director · Ops + CS" instead of raw title fragments. Local; no LLM call.
  - Retrofitted the cover-letter retry-and-friendly-message pattern (from Error 154) into anthropic.js — the main scoring proxy. 3 attempts with linear backoff on 429 / 5xx / 529. Lesson 154's lint rule expanded across the rest of the LLM-backed functions is now a follow-up.
  - Wrote BUILD_30_SUBMISSION.md with paste-ready release notes, full App Privacy disclosure with every data type, screenshot capture order, and a top-to-bottom submission checklist. Saves the next session from re-figuring out what Apple requires.
**Lesson:** Pre-submission paperwork (privacy disclosure, screenshots, release notes) is as much "code" as the actual build — codify it in a markdown file in the repo so future submissions are 30 minutes of copy-paste, not 2 hours of re-research.
**Files:** see "Side"
**Commit:** 81b5610

## Error 169 — notify-pipeline returned 502 on every cron tick; killed 3 notification types
**Build:** Discovered May 19, 2026 during a "prove the push pipeline works" debug session — user reported they'd never received Reminders / Follow-Ups / Pipeline Nudges / Timeline Check-Ins / Weekly Recap despite all five toggles enabled.
**Side:** `netlify/functions/notify-pipeline.js`, `src/App.jsx` (useNotifPrefs hook).
**Symptom:** Manual curl against the deployed function returned `HTTP 502 "error code: 502"`. The function was scheduled hourly via Netlify cron and silently failing every run — three of the five notification types route through it (Pipeline Nudges → staleness stage; Application Follow-Ups → follow_up stage; Timeline Check-Ins → timeline stage).
**Root cause (compound):**
(1) `notify-pipeline.js` was structured as `try { …all three stages… } finally { provider.shutdown(); }` with **no outer catch handler**. Any throw inside any stage propagated up, the `finally` ran provider.shutdown(), then the unhandled error reached Netlify's runtime which returned 502. The scheduler treated every cron run as a complete failure.
(2) The follow_up stage queried `workspace_roles?application_status=eq.applied&status_updated_at=lte.X` — those columns existed on the legacy `opportunities` table but were never carried over to `workspace_roles` during the workspace schema refactor. Current schema uses `status` (enum that includes `'applied'`) and `updated_at`. Supabase REST returned HTTP 400 on every cron tick, which became the 502.
(3) The timeline stage's applications-count helper had the same stale `application_status=eq.applied` reference — silent failure under the per-user inner try/catch, but still cost ~50ms per user for nothing.
**Fix:** Three layers:
- Each stage (staleness / follow_up / timeline) now does its own sbRpc/sbGet under a local try/catch. A failure in one stage no longer kills the other two.
- Stage failures are captured in a `stageErrors[]` array and returned to the caller for ops visibility.
- The outer block gained a real catch handler that logs + records the error and still returns HTTP 200 with `{ sent, stageErrors }`. The cron scheduler sees successful runs again.
- Fixed both follow_up + timeline queries to use the actual schema columns (`status=eq.applied`, `updated_at`).
After deploy, the function returns `{"sent":0,"stageErrors":[]}` consistently — meaning all three stages run clean, just no users currently matching trigger conditions.
**Lesson:** Any scheduled function should structure as outer-try-with-diagnostic-return: never let a throw reach the runtime, always return 200 with a structured payload that surfaces stage-level failures. Otherwise the scheduler keeps firing into a black hole. Worth a sweep across the other cron functions (notify-reminders, notify-weekly, workspace-sweep) to apply the same pattern.
**Files:** `netlify/functions/notify-pipeline.js`
**Commits:** 889b7c5, 2258bf8, 85f0c6d

## Error 170 — Settings notification toggles were localStorage-only, never persisted to Supabase
**Build:** Discovered May 19, 2026 in the same debug session as Error 169.
**Side:** `src/App.jsx` (useNotifPrefs hook).
**Symptom:** Users could flip the 5 notification toggles in Settings (Reminders / Application Follow-Ups / Pipeline Nudges / Timeline Check-Ins / Weekly Recap) and the UI persisted across launches, but the cron functions that filter on `user_devices.notif_*` columns never saw the change. Toggle off → still received pushes; toggle on → defaults already covered it.
**Root cause:** `useNotifPrefs` wrote toggle state to `localStorage` under key `vetted_notif_prefs` and read it back on next mount. Zero code paths called register-device to push the prefs to Supabase. The cron functions queried `user_devices.notif_reminders=eq.true` etc.; the only values that table ever saw were the defaults written by `register-device.js` at first-time registration (all five defaulting to `true`). So in practice users always received notifications regardless of toggle state — making the toggles entirely cosmetic AND making opt-out impossible.
**Fix:** Hook now accepts `authUser` as a parameter and, on each toggle, POSTs the full prefs map to register-device with the user's apple_id + cached APNs token. register-device.js is an upsert keyed on (apple_id, token) so it updates the existing row's notif_* columns rather than creating duplicates. localStorage persistence kept as the read-side cache so the UI is responsive without a round-trip on every render.
**Lesson:** UI controls that drive backend behavior need an end-to-end verification path — flipping the toggle, hitting the cron, and confirming the row state changed. Worth a sweep of every Settings control to confirm each one actually plumbs to the DB.
**Files:** `src/App.jsx`
**Commit:** 2258bf8

## Error 171 — SKStoreReviewController submit silently no-ops on TestFlight (expected Apple behavior)
**Build:** Discovered May 19, 2026 during pre-submission TestFlight QA.
**Side:** Apple's `SKStoreReviewController` API — not a bug in Vetted code.
**Symptom:** User triggered the in-app review prompt (which appears after the Score → Resolve dwell window per `useReviewPrompt.js`'s eligibility heuristic), tapped stars, tapped Submit, and nothing visible happened.
**Root cause:** Apple intentionally disables real review submission on TestFlight installs, Xcode debug runs, and sandbox-paid builds — the prompt UI still renders so developers can verify the trigger point, but Submit is a no-op. Apple provides no feedback channel (no toast, no confirmation), in any environment, on purpose. This is the same behavior in production: tap Submit → modal dismisses → nothing else visible. The rating is recorded internally and may or may not appear publicly within 24-72h based on Apple's opaque heuristics.
**Fix:** None required. Documenting here so future "review submit doesn't work" reports route directly to "expected, ship the build to the public App Store and re-test."
**Lesson:** Apple's review API has zero per-tap acknowledgement by design. When QAing the review prompt, only verify (a) it fires at the right moment per the eligibility rules, (b) tapping a star + Submit dismisses the modal cleanly. Do NOT expect any feedback that the submission "succeeded."
**Files:** `src/hooks/useReviewPrompt.js`, `ios/App/App/StoreKitPlugin.swift`
**Commit:** n/a (no code change)

## Error 172 — Build 30 launch crash: SettingsTab referenced devTierOverride without receiving it as a prop
**Build:** Discovered May 20, 2026 — user pulled Build 30 from App Review after device showed a full-screen error boundary on launch reading `Can't find variable: devTierOverride`.
**Side:** `src/App.jsx` (`SettingsTab` sub-component, line 1718).
**Symptom:** On launch (or any navigation that mounted the Settings tab), the app rendered the error boundary fallback: "Something went wrong · Can't find variable: devTierOverride · Try again." Try again re-mounted into the same crash. Effectively a hard brick of the Settings surface and, depending on activeTab restore, of the whole app.
**Root cause:** Build 30 added a `{devTierOverride && (<NotifyTestButton .../>)}` gate around the Send Test Push button inside `SettingsTab`. `devTierOverride` is destructured from `useAuth()` in the main `App` component, but `SettingsTab` is a separate top-level function component (line 1718). Its props were `{ t, lang, onLangChange, authUser, onSignOut, onOpenMenu, presentationMode, onTogglePresentationMode }` — `devTierOverride` was neither passed in by the call site nor in the destructure. In development with Vite HMR and React error overlay the bare identifier resolved against an outer module-scope variable from a closure that no longer existed at runtime in the production bundle; in the production iOS WebView it threw `ReferenceError`.
**Fix:** Added `devTierOverride={devTierOverride}` to the `<SettingsTab>` call site (line 1340) and added `devTierOverride` to the `SettingsTab` destructure (line 1719). Also gated the Presentation Mode toggle behind the same flag — it's a dev/marketing utility, not a user-facing feature, and shipping it visible to end users was an unrelated polish miss. Bumped CURRENT_PROJECT_VERSION 30 → 31; kept MARKETING_VERSION at 2026.05.001 since the marketing version never reached the public.
**Lesson:** Sub-components that reference variables from the parent component's scope are silently broken in React — the parser doesn't complain, the dev build may resolve via stale module state, and the bug only surfaces in the bundled production runtime. Two preventive patterns: (a) any sub-component that needs a value from the parent's hook destructure MUST receive it as an explicit prop, and (b) before shipping any change that touches a sub-component's prop usage, grep the call site to confirm props pass through. Build 30 would have shipped to the App Store and crash-on-launched every user without the pre-review pull. Also adopt as a sweep target: scan every top-level function component in `App.jsx` for unprop'd outer-scope references. This session's QA pass found zero others, but the audit is worth re-running before each submission.
**Files:** `src/App.jsx`, `src/i18n/translations.js`, `ios/App/App.xcodeproj/project.pbxproj`
**Commit:** pending — Build 31 hot-fix

## Error 173 — Marketing site "Inside the App" panels rendered as empty rectangles (X-Frame-Options vs same-origin iframes)
**Scope:** Marketing website (`tryvettedai.com` / `dist/landing.html`) — NOT the iOS app. iOS bundle is unaffected; this is a netlify.toml header config bug that only impacts the web landing.
**Build:** Discovered May 20, 2026 — user shared a Safari screenshot of `tryvettedai.com` showing the "Inside the App · How a score lands." section rendering six empty dark-green rounded rectangles where the editorial panels should be.
**Side:** `netlify.toml` (global `[[headers]] for = "/*"` block), `dist/panel/*.html` (six static editorial panels embedded as iframes).
**Symptom:** The `.panel-strip` on the marketing landing renders the iframe containers correctly (sized + styled + dark-green background visible), but each iframe is empty — no panel HTML content visible. Viewing a panel directly (`tryvettedai.com/panel/01-resolve-pursue-primary.html`) renders fine. Same origin → same origin embed silently refused by the browser.
**Root cause:** The global headers block in `netlify.toml` sets `X-Frame-Options = "DENY"` on every response under `/*`. XFO `DENY` is absolute — it blocks ALL iframe embedding, including same-origin. The CSP `frame-src 'self'` on landing.html *would* permit same-origin framing on its own, but XFO predates CSP frame-ancestors and is enforced independently. When both are present, the stricter wins: `XFO: DENY` overrides `frame-src 'self'` and the browser refuses to render the iframe with no console error visible to a casual inspector (it shows up in DevTools under "Refused to display in a frame because it set 'X-Frame-Options' to 'deny'").
**Fix:** Added a scoped `[[headers]] for = "/panel/*"` rule that sets `X-Frame-Options = "SAMEORIGIN"`, allowing landing.html (served from the same origin) to embed the panel HTMLs. The global DENY on `/*` still applies to every other path — homepage, SPA, function endpoints — preserving clickjacking protection for the surfaces that actually need it. Two-line netlify.toml change, no rebuild required.
**Lesson:** When adding any same-origin iframe embed to a Netlify-hosted site, audit the global header rules first. CSP `frame-src` is the modern API but XFO is still independently enforced and silently wins when set to DENY. Three correct approaches for same-origin embeds: (1) global XFO → SAMEORIGIN (loosens whole site), (2) global XFO → DENY + scoped path override to SAMEORIGIN (this fix — preferred when only a few paths need framing), (3) drop XFO entirely and rely on CSP `frame-ancestors` (modern but loses older-browser protection). Same diagnostic pattern would apply to the `/reel/*` iframes if they were re-introduced on the marketing landing — only the panel HTMLs use this pattern today, but `/reel/*` would need its own SAMEORIGIN override if it ever does.
**Files:** `netlify.toml`
**Commit:** 9274653

## Error 174 — fetch-jd session validation was opt-in; anonymous callers bypassed auth
**Scope:** `netlify/functions/fetch-jd.js` — backend security hardening. No client-side impact (all 4 callers already send credentials).
**Build:** Discovered May 20, 2026 during a security audit pass on public endpoints.
**Side:** `netlify/functions/fetch-jd.js`.
**Symptom:** Anyone could POST to `https://tryvettedai.com/.netlify/functions/fetch-jd` with a `url` field, omit `appleId` and `sessionToken`, and the function would happily scrape the URL on their behalf. CORS allowlist offers no protection against curl/Postman/script callers spoofing an Origin header. Rate limit + SSRF guards bound the blast radius but the endpoint was effectively an open URL-fetching proxy.
**Root cause:** The session auth block was conditional: `if (serverSecret && appleId && sessionToken) { /* validate */ }`. If the caller omitted either credential field, the entire validation was skipped and the request proceeded as if authenticated. The conditional also silently turned into a no-op if `VETTED_SECRET` env var went missing in Netlify — server misconfig became "auth disabled" rather than "all requests fail closed."
**Fix:** Made auth mandatory with three explicit gates returning correct HTTP status codes:
- Missing `VETTED_SECRET` → 500 "Server misconfigured" (fail closed on server misconfig instead of silent bypass)
- Missing `appleId` or `sessionToken` in request body → 401 "Authentication required"
- Invalid `sessionToken` (HMAC mismatch via `timingSafeEqual`) → 403 "Invalid session"
No client changes needed — all 4 callers (ScoreEntry, ScoreEntryV2, Dashboard, RoleWorkspace) already pass `appleId` and `sessionToken` from `authUser`. The Share Extension goes through a Universal Link that opens the app, inheriting the session.
**Lesson:** Conditional auth (`if (creds present) { validate }`) is an anti-pattern — it makes the validation opt-in for anyone who reads the code from the wrong direction. Auth must be a hard precondition that returns early on absence. Also: server-side misconfig (missing env vars) should fail closed, never silently. Worth sweeping every Netlify function with similar conditional-auth patterns: a `grep -rn "if (.*sessionToken)" netlify/functions/` audit before B31 cut would surface any siblings.
**Files:** `netlify/functions/fetch-jd.js`
**Commit:** pending

## Error 175 — market-pulse + market-findings session auth was opt-in (sibling of 174)
**Scope:** `netlify/functions/market-pulse.js`, `netlify/functions/market-findings.js` — backend security hardening. No client-side impact (both callers already send credentials).
**Build:** Discovered May 20, 2026 via the `grep -rn "if.*sessionToken" netlify/functions/` audit recommended in Error 174's lesson.
**Side:** `netlify/functions/market-pulse.js` (line 94), `netlify/functions/market-findings.js` (line 139).
**Symptom:** Same opt-in pattern as Error 174 — `if (serverSecret && appleId && sessionToken) { /* validate */ }`. Anyone could POST to either endpoint without credentials and trigger a Perplexity Sonar API call on Vetted's billing account. Per-IP rate limits provide bounded protection (6-8 calls/min/IP), but a distributed caller could drain budget. `market-findings.js` had an additional anti-pattern: the validation block was wrapped in `try { … } catch { /* allow unauth fallthrough if token format is unexpected */ }` — even *malformed* tokens silently bypassed auth instead of failing closed.
**Fix:** Same mandatory-auth pattern applied to Error 174: 500 on missing `VETTED_SECRET`, 401 on missing creds, 403 on invalid creds. Removed the swallow-and-fallthrough try/catch in market-findings (any thrown error from `timingSafeEqual` now propagates and returns 500, which is correct — malformed tokens are not a legitimate code path).
**Lesson:** When applying a server-side security fix, sweep for siblings immediately. The conditional-auth anti-pattern was copy-pasted across three functions; finding one means finding all. Also: never wrap auth in a swallow-all `try { … } catch {}` — auth failure modes should fail closed, never silent.
**Files:** `netlify/functions/market-pulse.js`, `netlify/functions/market-findings.js`
**Commit:** pending

## Error 176 — register-device had no sessionToken check; allowed push-notification hijack
**Scope:** `netlify/functions/register-device.js` — High-severity backend security hardening. No client-side impact (caller already sends credentials).
**Build:** Discovered May 20, 2026 via the Error 174 audit sweep.
**Side:** `netlify/functions/register-device.js`.
**Symptom:** Endpoint accepted any POST body with a valid `appleId` and `token` and upserted a row into `user_devices` (keyed on `apple_id` + `token`). No HMAC validation of the session token whatsoever — the original code path was `if (!appleId) { return 400; }` and nothing else. `appleId` is the Apple Sign-in opaque user identifier, not a secret: it's logged on the dev console, appears in support emails, surfaces in error reporting, and can be enumerated from PostHog if the project is misconfigured. Treating it as auth-by-itself meant: (a) anyone who learned a user's appleId could register their own APNs device token against that user's account and intercept future push notifications, (b) attackers could spam-register fake device tokens to bloat the push fanout from cron functions (`notify-pipeline.js`, `notify-weekly.js`) and drive APNs cost.
**Fix:** Added the standard HMAC mandatory-auth block: 500 on missing `VETTED_SECRET`, 401 on missing `appleId` or `sessionToken`, 403 on HMAC mismatch. Also added `import crypto from "crypto"` (the module is ESM, register-device didn't previously need crypto). The caller in `src/App.jsx` already sends `sessionToken: authUser.sessionToken || ""` so no client changes needed.
**Lesson:** Treating Apple's opaque user ID as a credential is a category error. It's an identifier, not an authenticator. Every endpoint that takes `appleId` MUST also validate `sessionToken` against `HMAC-SHA256(VETTED_SECRET, appleId)` — even endpoints that don't *return* user data, because identifier-only auth still allows write actions against another user's row. Add to the security review checklist: any function that mentions `apple_id` in its body must validate session token.
**Files:** `netlify/functions/register-device.js`
**Commit:** pending

## Error 177 — behavioral-insights had no sessionToken check; PII read leak
**Scope:** `netlify/functions/behavioral-insights.js` — High-severity backend security hardening. No client-side impact (caller already sends credentials).
**Build:** Discovered May 20, 2026 via the Error 174 audit sweep.
**Side:** `netlify/functions/behavioral-insights.js`.
**Symptom:** Endpoint accepted any POST with a valid `appleId` and returned that user's behavioral aggregates: comp floor margins (`compensation_min`, average pursue comp), location preferences (`location_prefs`), currency, scored role counts, filter signal patterns, preference drift percentages. Anyone who learned an appleId could pull this data for that user with no session token required. Original guard was `if (!appleId) { return 400; }` — same anti-pattern as Error 177 but worse because behavioral-insights *returns* PII directly rather than allowing a write.
**Fix:** Same as Error 176: added `import crypto from "crypto"`, added the standard HMAC mandatory-auth block before the aggregation logic, returning 500/401/403 for the three failure modes. Caller in `RoleWorkspace.jsx` already sends `sessionToken: authUser.sessionToken || ""` so no client changes needed.
**Lesson:** Endpoints that read user-scoped data are higher risk than write endpoints because the failure mode is silent (no row change to notice). They MUST validate session before any database query that uses `apple_id` in a WHERE clause. Worth a separate sweep: `grep -rn 'apple_id=eq' netlify/functions/` and verify every match sits behind a validated session.
**Files:** `netlify/functions/behavioral-insights.js`
**Commit:** pending
