import CryptoKit
import Foundation
import Security

/// RFC 7636 PKCE helpers (S256 only).
enum PKCE {
    struct Pair: Sendable {
        let verifier: String
        let challenge: String
    }

    static func generate() -> Pair {
        let verifier = randomURLSafeString(byteCount: 32) // 43 chars
        return Pair(verifier: verifier, challenge: challenge(for: verifier))
    }

    /// BASE64URL(SHA-256(ASCII(verifier))), no padding.
    static func challenge(for verifier: String) -> String {
        base64URL(Data(SHA256.hash(data: Data(verifier.utf8))))
    }

    static func randomURLSafeString(byteCount: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        let status = SecRandomCopyBytes(nil, byteCount, &bytes) // nil == kSecRandomDefault
        precondition(status == errSecSuccess, "SecRandomCopyBytes failed with status \(status)")
        return base64URL(Data(bytes))
    }

    static func base64URL(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
