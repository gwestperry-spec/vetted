// ShareViewController.swift
// VettedShareExtension — receives a URL shared from another app and shows a
// minimal confirmation UI before opening the main Vetted app via Universal
// Link. The user-initiated button tap is what makes the open call succeed
// under iOS 26's tightened Share Extension restrictions; auto-open from
// viewDidAppear is categorically blocked on iOS 26+ (extensionContext.open
// returns false, responder-chain openURL is also force-blocked).
//
// Bundle ID for this target: com.vettedai.app.VettedShareExtension
// App Group ID shared with main app: group.com.vettedai.app

import UIKit
import UniformTypeIdentifiers
import os.log

private let log = OSLog(subsystem: "com.vettedai.app.VettedShareExtension", category: "share")

class ShareViewController: UIViewController {

    // MUST match the App Group entitlement on both this target and the main
    // App target (set in Xcode → Signing & Capabilities → App Groups).
    private let appGroupID = "group.com.vettedai.app"
    private let userDefaultsURLKey = "pending_share_url"
    private let mainAppDeepLinkBase = "https://tryvettedai.com/score"

    // Brand palette — kept in sync with the main app's tokens.css.
    private let brandGreen   = UIColor(red: 0.176, green: 0.416, blue: 0.310, alpha: 1.0) // #2D6A4F
    private let paperColor   = UIColor(red: 0.980, green: 0.980, blue: 0.972, alpha: 1.0) // #FAFAF8
    private let inkColor     = UIColor(red: 0.102, green: 0.102, blue: 0.102, alpha: 1.0) // #1A1A1A
    private let mutedColor   = UIColor(red: 0.420, green: 0.420, blue: 0.420, alpha: 1.0) // #6B6B6B

    // Resolved URL — populated by extractURL(), consumed by scoreTapped().
    private var sharedURL: URL?

