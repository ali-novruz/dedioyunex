import AVFoundation

/// Text-to-speech honoring `tts` and `ttsRate`.
///
/// Voice: `az-AZ` if installed, otherwise `tr-TR`, otherwise the system default voice.
/// `voiceLanguage` tells you which one was chosen (`nil` = system default).
@MainActor
public final class MeneUygunSpeech {
    public nonisolated static let preferredLanguages = ["az-AZ", "tr-TR"]

    /// The chosen voice, `nil` when neither az-AZ nor tr-TR is installed.
    public let voice: AVSpeechSynthesisVoice?
    /// BCP-47 code of the chosen voice (e.g. "tr-TR"), `nil` = system default voice.
    public var voiceLanguage: String? { voice?.language }

    private let synthesizer = AVSpeechSynthesizer()

    public init(preferredLanguages: [String] = MeneUygunSpeech.preferredLanguages) {
        voice = Self.pickVoice(preferredLanguages)
    }

    /// Speaks `text` if `preferences.tts` is on. Interrupts anything currently being spoken.
    /// - Returns: `false` if TTS is off (nothing spoken).
    @discardableResult
    public func speak(_ text: String, preferences: Preferences) -> Bool {
        guard preferences.tts else { return false }
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = voice
        utterance.rate = Self.rate(for: preferences.ttsRate)
        if synthesizer.isSpeaking { synthesizer.stopSpeaking(at: .immediate) }
        synthesizer.speak(utterance)
        return true
    }

    public func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }

    public var isSpeaking: Bool { synthesizer.isSpeaking }

    /// ttsRate (0.6 | 0.8 | 1 | 1.2) relative to `AVSpeechUtteranceDefaultSpeechRate`.
    public nonisolated static func rate(for ttsRate: Double) -> Float {
        let rate = AVSpeechUtteranceDefaultSpeechRate * Float(ttsRate)
        return min(max(rate, AVSpeechUtteranceMinimumSpeechRate), AVSpeechUtteranceMaximumSpeechRate)
    }

    private static func pickVoice(_ languages: [String]) -> AVSpeechSynthesisVoice? {
        let voices = AVSpeechSynthesisVoice.speechVoices()
        for language in languages {
            if let exact = voices.first(where: { $0.language == language }) { return exact }
            let prefix = language.split(separator: "-").first.map(String.init) ?? language
            if let sameLanguage = voices.first(where: { $0.language.hasPrefix(prefix + "-") }) { return sameLanguage }
        }
        return nil
    }
}
