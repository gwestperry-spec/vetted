# Vetted: Career Intelligence — Word Bank
**Started:** April 8, 2026
**Purpose:** Reference for founder to understand every technical term used in development conversations.

---

## App Product Language

| Term | What It Means |
|---|---|
| **VQ** | Vetting Queue. The core scoring feature — user pastes a job description, the app scores it against their filter framework and returns a verdict. |
| **VQ Score** | The numerical output of a VQ scoring run. Ranges 0.0–5.0. Displayed to one decimal place. |
| **Filter Framework** | The user's personal set of career criteria (e.g., Compensation, Role Integrity, Access to Leadership). Each filter is weighted. The VQ score is a weighted average across all filters. |
| **Pursue / Monitor / Pass** | The three VQ verdict labels. Pursue = strong fit. Monitor = conditional, worth watching. Pass = does not meet the framework. |
| **Market Pulse** | A Vantage-only feature. Shows salary benchmarks and AI-generated market intelligence for any job title. Uses a three-tier salary lookup: Robert Half → Kinsa → O*NET/BLS. |
| **Navigator** | A user on the free or Signal tier. Referenced by name in coaching pair 9. |
| **Principal** | A user on the Vantage tier or a Founding Member (lifetime Vantage). |
| **Signal** | The mid-tier subscription ($399/year or monthly equivalent). |
| **Vantage** | The premium subscription tier ($799/year or monthly equivalent). Unlocks Market Pulse and additional features. |
| **Founding Member** | A lifetime Vantage subscriber. Purchased via a one-time IAP. |
| **Coaching Pairs** | The 60 question-and-statement pairs shown on the VQ loading screen. Each pair is a coaching moment — one question to prime the user, one statement to affirm them. Randomized per session; the anchor pair gets 2× weight. |
| **Anchor Pair** | Pair 60 in the COACHING_PAIRS array (index 59). "What if this score — whatever it says — is exactly the information you needed today?" / "It is. That's why you're here." Works at every score, every stage of search. |
| **JD** | Job Description. Used internally in code and logs to refer to the text the user pastes into the opportunity form. |

---

## iOS / Xcode / Capacitor Terms

