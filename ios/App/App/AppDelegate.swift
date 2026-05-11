import UIKit
import Capacitor
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
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            let ok = ApplicationDelegateProxy.shared.application(application, open: deepLink, options: [:])
            os_log("ApplicationDelegateProxy.open returned: %d", log: shareLog, type: .info, ok ? 1 : 0)
        }
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
}
