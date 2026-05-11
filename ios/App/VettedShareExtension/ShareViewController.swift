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
import os.log

// Subsystem-scoped logger so we can filter for [vetted_share_ext] in Console.app
// AND see it in Xcode's debug console when attached to the extension process.
private let log = OSLog(subsystem: "com.vettedai.app.VettedShareExtension", category: "share")

class ShareViewController: UIViewController {

    // MUST match the App Group entitlement on both this target and the main
    // App target (set in Xcode → Signing & Capabilities → App Groups).
    private let appGroupID = "group.com.vettedai.app"
    private let userDefaultsURLKey = "pending_share_url"

    // Universal Link target. iOS recognizes this URL belongs to Vetted via
    // the apple-app-site-association file served at
    // https://tryvettedai.com/.well-known/apple-app-site-association — and
    // routes the URL directly to the main app instead of opening Safari.
    // This bypasses iOS 26+ blocks on custom URL scheme openURL calls from
    // Share Extensions ("BUG IN CLIENT OF UIKIT: Force returning false").
    private let mainAppDeepLinkBase = "https://tryvettedai.com/score"

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        // Invisible passthrough — no UI shown to the user.
        view.backgroundColor = .clear
        os_log("viewDidLoad", log: log, type: .info)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        os_log("viewDidAppear — extracting URL", log: log, type: .info)
        extractURL()
    }

    // MARK: - URL extraction

    private func extractURL() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            os_log("no inputItems", log: log, type: .error)
            return finish()
        }
        os_log("got %d inputItems", log: log, type: .info, items.count)
        let urlTypeID = UTType.url.identifier
        let textTypeID = UTType.text.identifier
        for (i, item) in items.enumerated() {
            guard let providers = item.attachments else {
                os_log("item %d has no attachments", log: log, type: .info, i)
                continue
            }
            os_log("item %d has %d attachments", log: log, type: .info, i, providers.count)
            for (j, provider) in providers.enumerated() {
                let types = provider.registeredTypeIdentifiers
                os_log("attachment %d types: %{public}@", log: log, type: .info, j, types.joined(separator: ", "))

                if provider.hasItemConformingToTypeIdentifier(urlTypeID) {
                    os_log("loading as URL type", log: log, type: .info)
                    provider.loadItem(forTypeIdentifier: urlTypeID, options: nil) { [weak self] (data, err) in
                        if let err = err {
                            os_log("loadItem URL error: %{public}@", log: log, type: .error, err.localizedDescription)
                        }
                        self?.handle(data: data)
                    }
                    return
                }
                if provider.hasItemConformingToTypeIdentifier(textTypeID) {
                    os_log("loading as text type (fallback)", log: log, type: .info)
                    provider.loadItem(forTypeIdentifier: textTypeID, options: nil) { [weak self] (data, err) in
                        if let err = err {
                            os_log("loadItem text error: %{public}@", log: log, type: .error, err.localizedDescription)
                        }
                        self?.handle(data: data)
                    }
                    return
                }
            }
        }
        os_log("no URL or text attachment found — finishing", log: log, type: .error)
        finish()
    }

    private func handle(data: Any?) {
        var url: URL? = nil
        if let u = data as? URL {
            os_log("extracted URL object: %{public}@", log: log, type: .info, u.absoluteString)
            url = u
        } else if let s = data as? String {
            os_log("extracted as string: %{public}@", log: log, type: .info, s)
            if let parsed = URL(string: s.trimmingCharacters(in: .whitespacesAndNewlines)) {
                url = parsed
            }
        } else {
            os_log("loadItem returned unexpected type: %{public}@", log: log, type: .error, String(describing: type(of: data)))
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if let url = url {
                self.handoffURL(url)
            } else {
                os_log("could not extract any URL — finishing", log: log, type: .error)
                self.finish()
            }
        }
    }

    // MARK: - Handoff to main app

    private func handoffURL(_ url: URL) {
        os_log("handoff start for %{public}@", log: log, type: .info, url.absoluteString)

        // 1. Backup channel: write to App Group UserDefaults so the main app
        //    can recover the URL even if the deep link routing fails.
        if let defaults = UserDefaults(suiteName: appGroupID) {
            defaults.set(url.absoluteString, forKey: userDefaultsURLKey)
            defaults.set(Date().timeIntervalSince1970, forKey: "\(userDefaultsURLKey)_at")
            defaults.synchronize()
            os_log("wrote to App Group UserDefaults", log: log, type: .info)
        } else {
            os_log("App Group UserDefaults init failed — entitlement missing?", log: log, type: .error)
        }

        // 2. Primary channel: open the main app via Universal Link.
        // The encoded URL goes in the query string; iOS routes the full
        // https://tryvettedai.com/score?url=… to Vetted via AASA.
        let allowed = CharacterSet(charactersIn: ":/?&=+%").inverted
            .union(.alphanumerics)
            .union(CharacterSet(charactersIn: "._~-"))
        let encoded = url.absoluteString.addingPercentEncoding(withAllowedCharacters: allowed) ?? url.absoluteString
        guard let deepLink = URL(string: "\(mainAppDeepLinkBase)?url=\(encoded)") else {
            os_log("failed to build deep link URL", log: log, type: .error)
            return finish()
        }
        os_log("opening Universal Link: %{public}@", log: log, type: .info, deepLink.absoluteString)

        // Try the official extension API first (Apple supports this for Share
        // Extensions on iOS 13+). If it returns false, fall back to walking
        // the responder chain to find UIApplication.
        if let ctx = extensionContext {
            ctx.open(deepLink) { [weak self] success in
                os_log("extensionContext.open completion: %d", log: log, type: .info, success ? 1 : 0)
                if !success {
                    self?.fallbackOpenViaResponderChain(deepLink)
                }
                self?.finish()
            }
        } else {
            fallbackOpenViaResponderChain(deepLink)
            finish()
        }
    }

    @discardableResult
    private func fallbackOpenViaResponderChain(_ url: URL) -> Bool {
        os_log("trying responder-chain fallback", log: log, type: .info)
        var responder: UIResponder? = self
        while responder != nil {
            if let app = responder as? UIApplication {
                let selector = sel_registerName("openURL:")
                let result = app.perform(selector, with: url) != nil
                os_log("responder-chain openURL result: %d", log: log, type: .info, result ? 1 : 0)
                return result
            }
            responder = responder?.next
        }
        os_log("responder-chain found no UIApplication", log: log, type: .error)
        return false
    }

    // MARK: - Cleanup

    private func finish() {
        os_log("finishing extension", log: log, type: .info)
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
