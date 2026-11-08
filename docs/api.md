# Cizzy — API contract (v1)

Base URL: `https://cizzy.vercel.app` (dev: `http://localhost:3000`).
All JSON. Errors: `{ "error": "<code>", "error_description": "<text>" }` with 4xx/5xx.

## Preferences object

Flat JSON, source of truth: `sdk/web/src/schema.ts`. Every key is always present in responses.

```json
{
  "version": 1,
  "fontScale": 1,            // 1 | 1.25 | 1.5 | 1.75 | 2
  "lineSpacing": 1,          // 1 | 1.5 | 2
  "letterSpacing": 0,        // 0 | 0.05 | 0.1  (em)
  "contrast": "normal",      // "normal" | "high" | "dark"
  "colorFilter": "none",     // "none" | "protanopia" | "deuteranopia" | "tritanopia" | "grayscale"
  "highlightLinks": false, "largeCursor": false, "strongFocus": false, "screenReader": false,
  "captions": false, "visualAlerts": false, "transcripts": false, "signLanguage": false,
  "largeTargets": false, "extendedTimeouts": false, "noDrag": false, "reduceMotion": false,
  "simpleMode": false, "hideDistractions": false, "plainLanguage": false, "stepByStep": false,
  "confirmActions": false, "iconLabels": false,
  "dyslexiaFont": false, "readingRuler": false,
  "tts": false, "ttsRate": 1,  // ttsRate: 0.6 | 0.8 | 1 | 1.2
  "language": "az"           // "az" | "en"
}
```

Clients must ignore unknown keys (forward compatibility).

## Clients

A client (partner site or app) has `client_id`, `name`, `allowed_origins` (web) and `redirect_uris` (mobile).
Seeded demo clients:
- `demo-partner` — web, origin from env `DEMO_PARTNER_ORIGIN` (dev `http://localhost:4000`)
- `demo-mobile` — mobile, redirect URIs `cizzy-demo://callback`

## Authorization (OAuth 2.0 + PKCE, public clients, no client secret)

### 1. Authorize — `GET {BASE}/oauth/authorize`

| param | value |
|---|---|
| `response_type` | `code` |
| `client_id` | client id |
| `code_challenge` | BASE64URL(SHA-256(code_verifier)), no padding |
| `code_challenge_method` | `S256` |
| `state` | random string, echoed back |
| `redirect_uri` | mobile: exact registered URI. web popup: `postmessage` |
| `response_mode` | mobile: omit (query). web popup: `web_message` |
| `origin` | web popup only: `location.origin` of the partner page (must be in `allowed_origins`) |
| `return_to` | web popup only, optional: page URL on the same origin. Used when the popup has no `window.opener` (opened as a tab): the browser is sent to `return_to#cz_code=…&cz_state=…` |

User logs in if needed and sees the consent screen.
- Mobile result: redirect to `{redirect_uri}?code=...&state=...` or `{redirect_uri}?error=access_denied&state=...`.
- Web, popup blocked: `response_mode=cz_fragment`, `redirect_uri=<page URL on a registered origin>` → `redirect_uri#cz_code=…&cz_state=…` (exchange with that same `redirect_uri`).
- Web result: the popup calls `window.opener.postMessage({ type: "cizzy:authorize", code, state } | { type: "cizzy:authorize", error: "access_denied", state }, origin)` and closes.

Code lifetime: 5 minutes, single use.

### 2. Token — `POST {BASE}/oauth/token`

Body (JSON or `application/x-www-form-urlencoded`):
`grant_type=authorization_code`, `code`, `code_verifier`, `client_id`, `redirect_uri` (same value as in authorize).

200:
```json
{ "access_token": "mu_...", "token_type": "Bearer", "scope": "preferences", "sub": "<pairwise id>", "preferences": { ... } }
```
`sub` is a per-client pseudonymous user id (different for every client). Tokens do not expire; they are revoked by the user (platform "Bağlı xidmətlər") or by the client.
Errors: `invalid_request`, `invalid_client`, `invalid_grant` (400).

### 3. Preferences — `GET {BASE}/v1/preferences`

Header `Authorization: Bearer <access_token>`.
200: `{ "sub": "...", "preferences": { ... }, "updatedAt": "2026-11-08T10:00:00.000Z" }`
401 `{ "error": "invalid_token" }` → token revoked or unknown: client must delete the stored token and show the connect button again.

Clients should fetch on every app start / page load and apply the result; cache the last result locally to apply instantly before the network call returns.

### 4. Revoke — `POST {BASE}/oauth/revoke`

Body `{ "token": "<access_token>" }` → 200 `{}` (also 200 for unknown tokens).

## CORS

`/oauth/token`, `/oauth/revoke`, `/v1/preferences` answer CORS only for origins in the client's `allowed_origins`. Requests without an `Origin` header (mobile apps) are allowed.

## Schema — `GET {BASE}/v1/schema`

Public, no auth. All settings with type, allowed values, kind (A = SDK applies, B = service applies), need categories and best-effort mapping to WCAG 2.2 / ISO/IEC 24751 / CSS media features.
