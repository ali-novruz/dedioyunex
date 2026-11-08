import AuthenticationServices
import Foundation
import UIKit

/// MƏNƏ UYĞUN client. Use the shared instance:
///
/// ```swift
/// MeneUygun.shared.configure(clientId: "demo-mobile",
///                            baseURL: URL(string: "http://localhost:3000")!,
///                            redirectURI: URL(string: "meneuygun-demo://callback")!)
/// try await MeneUygun.shared.connect()
/// await MeneUygun.shared.refresh()
/// ```
@MainActor
public final class MeneUygun: ObservableObject {
    public static let shared = MeneUygun()

    public struct Configuration: Sendable, Equatable {
        public let clientId: String
        public let baseURL: URL
        public let redirectURI: URL
        /// Custom scheme of `redirectURI`, used as `callbackURLScheme`.
        public let callbackScheme: String
    }

    /// Current preferences. Schema defaults until connected; the cached value is applied
    /// immediately on `configure`, then replaced by `refresh()`.
    @Published public private(set) var preferences = Preferences()
    @Published public private(set) var isConnected = false
    /// Last error from the non-throwing calls (`refresh`, `disconnect`, `configure`). Cleared on success.
    @Published public private(set) var lastError: MeneUygunError?

    public private(set) var configuration: Configuration?

    private var keychain: Keychain?
    private var accessToken: String?
    private var authSession: ASWebAuthenticationSession?
    private let anchorProvider = PresentationAnchorProvider()
    private let urlSession: URLSession
    private let defaults: UserDefaults

    init(urlSession: URLSession = .shared, defaults: UserDefaults = .standard) {
        self.urlSession = urlSession
        self.defaults = defaults
    }

    // MARK: - Configure

    /// Call once at app start (e.g. in `App.init`). Loads the stored token and cached preferences.
    /// - Parameters:
    ///   - redirectURI: must be registered for the client on the platform, e.g. `meneuygun-demo://callback`.
    public func configure(clientId: String, baseURL: URL, redirectURI: URL) {
        precondition(!clientId.isEmpty, "MeneUygun: clientId must not be empty")
        guard let scheme = redirectURI.scheme, !scheme.isEmpty, scheme != "http", scheme != "https" else {
            preconditionFailure("MeneUygun: redirectURI must use a custom scheme, e.g. myapp://callback (got \(redirectURI))")
        }

        configuration = Configuration(clientId: clientId, baseURL: baseURL, redirectURI: redirectURI, callbackScheme: scheme)
        keychain = Keychain(service: "az.meneuygun.sdk", account: clientId)
        lastError = nil

        do {
            accessToken = try keychain?.read()
        } catch {
            accessToken = nil
            lastError = MeneUygunError.wrap(error)
        }
        isConnected = accessToken != nil
        preferences = isConnected ? loadCachedPreferences() : Preferences()
    }

    // MARK: - Connect (OAuth 2.0 + PKCE)

    /// Opens the MƏNƏ UYĞUN consent screen, exchanges the code and stores the token.
    /// Throws `MeneUygunError.cancelled` if the user closes the sheet.
    public func connect() async throws {
        let config = try requireConfiguration()
        guard authSession == nil else { throw MeneUygunError.authorizationInProgress }

        let pkce = PKCE.generate()
        let state = PKCE.randomURLSafeString(byteCount: 16)
        let authorizeURL = try makeAuthorizeURL(config, challenge: pkce.challenge, state: state)

        defer { authSession = nil }
        let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
            // @Sendable: the completion handler is not guaranteed to run on the main actor.
            let session = ASWebAuthenticationSession(
                url: authorizeURL,
                callbackURLScheme: config.callbackScheme
            ) { @Sendable url, error in
                if let error {
                    continuation.resume(throwing: mapAuthenticationError(error))
                } else if let url {
                    continuation.resume(returning: url)
                } else {
                    continuation.resume(throwing: MeneUygunError.invalidResponse("Empty authentication callback"))
                }
            }
            session.presentationContextProvider = anchorProvider
            session.prefersEphemeralWebBrowserSession = false
            authSession = session
            if !session.start() {
                continuation.resume(throwing: MeneUygunError.authorizationFailedToStart)
            }
        }

