#!/usr/bin/env bash
# Demo scenario (Əli baba): pharmacy with Action Guard, the scam moment and Safe mode, polyclinic with Form Guide.
# Usage: P=https://... D=https://... MAIL_DOMAIN=demo.az SLOW=3 bash tests/e2e-scenarios.sh
set -euo pipefail
export AGENT_BROWSER_SESSION="mu-scn-$$"
P="${P:-http://localhost:3000}"; D="${D:-http://localhost:4000}"; MAIL_DOMAIN="${MAIL_DOMAIN:-demo.test}"
ab() { if [[ "$1" == wait && "$2" =~ ^[0-9]+$ ]]; then agent-browser wait $(( $2 * ${SLOW:-1} )); else agent-browser "$@"; fi; }
ref() { ab snapshot -i | grep -F "$1" | head -1 | grep -oE "ref=e[0-9]+" | cut -d= -f2; }
fail() { echo "FAIL: $*"; exit 1; }
trap 'ab close >/dev/null 2>&1 || true' EXIT
GUARD="document.querySelector('[data-cz-ui=guard]')"
guard_text() { ab eval "$GUARD ? $GUARD.shadowRoot.querySelector('.body').innerText : 'NO DIALOG'"; }
guard_press() { ab eval "[...$GUARD.shadowRoot.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('$1')).click()" >/dev/null; }

echo "1. profile"
ab open "$P/" >/dev/null; ab wait 1500 >/dev/null
ab click "@$(ref 'E-poçtsuz başla')" >/dev/null; ab wait 2500 >/dev/null
ab click "@$(ref 'Görmə')" >/dev/null
ab click "@$(ref 'Davam et')" >/dev/null; ab wait 2500 >/dev/null

echo "2. connect on the pharmacy"
ab open "$D/aptek" >/dev/null; ab wait 2000 >/dev/null
ab click "@$(ref 'Cizzy-dən ayarları gətir')" >/dev/null; ab wait 2500 >/dev/null
ab click "@$(ref 'İcazə ver')" >/dev/null; ab wait 2000 >/dev/null; ab tab t1 >/dev/null 2>&1 || true; ab wait 3000 >/dev/null
[[ "$(ab eval 'Cizzy.isConnected')" == "true" ]] || fail "not connected"

echo "3. Action Guard asks before paying"
ab eval "window.alert = () => {}" >/dev/null # a native alert would freeze the automated browser
ab eval "document.getElementById('pay').click()" >/dev/null; ab wait 300 >/dev/null
T=$(guard_text); [[ "$T" == *"45 AZN"* && "$T" == *"Əminsiniz"* ]] || fail "no clear confirmation: $T"
guard_press "Xeyr"; ab wait 200 >/dev/null
[[ "$(ab eval 'String(window.lastOrder)')" == *undefined* ]] || fail "order went through after No"
ab eval "document.getElementById('pay').click()" >/dev/null; ab wait 300 >/dev/null
guard_press "Bəli"; ab wait 400 >/dev/null
[[ "$(ab eval 'String(window.lastOrder)')" == *true* ]] || fail "order did not go through after Yes"

echo "4. scam moment: Safe mode"
ab open "$P/tehlukesiz" >/dev/null; ab wait 3000 >/dev/null
ab read | grep -q "Bu fırıldaqdır" || fail "no scam advice"
ab read | grep -q "Təhlükəsiz rejim açıqdır" || fail "safe mode not on"
L=$(ab eval "fetch('/api/me').then(r=>r.json()).then(j=>j.preferences.guardLevel)"); [[ "$L" == *strict* ]] || fail "guardLevel is $L"
K=$(ab eval "fetch('/api/me/preferences',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({guardLevel:'off'})}).then(r=>r.json()).then(j=>j.preferences.guardLevel)"); [[ "$K" == *strict* ]] || fail "protection could be switched off during Safe mode: $K"
E=$(ab eval "fetch('/api/safety',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'end'})}).then(r=>r.status)"); [[ "$E" == *429* ]] || fail "Safe mode ended at once: $E"
V=$(ab eval "fetch('/api/safety',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'check',text:'Bankdan zəng edirik, kartınız bloklanıb, SMS kodunu deyin'})}).then(r=>r.json()).then(j=>j.verdict+': '+j.explain)")
echo "   AI: $V"; [[ "$V" == *scam* ]] || fail "AI did not call it a scam: $V"

echo "5. the connected site hardens"
ab open "$D/aptek" >/dev/null; ab wait 3000 >/dev/null
[[ "$(ab eval 'Cizzy.preferences.guardLevel')" == *strict* ]] || fail "site did not receive strict"
ab eval "document.getElementById('pay').click()" >/dev/null; ab wait 300 >/dev/null
T=$(guard_text); [[ "$T" == *"zəng edib"* ]] || fail "no scam question: $T"
guard_press "Bəli"; ab wait 200 >/dev/null
T=$(guard_text); [[ "$T" == *"Dayandırıldı"* ]] || fail "not stopped: $T"
[[ "$(ab eval 'String(window.lastOrder)')" == *undefined* ]] || fail "payment went through"
guard_press "Bağla"; ab wait 200 >/dev/null
ab eval "document.getElementById('pay').click()" >/dev/null; ab wait 300 >/dev/null
guard_press "Xeyr"; ab wait 200 >/dev/null; guard_press "Xeyr"; ab wait 200 >/dev/null
W=$(ab eval "[...$GUARD.shadowRoot.querySelectorAll('button')].find(b=>b.className==='yes').disabled"); [[ "$W" == *true* ]] || fail "no waiting period in strict mode"
guard_press "Xeyr"

echo "6. Form Guide on the polyclinic"
ab open "$P/ayarlar" >/dev/null; ab wait 2000 >/dev/null
ab eval "fetch('/api/me/preferences',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({formGuide:true})}).then(r=>r.status)" >/dev/null
ab open "$D/xestexana" >/dev/null; ab wait 3500 >/dev/null
S=$(ab eval "document.querySelector('[data-cz-ui=form-guide]').innerText"); [[ "$S" == *"Sahə 1 / 4"* ]] || fail "no progress: $S"
N=$(ab eval "[...document.querySelectorAll('#reg input,#reg select')].filter(e=>e.getClientRects().length).length"); [[ "$N" == *1* ]] || fail "more than one field shown: $N"
[[ "$(ab eval "document.getElementById('book').getClientRects().length")" == *0* ]] || fail "submit visible too early"
ab eval "const n=[...document.querySelectorAll('[data-cz-ui=form-guide] button')].find(b=>b.textContent==='Növbəti');n.click();n.click();n.click();n.click();" >/dev/null; ab wait 300 >/dev/null
[[ "$(ab eval "document.getElementById('book').getClientRects().length")" != *0* ]] || fail "submit not shown at the end"
ab eval "document.getElementById('book').click()" >/dev/null; ab wait 300 >/dev/null
guard_press "Xeyr"; ab wait 200 >/dev/null; guard_press "Xeyr"; ab wait 200 >/dev/null
T=$(guard_text); [[ "$T" == *"yazılırsınız"* ]] || fail "plain confirmation missing: $T"
echo "PASS demo scenario"
