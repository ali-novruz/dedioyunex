# MƏNƏ UYĞUN — Vəziyyət (8 noyabr 2026)

Kod: https://github.com/ali-novruz/dedioyunex (`main`)
Yerli: platforma http://localhost:3000 · demo sayt http://localhost:4000

---

## ✅ Edilənlər (işləyir və test olunub)

### İstifadəçi platforması (veb)
- E-poçt + 6 rəqəmli kodla giriş (şifrəsiz). Demo üçün kod ekranda yalnız `@demo.az` ünvanlarında göstərilir.
- **E-poçtsuz başla:** hesab yalnız bu cihazda; sonra e-poçt əlavə etmək olur.
- **Ehtiyaca görə qeydiyyat:** Görmə · Eşitmə · Hərəkət · Anlama/yaddaş · Oxuma · Texnologiya → yalnız uyğun ayarlar görünür + başlanğıc ayarları avtomatik tətbiq olunur.
- **Səsli / yazılı AI köməkçi:** “Yazılar xırdadır” deyirsən → ayarları özü qurur, ekran dərhal dəyişir, səsli izah edir, “Bəli, saxla / Yenidən de / Özüm dəyişim”. Qeyri-müəyyən cümlədə aydınlaşdırıcı sual verir. Saxladıqdan sonra “Əvvəlki ayarlara qayıt”.
- **Əl ilə ayarlar:** 6 kateqoriyada 29 ayar, hər dəyişiklik dərhal görünür və saxlanılır.
- **Bağlı xidmətlər:** hansı saytların ayarlarını gördüyü, bir toxunuşla ayırmaq.
- **Başqa cihaza ötür (QR):** nəvə/qızı profili qurur, QR ilə yaşlının telefonuna köçürür (tək istifadəlik, 15 dəq).
- Məlumatları yüklə (JSON), hesabı sil.
- **Tərtibatçı səhifəsi** (`/developers`): sayt qeydiyyatı → `client_id` + hazır kod, Next.js / React / WordPress nümunələri.

### API və təhlükəsizlik
- OAuth 2.0 + PKCE: veb popup, popup bloklananda yönləndirmə, mobil (custom scheme).
- Hər sayt üçün fərqli anonim ID (saytlar istifadəçini bir-biri ilə əlaqələndirə bilmir).
- Saytlara **yalnız interfeys ayarları** gedir — ad, e-poçt, kateqoriyalar getmir.
- Ehtiyac kateqoriyaları bazada şifrələnir (AES-256-GCM).
- CSRF qorunması, open-redirect bağlandı, IP və istifadəçi limitləri, “təsdiqlənmiş tərəfdaş” nişanı, fırıldaq xəbərdarlığı.
- Açıq sxem `/v1/schema` (WCAG 2.2 və ISO/IEC 24751 xəritəsi).
- Verilənlər bazası: **Postgres** (Supabase uyğun), ayrıca `dedio` sxemi.

### Web SDK (`<script src=".../sdk.js" data-client-id="..." async>`)
- **İstənilən sayta** kod dəyişmədən uyğunlaşır: yazı ölçüsü (px/rem saytlarda dizaynı pozmadan), sətir/hərf aralığı, kontrast + **WCAG AAA rəng düzəlişi**, rəng korluğu filtri, linklər, böyük kursor, fokus, böyük düymələr, animasiyanı dayandır, reklam/yan panel gizlətmə, **ikonların yanında yazı**, altyazı, oxuma xətti, oxunaqlı şrift, **səsli oxunuş** (“toxun və dinlə”, “səhifəni oxu”).
- **Sadə rejim:** sayt `data-mu-simple="hide|primary"` ilə işarələyir.
- **🧠 Səhifəni izah et (AI) — yeni:**
  - “Bu səhifə nədir?” → qısa başlıq, 2–3 cümlə xülasə, əsas məqamlar.
  - “Bu səhifədə nə edə bilərsiniz” → vacib düymələr + nə etdikləri + “Göstər”.
  - “❓ Bu nədir?” → istənilən düyməyə toxun → nə etdiyini izah edir (gizli/ikon funksiyalar da).
  - `data-ai="auto"`: uzun başlığın altına avtomatik “Sadə dildə” qutusu.
  - **Yaddaş köməkçisi** (sadə rejimdə): yuxarıda “📍 Siz buradasınız: …” + “Nə edim?”.
  - Form dəyərləri və `data-mu-private` bölmələr AI-a göndərilmir; sayt `data-ai="off"` ilə bağlaya bilər.
- Uyğunluq göstəricisi: “Bu sayt ayarlarınızdan 10/11-ni dəstəkləyir”; sayt sahibi üçün `?mu-check` yoxlaması.
- Server cavab verməsə sayt bloklanmır (fail-open), sinxronizasiya (tab-a qayıdanda, digər tab-larda).

