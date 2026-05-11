import UIKit
import Capacitor
import WebKit
import os.log

private let shareLog = OSLog(subsystem: "com.vettedai.app", category: "share-fallback")

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // App Group shared with VettedShareExtension. MUST match the App Groups
    // capability on both targets exactly.
    private let appGroupID = "group.com.vettedai.app"
    private let pendingShareKey = "pending_share_url"
    private let pendingShareTimestampKey = "pending_share_url_at"
    // 5 minutes — long enough for "share → open Vetted manually" but short
    // enough that a stale URL from yesterday doesn't get auto-scored.
    private let pendingShareMaxAgeSeconds: TimeInterval = 300

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // SignInWithApplePlugin, StoreKitPlugin, and PrintPlugin all conform to
        // CAPBridgedPlugin, so Capacitor auto-registers them when the bridge
        // initialises — no manual registerPluginInstance() needed or wanted.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    // ─── Share Extension fallback ─────────────────────────────────────────
    // iOS 26 blocks extensionContext.open() from Share Extensions even from a
    // user-initiated button tap (returns success=false). The Share Extension
    // writes the shared URL to the App Group UserDefaults as a backup
    // channel. When the user manually opens the main app afterwards, we
    // synthesize a custom-scheme open here so the existing JS appUrlOpen
    // handler routes it to the SCORE tab.
    func applicationDidBecomeActive(_ application: UIApplication) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            os_log("App Group inaccessible — entitlement missing on main app?", log: shareLog, type: .error)
            return
        }

        let pending = defaults.string(forKey: pendingShareKey) ?? ""
        os_log("didBecomeActive: pending=%{public}@", log: shareLog, type: .info, pending.isEmpty ? "<none>" : pending)
        if pending.isEmpty { return }

        // Age check — drop anything older than the window so old shares
        // don't auto-score on next launch.
        let timestamp = defaults.double(forKey: pendingShareTimestampKey)
        if timestamp > 0 {
            let age = Date().timeIntervalSince1970 - timestamp
            os_log("pending age=%.1fs (max=%.0fs)", log: shareLog, type: .info, age, pendingShareMaxAgeSeconds)
            if age > pendingShareMaxAgeSeconds {
                defaults.removeObject(forKey: pendingShareKey)
                defaults.removeObject(forKey: pendingShareTimestampKey)
                return
            }
        }

        // Consume — clear before dispatch so a synthesis crash doesn't loop.
        defaults.removeObject(forKey: pendingShareKey)
        defaults.removeObject(forKey: pendingShareTimestampKey)
        defaults.synchronize()

        // Build the deep link the appUrlOpen handler expects.
        let allowed = CharacterSet(charactersIn: ":/?&=+%").inverted
            .union(.alphanumerics)
            .union(CharacterSet(charactersIn: "._~-"))
        let encoded = pending.addingPercentEncoding(withAllowedCharacters: allowed) ?? pending
        guard let deepLink = URL(string: "vetted://score?url=\(encoded)") else {
            os_log("deep-link build failed", log: shareLog, type: .error)
            return
        }
        os_log("dispatching synthetic deep link: %{public}@", log: shareLog, type: .info, deepLink.absoluteString)

        // Defer so Capacitor's bridge + JS listener are both attached before
        // the event fires (cold-launch race).
        // Two paths, both fire — whichever wins the race:
        //
        // PATH A (1.2s): synthetic appUrlOpen via ApplicationDelegateProxy.
        //   Works on warm-foreground when JS bridge is already listening.
        //
        // PATH B (retry loop): inject directly into the WebView's
        //   localStorage via evaluateJavaScript. ScoreEntry reads
        //   "vetted_pending_share_url" on mount as a fallback. Survives the
        //   cold-launch race where JS isn't ready when path A fires.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            let ok = ApplicationDelegateProxy.shared.application(application, open: deepLink, options: [:])
            os_log("ApplicationDelegateProxy.open returned: %d", log: shareLog, type: .info, ok ? 1 : 0)
        }
        injectIntoWebView(pending, attempt: 0)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // Walk the view hierarchy to find the CAPBridgeViewController's WKWebView
    // and write the pending URL into its localStorage. Retries up to ~6s in
    // 0.5s steps to ride out the cold-launch window where the bridge view
    // controller isn't installed yet or the web view hasn't finished loading.
    private func injectIntoWebView(_ pending: String, attempt: Int) {
        guard attempt < 12 else {
            os_log("injectIntoWebView: gave up after %d attempts", log: shareLog, type: .error, attempt)
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard let self = self else { return }
            let webView = self.findWebView()
            if let webView = webView {
                let escaped = pending
                    .replacingOccurrences(of: "\\", with: "\\\\")
                    .replacingOccurrences(of: "'", with: "\\'")
                let js = "try{localStorage.setItem('vetted_pending_share_url','\(escaped)');console.log('[native] wrote pending share url');}catch(e){console.log('[native] write failed',e);}"
                webView.evaluateJavaScript(js) { _, error in
                    if let error = error {
                        os_log("evaluateJavaScript failed: %{public}@ — retrying", log: shareLog, type: .error, "\(error)")
                        self.injectIntoWebView(pending, attempt: attempt + 1)
                    } else {
                        os_log("injected pending URL into localStorage on attempt %d", log: shareLog, type: .info, attempt)
                    }
                }
            } else {
                self.injectIntoWebView(pending, attempt: attempt + 1)
            }
        }
    }

    private func findWebView() -> WKWebView? {
        guard let root = window?.rootViewController else { return nil }
        var stack: [UIViewController] = [root]
        while !stack.isEmpty {
            let vc = stack.removeFirst()
            // Walk the view subtree for any WKWebView.
            var views: [UIView] = [vc.view]
            while !views.isEmpty {
                let v = views.removeFirst()
                if let wv = v as? WKWebView { return wv }
                views.append(contentsOf: v.subviews)
            }
            stack.append(contentsOf: vc.children)
            if let presented = vc.presentedViewController { stack.append(presented) }
        }
        return nil
    }
}
