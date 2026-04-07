import Foundation
import UIKit
import WebKit
import Capacitor

// ─── PrintPlugin ──────────────────────────────────────────────────────────────
// UIMarkupTextPrintFormatter is a basic text renderer — it ignores CSS variables,
// grid layouts, and custom fonts. WKWebView.viewPrintFormatter() is the correct
// approach: it runs a full WebKit render pass, then hands the formatted output
// to UIPrintInteractionController for the native iOS print/share sheet.

@objc(PrintPlugin)
public class PrintPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "PrintPlugin"
    public let jsName = "PrintPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "printHTML", returnType: CAPPluginReturnPromise),
    ]

    // Retained for the print lifecycle; released in cleanup()
    private var printWebView: WKWebView?
    private var navDelegate: PrintNavDelegate?

    @objc func printHTML(_ call: CAPPluginCall) {
        guard let html = call.getString("html"), !html.isEmpty else {
            call.reject("html is required")
            return
        }
        let jobName = call.getString("jobName") ?? "Vetted Report"

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 768, height: 1024))
            webView.isHidden = true

            // Must be in the view hierarchy for viewPrintFormatter() to produce output
            self.bridge?.viewController?.view.addSubview(webView)
            self.printWebView = webView

            let delegate = PrintNavDelegate(
                webView: webView,
                jobName: jobName,
                call: call,
                cleanup: { [weak self] in
                    self?.printWebView = nil
                    self?.navDelegate = nil
                }
            )
            self.navDelegate = delegate
            webView.navigationDelegate = delegate

            // tryvettedai.com base URL lets Google Fonts and any relative assets resolve
            webView.loadHTMLString(html, baseURL: URL(string: "https://tryvettedai.com"))
        }
    }
}

// ─── Separate delegate to avoid retain cycles ─────────────────────────────────
private class PrintNavDelegate: NSObject, WKNavigationDelegate {

    private let webView: WKWebView
    private let jobName: String
    private let call: CAPPluginCall
    private let cleanup: () -> Void

    init(webView: WKWebView, jobName: String, call: CAPPluginCall, cleanup: @escaping () -> Void) {
        self.webView = webView
        self.jobName = jobName
        self.call = call
        self.cleanup = cleanup
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Extra 800ms for Google Fonts to finish loading after DOM ready
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            let printInfo = UIPrintInfo(dictionary: nil)
            printInfo.jobName = self.jobName
            printInfo.outputType = .general

            let controller = UIPrintInteractionController.shared
            controller.printInfo = printInfo
            controller.printFormatter = webView.viewPrintFormatter()

            controller.present(animated: true) { [weak self] _, completed, error in
                guard let self = self else { return }
                webView.removeFromSuperview()
                self.cleanup()
                if let error = error {
                    self.call.reject("Print failed: \(error.localizedDescription)")
                } else {
                    self.call.resolve(["completed": completed])
                }
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        webView.removeFromSuperview()
        cleanup()
        call.reject("Load failed: \(error.localizedDescription)")
    }
}
