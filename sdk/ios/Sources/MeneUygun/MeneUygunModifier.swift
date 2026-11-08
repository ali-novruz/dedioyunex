import SwiftUI

// MARK: - Environment values (type-B flags and combined accessibility state)

private struct MeneUygunPreferencesKey: EnvironmentKey {
    static let defaultValue = Preferences()
}

private struct MeneUygunIncreasedContrastKey: EnvironmentKey {
    static let defaultValue = false
}

private struct MeneUygunReduceMotionKey: EnvironmentKey {
    static let defaultValue = false
}

public extension EnvironmentValues {
    /// Preferences applied by the nearest `.meneUygun()`. Read type-B flags here
    /// (`confirmActions`, `simpleMode`, `plainLanguage`, `extendedTimeouts`, ...).
    var meneUygunPreferences: Preferences {
        get { self[MeneUygunPreferencesKey.self] }
        set { self[MeneUygunPreferencesKey.self] = newValue }
    }

    /// `true` when MƏNƏ UYĞUN `contrast == .high` OR system "Increase Contrast" is on.
    /// (`\.colorSchemeContrast` is read-only in SwiftUI, so the SDK cannot force it; use this instead.)
    var meneUygunIncreasedContrast: Bool {
        get { self[MeneUygunIncreasedContrastKey.self] }
        set { self[MeneUygunIncreasedContrastKey.self] = newValue }
    }

    /// `true` when MƏNƏ UYĞUN `reduceMotion` OR system "Reduce Motion" is on.
    var meneUygunReduceMotion: Bool {
        get { self[MeneUygunReduceMotionKey.self] }
        set { self[MeneUygunReduceMotionKey.self] = newValue }
    }
}

// MARK: - Mapping

public extension Preferences {
    /// fontScale → Dynamic Type size.
    /// 1 → .large (system default), 1.25 → .xxLarge, 1.5 → .xxxLarge, 1.75 → .accessibility2, 2 → .accessibility4.
    var dynamicTypeSize: DynamicTypeSize {
        switch fontScale {
        case ..<1.125: .large
        case ..<1.375: .xxLarge
        case ..<1.625: .xxxLarge
        case ..<1.875: .accessibility2
        default: .accessibility4
        }
    }
}

// MARK: - View modifier

public extension View {
    /// Applies the user's MƏNƏ UYĞUN preferences from `MeneUygun.shared` to this view tree.
    /// Put it once on the root view.
    @MainActor
    func meneUygun() -> some View {
        modifier(MeneUygunClientModifier(client: MeneUygun.shared))
    }

    /// Same, observing a specific client.
    @MainActor
    func meneUygun(client: MeneUygun) -> some View {
        modifier(MeneUygunClientModifier(client: client))
    }

    /// Applies a fixed preferences value (previews, tests, snapshots).
    func meneUygun(preferences: Preferences) -> some View {
        modifier(MeneUygunPreferencesModifier(preferences: preferences))
    }
}

struct MeneUygunClientModifier: ViewModifier {
    @ObservedObject var client: MeneUygun

    func body(content: Content) -> some View {
        content.modifier(MeneUygunPreferencesModifier(preferences: client.preferences))
    }
}

struct MeneUygunPreferencesModifier: ViewModifier {
    let preferences: Preferences

    @Environment(\.dynamicTypeSize) private var systemTypeSize
    @Environment(\.colorSchemeContrast) private var systemContrast
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @Environment(\.legibilityWeight) private var systemLegibilityWeight

    /// Approximate body size in points, used to turn web-relative values (em, line-height) into points.
    private static let bodyPointSize: CGFloat = 17

    func body(content: Content) -> some View {
        let prefs = preferences
        // fontScale 1 keeps the user's system size (even if smaller); >1 only ever enlarges.
        let typeSize = prefs.fontScale > 1 ? max(systemTypeSize, prefs.dynamicTypeSize) : systemTypeSize
        let disableAnimations = prefs.reduceMotion

        content
            .dynamicTypeSize(typeSize)
            .lineSpacing(CGFloat(prefs.lineSpacing - 1) * Self.bodyPointSize)
            .tracking(CGFloat(prefs.letterSpacing) * Self.bodyPointSize)
            .environment(\.legibilityWeight, prefs.contrast == .high ? LegibilityWeight.bold : systemLegibilityWeight)
            .grayscale(prefs.colorFilter == .grayscale ? 1 : 0)
            .preferredColorScheme(prefs.contrast == .dark ? ColorScheme.dark : nil)
            .transaction { transaction in
                if disableAnimations {
                    transaction.animation = nil
                    transaction.disablesAnimations = true
                }
            }
            .environment(\.meneUygunPreferences, prefs)
            .environment(\.meneUygunIncreasedContrast, prefs.contrast == .high || systemContrast == .increased)
            .environment(\.meneUygunReduceMotion, prefs.reduceMotion || systemReduceMotion)
    }
}
