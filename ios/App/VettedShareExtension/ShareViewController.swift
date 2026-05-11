//
//  ShareViewController.swift
//  VettedShareExtension
//
//  Direction A — "Editorial paper sheet"
//  Drop-in replacement for the existing controller.
//
//  Bundle requirements (add to the extension target):
//   • LibreBaskerville-Bold.ttf, LibreBaskerville-Regular.ttf
//     Register under Info.plist > UIAppFonts in the extension target.
//   • vetted-mark.png (and @2x/@3x) — the 1024² app icon, masked to a
//     rounded square. Source: assets/vetted-logo.png.
//
//  iOS 26 note: the primary-button tap is what makes the OS open the
//  host app. Auto-firing in viewDidAppear is categorically blocked.
//

import UIKit
import MobileCoreServices
import UniformTypeIdentifiers
import os.log

private let log = OSLog(subsystem: "com.vettedai.app.VettedShareExtension", category: "share")

final class ShareViewController: UIViewController {

    // App Group shared with the main app. MUST match the App Groups
    // capability on both targets exactly.
    private let appGroupID = "group.com.vettedai.app"
    private let pendingShareKey = "pending_share_url"
    private let pendingShareTimestampKey = "pending_share_url_at"

    // MARK: Brand tokens — colors_and_type.css

    private let ink         = UIColor(red: 0.102, green: 0.180, blue: 0.102, alpha: 1.0) // #1A2E1A
    private let paper       = UIColor(red: 0.980, green: 0.980, blue: 0.972, alpha: 1.0) // #FAFAF8
    private let cream       = UIColor(red: 0.941, green: 0.957, blue: 0.941, alpha: 1.0) // #F0F4F0
    private let border      = UIColor(red: 0.847, green: 0.910, blue: 0.847, alpha: 1.0) // #D8E8D8
    private let mutedSoft   = UIColor(red: 0.541, green: 0.604, blue: 0.541, alpha: 1.0) // #8A9A8A
    private let mutedDeep   = UIColor(red: 0.353, green: 0.416, blue: 0.353, alpha: 1.0) // #5A6A5A
    private let onDarkInk   = UIColor(red: 0.910, green: 0.941, blue: 0.910, alpha: 1.0) // #E8F0E8

    // MARK: Fonts — serif display + Inter body

    /// Libre Baskerville with system-serif fallback.
    private func serif(_ size: CGFloat, weight: UIFont.Weight = .bold) -> UIFont {
        let name = weight == .bold ? "LibreBaskerville-Bold" : "LibreBaskerville-Regular"
        if let f = UIFont(name: name, size: size) { return f }
        let desc = UIFont.systemFont(ofSize: size, weight: weight)
            .fontDescriptor.withDesign(.serif) ?? UIFont.systemFont(ofSize: size, weight: weight).fontDescriptor
        return UIFont(descriptor: desc, size: size)
    }

    /// Inter / system fallback.
    private func prose(_ size: CGFloat, weight: UIFont.Weight = .regular) -> UIFont {
        UIFont(name: weight == .semibold ? "Inter-SemiBold" : "Inter-Regular", size: size)
            ?? .systemFont(ofSize: size, weight: weight)
    }

    // MARK: State

    private var resolvedURL: URL?
    private let primaryButton = UIButton(type: .system)
    private let urlHostLabel  = UILabel()
    private let urlPathLabel  = UILabel()

    // MARK: View lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.42)

