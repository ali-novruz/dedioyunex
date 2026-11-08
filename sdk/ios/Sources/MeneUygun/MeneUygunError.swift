import Foundation

public enum MeneUygunError: Error, Equatable, Sendable, LocalizedError {
    /// `configure(clientId:baseURL:redirectURI:)` was not called.
    case notConfigured
    /// Base URL could not be turned into a valid authorize URL.
    case invalidConfiguration(String)
    /// `connect()` called while another authorization is on screen.
    case authorizationInProgress
    /// `ASWebAuthenticationSession.start()` returned false (no window / presentation anchor).
    case authorizationFailedToStart
    /// The user closed the sign-in sheet.
    case cancelled
    /// The user pressed "deny" on the consent screen.
    case accessDenied
    /// Callback `state` did not match the one we sent (possible CSRF). Nothing was stored.
    case stateMismatch
    /// `GET /v1/preferences` returned 401: token was revoked; local state was cleared.
    case tokenRevoked
    /// Server returned `{ "error", "error_description" }`. `status` is nil for redirect errors.
    case server(status: Int?, code: String, description: String?)
    case network(URLError)
    case invalidResponse(String)
    case keychain(OSStatus)
    /// Cached preferences in UserDefaults could not be decoded; the cache entry was removed.
    case cacheCorrupted(String)

    public var errorDescription: String? {
        switch self {
        case .notConfigured: "MeneUygun.configure(...) çağırılmayıb."
        case .invalidConfiguration(let detail): "Yanlış konfiqurasiya: \(detail)"
        case .authorizationInProgress: "Qoşulma artıq gedir."
        case .authorizationFailedToStart: "Giriş pəncərəsi açılmadı."
        case .cancelled: "Qoşulma ləğv edildi."
        case .accessDenied: "İcazə verilmədi."
        case .stateMismatch: "Təhlükəsizlik yoxlaması alınmadı. Yenidən cəhd edin."
        case .tokenRevoked: "Bağlantı MƏNƏ UYĞUN-da ləğv edilib. Yenidən qoşulun."
        case .server(let status, let code, let description):
            "Server xətası\(status.map { " \($0)" } ?? ""): \(code)\(description.map { " — \($0)" } ?? "")"
        case .network(let error): "Şəbəkə xətası: \(error.localizedDescription)"
        case .invalidResponse(let detail): "Gözlənilməz cavab: \(detail)"
        case .keychain(let status): "Keychain xətası: \(status)"
        case .cacheCorrupted(let detail): "Yadda saxlanmış ayarlar oxunmadı: \(detail)"
        }
    }

    static func wrap(_ error: Error) -> MeneUygunError {
        switch error {
        case let error as MeneUygunError: error
        case let error as URLError: .network(error)
        case is CancellationError: .cancelled
        case let error as DecodingError: .invalidResponse(String(describing: error))
        default: .invalidResponse(String(describing: error))
        }
    }
}
