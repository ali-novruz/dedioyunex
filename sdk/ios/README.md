# MƏNƏ UYĞUN — iOS SDK (Swift Package)

> **⚠️ NOT COMPILED / NOT TESTED.** This package and the example app were written on Windows without Xcode.
> The code targets **Xcode 16+, Swift 6 language mode, iOS 16+**, but it has never been built or run.
> Before using it in a demo, do the checks in [What to verify first on a Mac](#what-to-verify-first-on-a-mac).

The SDK reads the user's accessibility preference profile from MƏNƏ UYĞUN (OAuth 2.0 + PKCE, see `docs/api.md`)
and applies it to a SwiftUI app. Preference model mirrors `sdk/web/src/schema.ts` exactly.

## Integration in 5 steps

1. **Add the package.** Xcode → File → Add Package Dependencies… → Add Local… → select `sdk/ios`
   (or `.package(path: "../sdk/ios")` in another `Package.swift`). Link the `MeneUygun` library.

2. **Register your client** on the platform (`client_id` + a custom-scheme `redirect_uri`, e.g. `myapp://callback`).
   The seeded demo client is `demo-mobile` / `meneuygun-demo://callback`.
   You do **not** need to add the scheme to `CFBundleURLTypes`: `ASWebAuthenticationSession` catches the callback itself.
   For plain-http dev servers add an ATS exception (see `Example/MeneUygunDemo/Info.plist`).

3. **Configure once at start-up:**
   ```swift
   import MeneUygun

   @main struct MyApp: App {
       init() {
           MeneUygun.shared.configure(clientId: "demo-mobile",
                                      baseURL: URL(string: "http://localhost:3000")!,
                                      redirectURI: URL(string: "meneuygun-demo://callback")!)
       }
       var body: some Scene {
           WindowGroup {
               RootView()
                   .meneUygun()                                   // step 4
                   .task { await MeneUygun.shared.refresh() }     // fetch on every start
           }
       }
   }
   ```

4. **Apply preferences** with `.meneUygun()` on the root view. It applies automatically (type A):
   - `fontScale` → `dynamicTypeSize` (1 → system size, 1.25 → `.xxLarge`, 1.5 → `.xxxLarge`, 1.75 → `.accessibility2`, 2 → `.accessibility4`; never shrinks a larger system size),
   - `lineSpacing` / `letterSpacing` → `.lineSpacing` / `.tracking` (≈17 pt body),
   - `contrast == .dark` → `preferredColorScheme(.dark)`; `contrast == .high` → bold legibility weight + `\.meneUygunIncreasedContrast = true`,
   - `colorFilter == .grayscale` → `.grayscale(1)`,
   - `reduceMotion` → animations disabled via `.transaction`; `\.meneUygunReduceMotion` also reflects the system setting.

   Everything else (type B and A-flags that need app design: `simpleMode`, `hideDistractions`, `confirmActions`,
   `largeTargets`, `iconLabels`, `plainLanguage`, `extendedTimeouts`, `captions`, …) is read from the environment:
   ```swift
   @Environment(\.meneUygunPreferences) private var prefs
   if !(prefs.simpleMode || prefs.hideDistractions) { PromoBanner() }
   ```

5. **Add the connect button** somewhere in settings: `MeneUygunConnectButton()`
   ("MƏNƏ UYĞUN-dan ayarları gətir" → after connect "Qoşulub ✓" + "Ayır").
   Optional TTS: `let speech = MeneUygunSpeech(); speech.speak(text, preferences: prefs)` (no-op when `tts` is off).

## Public API

| Symbol | Notes |
|---|---|
| `MeneUygun.shared` | `@MainActor ObservableObject` |
| `configure(clientId:baseURL:redirectURI:)` | loads Keychain token + cached preferences; `redirectURI` must have a custom scheme (precondition) |
| `connect() async throws` | PKCE S256, random `state` checked, `ASWebAuthenticationSession` (`prefersEphemeralWebBrowserSession = false`), `POST /oauth/token`, token → Keychain. Throws `MeneUygunError` (`.cancelled`, `.accessDenied`, `.stateMismatch`, `.server`, `.network`, …) |
| `refresh() async` | `GET /v1/preferences`; 401 → token, cache and preferences cleared, `lastError = .tokenRevoked` |
| `disconnect() async` | clears local state, then `POST /oauth/revoke` |
| `@Published preferences`, `isConnected`, `lastError` | `lastError` holds failures of the non-throwing calls |
| `Preferences` | `Codable, Equatable, Hashable, Sendable`; unknown keys ignored, missing keys = schema defaults, wrong type / `null` / value outside the schema → `DecodingError` |
| `Contrast`, `ColorFilter`, `Language` | string enums |
| `View.meneUygun()`, `.meneUygun(client:)`, `.meneUygun(preferences:)` | last one for previews/tests |
| `\.meneUygunPreferences`, `\.meneUygunIncreasedContrast`, `\.meneUygunReduceMotion` | environment values |
| `MeneUygunConnectButton` | |
| `MeneUygunSpeech` | `AVSpeechSynthesizer`; voice az-AZ → tr-TR → system default; `voiceLanguage` says which (`nil` = system default) |

Storage: token in Keychain (`service = az.meneuygun.sdk`, `account = clientId`, `AfterFirstUnlockThisDeviceOnly`);
last preferences in `UserDefaults` key `az.meneuygun.preferences.<clientId>`. Keychain items survive app reinstall, UserDefaults do not.

## Running the example

`Example/` contains only sources + `Info.plist` (no `.xcodeproj` could be generated on Windows).

- With XcodeGen: `cd sdk/ios/Example && xcodegen && open MeneUygunDemo.xcodeproj` (`project.yml` untested).
- By hand: Xcode → New Project → iOS App (SwiftUI) named `MeneUygunDemo`, delete the template `ContentView`/App file,
  add the two `.swift` files from `Example/MeneUygunDemo`, add the local package `sdk/ios`, and copy the
  `NSAppTransportSecurity` block from `Example/MeneUygunDemo/Info.plist` into the target's Info.
- Start the platform on the Mac (`http://localhost:3000`) and run on the **simulator** (localhost = the Mac).
  On a real device, use the Mac's LAN IP in `baseURL` and allow it in ATS (dev only).

Screen: "DEMO Market" header, promo banner (hidden with `simpleMode`/`hideDistractions`), 3 products,
"Ödə" (asks "Əminsiniz?" when `confirmActions`), TTS button when `tts`, connect / disconnect / refresh.

## What to verify first on a Mac

1. **Build + unit tests** (decoding rules, RFC 7636 PKCE vector, mapping):
   `cd sdk/ios && xcodebuild test -scheme MeneUygun -destination 'platform=iOS Simulator,name=iPhone 16'`
   (`swift build`/`swift test` on macOS will fail: the package is iOS-only and imports UIKit.)
2. **Swift 6 concurrency diagnostics**, the likeliest compile problems:
   - `ASWebAuthenticationSession` completion closure marked `@Sendable` (`MeneUygun.swift`),
   - `PresentationAnchorProvider.presentationAnchor` as `nonisolated` + `MainActor.assumeIsolated`,
   - `withCheckedThrowingContinuation` body touching `authSession` (relies on Swift 6 `#isolation` inheritance).
3. **SwiftUI APIs assumed:** `.environment(\.legibilityWeight, …)` is settable; `View.tracking(_:)` (iOS 16);
   `DynamicTypeSize` is `Comparable`.
4. **End-to-end on the simulator:** connect → consent → callback → token in Keychain → preferences applied;
   kill/relaunch (cached preferences applied before the network returns); revoke from the platform
   ("Bağlı xidmətlər") → `refresh()` gets 401 → button returns; "Ayır" → revoke call succeeds.
   Expect the system prompt "… wants to use localhost to sign in" (shared, non-ephemeral session).
5. **`tts: 1` decoding** throws on the iOS versions you target (Bool from number), as the schema requires.
6. **TTS voice:** iOS likely has no az-AZ voice, so `voiceLanguage` should report `tr-TR` (or `nil` if no Turkish voice is installed).

## Known limitations

- `colorFilter` protanopia/deuteranopia/tritanopia, `dyslexiaFont`, `readingRuler`, `highlightLinks`, `strongFocus`,
  `largeCursor`, `captions` are exposed but not applied automatically (no generic SwiftUI equivalent).
- System "Increase Contrast" / "Reduce Motion" cannot be forced by an app; the SDK combines them into its own environment flags.
- `preferredColorScheme(.dark)` affects the whole window, not just the modified subtree.