        let backdropTap = UITapGestureRecognizer(target: self, action: #selector(cancelTapped))
        view.addGestureRecognizer(backdropTap)

        let sheet = buildSheet()
        view.addSubview(sheet)
        NSLayoutConstraint.activate([
            sheet.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            sheet.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            sheet.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        resolveSharedURL()
    }

    // MARK: Build the sheet

    private func buildSheet() -> UIView {
        let sheet = UIView()
        sheet.translatesAutoresizingMaskIntoConstraints = false
        sheet.backgroundColor = paper
        sheet.layer.cornerRadius = 22
        sheet.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        sheet.layer.cornerCurve = .continuous
        // Keep taps on the sheet from dismissing.
        sheet.isUserInteractionEnabled = true

        // Grabber
        let grabber = UIView()
        grabber.backgroundColor = ink.withAlphaComponent(0.18)
        grabber.layer.cornerRadius = 2.5
        grabber.translatesAutoresizingMaskIntoConstraints = false
        sheet.addSubview(grabber)

        // ── Eyebrow row: mark + VETTED + hairline + SHARE TO SCORE ──
        let mark = UIImageView(image: UIImage(named: "vetted-mark"))
        mark.contentMode = .scaleAspectFit
        mark.layer.cornerRadius = 6
        mark.layer.cornerCurve = .continuous
        mark.clipsToBounds = true
        mark.translatesAutoresizingMaskIntoConstraints = false

        let wordmark = UILabel()
        wordmark.text = "VETTED"
        wordmark.font = serif(11, weight: .bold)
        wordmark.textColor = ink
        wordmark.attributedText = tracked("VETTED", font: serif(11, weight: .bold), color: ink, tracking: 0.22)

        let hairline = UIView()
        hairline.backgroundColor = border

        let kicker = UILabel()
        kicker.attributedText = tracked("SHARE TO SCORE", font: serif(9), color: mutedSoft, tracking: 0.18)

        let eyebrow = UIStackView(arrangedSubviews: [mark, wordmark, hairline, kicker])
        eyebrow.axis = .horizontal
        eyebrow.alignment = .center
        eyebrow.spacing = 10
        eyebrow.translatesAutoresizingMaskIntoConstraints = false
        sheet.addSubview(eyebrow)

        // ── Title ──
        let title = UILabel()
        title.text = "Score this role."
        title.font = serif(28, weight: .bold)
        title.textColor = ink
        title.numberOfLines = 1
        title.adjustsFontSizeToFitWidth = true
        title.minimumScaleFactor = 0.85
        title.translatesAutoresizingMaskIntoConstraints = false
        sheet.addSubview(title)

        // ── Subhead ──
        let subhead = UILabel()
        subhead.text = "We'll fetch the listing and run it through your filter framework."
        subhead.font = prose(14)
        subhead.textColor = mutedDeep
        subhead.numberOfLines = 2
        subhead.translatesAutoresizingMaskIntoConstraints = false
        sheet.addSubview(subhead)

        // ── URL preview card ──
        let urlCard = makeURLCard()
        sheet.addSubview(urlCard)

        // ── Primary CTA ──
        configurePrimaryButton()
        sheet.addSubview(primaryButton)

        // ── Cancel ──
        let cancel = UIButton(type: .system)
        cancel.setTitle("Cancel", for: .normal)
        cancel.titleLabel?.font = prose(14)
        cancel.setTitleColor(mutedSoft, for: .normal)
        cancel.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        cancel.translatesAutoresizingMaskIntoConstraints = false
        sheet.addSubview(cancel)

        // ── Constraints ──
        NSLayoutConstraint.activate([
            grabber.topAnchor.constraint(equalTo: sheet.topAnchor, constant: 8),
            grabber.centerXAnchor.constraint(equalTo: sheet.centerXAnchor),
            grabber.widthAnchor.constraint(equalToConstant: 36),
            grabber.heightAnchor.constraint(equalToConstant: 5),

            eyebrow.topAnchor.constraint(equalTo: sheet.topAnchor, constant: 22),
            eyebrow.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 28),
            eyebrow.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -28),

            mark.widthAnchor.constraint(equalToConstant: 26),
            mark.heightAnchor.constraint(equalToConstant: 26),
            hairline.heightAnchor.constraint(equalToConstant: 1),

            title.topAnchor.constraint(equalTo: eyebrow.bottomAnchor, constant: 18),
            title.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 28),
            title.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -28),

            subhead.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 8),
            subhead.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 28),
            subhead.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -28),

            urlCard.topAnchor.constraint(equalTo: subhead.bottomAnchor, constant: 18),
            urlCard.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 28),
            urlCard.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -28),

            primaryButton.topAnchor.constraint(equalTo: urlCard.bottomAnchor, constant: 20),
            primaryButton.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: 20),
            primaryButton.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -20),
            primaryButton.heightAnchor.constraint(equalToConstant: 52),

            cancel.topAnchor.constraint(equalTo: primaryButton.bottomAnchor, constant: 6),
            cancel.centerXAnchor.constraint(equalTo: sheet.centerXAnchor),
            cancel.bottomAnchor.constraint(equalTo: sheet.safeAreaLayoutGuide.bottomAnchor, constant: -8),
        ])

        return sheet
    }

    private func makeURLCard() -> UIView {
        let card = UIView()
        card.translatesAutoresizingMaskIntoConstraints = false
        card.backgroundColor = .white
        card.layer.cornerRadius = 10
        card.layer.cornerCurve = .continuous
        card.layer.borderWidth = 0.5
        card.layer.borderColor = border.cgColor

        // Tiny favicon-stub tile (initials of host)
        let chip = UIView()
        chip.backgroundColor = cream
        chip.layer.cornerRadius = 6
        chip.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(chip)

        let chipLabel = UILabel()
        chipLabel.attributedText = tracked("•", font: serif(11, weight: .bold), color: mutedDeep, tracking: 0.12)
        chipLabel.textAlignment = .center
        chipLabel.translatesAutoresizingMaskIntoConstraints = false
        chip.addSubview(chipLabel)
        chipLabel.tag = 9001 // we'll update with host initials once URL resolves

        urlHostLabel.font = prose(13, weight: .semibold)
        urlHostLabel.textColor = ink
        urlHostLabel.text = "Resolving…"
        urlHostLabel.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(urlHostLabel)

        urlPathLabel.font = serif(11, weight: .regular)
        urlPathLabel.textColor = mutedSoft
        urlPathLabel.lineBreakMode = .byTruncatingTail
        urlPathLabel.text = " "
        urlPathLabel.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(urlPathLabel)

        NSLayoutConstraint.activate([
            chip.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            chip.centerYAnchor.constraint(equalTo: card.centerYAnchor),
            chip.widthAnchor.constraint(equalToConstant: 28),
            chip.heightAnchor.constraint(equalToConstant: 28),

            chipLabel.centerXAnchor.constraint(equalTo: chip.centerXAnchor),
            chipLabel.centerYAnchor.constraint(equalTo: chip.centerYAnchor),

            urlHostLabel.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            urlHostLabel.leadingAnchor.constraint(equalTo: chip.trailingAnchor, constant: 12),
            urlHostLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),

            urlPathLabel.topAnchor.constraint(equalTo: urlHostLabel.bottomAnchor, constant: 2),
            urlPathLabel.leadingAnchor.constraint(equalTo: chip.trailingAnchor, constant: 12),
            urlPathLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            urlPathLabel.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -12),
        ])

        return card
    }

    private func configurePrimaryButton() {
        primaryButton.translatesAutoresizingMaskIntoConstraints = false
        primaryButton.layer.cornerRadius = 10
        primaryButton.layer.cornerCurve = .continuous
        primaryButton.backgroundColor = ink
        primaryButton.tintColor = onDarkInk
        primaryButton.setAttributedTitle(
            tracked("SCORE THIS ROLE   →", font: serif(11, weight: .bold), color: onDarkInk, tracking: 0.18),
            for: .normal)
        primaryButton.alpha = 0.5 // disabled until URL resolves
        primaryButton.isEnabled = false
        primaryButton.addTarget(self, action: #selector(primaryTapped), for: .touchUpInside)
    }

    // MARK: Attributed-string helper for letter-spacing

    private func tracked(_ s: String, font: UIFont, color: UIColor, tracking: CGFloat) -> NSAttributedString {
        NSAttributedString(string: s, attributes: [
            .font: font,
            .foregroundColor: color,
            .kern: font.pointSize * tracking,
        ])
    }

    // MARK: URL resolution

    private func resolveSharedURL() {
        guard
            let item = extensionContext?.inputItems.first as? NSExtensionItem,
            let providers = item.attachments
        else { return }

        let urlType = UTType.url.identifier
        for provider in providers where provider.hasItemConformingToTypeIdentifier(urlType) {
            provider.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] coded, _ in
                guard let self, let url = coded as? URL else { return }
                DispatchQueue.main.async { self.applyURL(url) }
            }
            return
        }
    }

    private func applyURL(_ url: URL) {
        resolvedURL = url
        let host = (url.host ?? "").replacingOccurrences(of: "www.", with: "")
        let path = url.path
        urlHostLabel.text = host
        urlPathLabel.text = path.isEmpty ? "/" : path

        // Update chip with initial of host
        if let chipLabel = view.viewWithTag(9001) as? UILabel,
           let first = host.first {
            chipLabel.attributedText = tracked(
                String(first).uppercased(),
                font: serif(12, weight: .bold), color: mutedDeep, tracking: 0.12)
        }

        primaryButton.alpha = 1.0
        primaryButton.isEnabled = true
    }

    // MARK: Actions

    @objc private func primaryTapped() {
        guard let url = resolvedURL else { return }

        // 1. Backup channel: write to App Group so the main app can recover
        //    the URL via AppDelegate's applicationDidBecomeActive even when
        //    extensionContext.open() fails (categorically blocked on iOS 26
        //    even from a user-initiated tap inside a Share Extension).
        if let defaults = UserDefaults(suiteName: appGroupID) {
            defaults.set(url.absoluteString, forKey: pendingShareKey)
            defaults.set(Date().timeIntervalSince1970, forKey: pendingShareTimestampKey)
            defaults.synchronize()
            os_log("wrote URL to App Group: %{public}@", log: log, type: .info, url.absoluteString)
        } else {
            os_log("App Group inaccessible — entitlement missing?", log: log, type: .error)
        }

        // 2. Best-effort open via extensionContext (works pre-iOS 26).
        //    The AppDelegate fallback handles iOS 26 via the App Group write
        //    above + WebView localStorage injection on the next foreground.
        let allowed = CharacterSet(charactersIn: ":/?&=+%").inverted
            .union(.alphanumerics)
            .union(CharacterSet(charactersIn: "._~-"))
        let encoded = url.absoluteString.addingPercentEncoding(withAllowedCharacters: allowed) ?? url.absoluteString
        guard let deepLink = URL(string: "vetted://score?url=\(encoded)") else {
            extensionContext?.completeRequest(returningItems: nil)
            return
        }
        os_log("user-initiated open: %{public}@", log: log, type: .info, deepLink.absoluteString)
        extensionContext?.open(deepLink) { [weak self] success in
            os_log("extensionContext.open completion: %d", log: log, type: .info, success ? 1 : 0)
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    @objc private func cancelTapped() {
        extensionContext?.cancelRequest(withError: NSError(domain: "Vetted.Share", code: -1))
    }
}
