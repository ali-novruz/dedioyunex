# MƏNƏ UYĞUN

Şəxsi rəqəmsal əlçatanlıq profili: istifadəçi ayarlarını (yazı ölçüsü, kontrast, səsli oxunuş, sadə rejim…) bir dəfə qurur — səslə, yazaraq və ya əl ilə — və MƏNƏ UYĞUN-a qoşulan bütün sayt və tətbiqlər avtomatik ona uyğunlaşır.

| Qovluq | Nədir |
|---|---|
| `platform/` | İstifadəçi platforması + API + OAuth (Next.js 16, SQLite `node:sqlite`) |
| `sdk/web/` | Web SDK (`/sdk.js`) — ayar sxemi, tətbiq mühərriki, səsli oxunuş, uyğunluq yoxlaması |
| `sdk/android/` | Android SDK (Kotlin/Compose) + nümunə tətbiq |
| `sdk/ios/` | iOS SDK (Swift/SwiftUI) + nümunə — **Mac-da hələ yığılmayıb/test edilməyib** |
| `demo-partner/` | DEMO Market — inteqrasiya nümunəsi sayt |
| `deploy/` | Docker Compose + Caddy (avtomatik HTTPS) — Hostinger VPS üçün |
| `tests/` | `e2e-web.sh` (brauzer), `api-test.sh` (API), `mock-ai.mjs` |
| `docs/` | Spesifikasiya (PDF), API müqaviləsi, sxem |

## Lokal işə salma

```bash
cd platform && npm install && npm run dev          # http://localhost:3000  (.env.local hazırdır)
node demo-partner/serve.mjs                         # http://localhost:4000  (DEMO Market)
```

Səsli köməkçi üçün `platform/.env.local`-da `AI_API_KEY` doldurun (pulsuz: https://console.groq.com/keys).
`STT_MODE=browser` — səs brauzerdə (Chrome/Edge) tanınır, `STT_MODE=server` — Whisper ilə serverdə.

## Hər hansı sayta qoşmaq (2 addım)

1. Platformada daxil olun → **Tərtibatçılar** (`/developers`) → saytın ünvanını qeyd edin → `client_id` alın.
2. Saytın `<head>` hissəsinə:

```html
<script src="https://PLATFORMA/sdk.js" data-client-id="CLIENT_ID" async></script>
```

Saytda heç nə dəyişmədən (avtomatik rejim) yazı ölçüsü, sətir/hərf aralığı, kontrast (WCAG AAA rəng düzəlişi daxil), rəng filtrləri, linklər, kursor, fokus, böyük düymələr, animasiya, reklam/yan panel gizlətmə, ikon yazıları, altyazı, oxuma xətti, oxunaqlı şrift və səsli oxunuş işləyir.
Dəqiq inteqrasiya (sadə rejim işarələri, B növ ayarlar, tokens rejimi) — `/developers` səhifəsində.
Sayt sahibi üçün yoxlama: `https://SAYT/?mu-check` (və ya konsolda `MeneUygun.check()`).

## Testlər

```bash
bash tests/e2e-web.sh                       # platform :3000 + demo :4000 işləyərkən (agent-browser lazımdır)
node tests/mock-ai.mjs &                    # sonra platformanı AI_BASE_URL=http://127.0.0.1:4100/v1 AI_API_KEY=test-key ilə başladın
BASE=http://localhost:3100 bash tests/api-test.sh
```

## Deploy (Hostinger VPS)

```bash
cd deploy && cp .env.example .env   # domenləri, SECRET, AI açarını yazın
docker compose up -d --build
```

DNS: `APP_DOMAIN` və `DEMO_DOMAIN` üçün A qeydi → VPS IP (Vercel DNS-də "Add record").
