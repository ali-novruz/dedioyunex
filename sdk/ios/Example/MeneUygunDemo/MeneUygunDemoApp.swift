import MeneUygun
import SwiftUI

@main
struct MeneUygunDemoApp: App {
    init() {
        // Simulator: localhost reaches the Mac. Real device: use the Mac's LAN IP and extend the ATS exception.
        MeneUygun.shared.configure(
            clientId: "demo-mobile",
            baseURL: URL(string: "http://localhost:3000")!,
            redirectURI: URL(string: "meneuygun-demo://callback")!
        )
    }

    var body: some Scene {
        WindowGroup {
            MarketView()
                .meneUygun()
                .task { await MeneUygun.shared.refresh() } // fetch on every app start
        }
    }
}