| Term | What It Means |
|---|---|
| **Capacitor** | The open-source framework (by Ionic) that wraps a React web app in a native iOS shell. The React code runs inside a `WKWebView`; Capacitor provides a JavaScript bridge so the web code can call native iOS features. |
| **WKWebView** | Apple's modern web view. This is literally the browser window inside the iOS app. The React/Vite app runs inside it. |
| **CAPBridgeViewController** | Capacitor's base iOS view controller. It creates the WKWebView, sets up the bridge, and loads `index.html`. All Capacitor iOS apps use this or a subclass of it. |
| **MainViewController** | Our custom subclass of `CAPBridgeViewController`. Its only job is to register the three local plugins (SignInWithApple, StoreKit, Print) at exactly the right moment in the Capacitor 8 lifecycle. |
| **capacitorDidLoad()** | The correct Capacitor 8 lifecycle hook for registering local plugins. Called from `loadView()`, after the bridge and web view are created but before `index.html` starts loading. This is the only safe window for plugin registration. |
| **loadView()** | A UIKit method called before `viewDidLoad()`. In Capacitor 8, this is where the WKWebView is created, the bridge is initialized, and `capacitorDidLoad()` is called. It is marked `final` — it cannot be overridden by subclasses. |
| **viewDidLoad()** | A UIKit method called after `loadView()`. In Capacitor 8, this is where `loadWebView()` is called — which begins loading `index.html`. If you try to register plugins here, it is too late. |
| **loadWebView()** | A Capacitor method that starts loading `index.html` into the WKWebView. Called inside `viewDidLoad()`. Once this fires, the JS bridge is active and plugins must already be registered. |
| **registerPluginInstance()** | The Capacitor bridge method used to register a local (custom) plugin. Must be called in `capacitorDidLoad()`. Passing a plugin instance (e.g., `SignInWithApplePlugin()`) stores it in the bridge's plugin dictionary and injects the plugin's JS via `JSExport.exportJS()`. |
| **CAPPlugin** | The base Swift class all Capacitor plugins inherit from. |
| **CAPBridgedPlugin** | A Capacitor Swift protocol that, together with `CAPPlugin`, makes a class registerable as a Capacitor plugin. Local plugins in this app must conform to both. |
| **jsName** | The name the JavaScript side uses to find the plugin at `window.Capacitor.Plugins.{jsName}`. Must match exactly what the JS code calls. Our plugin: `"SignInWithApplePlugin"`. |
| **identifier** | The internal Capacitor identifier for a plugin. Should match `jsName` for local plugins. |
| **@objc(ClassName)** | A Swift attribute that sets the Objective-C runtime name for a class. Required when the class needs to be found by name at runtime — for example, by a storyboard using `NSClassFromString("MainViewController")`. Without it, `use_frameworks!` can cause the ObjC name to include the module prefix, making it unfindable. |
| **use_frameworks!** | A CocoaPods directive that builds all dependencies as dynamic Swift/ObjC frameworks instead of static libraries. Required for Swift-based pods. Side effect: Swift class ObjC names may include module prefix unless pinned with `@objc()`. |
| **ASAuthorizationController** | Apple's built-in controller for initiating a Sign in with Apple request. Requires a `presentationAnchor` (a valid, on-screen `UIWindow`) to display the auth sheet. |
| **presentationAnchor** | A delegate method on `ASAuthorizationControllerPresentationContextProviding` that returns the `UIWindow` where the Sign in with Apple sheet will be presented. Must return a real, visible window — a detached `UIWindow()` will cause the sheet to be silently discarded, especially on iPad. |
| **ASPresentationAnchor** | A type alias for `UIWindow`. What `presentationAnchor()` must return. |
| **StoreKit 2** | Apple's modern in-app purchase framework (Swift async/await API). Used for subscription and lifetime purchase flows. Different from the older StoreKit 1 (Obj-C, callback-based). |
| **JWS** | JSON Web Signature. StoreKit 2 returns transactions as signed JWS strings. The app sends this to the server for Apple-side verification before granting tier access. |
| **project.pbxproj** | The actual Xcode project file (inside the `.xcodeproj` bundle). Stores every file reference, build setting, and compile instruction. When you add a Swift file to the project, Xcode writes four entries here: PBXBuildFile, PBXFileReference, PBXGroup children, and PBXSourcesBuildPhase. |
| **PBXBuildFile** | An entry in `project.pbxproj` linking a build file UUID to a file reference UUID. Tells Xcode "compile this file." |
| **PBXFileReference** | An entry in `project.pbxproj` declaring that a file exists on disk. Includes the file path and type. |
| **PBXGroup** | An entry in `project.pbxproj` representing a folder in the Xcode navigator. Contains a `children` array of file reference UUIDs. |
| **PBXSourcesBuildPhase** | An entry in `project.pbxproj` listing all files that get compiled. A file missing from this section will not be included in the build even if it exists on disk. This was the root cause of the black screen with `MainViewController`. |
| **AppDelegate** | The iOS app lifecycle class. Handles app launch, background/foreground transitions, and URL handling. In this app, it is a minimal shell — plugin registration was moved to `MainViewController`. |
| **Storyboard** | A file (`Main.storyboard`) that defines the initial view controller hierarchy. The `customClass` attribute tells iOS which Swift class to instantiate at launch. Changed from `CAPBridgeViewController` to `MainViewController`. |
| **Info.plist** | The iOS app configuration file. Contains bundle ID, URL schemes, required capabilities, and other system-level settings. |
| **Clean Build Folder** | Xcode command (⇧⌘K) that deletes all compiled artifacts and forces a full recompile. Required after any change to the `project.pbxproj` or Swift source files. |
| **Archive** | The Xcode process that compiles a release build suitable for App Store submission. Run via Product → Archive. |
| **Cap Sync** | `npx cap sync ios` — the Capacitor command that copies the latest web build (`dist/`) into the iOS project's `public/` folder. Must be run after every `npm run build` before archiving. |

---

## Web / React / Netlify Terms

