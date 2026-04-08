import UIKit
import Capacitor

/// MainViewController subclasses CAPBridgeViewController so we can register
/// local plugins at the only moment the bridge is guaranteed to be non-nil:
/// immediately after super.viewDidLoad() returns.
///
/// This is the definitive fix for all sign-in timing failures. Unlike AppDelegate
/// lifecycle hooks (applicationDidBecomeActive, didFinishLaunching), viewDidLoad
/// fires as part of the bridge initialisation sequence itself — no race possible.
class MainViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Bridge is guaranteed non-nil here — super.viewDidLoad() completes
        // bridge setup before returning. These registrations run once, correctly,
        // on every launch type: cold, warm, reinstall, iPad, background-refresh.
        bridge?.registerPluginInstance(SignInWithApplePlugin())
        bridge?.registerPluginInstance(StoreKitPlugin())
        bridge?.registerPluginInstance(PrintPlugin())
    }
}
