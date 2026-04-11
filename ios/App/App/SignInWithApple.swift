import Foundation
import Capacitor
import AuthenticationServices
import UIKit

@objc(SignInWithApplePlugin)
public class SignInWithApplePlugin: CAPPlugin, CAPBridgedPlugin,
    ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding {

    public let identifier = "SignInWithApplePlugin"
    public let jsName = "SignInWithApplePlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {}

    private var savedCall: CAPPluginCall?

    // Retained so ARC does not release the controller before the async
    // authorization sheet completes. On iPad the presentation path is longer
    // and a locally-scoped controller can be deallocated mid-flow.
    private var authController: ASAuthorizationController?

    @objc func authorize(_ call: CAPPluginCall) {
        self.savedCall = call
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let provider = ASAuthorizationAppleIDProvider()
            let request  = provider.createRequest()
            request.requestedScopes = [.fullName, .email]
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate                  = self
            controller.presentationContextProvider = self
            self.authController = controller   // retain across async boundary
            controller.performRequests()
        }
    }

    // ─── Presentation anchor ──────────────────────────────────────────────────
    // iPad requires a valid, visible window. Priority order:
    //   1. Foreground-active scene window — most reliable across all iPad modes
    //      (Split View, Slide Over, Stage Manager)
    //   2. Capacitor bridge window — direct reference to the hosting WKWebView
    //   3. Any connected scene window — last resort before empty fallback
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // 1. Foreground active scene — key window first, then any window in that scene
        if let scene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
            if let w = scene.windows.first(where: { $0.isKeyWindow }) { return w }
            if let w = scene.windows.first { return w }
        }

        // 2. Capacitor bridge window
        if let w = self.bridge?.viewController?.view?.window { return w }

        // 3. Any window scene (covers .foregroundInactive in Split View)
        for scene in UIApplication.shared.connectedScenes {
            if let ws = scene as? UIWindowScene {
                if let w = ws.windows.first(where: { $0.isKeyWindow }) { return w }
                if let w = ws.windows.first { return w }
            }
        }

        // Should never reach here while the app is on screen
        return UIWindow()
    }

    // ─── Auth success ─────────────────────────────────────────────────────────
    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        defer { authController = nil }
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let call = self.savedCall
        else { return }

        let identityToken: String
        if let data = credential.identityToken,
           let str  = String(data: data, encoding: .utf8) {
            identityToken = str
        } else {
            identityToken = ""
        }

        call.resolve([
            "response": [
                "identityToken": identityToken,
                "user":          credential.user,
                "givenName":     credential.fullName?.givenName  ?? "",
                "familyName":    credential.fullName?.familyName ?? "",
                "email":         credential.email ?? ""
            ] as [String: Any]
        ])
        self.savedCall = nil
    }

    // ─── Auth failure ─────────────────────────────────────────────────────────
    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        defer { authController = nil }
        guard let call = self.savedCall else { return }
        let appleError  = error as? ASAuthorizationError
        let isCancelled = appleError?.code == .canceled
        let msg  = isCancelled ? "Sign in was cancelled" : "Sign in failed: \(error.localizedDescription)"
        let code = isCancelled ? "cancelled" : "failed"
        call.resolve(["error": true, "code": code, "message": msg])
        self.savedCall = nil
    }
}