    // UI
    private let containerView = UIView()
    private let titleLabel = UILabel()
    private let urlLabel = UILabel()
    private let scoreButton = UIButton(type: .system)
    private let cancelButton = UIButton(type: .system)

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.35) // dim host app
        setupUI()
        extractURL()
    }

    // MARK: - URL extraction

    private func extractURL() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            return failAndDismiss(reason: "no_input_items")
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
                    provider.loadItem(forTypeIdentifier: textTypeID, options: nil) { [weak self] (data, _) in
                        self?.handle(data: data)
                    }
                    return
                }
            }
        }
        failAndDismiss(reason: "no_compatible_attachment")
    }

    private func handle(data: Any?) {
        var resolved: URL? = nil
        if let u = data as? URL {
            resolved = u
        } else if let s = data as? String {
            // Strip any whitespace then attempt to URL-parse.
            if let parsed = URL(string: s.trimmingCharacters(in: .whitespacesAndNewlines)) {
                resolved = parsed
            }
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            // Scheme-validate: only allow http(s) before showing the score UI.
            // Rejects javascript:, data:, file:, custom schemes, etc.
            if let url = resolved,
               let scheme = url.scheme?.lowercased(),
               (scheme == "http" || scheme == "https") {
                self.sharedURL = url
                self.urlLabel.text = self.humanReadableHost(url)
                self.scoreButton.isEnabled = true
                self.scoreButton.alpha = 1.0
                os_log("URL ready: %{public}@", log: log, type: .info, url.absoluteString)
            } else {
                self.failAndDismiss(reason: "invalid_scheme_or_url")
            }
        }
    }

    private func humanReadableHost(_ url: URL) -> String {
        let host = url.host?.replacingOccurrences(of: "www.", with: "") ?? "external link"
        let path = url.path.isEmpty ? "" : url.path
        let display = host + path
        return display.count > 60 ? String(display.prefix(60)) + "…" : display
    }

    // MARK: - User actions

    @objc private func scoreTapped() {
        guard let sharedURL = sharedURL else {
            failAndDismiss(reason: "no_url_on_tap")
            return
        }

        // 1. Backup channel: write to App Group so the main app can recover
        //    the URL even if the open call somehow doesn't auto-route.
        if let defaults = UserDefaults(suiteName: appGroupID) {
            defaults.set(sharedURL.absoluteString, forKey: userDefaultsURLKey)
            defaults.set(Date().timeIntervalSince1970, forKey: "\(userDefaultsURLKey)_at")
            defaults.synchronize()
        }

        // 2. Build the Universal Link
        let allowed = CharacterSet(charactersIn: ":/?&=+%").inverted
            .union(.alphanumerics)
            .union(CharacterSet(charactersIn: "._~-"))
        let encoded = sharedURL.absoluteString.addingPercentEncoding(withAllowedCharacters: allowed) ?? sharedURL.absoluteString
        guard let deepLink = URL(string: "\(mainAppDeepLinkBase)?url=\(encoded)") else {
            return failAndDismiss(reason: "deeplink_build_failed")
        }
        os_log("user-initiated open of Universal Link: %{public}@", log: log, type: .info, deepLink.absoluteString)

        // 3. Fire from user-initiated context. iOS allows this.
        extensionContext?.open(deepLink) { [weak self] success in
            os_log("extensionContext.open completion: %d", log: log, type: .info, success ? 1 : 0)
            self?.finish()
        }
    }

    @objc private func cancelTapped() {
        finish()
    }

    // MARK: - Cleanup

    private func failAndDismiss(reason: String) {
        os_log("failed: %{public}@", log: log, type: .error, reason)
        DispatchQueue.main.async { [weak self] in
            self?.finish()
        }
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }

    // MARK: - UI

    private func setupUI() {
        // Container = bottom sheet
        containerView.backgroundColor = paperColor
        containerView.layer.cornerRadius = 18
        containerView.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        containerView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(containerView)

        // Eyebrow / wordmark
        let eyebrow = UILabel()
        eyebrow.text = "VETTED"
        eyebrow.font = .systemFont(ofSize: 11, weight: .bold)
        eyebrow.textColor = brandGreen
        eyebrow.numberOfLines = 1
        eyebrow.translatesAutoresizingMaskIntoConstraints = false
        eyebrow.adjustsFontForContentSizeCategory = true
        containerView.addSubview(eyebrow)

        // Title
        titleLabel.text = "Score this role"
        titleLabel.font = .systemFont(ofSize: 22, weight: .bold)
        titleLabel.textColor = inkColor
        titleLabel.numberOfLines = 0
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(titleLabel)

        // URL preview
        urlLabel.text = "Loading…"
        urlLabel.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        urlLabel.textColor = mutedColor
        urlLabel.numberOfLines = 2
        urlLabel.lineBreakMode = .byTruncatingMiddle
        urlLabel.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(urlLabel)

        // Score button (primary)
        scoreButton.setTitle("Score in Vetted →", for: .normal)
        scoreButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        scoreButton.backgroundColor = brandGreen
        scoreButton.setTitleColor(.white, for: .normal)
        scoreButton.layer.cornerRadius = 10
        scoreButton.translatesAutoresizingMaskIntoConstraints = false
        scoreButton.addTarget(self, action: #selector(scoreTapped), for: .touchUpInside)
        scoreButton.isEnabled = false
        scoreButton.alpha = 0.5
        containerView.addSubview(scoreButton)

        // Cancel button (secondary)
        cancelButton.setTitle("Cancel", for: .normal)
        cancelButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .regular)
        cancelButton.setTitleColor(mutedColor, for: .normal)
        cancelButton.translatesAutoresizingMaskIntoConstraints = false
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        containerView.addSubview(cancelButton)

        // Tap on the dim backdrop also cancels
        let tap = UITapGestureRecognizer(target: self, action: #selector(cancelTapped))
        view.addGestureRecognizer(tap)
        // But taps inside the container shouldn't propagate
        containerView.isUserInteractionEnabled = true

        // Layout
        NSLayoutConstraint.activate([
            containerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            containerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            containerView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            eyebrow.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 28),
            eyebrow.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 24),
            eyebrow.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -24),

            titleLabel.topAnchor.constraint(equalTo: eyebrow.bottomAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: eyebrow.leadingAnchor),
            titleLabel.trailingAnchor.constraint(equalTo: eyebrow.trailingAnchor),

            urlLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 10),
            urlLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            urlLabel.trailingAnchor.constraint(equalTo: titleLabel.trailingAnchor),

            scoreButton.topAnchor.constraint(equalTo: urlLabel.bottomAnchor, constant: 20),
            scoreButton.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            scoreButton.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),
            scoreButton.heightAnchor.constraint(equalToConstant: 50),

            cancelButton.topAnchor.constraint(equalTo: scoreButton.bottomAnchor, constant: 6),
            cancelButton.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            cancelButton.heightAnchor.constraint(equalToConstant: 44),
            cancelButton.bottomAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.bottomAnchor, constant: -8),
        ])
    }
}
