import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var pluginRegistered = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        guard !pluginRegistered else { return }
        if let vc = window?.rootViewController as? CAPBridgeViewController,
           let bridge = vc.bridge {
            bridge.registerPluginInstance(SignInWithApplePlugin())
            bridge.registerPluginInstance(StoreKitPlugin())
            bridge.registerPluginInstance(PrintPlugin())
            pluginRegistered = true  // only lock once bridge is confirmed non-nil
        }
        // if bridge is nil, pluginRegistered stays false so applicationDidBecomeActive
        // will retry on the next activation (e.g. user backgrounds then foregrounds)
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
}
