import AVFoundation
import SwiftUI
import XCTest
@testable import MeneUygun

final class PreferencesTests: XCTestCase {
    private func decode(_ json: String) throws -> Preferences {
        try JSONDecoder().decode(Preferences.self, from: Data(json.utf8))
    }

    func testEmptyObjectGivesSchemaDefaults() throws {
        let prefs = try decode("{}")
        XCTAssertEqual(prefs, Preferences())
        XCTAssertEqual(prefs.version, 1)
        XCTAssertEqual(prefs.fontScale, 1)
        XCTAssertEqual(prefs.contrast, .normal)
        XCTAssertEqual(prefs.colorFilter, .none)
        XCTAssertEqual(prefs.ttsRate, 1)
        XCTAssertEqual(prefs.language, .az)
    }

    func testFullServerObject() throws {
        let prefs = try decode("""
        {"version":1,"fontScale":1.5,"lineSpacing":2,"letterSpacing":0.05,"contrast":"dark","colorFilter":"grayscale",
         "highlightLinks":true,"largeCursor":false,"strongFocus":false,"screenReader":false,
         "captions":false,"visualAlerts":false,"transcripts":false,"signLanguage":false,
         "largeTargets":true,"extendedTimeouts":false,"noDrag":false,"reduceMotion":true,
         "simpleMode":true,"hideDistractions":false,"plainLanguage":false,"stepByStep":false,
         "confirmActions":true,"iconLabels":true,"dyslexiaFont":false,"readingRuler":false,
         "tts":true,"ttsRate":0.6,"language":"ru"}
        """)
        XCTAssertEqual(prefs.fontScale, 1.5)
        XCTAssertEqual(prefs.lineSpacing, 2)
        XCTAssertEqual(prefs.letterSpacing, 0.05)
        XCTAssertEqual(prefs.contrast, .dark)
        XCTAssertEqual(prefs.colorFilter, .grayscale)
        XCTAssertTrue(prefs.confirmActions)
        XCTAssertEqual(prefs.ttsRate, 0.6)
        XCTAssertEqual(prefs.language, .ru)
    }

    func testUnknownKeysAreIgnored() throws {
        let prefs = try decode(#"{"futureKey":{"nested":true},"simpleMode":true}"#)
        XCTAssertTrue(prefs.simpleMode)
    }

    func testInputVersionIsIgnored() throws {
        XCTAssertEqual(try decode(#"{"version":99}"#).version, Preferences.schemaVersion)
    }

    func testWrongTypesThrow() {
        XCTAssertThrowsError(try decode(#"{"fontScale":"big"}"#))
        XCTAssertThrowsError(try decode(#"{"tts":"yes"}"#))
        XCTAssertThrowsError(try decode(#"{"tts":1}"#))
        XCTAssertThrowsError(try decode(#"{"tts":null}"#))
        XCTAssertThrowsError(try decode(#"{"contrast":1}"#))
    }

    func testValuesOutsideSchemaThrow() {
        XCTAssertThrowsError(try decode(#"{"fontScale":1.3}"#))
        XCTAssertThrowsError(try decode(#"{"ttsRate":2}"#))
        XCTAssertThrowsError(try decode(#"{"contrast":"neon"}"#))
        XCTAssertThrowsError(try decode(#"{"colorFilter":"sepia"}"#))
        XCTAssertThrowsError(try decode(#"{"language":"tr"}"#))
    }

    func testRoundTrip() throws {
        var prefs = Preferences()
        prefs.fontScale = 1.75
        prefs.contrast = .high
        prefs.tts = true
        prefs.ttsRate = 1.2
        let data = try JSONEncoder().encode(prefs)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(object["version"] as? Int, 1)
        XCTAssertEqual(object.count, 29) // version + 28 preference keys
        XCTAssertEqual(try JSONDecoder().decode(Preferences.self, from: data), prefs)
    }

    func testDynamicTypeMapping() {
        func size(_ scale: Double) -> DynamicTypeSize {
            var prefs = Preferences()
            prefs.fontScale = scale
            return prefs.dynamicTypeSize
        }
        XCTAssertEqual(size(1), .large)
        XCTAssertEqual(size(1.25), .xxLarge)
        XCTAssertEqual(size(1.5), .xxxLarge)
        XCTAssertEqual(size(1.75), .accessibility2)
        XCTAssertEqual(size(2), .accessibility4)
    }
}

final class PKCETests: XCTestCase {
    /// RFC 7636 Appendix B test vector.
    func testS256Challenge() {
        XCTAssertEqual(
            PKCE.challenge(for: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        )
    }

    func testVerifierShapeAndUniqueness() {
        let a = PKCE.generate(), b = PKCE.generate()
        XCTAssertEqual(a.verifier.count, 43)
        XCTAssertNotEqual(a.verifier, b.verifier)
        XCTAssertNil(a.verifier.rangeOfCharacter(from: CharacterSet(charactersIn: "+/=")))
    }
}

final class SpeechRateTests: XCTestCase {
    func testRateScalesDefault() {
        XCTAssertEqual(MeneUygunSpeech.rate(for: 1), AVSpeechUtteranceDefaultSpeechRate)
        XCTAssertLessThan(MeneUygunSpeech.rate(for: 0.6), MeneUygunSpeech.rate(for: 1))
        XCTAssertGreaterThan(MeneUygunSpeech.rate(for: 1.2), MeneUygunSpeech.rate(for: 1))
    }
}