        let code = try parseCallback(callbackURL, expectedState: state)
        let token = try await exchange(code: code, verifier: pkce.verifier, config: config)

        guard let keychain else { throw MeneUygunError.notConfigured }
        try keychain.save(token.accessToken)
        accessToken = token.accessToken
        isConnected = true
        try apply(token.preferences)
        lastError = nil
    }

    // MARK: - Refresh

    /// `GET /v1/preferences`. Call on every app start. 401 → token is deleted and `isConnected` becomes false.
    /// Errors are published in `lastError`.
    public func refresh() async {
        guard let config = configuration else { lastError = .notConfigured; return }
        guard let token = accessToken else { return }

        var request = URLRequest(url: config.baseURL.appending(path: "v1/preferences"))
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            let (data, http) = try await perform(request)
            // Disconnected or reconnected while the request was in flight: drop this result.
            guard accessToken == token else { return }

            if http.statusCode == 401 {
                try clearLocalState()
                lastError = .tokenRevoked
                return
            }
            guard (200..<300).contains(http.statusCode) else {
                throw serverError(status: http.statusCode, data: data)
            }
            let body = try JSONDecoder().decode(PreferencesResponse.self, from: data)
            try apply(body.preferences)
            lastError = nil
        } catch {
            lastError = MeneUygunError.wrap(error)
        }
    }

    // MARK: - Disconnect

    /// Clears the token, cache and preferences locally, then revokes the token on the server.
    /// A revoke failure is published in `lastError`; local state is cleared regardless.
    public func disconnect() async {
        guard let config = configuration else { lastError = .notConfigured; return }
        let token = accessToken
        do {
            try clearLocalState()
            lastError = nil
        } catch {
            lastError = MeneUygunError.wrap(error)
        }
        guard let token else { return }

        var request = URLRequest(url: config.baseURL.appending(path: "oauth/revoke"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        do {
            request.httpBody = try JSONEncoder().encode(["token": token])
            let (data, http) = try await perform(request)
            guard (200..<300).contains(http.statusCode) else {
                throw serverError(status: http.statusCode, data: data)
            }
        } catch {
            lastError = MeneUygunError.wrap(error)
        }
    }

    // MARK: - Internals

    private func requireConfiguration() throws -> Configuration {
        guard let configuration else { throw MeneUygunError.notConfigured }
        return configuration
    }

    private func makeAuthorizeURL(_ config: Configuration, challenge: String, state: String) throws -> URL {
        guard var components = URLComponents(
            url: config.baseURL.appending(path: "oauth/authorize"),
            resolvingAgainstBaseURL: false
        ) else {
            throw MeneUygunError.invalidConfiguration("baseURL \(config.baseURL)")
        }
        components.queryItems = [
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "client_id", value: config.clientId),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "redirect_uri", value: config.redirectURI.absoluteString),
        ]
        guard let url = components.url else {
            throw MeneUygunError.invalidConfiguration("authorize URL from \(config.baseURL)")
        }
        return url
    }

    /// Returns the authorization code or throws (state mismatch is checked first).
    private func parseCallback(_ url: URL, expectedState: String) throws -> String {
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        func value(_ name: String) -> String? { items.first { $0.name == name }?.value }

        guard value("state") == expectedState else { throw MeneUygunError.stateMismatch }
        if let error = value("error") {
            if error == "access_denied" { throw MeneUygunError.accessDenied }
            throw MeneUygunError.server(status: nil, code: error, description: value("error_description"))
        }
        guard let code = value("code"), !code.isEmpty else {
            throw MeneUygunError.invalidResponse("Callback has no code: \(url)")
        }
        return code
    }

    private func exchange(code: String, verifier: String, config: Configuration) async throws -> TokenResponse {
        var request = URLRequest(url: config.baseURL.appending(path: "oauth/token"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(TokenRequest(
            grantType: "authorization_code",
            code: code,
            codeVerifier: verifier,
            clientId: config.clientId,
            redirectUri: config.redirectURI.absoluteString
        ))

        let (data, http) = try await perform(request)
        guard (200..<300).contains(http.statusCode) else {
            throw serverError(status: http.statusCode, data: data)
        }
        return try JSONDecoder().decode(TokenResponse.self, from: data)
    }

    private func perform(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let result: (Data, URLResponse)
        do {
            result = try await urlSession.data(for: request)
        } catch let error as URLError {
            throw MeneUygunError.network(error)
        }
        guard let http = result.1 as? HTTPURLResponse else {
            throw MeneUygunError.invalidResponse("Non-HTTP response")
        }
        return (result.0, http)
    }

    private func serverError(status: Int, data: Data) -> MeneUygunError {
        if let body = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
            return .server(status: status, code: body.error, description: body.errorDescription)
        }
        return .server(status: status, code: "http_\(status)", description: String(data: data, encoding: .utf8))
    }

    private var cacheKey: String? {
        configuration.map { "az.meneuygun.preferences.\($0.clientId)" }
    }

    private func apply(_ newPreferences: Preferences) throws {
        preferences = newPreferences
        guard let cacheKey else { throw MeneUygunError.notConfigured }
        defaults.set(try JSONEncoder().encode(newPreferences), forKey: cacheKey)
    }

    private func loadCachedPreferences() -> Preferences {
        guard let cacheKey, let data = defaults.data(forKey: cacheKey) else { return Preferences() }
        do {
            return try JSONDecoder().decode(Preferences.self, from: data)
        } catch {
            defaults.removeObject(forKey: cacheKey)
            lastError = .cacheCorrupted(String(describing: error))
            return Preferences()
        }
    }

    private func clearLocalState() throws {
        accessToken = nil
        isConnected = false
        preferences = Preferences()
        if let cacheKey { defaults.removeObject(forKey: cacheKey) }
        try keychain?.delete()
    }
}

