import Foundation

// Mirrors sdk/web/src/schema.ts exactly. Keep keys, defaults and allowed values identical.

public enum Contrast: String, Codable, CaseIterable, Sendable {
    case normal, high, dark
}

public enum ColorFilter: String, Codable, CaseIterable, Sendable {
    case none, protanopia, deuteranopia, tritanopia, grayscale
}

public enum Language: String, Codable, CaseIterable, Sendable {
    case az, ru, en
}

/// The user's accessibility preference profile (schema v1).
///
/// Decoding rules (same as `normalizePreferences` in schema.ts):
/// - unknown keys are ignored (forward compatibility),
/// - missing keys take the schema default,
/// - a present key with a wrong type, `null`, or a value outside the allowed set throws `DecodingError`,
/// - `version` from the input is ignored; it is always `Preferences.schemaVersion`.
public struct Preferences: Codable, Equatable, Hashable, Sendable {
    public static let schemaVersion = 1

    public static let fontScaleOptions: [Double] = [1, 1.25, 1.5, 1.75, 2]
    public static let lineSpacingOptions: [Double] = [1, 1.5, 2]
    public static let letterSpacingOptions: [Double] = [0, 0.05, 0.1]
    public static let ttsRateOptions: [Double] = [0.6, 0.8, 1, 1.2]

    public let version: Int = Preferences.schemaVersion

    // vision
    public var fontScale: Double = 1
    public var lineSpacing: Double = 1
    /// em
    public var letterSpacing: Double = 0
    public var contrast: Contrast = .normal
    public var colorFilter: ColorFilter = .none
    public var highlightLinks = false
    public var largeCursor = false
    public var strongFocus = false
    public var screenReader = false
    // hearing
    public var captions = false
    public var visualAlerts = false
    public var transcripts = false
    public var signLanguage = false
    // motor
    public var largeTargets = false
    public var extendedTimeouts = false
    public var noDrag = false
    public var reduceMotion = false
    // cognitive
    public var simpleMode = false
    public var hideDistractions = false
    public var plainLanguage = false
    public var stepByStep = false
    public var confirmActions = false
    public var iconLabels = false
    // reading
    public var dyslexiaFont = false
    public var readingRuler = false
    public var tts = false
    public var ttsRate: Double = 1
    // general
    public var language: Language = .az

    /// Schema defaults (`DEFAULT_PREFERENCES`).
    public init() {}

    enum CodingKeys: String, CodingKey {
        case version
        case fontScale, lineSpacing, letterSpacing, contrast, colorFilter
        case highlightLinks, largeCursor, strongFocus, screenReader
        case captions, visualAlerts, transcripts, signLanguage
        case largeTargets, extendedTimeouts, noDrag, reduceMotion
        case simpleMode, hideDistractions, plainLanguage, stepByStep, confirmActions, iconLabels
        case dyslexiaFont, readingRuler, tts, ttsRate
        case language
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.init()

        fontScale = try Self.choice(c, .fontScale, Self.fontScaleOptions, default: fontScale)
        lineSpacing = try Self.choice(c, .lineSpacing, Self.lineSpacingOptions, default: lineSpacing)
        letterSpacing = try Self.choice(c, .letterSpacing, Self.letterSpacingOptions, default: letterSpacing)
        contrast = try Self.field(c, .contrast, default: contrast)
        colorFilter = try Self.field(c, .colorFilter, default: colorFilter)
        highlightLinks = try Self.field(c, .highlightLinks, default: highlightLinks)
        largeCursor = try Self.field(c, .largeCursor, default: largeCursor)
        strongFocus = try Self.field(c, .strongFocus, default: strongFocus)
        screenReader = try Self.field(c, .screenReader, default: screenReader)

        captions = try Self.field(c, .captions, default: captions)
        visualAlerts = try Self.field(c, .visualAlerts, default: visualAlerts)
        transcripts = try Self.field(c, .transcripts, default: transcripts)
        signLanguage = try Self.field(c, .signLanguage, default: signLanguage)

        largeTargets = try Self.field(c, .largeTargets, default: largeTargets)
        extendedTimeouts = try Self.field(c, .extendedTimeouts, default: extendedTimeouts)
        noDrag = try Self.field(c, .noDrag, default: noDrag)
        reduceMotion = try Self.field(c, .reduceMotion, default: reduceMotion)

        simpleMode = try Self.field(c, .simpleMode, default: simpleMode)
        hideDistractions = try Self.field(c, .hideDistractions, default: hideDistractions)
        plainLanguage = try Self.field(c, .plainLanguage, default: plainLanguage)
        stepByStep = try Self.field(c, .stepByStep, default: stepByStep)
        confirmActions = try Self.field(c, .confirmActions, default: confirmActions)
        iconLabels = try Self.field(c, .iconLabels, default: iconLabels)

        dyslexiaFont = try Self.field(c, .dyslexiaFont, default: dyslexiaFont)
        readingRuler = try Self.field(c, .readingRuler, default: readingRuler)
        tts = try Self.field(c, .tts, default: tts)
        ttsRate = try Self.choice(c, .ttsRate, Self.ttsRateOptions, default: ttsRate)

        language = try Self.field(c, .language, default: language)
    }

    /// Missing key → default. Present key (including `null`) must decode as `T`, otherwise throws.
    private static func field<T: Decodable>(
        _ c: KeyedDecodingContainer<CodingKeys>, _ key: CodingKeys, default fallback: T
    ) throws -> T {
        guard c.contains(key) else { return fallback }
        return try c.decode(T.self, forKey: key)
    }

    /// Numeric choice: must be one of `options`, otherwise throws.
    private static func choice(
        _ c: KeyedDecodingContainer<CodingKeys>, _ key: CodingKeys, _ options: [Double], default fallback: Double
    ) throws -> Double {
        guard c.contains(key) else { return fallback }
        let value = try c.decode(Double.self, forKey: key)
        guard let match = options.first(where: { abs($0 - value) < 1e-9 }) else {
            throw DecodingError.dataCorruptedError(
                forKey: key, in: c,
                debugDescription: "\(key.stringValue) must be one of \(options), got \(value)"
            )
        }
        return match
    }
}
