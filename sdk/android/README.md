# MƏNƏ UYĞUN — Android SDK

Kotlin + Jetpack Compose. Library module `:meneuygun` (package `az.meneuygun.sdk`), demo app `:sample` ("DEMO Market").

Build: `./gradlew :sample:assembleDebug` (Gradle 9.3.1, AGP 8.13.0, Kotlin 2.3.0, compileSdk 36, minSdk 24; runs on JDK 17–25).

## Integration in 5 steps

**1. Add the module and register your redirect scheme.** Your client must have a registered mobile redirect URI (e.g. `meneuygun-demo://callback`).

```kotlin
// app/build.gradle.kts
dependencies { implementation(project(":meneuygun")) }
android { defaultConfig { manifestPlaceholders["meneuygunRedirectScheme"] = "meneuygun-demo" } }
```

The SDK manifest adds `INTERNET` and a `MeneUygunRedirectActivity` with an intent filter for that scheme.

**2. Initialize once** in `Application.onCreate` (it restores the cached token and preferences instantly):

```kotlin
MeneUygun.init(this, clientId = "demo-mobile", baseUrl = "https://…", redirectUri = "meneuygun-demo://callback")
```

**3. Wrap your UI in the theme.** Font scale, line/letter spacing, high-contrast / dark colors and 56dp touch targets are applied automatically (type-A settings).

```kotlin
setContent { MeneUygunTheme { AppContent() } }
```

**4. Add the connect button and refresh on start.**

```kotlin
MeneUygunConnectButton()                       // "MƏNƏ UYĞUN-dan ayarları gətir" / "Qoşulub ✓" + "Ayır"
LaunchedEffect(Unit) { MeneUygun.refresh() }   // GET /v1/preferences; on 401 the token is dropped
```

`connect(activity)` opens a Custom Tab with OAuth 2.0 + PKCE (S256) and `state`; the redirect activity verifies `state`, exchanges the code at `/oauth/token` and returns to your activity. `disconnect()` calls `/oauth/revoke` and clears local data. Errors from the redirect/exchange appear in `MeneUygun.lastError`.

**5. Implement the type-B flags yourself** from `LocalMeneUygun.current` (or `MeneUygun.preferences`):

```kotlin
val prefs = LocalMeneUygun.current
if (!prefs.simpleMode && !prefs.hideDistractions) PromoBanner()
Button(onClick = { if (prefs.confirmActions) askConfirm = true else pay() }) { Text("Ödə") }
```

Text-to-speech: `MeneUygunTts(context).speak(text, prefs)` speaks only when `prefs.tts` is on, at `prefs.ttsRate`; it uses an `az` voice, or `tr` if the device has none (`state` shows which).

## Notes

- `Preferences.fromJson` mirrors `sdk/web/src/schema.ts`: unknown keys ignored, missing keys = defaults, wrong type or value outside the schema throws `PreferenceException`.
- The sample reads `baseUrl` from `BuildConfig` (default `http://10.0.2.2:3000`, override with `-Pmeneuygun.baseUrl=…`). Cleartext HTTP is allowed only for `10.0.2.2`, `localhost`, `127.0.0.1`.
- Not applied on Android yet: `colorFilter`, `dyslexiaFont`, `readingRuler`, `reduceMotion` (exposed in `Preferences`, apps may implement them).