// MARK: - Wire types

private struct TokenRequest: Encodable {
    let grantType: String
    let code: String
    let codeVerifier: String
    let clientId: String
    let redirectUri: String

    enum CodingKeys: String, CodingKey {
        case grantType = "grant_type"
        case code
        case codeVerifier = "code_verifier"
        case clientId = "client_id"
        case redirectUri = "redirect_uri"
    }
}

private struct TokenResponse: Decodable {
    let accessToken: String
    let tokenType: String
    let sub: String
    let preferences: Preferences

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case sub
        case preferences
    }
}

private struct PreferencesResponse: Decodable {
    let sub: String
    let preferences: Preferences
    let updatedAt: String?
}

private struct ErrorResponse: Decodable {
    let error: String
    let errorDescription: String?

    enum CodingKeys: String, CodingKey {
        case error
        case errorDescription = "error_description"
    }
}

// MARK: - ASWebAuthenticationSession glue

private func mapAuthenticationError(_ error: Error) -> MeneUygunError {
    if let authError = error as? ASWebAuthenticationSessionError, authError.code == .canceledLogin {
        return .cancelled
    }
    return MeneUygunError.wrap(error)
}

/// Supplies the key window of the foreground scene as the presentation anchor.
final class PresentationAnchorProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    // nonisolated + assumeIsolated works whether or not the SDK marks this protocol @MainActor.
    // UIKit always calls it on the main thread.
    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            guard let scene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first else {
                preconditionFailure("MeneUygun.connect() needs a connected UIWindowScene to present sign-in")
            }
            return scene.windows.first(where: { $0.isKeyWindow }) ?? scene.windows.first ?? UIWindow(windowScene: scene)
        }
    }
}
