import UIKit
import Capacitor

/// MainViewController subclasses CAPBridgeViewController so we can register
/// local plugins at the correct Capacitor 8 lifecycle point: capacitorDidLoad().
///
/// Capacitor 8 lifecycle (CAPBridgeViewController source, loadView → viewDidLoad):
///   1. loadView()          → creates WKWebView + CapacitorBridge → calls capacitorDidLoad()
///   2. capacitorDidLoad()  ← OUR HOOK: bridge & webView are set, web content not yet loaded
///   3. viewDidLoad()       → calls loadWebView() → index.html begins loading
///
/// Registering in viewDidLoad (after super) is too late: loadWebView() has already fired.
/// Registering in AppDelegate is too early: the bridge doesn't exist yet.
/// capacitorDidLoad() is the only window where bridge is live and the web view is idle.
@objc(MainViewController)
class MainViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SignInWithApplePlugin())
        bridge?.registerPluginInstance(StoreKitPlugin())
        bridge?.registerPluginInstance(PrintPlugin())

        // Lock scrollView zoom scale — blocks pinch-zoom at the scroll layer.
        webView?.scrollView.maximumZoomScale = 1.0
        webView?.scrollView.minimumZoomScale = 1.0
        webView?.scrollView.alwaysBounceHorizontal = false
        webView?.scrollView.showsHorizontalScrollIndicator = false

        // Disable the pinch gesture recognizer explicitly.
        webView?.scrollView.pinchGestureRecognizer?.isEnabled = false

        // Force light mode — prevents iOS dark mode from inverting form input
        // colors (white text in textareas, light backgrounds on inputs).
        webView?.overrideUserInterfaceStyle = .light
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        disableDoubleTapZoom()
    }

    // Walk the WKWebView's internal gesture recognizer tree and kill every
    // double-tap recognizer. Must run after viewDidAppear so WKWebView has
    // installed its gesture recognizers into the subview hierarchy.
    private func disableDoubleTapZoom() {
        guard let webView = webView else { return }
        var views: [UIView] = [webView]
        while !views.isEmpty {
            let view = views.removeFirst()
            for gesture in view.gestureRecognizers ?? [] {
                if let tap = gesture as? UITapGestureRecognizer, tap.numberOfTapsRequired == 2 {
                    tap.isEnabled = false
                }
            }
            views.append(contentsOf: view.subviews)
        }
    }
}
