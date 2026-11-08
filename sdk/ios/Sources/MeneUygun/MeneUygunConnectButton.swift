import SwiftUI

/// "MƏNƏ UYĞUN-dan ayarları gətir" button. When connected shows "Qoşulub ✓" and an "Ayır" button.
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

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if client.isConnected {
                HStack(spacing: 12) {
                    Text("Qoşulub ✓")
                        .font(.headline)
                        .foregroundStyle(.green)
                    Button("Ayır", role: .destructive) {
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
                        Text("MƏNƏ UYĞUN-dan ayarları gətir")
                    }
                    .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
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
