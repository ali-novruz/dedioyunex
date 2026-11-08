<p align="center"><img src="platform/public/logo.svg" alt="Cizzy" width="300"></p>

<p align="center"><b>Bir dəfə qur, hər xidmətdə özünə uyğun istifadə et.</b></p>

<p align="center">
  <a href="https://cizzy.vercel.app">Canlı platforma</a> ·
  <a href="https://cizzy-demo.vercel.app/aptek">Demo sayt</a> ·
  <a href="docs/Cizzy-spesifikasiya.pdf">Spesifikasiya (PDF)</a> ·
  <a href="docs/ssenariler.md">Ssenarilər</a>
</p>

---

**Cizzy** yaşlılar və görmə, eşitmə, hərəkət, anlama çətinliyi olan insanlar üçün şəxsi rəqəmsal əlçatanlıq profilidir. İnsan ehtiyacını bir dəfə deyir, yazır və ya əl ilə seçir. Qoşulmuş hər sayt dərhal ona uyğunlaşır, onu səhvdən və fırıldaqdan qoruyur.

## Problem

Yaşlı insan bankda, apteklə, dövlət portalında tək başına iş görə bilmir: yazılar xırdadır, menyu qarışıqdır, sessiya tez bağlanır. Hər saytın öz ayarı varsa belə, hamısını ayrıca qurmaq mümkün deyil. Eyni insanlar fırıldaqçıların da əsas hədəfidir.

## Məhsulun 4 qatı

| Qat | Nə edir |
|---|---|
| **1. Daşınan profil** | Bir dəfə qurulur, hər saytda işləyir (OAuth 2.0 + PKCE, açıq sxem). Saytlar ad, e-poçt və ya çətinlikləri görmür, hər sayt üçün ayrı anonim ID. |
| **2. Adaptasiya** | 89 ayar: yazı, bütün rənglər, parlaqlıq, şəkil və video, kursor, altyazı, səs. Saytı dəyişmədən, bir sətir kodla. |
| **3. Davranış və qoruma** | Action Guard, Təhlükəsiz rejim, Form Guide. |
| **4. AI yardımı** | Ayarları səslə qurmaq, səhifəni və düymələri izah etmək, mətni sadə dilə çevirmək, şübhəli mesajı yoxlamaq. |

## Əsas funksiyalar

- **Səsli və yazılı köməkçi:** “Yazılar xırdadır” deyin, ekran dərhal dəyişsin. Azərbaycan dilində danışır və cavab verir.
- **18 ehtiyac:** görmə, eşitmə, hərəkət, oxuma, rəng korluğu, miqren, epilepsiya, DEHB, autizm, Parkinson, bir əllə istifadə, demensiya, disleksiya və s. Hər biri uyğun ayarları açır.
- **Mürəkkəb saytı sadələşdirmə:** oxuma görünüşü, AI ilə düymələri azaltma, uzun menyuları qısaltma, açılan pəncərələri gizlətmə.
- **Action Guard:** “Siz 45 AZN ödəyirsiniz. Əminsiniz?” Yoxlama brauzerdə aparılır.
- **Təhlükəsiz rejim:** “Kimsə zəng edib kod və ya pul istəyir” düyməsi. Dərhal izah, etibarlı şəxsə xəbər, 24 saat ciddi qoruma. Qoşulmuş saytlarda ödəniş dayandırılır.
- **Form Guide:** bir ekranda bir sahə, sadə izah, irəliləyiş.
- **Tam Azərbaycan və ingilis dili.**

## 3 dəqiqəlik sınaq

1. [cizzy.vercel.app](https://cizzy.vercel.app) açın, **E-poçtsuz başla**, ehtiyacınızı seçin. E-poçtla girəndə kod poçtunuza gəlir; sürətli sınaq üçün `@demo.az` ilə bitən istənilən ünvan yazın, kod ekranda görünür.
2. [Demo aptekdə](https://cizzy-demo.vercel.app/aptek) **Cizzy-dən ayarları gətir** düyməsinə basıb icazə verin. Sayt dərhal dəyişir.
3. **Ödə** düyməsinə basın: Action Guard soruşur.
4. Platformada **Kimsə zəng edib kod və ya pul istəyir** düyməsinə basın, apteke qayıdıb yenidən ödəyin: ödəniş dayandırılır.

## Sayta qoşulma

```html
<script src="https://cizzy.vercel.app/sdk.js" data-client-id="SIZIN_CLIENT_ID" async></script>
<button data-cz-guard="payment" data-cz-guard-amount="45 AZN">Ödə</button>
```

`client_id` [tərtibatçı səhifəsindən](https://cizzy.vercel.app/developers) alınır. Server cavab verməsə sayt bloklanmır.

## Texnologiya

| Hissə | Texnologiya |
|---|---|
| Platforma və API | Next.js 16, TypeScript |
| Verilənlər bazası | PostgreSQL (Supabase), ehtiyaclar AES-256-GCM ilə şifrəli |
| Web SDK | TypeScript, asılılıqsız, tək fayl |
| AI | Groq (Qwen, Whisper), Azure Speech (Azərbaycan səsi) |

```
platform/       istifadəçi platforması, API, OAuth
sdk/web/        Web SDK: ayar sxemi, mühərrik, qoruma, səs
demo-partner/   demo saytlar: aptek, poliklinika, arayış, xəbər, mağaza
tests/          brauzer və API testləri
docs/           spesifikasiya, API, ssenarilər, dizayn
```

## Lokal işə salma

Node 24 və Postgres lazımdır.

```bash
cd platform
cp .env.example .env.local   # DATABASE_URL və SECRET yazın
npm install
npm run dev                  # http://localhost:3000
node ../demo-partner/serve.mjs   # http://localhost:4000
```

## Testlər

```bash
node tests/engine-settings.mjs   # ayarların hər biri real brauzerdə ölçülür
bash tests/e2e-web.sh            # giriş, qeydiyyat, qoşulma, sinxron, ayırma
bash tests/e2e-scenarios.sh      # aptek, fırıldaq anı, Təhlükəsiz rejim, Form Guide
```

## Məhdudiyyətlər

- Qoruma yalnız Cizzy qoşulmuş saytlarda işləyir. Fırıldaqçının saxta saytında SDK olmur.
- Etibarlı şəxsə xəbər bir toxunuşla zəng, WhatsApp və ya SMS ilə verilir. Avtomatik göndəriş üçün SMTP və ya SMS xidməti lazımdır.
- Real yaşlı istifadəçilərlə sınaq hələ aparılmayıb.
- AI nəticəsi məsləhətdir, qərar istifadəçidədir.
