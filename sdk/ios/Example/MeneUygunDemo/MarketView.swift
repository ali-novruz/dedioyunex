import MeneUygun
import SwiftUI

struct Product: Identifiable {
    let id: Int
    let name: String
    let price: Double
    let symbol: String
}

private let products = [
    Product(id: 1, name: "Çörək", price: 0.70, symbol: "takeoutbag.and.cup.and.straw"),
    Product(id: 2, name: "Süd, 1 L", price: 1.90, symbol: "drop.fill"),
    Product(id: 3, name: "Alma, 1 kq", price: 2.40, symbol: "leaf.fill"),
]

private func manat(_ value: Double) -> String {
    String(format: "%.2f ₼", value)
}

struct MarketView: View {
    @ObservedObject private var client = MeneUygun.shared
    @Environment(\.meneUygunPreferences) private var prefs
    @Environment(\.meneUygunIncreasedContrast) private var increasedContrast

    @State private var cart: [Int: Int] = [:]
    @State private var showConfirm = false
    @State private var showPaid = false
    @State private var speech = MeneUygunSpeech()

    private var minTarget: CGFloat { prefs.largeTargets ? 56 : 44 }
    private var itemCount: Int { cart.values.reduce(0, +) }
    private var total: Double {
        products.reduce(0) { $0 + Double(cart[$1.id] ?? 0) * $1.price }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header

                if !(prefs.simpleMode || prefs.hideDistractions) {
                    promoBanner
                }

                ForEach(products) { productRow($0) }

                checkout

                Divider()
                settingsSection
            }
            .padding(16)
        }
        .alert("Əminsiniz?", isPresented: $showConfirm) {
            Button("Bəli, ödə") { pay() }
            Button("Ləğv et", role: .cancel) {}
        } message: {
            Text("\(manat(total)) ödəniləcək.")
        }
        .alert("Ödəniş tamamlandı", isPresented: $showPaid) {
            Button("Oldu", role: .cancel) {}
        }
    }

    // MARK: - Sections

    private var header: some View {
        HStack {
            Text("DEMO Market")
                .font(.largeTitle.bold())
            Spacer()
            Label("\(itemCount)", systemImage: "cart")
                .font(.title3)
                .accessibilityLabel("Səbətdə \(itemCount) məhsul")
        }
    }

    private var promoBanner: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("🔥 Həftənin təklifi")
                .font(.headline)
            Text("Bütün meyvələrə 20% endirim! Tələsin, təklif bazar günü bitir.")
                .font(.subheadline)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(increasedContrast ? Color.yellow : Color.orange.opacity(0.2))
        .foregroundStyle(increasedContrast ? Color.black : Color.primary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func productRow(_ product: Product) -> some View {
        HStack(spacing: 12) {
            Image(systemName: product.symbol)
                .font(.title2)
                .frame(width: 36)
                .accessibilityHidden(true)
            VStack(alignment: .leading) {
                Text(product.name).font(.headline)
                Text(manat(product.price)).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
            if let count = cart[product.id], count > 0 {
                Text("×\(count)").font(.headline)
            }
            Button {
                withAnimation(.spring()) { cart[product.id, default: 0] += 1 }
            } label: {
                if prefs.iconLabels {
                    Label("Səbətə at", systemImage: "cart.badge.plus")
                        .labelStyle(.titleAndIcon)
                } else {
                    Label("Səbətə at", systemImage: "cart.badge.plus")
                        .labelStyle(.iconOnly)
                }
            }
            .buttonStyle(.bordered)
            .frame(minWidth: minTarget, minHeight: minTarget)
        }
        .padding(.vertical, 4)
        .overlay(alignment: .bottom) {
            if increasedContrast { Rectangle().frame(height: 1).foregroundStyle(.primary) }
        }
    }

    private var checkout: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Cəmi").font(.title3)
                Spacer()
                Text(manat(total)).font(.title3.bold())
            }
            Button {
                if prefs.confirmActions { showConfirm = true } else { pay() }
            } label: {
                Text("Ödə")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: minTarget)
            }
            .buttonStyle(.borderedProminent)
            .disabled(cart.isEmpty)

            if prefs.tts {
                Button {
                    speech.speak(cartSummary, preferences: prefs)
                } label: {
                    Label("Səbəti səslə oxu", systemImage: "speaker.wave.2")
                        .frame(maxWidth: .infinity, minHeight: minTarget)
                }
                .buttonStyle(.bordered)
                Text("Səs: \(speech.voiceLanguage ?? "sistem səsi")")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var settingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Əlçatanlıq ayarları").font(.headline)
            MeneUygunConnectButton()
            if client.isConnected {
                Button("Ayarları yenilə") {
                    Task { await client.refresh() }
                }
                .frame(minHeight: minTarget)
            }
            if let error = client.lastError {
                Text(error.localizedDescription)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
    }

    // MARK: - Actions

    private var cartSummary: String {
        let lines = products.compactMap { p -> String? in
            guard let count = cart[p.id], count > 0 else { return nil }
            return "\(p.name), \(count) ədəd"
        }
        guard !lines.isEmpty else { return "Səbət boşdur." }
        return "Səbətinizdə: " + lines.joined(separator: "; ") + ". Cəmi \(manat(total))."
    }

    private func pay() {
        cart = [:]
        showPaid = true
    }
}

#Preview("Defaults") {
    MarketView().meneUygun(preferences: Preferences())
}

#Preview("Large, simple, confirm") {
    var prefs = Preferences()
    prefs.fontScale = 1.5
    prefs.simpleMode = true
    prefs.confirmActions = true
    prefs.iconLabels = true
    prefs.largeTargets = true
    prefs.contrast = .high
    return MarketView().meneUygun(preferences: prefs)
}
