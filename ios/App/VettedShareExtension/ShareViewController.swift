// ShareViewController.swift
// VettedShareExtension — receives a URL shared from another app (LinkedIn,
// Safari, anywhere), stores it in the App Group's shared UserDefaults
// (backup channel), then opens the main Vetted app via the
// `vetted://score?url=…` deep link. No confirmation UI — the user picked
// Vetted from the system share sheet, that IS the confirmation.
//
// Bundle ID for this target: com.vettedai.app.VettedShareExtension
// App Group ID shared with main app: group.com.vettedai.app

import UIKit
import Social
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    // MUST match the App Group entitlement on both this target and the main
    // App target (set in Xcode → Signing & Capabilities → App Groups).
    private let appGroupID = "group.com.vettedai.app"
    private let userDefaultsURLKey = "pending_share_url"
    private let mainAppURLScheme = "vetted"

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        // Invisible passthrough — no UI shown to the user.
        view.backgroundColor = .clear
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        extractURL()
    }

    // MARK: - URL extraction

    private func extractURL() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            return finish()
        }
        let urlTypeID = UTType.url.identifier
        let textTypeID = UTType.text.identifier
        for item in items {
            guard let providers = item.attachments else { continue }
            for provider in providers {
                if provider.hasItemConformingToTypeIdentifier(urlTypeID) {
                    provider.loadItem(forTypeIdentifier: urlTypeID, options: nil) { [weak self] (data, _) in
                        self?.handle(data: data)
                    }
                    return
                }
                if provider.hasItemConformingToTypeIdentifier(textTypeID) {
                    // Fallback: some apps share the URL as plain text.
                    provider.loadItem(forTypeIdentifier: textTypeID, options: nil) { [weak self] (data, _) in
                        self?.handle(data: data)
                    }
                    return
                }
            }
        }
        finish()
    }

    private func handle(data: Any?) {
        var url: URL? = nil
        if let u = data as? URL {
            url = u
        } else if let s = data as? String {
            // Pluck the first URL-looking substring from shared text.
            if let parsed = URL(string: s.trimmingCharacters(in: .whitespacesAndNewlines)) {
                url = parsed
            }
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if let url = url {
                self.handoffURL(url)
            } else {
                self.finish()
            }
        }
    }

    // MARK: - Handoff to main app

    private func handoffURL(_ url: URL) {
        // 1. Backup channel: write to App Group UserDefaults so the main app
        //    can recover the URL even if the deep link routing fails.
        if let defaults = UserDefaults(suiteName: appGroupID) {
            defaults.set(url.absoluteString, forKey: userDefaultsURLKey)
            defaults.set(Date().timeIntervalSince1970, forKey: "\(userDefaultsURLKey)_at")
            defaults.synchronize()
        }

        // 2. Primary channel: build the deep link and ask the system to open it.
        let allowed = CharacterSet(charactersIn: ":/?&=+%").inverted
            .union(.alphanumerics)
            .union(CharacterSet(charactersIn: "._~-"))
        let encoded = url.absoluteString.addingPercentEncoding(withAllowedCharacters: allowed) ?? url.absoluteString
        if let deepLink = URL(string: "\(mainAppURLScheme)://score?url=\(encoded)") {
            openMainApp(deepLink)
        }

        // 3. Dismiss the extension promptly. The main app launch happens in parallel.
        finish()
    }

    // Share Extensions can't call UIApplication.shared.open directly. The
    // standard workaround is to walk the responder chain to find UIApplication
    // and perform the openURL: selector. Works on iOS 14+ as of 2026.
    @discardableResult
    private func openMainApp(_ url: URL) -> Bool {
        var responder: UIResponder? = self
        while responder != nil {
            if let app = responder as? UIApplication {
                let selector = sel_registerName("openURL:")
                return app.perform(selector, with: url) != nil
            }
            responder = responder?.next
        }
        return false
    }

    // MARK: - Cleanup

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
