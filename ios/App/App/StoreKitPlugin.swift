import Foundation
import Capacitor
import StoreKit

@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKitPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchase",         returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        // Plugin auto-registered via CAPBridgedPlugin protocol
    }

    // ─── purchase({ productId }) ──────────────────────────────────────────
    // Initiates a StoreKit 2 purchase and resolves with the signed JWS
    // transaction string. The JS layer sends the JWS to the server for
    // validation before granting access.
    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    // Capture jwsRepresentation from VerificationResult before
                    // pattern-matching — it lives on the wrapper, not on Transaction.
                    let jws = verification.jwsRepresentation
                    switch verification {
                    case .verified(let transaction):
                        // Finish the transaction — Apple already verified it on-device.
                        // If the subsequent server call fails, the user can restore.
                        await transaction.finish()
                        call.resolve([
                            "transactionId": "\(transaction.id)",
                            "productId":     transaction.productID,
                            "jws":           jws,
                        ])
                    case .unverified(_, let error):
                        call.reject("Transaction unverified: \(error.localizedDescription)")
                    }
                case .userCancelled:
                    call.reject("cancelled")
                case .pending:
                    // Requires parental approval — treat as cancelled for now.
                    call.reject("pending")
                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    // ─── restorePurchases() ───────────────────────────────────────────────
    // Returns all current entitlements as JWS strings so the server can
    // re-validate and restore the Supabase tier if needed.
    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            var transactions: [[String: Any]] = []

            for await result in Transaction.currentEntitlements {
                // Capture jwsRepresentation from VerificationResult before
                // pattern-matching — it lives on the wrapper, not on Transaction.
                let jws = result.jwsRepresentation
                if case .verified(let transaction) = result {
                    await transaction.finish()
                    transactions.append([
                        "transactionId": "\(transaction.id)",
                        "productId":     transaction.productID,
                        "jws":           jws,
                    ])
                }
            }

            call.resolve(["transactions": transactions])
        }
    }
}
