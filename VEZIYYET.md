# MƏNƏ UYĞUN — Vəziyyət (8 noyabr 2026)

Kod: https://github.com/ali-novruz/dedioyunex (`main`)
**Canlı: platforma https://mene-uygun.vercel.app · demo sayt https://mene-uygun-demo.vercel.app** (Vercel + Supabase)
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
- `tests/e2e-web.sh` — 7/7 **canlıda** (giriş → qeydiyyat → sayta qoşulma → uyğunlaşma → sinxron → ayırma)
- `tests/e2e-scenarios.sh` — bank ssenarisi **canlıda** keçir
- `tests/api-test.sh` — 41/41, yalnız yerli (sınaq AI serveri ilə); Vercel üçün dəyişikliklərdən sonra yenidən işlədilməyib
- Real Groq açarı ilə canlıda: səsli köməkçinin ayar seçimi, aydınlaşdırıcı sual, səhifə izahı (“Sadə dildə”), səs → mətn hattı

### Sənədlər
- `docs/MENE-UYGUN-spesifikasiya.pdf`, `docs/api.md`, `docs/ssenariler.md`, `README.md`, `backlog.md`

---

## 🎨 Dizayn və dil

- Yeni dizayn Canva referansından çıxarılıb: sarı fon, boz “pəncərə” kartlar, tünd çərçivə, sərt kölgə, basılanda enən düymələr. Qaydalar `DESIGN.md`-dədir, məhsul qeydi `PRODUCT.md`-dədir.
- **Tam AZ + EN:** interfeys, server xətaları, e-poçt, SDK düymələri, AI cavabları, demo səhifələr. Rus dili çıxarılıb. Varsayılan Azərbaycan dilidir, yuxarıdakı AZ/EN düyməsi ilə dəyişir.
- **Şrift:** Archivo + Libre Baskerville. Hər ikisində `Ə ə Ğ ğ İ ı Ö ö Ş ş Ç ç Ü ü` var (canlıda ölçülüb).
- **Köməkçi:** danışmaq və yazmaq yan-yanadır. Təklif ekranda olanda yazaraq düzəliş etmək olur, AI əvvəlki təklifin üstündən davam edir.
- Landing səhifəsində “Özünüz sınayın”: düyməyə basan kimi səhifənin özü dəyişir.

## 🚀 Yerləşdirmə

- **Vercel** (`alinovruz29s-projects`): `mene-uygun` (Root Directory = `platform`, region `sin1`) və `mene-uygun-demo`.
- **Supabase:** Session pooler (limit 15 bağlantı), ayrıca `dedio` sxemi; `DATABASE_POOL_MAX=1` və `attachDatabasePool` (serverless).
- **AI:** Groq — `qwen/qwen3.8-27b` (`llama-3.3-70b-versatile` Groq-dan çıxarılıb) + `whisper-large-v3`.
- Sirlər `deploy/.env`-dədir (git-ə düşmür) və Vercel env-ə yüklənib.

## 🖥 VPS (ayrıca problem, həll olunmayıb)

- VPS işləyir, konteynerlər sağlamdır, amma **internetdən heç bir port cavab vermir**: 80/443-dən başqa “accept any” olan 25577, 8765, 32768 də timeout verir; 443 dörd ölkədən yoxlanıb. Hostinger firewall-da qaydalar düzgündür və sinxrondur, deməli bloklama ya serverin özündə (ufw/iptables), ya da Hostinger tərəfdədir.
- Traefik loqlarında Let's Encrypt 4 noyabrdan bəri timeout yazır; bu IP-yə birbaşa gələn digər saytlara da təsir edir.
- Yoxlamaq üçün hPanel brauzer terminalında: `ufw status`, `iptables -S`. Lazım gəlsə Hostinger dəstəyinə yazılmalıdır.
- VPS-dəki `dedio` layihəsi (3 konteyner) artıq lazım deyil, silinə bilər.

## ⏭ Növbəti addımlar

1. Yaşlı nitqi ilə səs testi və 3–5 nəfərlik real istifadəçi testi.
2. Demo videosu.
3. Öz startup saytına Web SDK inteqrasiyası.

## ⚠️ Qalan / yoxlanılmayanlar

- Azərbaycan dilində Whisper keyfiyyəti real yaşlı nitqi ilə yoxlanmalıdır (səs hattı işləyir; sınaq süni səslə edilib, keyfiyyət haqqında nəticə vermir).
- Groq pulsuz planı: dəqiqədə 8000 token, təxminən 2–3 köməkçi sorğusu. Canlı demoda ardıcıl çox sorğu göndərməyin; bir dəfə müvəqqəti “over capacity” xətası görülüb (istifadəçiyə “yenidən cəhd edin” deyilir).
- IP limitləri yaddaşdadır: Vercel-də hər instansiya üçün ayrıca sayılır, ona görə tək serverdəkindən zəifdir. Gündəlik AI limiti bazadadır və dəqiqdir.
- SDK-nın sabit düymələri böyük şriftdə başlığın bir hissəsini örtə bilir.
- Yeni deploy-dan dərhal sonra bir neçə dəqiqə köhnə versiyaların bağlantıları Supabase limitini tuta bilər: demodan ən azı 15 dəqiqə əvvəl deploy etməyin.
- iOS düyməsinin yeni görünüşü yığılmayıb (Mac lazımdır). Android yenidən yığılıb, `dist/` içindəki APK canlı ünvana bağlıdır, cihazda hələ sınanmayıb.
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
