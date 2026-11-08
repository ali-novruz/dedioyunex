#!/usr/bin/env bash
# API-level tests: anonymous account, AI assistant (needs tests/mock-ai.mjs on :4100), limits,
# QR transfer, mobile OAuth (PKCE + custom scheme), CORS, revoke, schema.
# Usage: BASE=http://localhost:3100 bash tests/api-test.sh   (server started with AI_* pointing to the mock, AI_DAILY_LIMIT=5)
set -euo pipefail
BASE="${BASE:-http://localhost:3100}"
J1=$(mktemp); J2=$(mktemp)
pass=0
ok() { pass=$((pass+1)); echo "  ✓ $*"; }
fail() { echo "  ✗ FAIL: $*"; exit 1; }
post() { curl -s -b "$1" -c "$1" -H "Origin: $BASE" -H "Content-Type: application/json" -X "${4:-POST}" "$BASE$2" -d "$3"; }
get() { curl -s -b "$1" -c "$1" "$BASE$2"; }

echo "security"
curl -s -X POST "$BASE/api/auth/anonymous" -H "Origin: https://evil.example" | grep -q "Cross-origin" && ok "CSRF: foreign Origin blocked" || fail "csrf"
curl -s -X POST "$BASE/api/auth/anonymous" | grep -q "Cross-origin" && ok "CSRF: missing Origin blocked" || fail "csrf no origin"
curl -s -X POST "$BASE/api/auth/request-code" -H "Origin: $BASE" -H "Content-Type: text/plain" -d '{"email":"a@b.c"}' | grep -q "application/json" && ok "non-JSON body rejected" || fail "content-type"
for n in '//evil.example' '/\evil.example' '/%5Cevil.example'; do
  L=$(curl -s -o /dev/null -w "%{redirect_url}" -b "$J1" "$BASE/giris?next=$n")
  [[ "$L" != *evil* ]] || fail "open redirect via $n → $L"
done; ok "open redirect blocked"
R=$(post "$J2" /api/auth/request-code '{"email":"real.person@gmail.com"}')
echo "$R" | grep -q 'demoCode' && fail "code shown for non-demo e-mail: $R" || ok "codes not shown for real e-mails without SMTP"
R=$(post "$J2" /api/auth/request-code '{"email":"ali@demo.az"}')
echo "$R" | grep -qE '"demoCode":"[0-9]{6}"' && ok "demo domain shows code" || fail "demo domain: $R"
rm -f "$J2"; J2=$(mktemp)

echo "anonymous account"
post "$J1" /api/auth/anonymous '{}' | grep -q '"ok":true' || fail "anonymous start"
get "$J1" /api/me | grep -q '"email":null' && ok "account without e-mail" || fail "me"
post "$J1" /api/me/categories '{"categories":["vision"]}' PUT | grep -q vision && ok "categories saved" || fail "categories"
post "$J1" /api/me/categories '{"categories":["xray"]}' PUT | grep -q error && ok "unknown category rejected" || fail "bad category accepted"

echo "assistant"
R=$(post "$J1" /api/assistant/interpret '{"text":"kömək edin, bilmirəm"}')
echo "$R" | grep -q '"question":"Sizə nə çətindir' && ok "vague request → clarifying question" || fail "no question: $R"
R=$(post "$J1" /api/assistant/interpret '{"text":"yazılar xırdadır","previous":{"said":"kömək edin","question":"Sizə nə çətindir?"}}')
echo "$R" | grep -q '"fontScale":1.75' && ok "follow-up → settings" || fail "no patch: $R"
echo "$R" | grep -q 'bogusKey' && echo "$R" | grep -q '"ignored":\[' && ok "invalid AI keys dropped and reported" || fail "ignored missing: $R"
echo "$R" | grep -q '"ttsRate":3' && fail "invalid value passed through" || ok "invalid AI value dropped"
echo "$R" | grep -q 'nonsense' && fail "unknown category passed" || ok "unknown AI category dropped"
get "$J1" /api/me | grep -q '"fontScale":1,' && ok "interpret does not save before confirmation" || fail "saved without confirmation"
AUDIO=./.mu-test-audio.webm; printf 'fake-audio-bytes' > "$AUDIO"; trap 'rm -f "$AUDIO"' EXIT
R=$(curl -s -b "$J1" -c "$J1" -H "Origin: $BASE" -F "audio=@$AUDIO;type=audio/webm" "$BASE/api/assistant/transcribe")
echo "$R" | grep -q 'xırdadır' && ok "speech → text (server mode)" || fail "transcribe: $R"
for i in 1 2 3; do post "$J1" /api/assistant/interpret '{"text":"yazılar xırdadır"}' >/dev/null; done
R=$(post "$J1" /api/assistant/interpret '{"text":"yazılar xırdadır"}')
echo "$R" | grep -q 'limiti bitdi' && ok "daily AI limit enforced (5)" || fail "limit not enforced: $R"