| Term | What It Means |
|---|---|
| **React** | The JavaScript UI framework the app is built with. Version 19 (latest). |
| **Vite** | The build tool that compiles and bundles the React code into the `dist/` folder that Capacitor copies into the iOS app. |
| **App.jsx** | The main React file. Currently a single large component (god component). Contains all UI, state, and logic. Split into components is a pending task. |
| **Netlify Functions** | Serverless Node.js functions that run on Netlify's infrastructure. Act as the backend API. They are the only place API keys are stored and used. The app never calls Anthropic, Supabase, or Stripe directly from the frontend. |
| **VITE_VETTED_SECRET** | A secret baked into the frontend at build time. Used to sign API requests via HMAC. Because it's baked in at compile time, any rotation requires a new Xcode archive and App Store submission — not just a Netlify redeploy. |
| **VETTED_SECRET** | The server-side copy of the above secret. Stored in Netlify environment variables. Used to verify the HMAC signature on incoming requests from the app. |
| **HMAC** | Hash-Based Message Authentication Code. A cryptographic signature applied to API requests so the server can verify they came from the real app, not a forged request. |
| **AbortController** | A browser API used to cancel a `fetch()` request after a timeout. Used for the Claude (Anthropic) call in Market Pulse — if Claude takes more than 25 seconds, the request is aborted. The salary data is still displayed; only the AI insights are skipped. |
| **sessionStorage** | Browser storage that survives app backgrounding/foregrounding but is cleared on cold launch. Used to store the session token between foreground cycles. |
| **localStorage** | Browser storage that survives cold launches. Used as the primary persisted store for the session token. |
| **Sentry** | Error monitoring service. Captures unhandled exceptions and reports them to the Sentry dashboard. Integrated via `@sentry/react`. |
| **HMR** | Hot Module Replacement. Vite's development feature that updates the browser in real time when source files change, without a full page reload. |
| **StrictMode** | A React development mode feature that intentionally runs `useEffect` twice on mount to surface bugs. Does not run in production. The `_lastCoachingIdx` double-run in development is a known, harmless side effect. |
| **module-level variable** | A JavaScript variable declared outside any function or component, at the top level of a module file. Persists across React re-mounts within a browser session. Used for `_lastCoachingIdx` (coaching pair no-repeat tracking) and `_lastCoachingIdx`. Resets on page reload or HMR. |

---

## Salary Lookup Terms

| Term | What It Means |
|---|---|
| **Robert Half 2025** | Tier 1 salary source. A static lookup table of ~90 executive and professional roles based on Robert Half's 2025 Salary Guide. Checked first for any title. |
| **Kinsa 2026** | Tier 2 salary source. A static lookup table of ~80+ food & beverage industry roles based on Kinsa Group's 2026 F&B Salary Guide (sourced from 6,000+ candidate interviews). Checked if Robert Half returns no match. |
| **O*NET / BLS** | Tier 3 fallback. O*NET (Occupational Information Network) is a government occupational database that provides salary percentile data. BLS (Bureau of Labor Statistics) provides geographic wage adjustments. Queried live via API if neither Robert Half nor Kinsa match. |
| **matchTable()** | The core salary matching function. Iterates all rows and all keywords in a table, tests each with a word-boundary regex, and returns the row whose matching keyword is longest (longest-match wins). |
| **Word-boundary regex (\b)** | A regex assertion that matches at the border between a word character (a-z, 0-9, _) and a non-word character (space, comma, punctuation). `\bcto\b` matches the standalone word "cto" but not "cto" as it appears inside "director" (d-i-r-e-**c**-**t**-**o**-r). Prevents substring collisions in keyword matching. |
| **Longest-match logic** | The rule that determines which keyword row wins when multiple keywords match the same title. The row whose matching keyword has the most characters wins. Ensures "director of procurement" (22 chars) beats "procurement" (11 chars) for exact titles, while "procurement" still serves as a fallback for variants like "director of dairy procurement." |
| **Anchor pair** | See product language section above. Also used here to mean the final entry (index 59) in `COACHING_PAIRS` — given 2× weight in the random selection pool. |
| **ANCHOR_IDX** | The JavaScript constant equal to `COACHING_PAIRS.length - 1`. Always points to the last entry. Self-maintains if the array grows. |

