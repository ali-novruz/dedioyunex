# MƏNƏ UYĞUN — ürün dökümü

- **Hedef:** yaşlılar ve görme/işitme/hareket/anlama/okuma güçlüğü olanlar ayarlarını bir kez kurar; SDK'yı ekleyen her web/mobil hizmet otomatik uyum sağlar.
- **Kanal:** YUNEX hackathon. Demo: önce/sonra (DEMO Market veya Ali'nin kendi sitesi).
- **İş modeli:** kullanıcıya ücretsiz; kurumlara 3 ay ücretsiz pilot → yıllık lisans (fiyat varsayım). Ölçüt: işlemi yarıda bırakan yaşlı kullanıcı oranı, çağrı merkezi talepleri, işlem adım sayısı.
- **Fark (GPII/Morphic):** onlar kütüphane bilgisayarlarında kanıtladı; biz banka/devlet web+mobil hizmetlerinin içine taşıyoruz. Cihaz seviyesinde sadeleştirme var (Assistive Access, Easy Mode), hizmetin içinde yok.
- **Gizlilik cümlesi:** "Ad, e-poçt və ehtiyac kateqoriyaları ötürülmür. Yalnız istifadəçinin gördüyü və təsdiqlədiyi interfeys ayarları ötürülür."
- **Sabitler:** client id'ler `demo-partner`, `demo-mobile`; redirect `meneuygun-demo://callback`; şema sürümü 1.
- **Kural:** şema tek kaynak `sdk/web/src/schema.ts`; Android/iOS modelleri onu birebir yansıtır.
