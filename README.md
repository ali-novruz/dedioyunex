# MƏNƏ UYĞUN

Şəxsi rəqəmsal əlçatanlıq profili: istifadəçi ayarlarını (yazı ölçüsü, kontrast, səsli oxunuş, sadə rejim…) bir dəfə qurur — səslə, yazaraq və ya əl ilə — və MƏNƏ UYĞUN-a qoşulan bütün sayt və tətbiqlər avtomatik ona uyğunlaşır.

| Qovluq | Nədir |
|---|---|
| `platform/` | İstifadəçi platforması + API + OAuth (Next.js 16, Postgres / Supabase) |
| `sdk/web/` | Web SDK (`/sdk.js`) — ayar sxemi, tətbiq mühərriki, səsli oxunuş, uyğunluq yoxlaması |
| `sdk/android/` | Android SDK (Kotlin/Compose) + nümunə tətbiq |
| `sdk/ios/` | iOS SDK (Swift/SwiftUI) + nümunə — **Mac-da hələ yığılmayıb/test edilməyib** |
| `demo-partner/` | DEMO Market — inteqrasiya nümunəsi sayt |
| `deploy/` | Docker Compose (Traefik) — Hostinger VPS; `vercel-proxy/` — dedio.vercel.app → VPS |
| `tests/` | `e2e-web.sh` (brauzer), `api-test.sh` (API), `mock-ai.mjs` |
| `docs/` | Spesifikasiya (PDF), API müqaviləsi, sxem |

## Lokal işə salma

```bash
docker run -d --name dedio-pg -p 5433:5432 -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=dedio postgres:16-alpine
cd platform && cp .env.example .env.local   # SECRET doldurun
npm install && npm run dev                  # http://localhost:3000
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

## Deploy (Vercel + Supabase)

Canlı: https://mene-uygun.vercel.app · demo: https://mene-uygun-demo.vercel.app

```bash
vercel deploy --prod                  # repo kökündən: platforma (layihə "mene-uygun", Root Directory = platform)
cd demo-partner && vercel deploy --prod   # demo sayt (layihə "mene-uygun-demo", PLATFORM_URL env)
```

Canlıda test: `P=https://mene-uygun.vercel.app D=https://mene-uygun-demo.vercel.app SLOW=3 bash tests/e2e-web.sh "x-$(date +%s)@demo.az"`

VPS yolu (`deploy/docker-compose.*`, `deploy/vercel-proxy`) saxlanılıb, amma istifadə olunmur: VPS-ə xaricdən qoşulmaq mümkün deyil.
