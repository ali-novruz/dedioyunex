#!/usr/bin/env bash
# End-to-end test of the web flow with agent-browser.
# Needs: platform on :3000 (DEMO_SHOW_CODES=true) and demo-partner on :4000.
# Usage: bash tests/e2e-web.sh [email]
set -euo pipefail
export AGENT_BROWSER_SESSION="mu-e2e-$$"
EMAIL="${1:-e2e-$(date +%s)@demo.test}"
OUT="${OUT_DIR:-$(mktemp -d)}"
P="${P:-http://localhost:3000}"
D="${D:-http://localhost:4000}"
ab() { if [[ "$1" == wait && "$2" =~ ^[0-9]+$ ]]; then agent-browser wait $(( $2 * ${SLOW:-1} )); else agent-browser "$@"; fi; } # SLOW=3 for remote targets
ref() { ab snapshot -i | grep -F "$1" | head -1 | grep -oE "ref=e[0-9]+" | cut -d= -f2; }
fail() { echo "FAIL: $*"; ab close >/dev/null 2>&1 || true; exit 1; }
trap 'ab close >/dev/null 2>&1 || true' EXIT

echo "1. login as $EMAIL"
ab open "$P/giris" >/dev/null
ab fill "@$(ref 'E-poçt ünvanınız')" "$EMAIL" >/dev/null
ab click "@$(ref 'Kodu göndər')" >/dev/null
ab wait 1500 >/dev/null
CODE=$(ab read | grep -oE "Kodunuz: ?\**[0-9]{6}" | grep -oE "[0-9]{6}") || fail "no demo code shown"
ab fill "@$(ref '6 rəqəmli kod')" "$CODE" >/dev/null
ab press Enter >/dev/null
ab wait 2500 >/dev/null
[[ "$(ab get url)" == *"/qeydiyyat"* ]] || fail "new user not sent to onboarding: $(ab get url)"

echo "2. onboarding: vision + cognitive"
ab click "@$(ref 'Görmə')" >/dev/null
ab click "@$(ref 'Anlama və yaddaş')" >/dev/null
ab click "@$(ref 'Davam et')" >/dev/null
ab wait 2000 >/dev/null
ab read | grep -q "başlanğıc ayarları" || fail "preset not applied"
PREFS=$(curl -s -b "$(ab cookies get --json 2>/dev/null | head -c0)" "$P/api/me" >/dev/null; ab eval "fetch('/api/me').then(r=>r.json()).then(j=>JSON.stringify(j.preferences))")
echo "   prefs: $PREFS"
[[ "$PREFS" == *'\"fontScale\":1.5'* ]] || fail "fontScale preset missing"

echo "3. partner site before connect"
ab open "$D/" >/dev/null
ab wait 1500 >/dev/null
BEFORE=$(ab eval "getComputedStyle(document.querySelector('.card h3')).fontSize")
[[ "$BEFORE" == '"13px"' ]] || fail "partner already adapted before connect: $BEFORE"
ab screenshot "$OUT/1-before.png" >/dev/null

echo "4. connect + consent"
ab click "@$(ref 'MƏNƏ UYĞUN-dan ayarları gətir')" >/dev/null
ab wait 2500 >/dev/null
ab tab list | grep -q "oauth/authorize" || fail "consent window not opened"
ab screenshot "$OUT/2-consent.png" >/dev/null
ab click "@$(ref 'İcazə ver')" >/dev/null
ab wait 2500 >/dev/null
ab tab t1 >/dev/null 2>&1 || true
ab wait 1500 >/dev/null

echo "5. partner adapted"
R=$(ab eval "JSON.stringify({fs:getComputedStyle(document.querySelector('.card h3')).fontSize, promo:getComputedStyle(document.querySelector('.promo')).display, sub:getComputedStyle(document.querySelector('.sub')).color, labels:[...document.querySelectorAll('[data-mu-ui=icon-label]')].map(e=>e.textContent), compat:MeneUygun.compatibility, connected:MeneUygun.isConnected})")
echo "   $R"
[[ "$R" == *'\"fs\":\"19.5px\"'* ]] || fail "text not scaled"
[[ "$R" == *'\"promo\":\"none\"'* ]] || fail "distraction not hidden"
[[ "$R" == *'\"sub\":\"rgb(0, 0, 0)\"'* ]] || fail "low-contrast text not fixed"
[[ "$R" == *'Səbət'* ]] || fail "icon labels missing"
[[ "$R" == *'\"connected\":true'* ]] || fail "not connected"
ab screenshot "$OUT/3-after.png" >/dev/null

echo "6. change on platform → partner follows after reload"
ab open "$P/ayarlar" >/dev/null
ab eval "fetch('/api/me/preferences',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fontScale:2})}).then(r=>r.status)" | grep -q 200 || fail "patch failed"
ab open "$D/" >/dev/null
ab wait 2500 >/dev/null
FS=$(ab eval "getComputedStyle(document.querySelector('.card h3')).fontSize")
[[ "$FS" == '"26px"' ]] || fail "partner did not sync new fontScale: $FS"

echo "7. disconnect from platform → partner resets"
ab open "$P/xidmetler" >/dev/null
ab eval "fetch('/api/connections/demo-partner',{method:'DELETE'}).then(r=>r.status)" | grep -q 200 || fail "disconnect failed"
ab open "$D/" >/dev/null
ab wait 2500 >/dev/null
FS=$(ab eval "getComputedStyle(document.querySelector('.card h3')).fontSize")
[[ "$FS" == '"13px"' ]] || fail "partner still adapted after revoke: $FS"
ab eval "MeneUygun.isConnected" | grep -q false || fail "token not cleared after revoke"

echo "PASS (screenshots in $OUT)"