echo "preferences validation"
post "$J1" /api/me/preferences '{"fontScale":7}' PATCH | grep -q error && ok "invalid value rejected" || fail "fontScale 7 accepted"
post "$J1" /api/me/preferences '{"fontScale":1.5,"tts":true}' PATCH | grep -q '"fontScale":1.5' && ok "patch saved" || fail "patch"

echo "QR transfer"
R=$(post "$J1" /api/me/transfer '{}')
TOKEN=$(echo "$R" | grep -oE '/kecid/[A-Za-z0-9_-]+' | cut -d/ -f3)
echo "$R" | grep -q '<svg' && ok "QR svg generated" || fail "no svg"
post "$J2" /api/auth/transfer "{\"token\":\"$TOKEN\"}" | grep -q '"ok":true' && ok "second device signed in" || fail "transfer"
get "$J2" /api/me | grep -q '"fontScale":1.5' && ok "same profile on second device" || fail "different profile"
post "$J2" /api/auth/transfer "{\"token\":\"$TOKEN\"}" | grep -q 'etibarlı deyil' && ok "transfer link is single-use" || fail "token reusable"

echo "mobile OAuth (PKCE, custom scheme)"
VERIFIER=$(head -c 48 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n' | head -c 64)
CHALLENGE=$(printf '%s' "$VERIFIER" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=\n')
PARAMS="{\"response_type\":\"code\",\"client_id\":\"demo-mobile\",\"redirect_uri\":\"meneuygun-demo://callback\",\"code_challenge\":\"$CHALLENGE\",\"code_challenge_method\":\"S256\",\"state\":\"st123\"}"
R=$(post "$J1" /api/oauth/decision "{\"params\":$PARAMS,\"decision\":\"allow\"}")
URL=$(echo "$R" | grep -oE 'meneuygun-demo://callback\?[^"]+')
[[ -n "$URL" ]] && ok "redirect to app scheme: ${URL:0:40}…" || fail "decision: $R"
CODE=$(echo "$URL" | grep -oE 'code=[^&]+' | cut -d= -f2)
echo "$URL" | grep -q 'state=st123' && ok "state echoed" || fail "state"
R=$(curl -s -X POST "$BASE/oauth/token" -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=authorization_code&code=$CODE&code_verifier=wrong-verifier-wrong-verifier-wrong-verifier-123&client_id=demo-mobile&redirect_uri=meneuygun-demo://callback")
echo "$R" | grep -q invalid_grant && ok "wrong PKCE verifier rejected (and code burned)" || fail "pkce: $R"
R=$(post "$J1" /api/oauth/decision "{\"params\":$PARAMS,\"decision\":\"allow\"}")
CODE=$(echo "$R" | grep -oE 'code=[^&"]+' | head -1 | cut -d= -f2)
R=$(curl -s -X POST "$BASE/oauth/token" -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=authorization_code&code=$CODE&code_verifier=$VERIFIER&client_id=demo-mobile&redirect_uri=meneuygun-demo://callback")
TOK=$(echo "$R" | grep -oE '"access_token":"[^"]+' | cut -d'"' -f4)
SUB=$(echo "$R" | grep -oE '"sub":"[^"]+' | cut -d'"' -f4)
[[ -n "$TOK" ]] && ok "token issued" || fail "token: $R"
echo "$R" | grep -q '"email"' && fail "email leaked in token response" || ok "no e-mail in token response"
echo "$R" | grep -q 'vision' && fail "categories leaked" || ok "no categories in token response"
R=$(curl -s -X POST "$BASE/oauth/token" -H "Content-Type: application/json" -d "{\"grant_type\":\"authorization_code\",\"code\":\"$CODE\",\"code_verifier\":\"$VERIFIER\",\"client_id\":\"demo-mobile\",\"redirect_uri\":\"meneuygun-demo://callback\"}")
echo "$R" | grep -q invalid_grant && ok "code is single-use" || fail "code reuse: $R"
R=$(curl -s "$BASE/v1/preferences" -H "Authorization: Bearer $TOK")
echo "$R" | grep -q '"fontScale":1.5' && ok "GET /v1/preferences" || fail "prefs: $R"

echo "pairwise ids"
VERIFIER2=$(head -c 48 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n' | head -c 64)
CH2=$(printf '%s' "$VERIFIER2" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=\n')
WP="{\"response_type\":\"code\",\"client_id\":\"demo-partner\",\"redirect_uri\":\"postmessage\",\"response_mode\":\"web_message\",\"origin\":\"http://localhost:4000\",\"code_challenge\":\"$CH2\",\"code_challenge_method\":\"S256\",\"state\":\"w1\"}"
R=$(post "$J1" /api/oauth/decision "{\"params\":$WP,\"decision\":\"allow\"}")
WCODE=$(echo "$R" | grep -oE '"code":"[^"]+' | cut -d'"' -f4)
R=$(curl -s -i -X POST "$BASE/oauth/token" -H "Origin: http://localhost:4000" -H "Content-Type: application/json" -d "{\"grant_type\":\"authorization_code\",\"code\":\"$WCODE\",\"code_verifier\":\"$VERIFIER2\",\"client_id\":\"demo-partner\",\"redirect_uri\":\"postmessage\"}")
echo "$R" | grep -qi 'access-control-allow-origin: http://localhost:4000' && ok "CORS allowed for registered origin" || fail "cors: $R"
WSUB=$(echo "$R" | grep -oE '"sub":"[^"]+' | cut -d'"' -f4)
WTOK=$(echo "$R" | grep -oE '"access_token":"[^"]+' | cut -d'"' -f4)
[[ -n "$WSUB" && "$WSUB" != "$SUB" ]] && ok "different sub per client (no cross-site tracking)" || fail "sub same: $SUB / $WSUB"
R=$(curl -s -i "$BASE/v1/preferences" -H "Origin: https://evil.example" -H "Authorization: Bearer $WTOK")
echo "$R" | head -1 | grep -q 403 && ok "token unusable from unregistered origin" || fail "evil origin: $(echo "$R" | head -1)"

echo "web consent validation"
BAD="{\"response_type\":\"code\",\"client_id\":\"demo-partner\",\"redirect_uri\":\"postmessage\",\"response_mode\":\"web_message\",\"origin\":\"https://evil.example\",\"code_challenge\":\"$CH2\",\"code_challenge_method\":\"S256\",\"state\":\"w1\"}"
post "$J1" /api/oauth/decision "{\"params\":$BAD,\"decision\":\"allow\"}" | grep -q 'qeydiyyatda deyil' && ok "unregistered origin refused" || fail "evil origin accepted"
curl -s "$BASE/oauth/authorize?response_type=code&client_id=demo-partner&redirect_uri=postmessage&response_mode=web_message&origin=https://evil.example&code_challenge=$CH2&code_challenge_method=S256&state=x" -b "$J1" | grep -q 'qeydiyyatda deyil' && ok "consent page shows refusal" || fail "authorize page"

echo "revoke"
curl -s -X POST "$BASE/oauth/revoke" -H "Content-Type: application/json" -d "{\"token\":\"$TOK\"}" >/dev/null
curl -s -o /dev/null -w "%{http_code}" "$BASE/v1/preferences" -H "Authorization: Bearer $TOK" | grep -q 401 && ok "revoked token → 401" || fail "revoke"
get "$J1" /api/me/export | grep -q '"preferences"' && ok "data export" || fail "export"

echo "schema"
curl -s "$BASE/v1/schema" | grep -q '1.4.4 Resize Text' && ok "public schema with WCAG mapping" || fail "schema"

echo "account deletion"
post "$J2" /api/me '{}' DELETE | grep -q '"ok":true' && ok "account deleted" || fail "delete"
curl -s -o /dev/null -w "%{http_code}" "$BASE/v1/preferences" -H "Authorization: Bearer $WTOK" | grep -q 401 && ok "tokens of deleted account → 401" || fail "token after delete"

echo "PASS ($pass checks)"
