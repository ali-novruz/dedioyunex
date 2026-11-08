# Backlog

## Done (MVP, 2026-11-08)
- Platform: e-mail code login, e-mail-less start, need-based onboarding + presets, voice/text AI assistant (clarifying question, confirm, undo, daily limit), manual settings editor (28 settings / 6 categories), connected services, QR transfer to another device, export, account deletion.
- API: OAuth 2.0 + PKCE (web popup / no-opener fallback / redirect, mobile custom scheme), pairwise subject ids, CORS per registered origin, revoke, public `/v1/schema` with WCAG/ISO 24751 mapping.
- Web SDK: auto mode (works on any site), tokens mode, compatibility indicator (`data-supports`), `?mu-check` checker, fail-open (cached prefs), cross-tab + on-focus sync.
- Verified partner badge, anti-scam text, need categories encrypted at rest (AES-256-GCM).
- Tests: `tests/e2e-web.sh` (7 steps, PASS), `tests/api-test.sh` (35 checks, PASS).

## Not verified / open
- **iOS SDK** never compiled (no Mac). First thing on a Mac: `xcodebuild` the Example, run PreferencesTests.
- **Android SDK** builds (`assembleDebug`), never run on a device/emulator; OAuth round trip with the real server untested. colorFilter, dyslexiaFont, readingRuler, reduceMotion are exposed but not applied on Android.
- **Real AI key**: assistant tested only against `tests/mock-ai.mjs`. Needs a Groq (free) key; check Azerbaijani Whisper quality with real elderly speech.
- **Azerbaijani TTS**: browsers have no az voice → Turkish voice is used and the UI says so. Cloud TTS (az-AZ) is a roadmap item.
- **E-mail delivery**: only `DEMO_SHOW_CODES=true` tested; SMTP path untested.
- **Deploy**: Docker files written; VPS + domain not set up yet.

## Roadmap
1. Browser extension for sites without the SDK (gives value without partners).
2. SMS login code (needs a paid SMS provider).
3. ASAN Login / SİMA link.
4. Android overlay + OCR for apps without the SDK (iOS does not allow it).
5. Cloud TTS with a real Azerbaijani voice.
6. Partner dashboard: integration health, compatibility score history.
7. Legal review against Azerbaijan's personal data law.
