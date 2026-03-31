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

    override public func load() {
        // Plugin auto-registered via CAPBridgedPlugin protocol
    }

    private var savedCall: CAPPluginCall?

    @objc func authorize(_ call: CAPPluginCall) {
        self.savedCall = call
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    // ─── Presentation anchor ──────────────────────────────────────────────
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        for scene in UIApplication.shared.connectedScenes {
            if let ws = scene as? UIWindowScene {
                #if compiler(>=5.9)
                if #available(iOS 26.0, *) {
                    if let window = ws.keyWindow { return window }
                }
                #endif
                if let window = ws.windows.first(where: { $0.isKeyWindow }) { return window }
                if let window = ws.windows.first { return window }
            }
        }
        return UIWindow()
    }

    // ─── Auth success ─────────────────────────────────────────────────────
    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let call = self.savedCall
        else { return }

        let identityToken: String
        if let data = credential.identityToken, let str = String(data: data, encoding: .utf8) {
            identityToken = str
        } else {
            identityToken = ""
        }

        call.resolve([
            "response": [
                "identityToken": identityToken,
                "user": credential.user,
                "givenName": credential.fullName?.givenName ?? "",
                "familyName": credential.fullName?.familyName ?? "",
                "email": credential.email ?? ""
            ] as [String: Any]
        ])
        self.savedCall = nil
    }

    // ─── Auth failure ─────────────────────────────────────────────────────
    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        guard let call = self.savedCall else { return }
        let appleError = error as? ASAuthorizationError
        let isCancelled = appleError?.code == .canceled
        let msg = isCancelled ? "Sign in was cancelled" : "Sign in failed: \(error.localizedDescription)"
        let code: String? = isCancelled ? "cancelled" : "failed"
        call.resolve(["error": true, "code": code ?? "failed", "message": msg])
    }
}