---

## Apple / App Store Terms

| Term | What It Means |
|---|---|
| **App Store Connect** | Apple's web portal for managing iOS app submissions, TestFlight builds, IAP products, and reviewer communications. |
| **Resolution Center** | The section of App Store Connect where Apple reviewers leave rejection notes and where developers respond. |
| **Guideline 2.1(a)** | Apple Review Guideline: Performance — App Completeness. Cited when a core feature doesn't work during review. Build 17 was rejected under this guideline because Sign in with Apple failed on iPad. |
| **TestFlight** | Apple's beta testing platform. Builds submitted to App Store Connect are automatically available to TestFlight users before App Store approval. |
| **IAP** | In-App Purchase. The Apple payment system used to charge for subscriptions and lifetime access. Products are configured in App Store Connect. |
| **Subscription Group** | An App Store Connect construct grouping related subscription products. Required for iOS subscriptions. Products in the same group are ordered highest-to-lowest tier per Apple requirements. |
| **Bundle ID** | The unique identifier for the iOS app: `com.vettedai.app`. Must match exactly across Xcode, Apple Developer account, App Store Connect, and the apple-auth Netlify function. A single character mismatch (e.g., `com.vetted.app`) causes all Sign in with Apple tokens to be rejected. |
| **CURRENT_PROJECT_VERSION** | The Xcode build number. Must be incremented for every new submission to App Store Connect. Currently: 18. |
| **MARKETING_VERSION** | The user-facing version number (e.g., 2.1). Displayed in the App Store. Can stay the same across builds but must be accurate for the release notes. |

---

## Supabase Terms

| Term | What It Means |
|---|---|
| **Supabase** | The backend database service. Stores user profiles, filter frameworks, and scored opportunities. |
| **RLS** | Row Level Security. A Supabase feature that restricts database access at the row level based on the authenticated user. Currently disabled on the main tables — enabling it is a pending task for a future build. |
| **service_role key** | The Supabase API key with full admin access. Used in Netlify functions (`VT_DB_KEY`). Never exposed to the frontend. |
| **anon key** | The Supabase public API key. Used for unauthenticated access. Setting this as `VT_DB_KEY` (instead of the service_role key) was the root cause of Error 19. |
| **profiles table** | Supabase table storing each user's display name, current title, target roles, compensation preferences, location, and tier. |
| **filter_frameworks table** | Supabase table storing each user's filter framework — the weighted set of career criteria. |
| **opportunities table** | Supabase table storing each scored opportunity (role title, company, scores, recommendation, rationale, strengths, gaps). |

---

## Stripe Terms

| Term | What It Means |
|---|---|
| **Webhook** | A Stripe-to-server notification that fires when a payment event occurs (checkout completed, subscription renewed, cancelled, etc.). Vetted's `stripe-webhook.js` Netlify function receives these and updates Supabase. |
| **Webhook Secret** | A signing key Stripe provides when a webhook endpoint is created. Used to verify that incoming webhook payloads actually came from Stripe (not spoofed). Stored as `STRIPE_WEBHOOK_SECRET` in Netlify. |
| **Test Mode vs. Sandbox** | Two separate Stripe environments with separate keys, product IDs, and webhook secrets. They are not interchangeable. All five Stripe env vars must come from the same environment. |
| **Replay Window** | The time window during which a webhook with a given timestamp will be accepted. Set to 86400 seconds (24 hours) to accommodate Stripe's full retry schedule. |
| **`setImmediate()`** | A Node.js function that queues a callback to run after the current event loop. In Netlify serverless, execution freezes after the response is returned — `setImmediate()` callbacks never run. All async work must be `await`-ed before returning the response. |
| **success_url / cancel_url** | Stripe Checkout parameters that define where the user goes after payment. On iOS native, these must be `vetted://` deep link URLs (not https) so Safari can return the user to the app. |
| **Deep link** | A URL with a custom scheme (e.g., `vetted://upgrade-success`) that iOS routes directly to the app. Registered in `Info.plist`. |
