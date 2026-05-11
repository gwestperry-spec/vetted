import UIKit
import Capacitor

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
        // Manual registration was the root cause of all sign-in race conditions
        // (cold launch, reinstall without restart, iPad, warm launch).
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    // ─── Share Extension fallback ─────────────────────────────────────────
    // iOS 26 blocks extensionContext.open() from Share Extensions even from a
    // user-initiated button tap (returns success=false). The Share Extension
    // still writes the shared URL to the App Group UserDefaults as a backup
    // channel. When the user manually opens the main app afterwards, we
    // synthesize a Universal-Link-style open here so the existing JS
    // appUrlOpen handler routes it to the SCORE tab.
    func applicationDidBecomeActive(_ application: UIApplication) {
        guard let defaults = UserDefaults(suiteName: appGroupID),
              let pending = defaults.string(forKey: pendingShareKey),
              !pending.isEmpty else { return }

        // Age check — drop anything older than the window so old shares
        // don't auto-score on next launch.
        let timestamp = defaults.double(forKey: pendingShareTimestampKey)
        if timestamp > 0 {
            let age = Date().timeIntervalSince1970 - timestamp
            if age > pendingShareMaxAgeSeconds { return }
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
        // Use the custom URL scheme — ApplicationDelegateProxy.application(_:open:options:)
        // routes custom-scheme opens directly to the Capacitor appUrlOpen
        // event. Universal Links (https://) instead require
        // application(_:continue:restorationHandler:) with an NSUserActivity,
        // which is the wrong shape here since we're synthesizing the open
        // ourselves from a backup channel, not handling a real OS hand-off.
        guard let deepLink = URL(string: "vetted://score?url=\(encoded)") else { return }

        // Defer two runloop turns so Capacitor's bridge + JS listener are
        // both attached before the event fires (cold-launch race).
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            _ = ApplicationDelegateProxy.shared.application(application, open: deepLink, options: [:])
        }
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
}
