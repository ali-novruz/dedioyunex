#!/usr/bin/env bash
# Scenario test (Əli baba, bank transfer): needs platform :3000 (DEMO_SHOW_CODES=true) and demo-partner :4000.
set -euo pipefail
export AGENT_BROWSER_SESSION="mu-scn-$$"
P="${P:-http://localhost:3000}"; D="${D:-http://localhost:4000}"; MAIL_DOMAIN="${MAIL_DOMAIN:-demo.test}"
ab() { if [[ "$1" == wait && "$2" =~ ^[0-9]+$ ]]; then agent-browser wait $(( $2 * ${SLOW:-1} )); else agent-browser "$@"; fi; } # SLOW=3 for remote targets
ref() { ab snapshot -i | grep -F "$1" | head -1 | grep -oE "ref=e[0-9]+" | cut -d= -f2; }
fail() { echo "FAIL: $*"; exit 1; }
trap 'ab close >/dev/null 2>&1 || true' EXIT
ab open $P/giris >/dev/null
ab fill "@$(ref 'E-poçt ünvanınız')" "scn-$(date +%s)@$MAIL_DOMAIN" >/dev/null
ab click "@$(ref 'Kodu göndər')" >/dev/null; ab wait 1500 >/dev/null
CODE=$(ab read | grep -oE "Kodunuz: ?\**[0-9]{6}" | grep -oE "[0-9]{6}")
ab fill "@$(ref '6 rəqəmli kod')" "$CODE" >/dev/null; ab press Enter >/dev/null; ab wait 2500 >/dev/null
for c in 'Görmə' 'Anlama və yaddaş' 'Texnologiyadan'; do ab click "@$(ref "$c")" >/dev/null; done
ab click "@$(ref 'Davam et')" >/dev/null; ab wait 2000 >/dev/null
ab eval "fetch('/api/me/preferences',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({visualAlerts:true})}).then(r=>r.status)" | grep -q 200 || fail patch
ab open $D/bank >/dev/null; ab wait 1500 >/dev/null
ab click "@$(ref 'MƏNƏ UYĞUN-dan ayarları gətir')" >/dev/null; ab wait 2500 >/dev/null
ab click "@$(ref 'İcazə ver')" >/dev/null; ab wait 2500 >/dev/null; ab tab t1 >/dev/null 2>&1 || true; ab wait 2500 >/dev/null
R=$(ab eval "JSON.stringify({nav:[...document.querySelectorAll('nav a')].filter(a=>getComputedStyle(a).display!=='none').map(a=>a.textContent), promo:getComputedStyle(document.querySelector('.promo')).display, timer:document.getElementById('timer').textContent, step:getComputedStyle(document.querySelector('.stepnav')).display})")
echo "$R"
[[ "$R" == *'[\"Köçürmələr\"]'* ]] || fail "menu not reduced to the main action"
[[ "$R" == *'\"promo\":\"none\"'* ]] || fail "ad not hidden"
[[ "$R" == *'Sessiya 29:'* ]] || fail "session not extended"
[[ "$R" == *'\"step\":\"flex\"'* ]] || fail "step-by-step not active"
C=$(ab eval "document.getElementById('next').click();document.getElementById('next').click();document.getElementById('code').value='4821';document.getElementById('next').click();document.querySelector('[role=alertdialog] p')?.textContent")
[[ "$C" == *'Nicat Əliyevə'* ]] || fail "no plain confirmation: $C"
D=$(ab eval "document.querySelector('[role=alertdialog] [data-yes]').click(); document.querySelector('[role=status]:not(#smsbox)')?.textContent")
[[ "$D" == *'göndərildi'* ]] || fail "no visual result: $D"
echo "PASS bank scenario"