### Mobil SDK
- **Android** (Kotlin/Compose): yığılır, APK hazırdır (`dist/dedio-demo-android.apk`, canlı ünvana bağlı). Cihazda hələ sınanmayıb.
- **iOS** (Swift/SwiftUI): kod yazılıb, Mac olmadığı üçün yığılmayıb.

### Demo sayt (DEMO Market) və ssenarilər — `docs/ssenariler.md`
- `/` mağaza · `/bank` **Əli baba – köçürmə** · `/arayis` **Südabə xanım – arayış** · `/xestexana` **demensiya – həkimə yazılma** · `/xeber` **uzun xəbər**.
- Bank ssenarisi: 12 menyudan yalnız “Köçürmələr”, reklam gizli, 3 addım, sessiya 90 san → 30 dəq, sadə dildə təsdiq (“50 manat Nicat Əliyevə… son 4 rəqəm 4 4 1 7”).

### Testlər (hamısı keçir)
- `tests/e2e-web.sh` — 7/7 (giriş → qeydiyyat → sayta qoşulma → uyğunlaşma → sinxron → ayırma)
- `tests/api-test.sh` — 41/41 (təhlükəsizlik, AI, QR, mobil OAuth, CORS, silmə)
- `tests/e2e-scenarios.sh` — bank ssenarisi
- Səhifə izahı — sınaq AI serveri ilə yoxlanıb.

### Sənədlər
- `docs/MENE-UYGUN-spesifikasiya.pdf`, `docs/api.md`, `docs/ssenariler.md`, `README.md`, `backlog.md`

---

## 🔄 İndi edilən

- **Hostinger VPS deploy** (`dedio` layihəsi): konteynerlər işləyir (platforma, demo, müvəqqəti Postgres), platforma serverdə yığılır. Ünvan hələ cavab vermir — Traefik/HTTPS yoxlanılır.
  - Backend: `https://dedio.89-116-236-208.sslip.io`
  - Demo: `https://demo.89-116-236-208.sslip.io`

## ⏭ Növbəti addımlar (mən edəcəyəm)

1. VPS-də saytın cavab verməsini təmin etmək (HTTPS sertifikatı / marşrut).
2. Canlıda testləri işə salmaq (giriş, qoşulma, bank ssenarisi).
3. Spesifikasiya PDF-ə ssenariləri və “Səhifəni izah et” funksiyasını əlavə etmək.
4. Supabase ünvanı gələndə bazanı ora keçirmək (yalnız `DATABASE_URL` dəyişir).
5. `dedio.vercel.app` → VPS yönləndirməsi (`deploy/vercel-proxy`) — sizin icazənizlə.

## ⛔ Səndən lazım olanlar

| Nə | Niyə | Harada |
|---|---|---|
| **Supabase bağlantı ünvanı** (Session pooler URI) | Bazanı Supabase-ə keçirmək | Supabase → Project Settings → Database → Connection string |
| **Groq API açarı** (pulsuz) | Səsli köməkçi və “Səhifəni izah et” real AI ilə işləsin | https://console.groq.com/keys |
| **Vercel icazəsi** | `dedio` layihəsinə yönləndirməni deploy etmək (və ya özün: `cd deploy/vercel-proxy && vercel deploy --prod`) | — |
| İstəyə görə: GitHub token-ə `workflow, write:packages` | Docker imajlarını GitHub Actions ilə yığmaq (indi lazım deyil) | `gh auth refresh -s workflow,write:packages` |

## ⚠️ Qalan / yoxlanılmayanlar

- Real AI açarı ilə səs və səhifə izahı (indi sınaq AI ilə test olunub). Azərbaycan dilində Whisper keyfiyyəti yaşlı nitqi ilə yoxlanmalıdır.
- Brauzerlərdə Azərbaycan səsi yoxdur → türk səsi istifadə olunur (ekranda deyilir). Bulud TTS — yol xəritəsində.
- E-poçt göndərmə (SMTP) qurulmayıb → real e-poçtlar üçün kod getmir; “E-poçtsuz başla” və `@demo.az` işləyir.
- iOS SDK yığılmayıb (Mac lazımdır); Android cihazda sınanmayıb.
- Supabase TLS sertifikatı yoxlanmır (şifrələnir, amma CA bağlanmayıb).
- Real istifadəçi testi (3–5 yaşlı nəfərlə) edilməyib — pitch üçün ən güclü sübut.
- Dizayn, loqo, interfeys — sonra dəyişəcəksiniz (indi funksiyaya fokus).

## 🗺 Yol xəritəsi (MVP-dən sonra)

1. Brauzer genişlənməsi — SDK qoşmayan saytlar üçün.
2. SMS ilə giriş kodu.
3. ASAN Login / SİMA.
4. Android: SDK-sız tətbiqlər üçün ekran üstü qat + OCR.
5. Azərbaycan dilində bulud səsi.
6. Partnyor paneli (uyğunluq balı, istifadə statistikası).
