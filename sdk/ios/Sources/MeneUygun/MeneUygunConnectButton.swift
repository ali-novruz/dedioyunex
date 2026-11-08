import SwiftUI

/// The connect key in Azerbaijani or English. When connected shows the connected state and a disconnect button.
@MainActor
public struct MeneUygunConnectButton: View {
    @ObservedObject private var client: MeneUygun
    @State private var isWorking = false
    @State private var errorMessage: String?

    public init() {
        _client = ObservedObject(wrappedValue: MeneUygun.shared)
    }

    public init(client: MeneUygun) {
        _client = ObservedObject(wrappedValue: client)
    }

    private var english: Bool {
        client.isConnected ? client.preferences.language == .en : (Locale.preferredLanguages.first?.hasPrefix("en") ?? false)
    }

    private func l(_ az: String, _ en: String) -> String { english ? en : az }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if client.isConnected {
                HStack(spacing: 12) {
                    Text(l("Qoşulub", "Connected"))
                        .font(.headline)
                    Button(l("Ayır", "Disconnect"), role: .destructive) {
                        Task { await disconnect() }
                    }
                    .buttonStyle(.bordered)
                    .disabled(isWorking)
                }
            } else {
                Button {
                    Task { await connect() }
                } label: {
                    HStack {
                        if isWorking { ProgressView() }
                        Text(l("MƏNƏ UYĞUN-dan ayarları gətir", "Bring my MƏNƏ UYĞUN settings"))
                    }
                    .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(MeneUygunKeyStyle())
                .disabled(isWorking)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
    }

    private func connect() async {
        isWorking = true
        defer { isWorking = false }
        do {
            try await client.connect()
            errorMessage = nil
        } catch MeneUygunError.cancelled {
            errorMessage = nil // user closed the sheet on purpose
        } catch {
            errorMessage = MeneUygunError.wrap(error).localizedDescription
        }
    }

    private func disconnect() async {
        isWorking = true
        defer { isWorking = false }
        await client.disconnect()
        errorMessage = client.lastError?.localizedDescription
    }
}


/// A physical key: amber face, ink border, hard shadow that disappears when pressed.
struct MeneUygunKeyStyle: ButtonStyle {
    private let ink = Color(red: 0.149, green: 0.149, blue: 0.149)
    private let amber = Color(red: 0.961, green: 0.737, blue: 0.290)

    func makeBody(configuration: Configuration) -> some View {
        let lift: CGFloat = configuration.isPressed ? 0 : 5
        return configuration.label
            .foregroundStyle(ink)
            .fontWeight(.semibold)
            .padding(.horizontal, 14)
            .background(RoundedRectangle(cornerRadius: 10).fill(amber))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(ink, lineWidth: 2))
            .background(RoundedRectangle(cornerRadius: 10).fill(ink).offset(x: lift, y: lift))
            .offset(x: configuration.isPressed ? 5 : 0, y: configuration.isPressed ? 5 : 0)
    }
}
