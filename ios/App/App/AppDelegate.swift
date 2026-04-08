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
        attemptPluginRegistration(retryCount: 0)
    }

    /// Tries to register Capacitor plugins, retrying every 500 ms if the bridge
    /// isn't ready yet (cold launch / fresh install race condition).
    /// Gives up after 10 attempts (~5 s) — by then the app is in a bad state anyway.
    private func attemptPluginRegistration(retryCount: Int) {
        guard !pluginRegistered else { return }
        guard retryCount < 10 else { return }

        if let vc = window?.rootViewController as? CAPBridgeViewController,
           let bridge = vc.bridge {
            bridge.registerPluginInstance(SignInWithApplePlugin())
            bridge.registerPluginInstance(StoreKitPlugin())
            bridge.registerPluginInstance(PrintPlugin())
            pluginRegistered = true
        } else {
            // Bridge not ready yet — schedule a retry on the main thread
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                self?.attemptPluginRegistration(retryCount: retryCount + 1)
            }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
}
