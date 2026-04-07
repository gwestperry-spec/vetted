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

## Open Items (updated April 6, 2026)

| Issue | Priority | Target Build |
|---|---|---|
| VQ scoring loading visuals never rendered (spinner/phase animations broken in live builds) | High | v2.1 |
| App Store Server Notifications — subscription renewal/cancellation lifecycle | High | v2.1 |
| Streaming AI responses — scoring still ~12s | High | v2.1 |
| Supabase RLS — enable after IAP launch confirmed stable | Medium | v2.1 |
| ADA — focus trap in modals, aria-live on filter carousel | Medium | v2.1 |
| Component splitting — App.jsx god component | Medium | v2.1 |
| JWS certificate chain verification (leaf → Apple Root CA) | Medium | v2.1 |
| Live mode Stripe env vars — swap when ready for real payments | Blocked on approval | — |

---

## Build History Summary (updated April 6, 2026)

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
