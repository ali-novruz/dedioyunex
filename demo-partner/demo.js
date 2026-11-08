// Shared helpers for the DEMO partner pages: language, and reactions to MƏNƏ UYĞUN preferences
// (type-B settings a real service would implement itself: longer sessions, confirmations, plain language).
(function () {
  var EN = {
    // shared
    "Əminsiniz?": "Are you sure?",
    // market
    "DEMO Market — onlayn mağaza": "DEMO Market — online shop",
    "Məhsul axtar…": "Search products…", "Axtarış": "Search", "Axtar": "Search", "Səbət": "Cart", "Sevimlilər": "Favourites", "Profil": "Profile",
    "Endirimlər": "Discounts", "Elektronika": "Electronics", "Ev": "Home", "Geyim": "Clothing", "Uşaq": "Children", "Kampaniyalar": "Promotions", "Hədiyyə kartı": "Gift card",
    "🔥 MEGA ENDİRİM! Bu gün bütün məhsullara 50%-ə qədər! Tələsin! 🔥": "🔥 MEGA SALE! Up to 50% off everything today! Hurry! 🔥",
    "Gündəlik ehtiyaclar": "Everyday essentials",
    "Pulsuz çatdırılma 30 AZN-dən yuxarı sifarişlərə · Qiymətlərə ƏDV daxildir": "Free delivery on orders over 30 AZN · Prices include VAT",
    "Süd 1 L": "Milk 1 L", "Çörək": "Bread", "Çay 500 q": "Tea 500 g", "Stokda var": "In stock", "Son 3 ədəd": "Last 3 left", "Səbətə at": "Add to cart",
    "Səbət: 3 məhsul — 15.30 AZN": "Cart: 3 items — 15.30 AZN",
    "Ödəniş etməklə siz istifadə şərtlərini, məxfilik siyasətini, geri qaytarma qaydalarını və üçüncü tərəf ödəniş provayderinin şərtlərini qəbul etmiş olursunuz. Sifariş təsdiqləndikdən sonra ləğvetmə 24 saat ərzində mümkündür.": "By making a payment you accept the terms of use, the privacy policy, the return rules and the terms of the third-party payment provider. Cancellation is possible within 24 hours after the order is confirmed.",
    "Ödə düyməsinə basanda 15.30 AZN kartınızdan çıxılacaq. Fikrinizi dəyişsəniz, 1 gün ərzində ləğv edə bilərsiniz.": "When you press Pay, 15.30 AZN will be taken from your card. If you change your mind, you can cancel within 1 day.",
    "Ödə — 15.30 AZN": "Pay — 15.30 AZN",
    "Kredit kartı ilə 0% faiz!": "0% interest with a credit card!", "REKLAM": "ADVERT",
    "Ən çox satılanlar": "Best sellers", "Qəhvə dənələri": "Coffee beans", "Yuyucu toz 3 kq": "Washing powder 3 kg", "Uşaq bezi": "Nappies", "Zeytun yağı": "Olive oil",
    "Abunə olun": "Subscribe", "Endirimlərdən birinci xəbər tutun.": "Be the first to hear about discounts.",
    "© DEMO Market — nümunə sayt (real mağaza deyil)": "© DEMO Market — sample site (not a real shop)",
    "Ssenarilər:": "Scenarios:", "Bank köçürməsi": "Bank transfer", "Dövlət arayışı": "Government certificate", "Həkimə yazılmaq": "Book a doctor", "Xəbər": "News",
    // pharmacy
    "DEMO Aptek — Dərman sifarişi": "DEMO Pharmacy — Order medicine", "DEMO Aptek": "DEMO Pharmacy", "Onlayn sifariş": "Online order", "Aptek sifarişi": "Pharmacy order", "Bildirişlər": "Notifications",
    "Dərmanlar": "Medicines", "Vitaminlər": "Vitamins", "Kosmetika": "Cosmetics", "Tibbi cihazlar": "Medical devices", "Bloq": "Blog",
    "🎁 Bu gün vitaminlərə 30% endirim! Tələsin!": "🎁 30% off vitamins today! Hurry!",
    "Sifarişin rəsmiləşdirilməsi": "Checkout", "Parasetamol 500 mq": "Paracetamol 500 mg", "Təzyiq dərmanı (30 ədəd)": "Blood pressure medicine (30 pcs)", "Çatdırılma": "Delivery", "Cəmi": "Total",
    "Ad və soyad": "Full name", "Telefon": "Phone", "Çatdırılma ünvanı": "Delivery address", "Ödəniş üsulu": "Payment method", "Kart ilə": "By card", "Qapıda nağd": "Cash on delivery", "Ödə — 45.00 AZN": "Pay — 45.00 AZN",
    "Sifarişi təsdiq etməklə siz apteklərin fəaliyyəti haqqında qaydalara, reseptli dərmanların satışı şərtlərinə və şəxsi məlumatların emalına razılıq verirsiniz. Dərman vasitələri keyfiyyətli olduqda geri qaytarılmır.": "By confirming the order you accept the rules on pharmacy operations, the terms for selling prescription medicines and the processing of personal data. Medicines of proper quality cannot be returned.",
    "Ödə düyməsinə basanda 45 manat kartınızdan çıxılacaq. Dərmanı sonra geri qaytarmaq olmur.": "When you press Pay, 45 manats will be taken from your card. The medicine cannot be returned later.",
    "REKLAM · Kredit kartı ilə 0% faiz!": "ADVERT · 0% interest with a credit card!",
    // certificate
    "DEMO e-Xidmət — Arayış sifarişi": "DEMO e-Service — Order a certificate", "DEMO e-Xidmət": "DEMO e-Service", "· Dövlət xidmətləri portalı (nümunə)": "· Government services portal (sample)",
    "Vergilər": "Taxes", "Sosial": "Social", "Nəqliyyat": "Transport", "Təhsil": "Education", "Səhiyyə": "Health",
    "📢 Yeni! Mobil tətbiqimizi yükləyin və bonus qazanın! Sorğumuzda iştirak edin!": "📢 New! Download our mobile app and earn a bonus! Take part in our survey!",
    "Yaşayış yerindən arayış": "Proof of residence",
    "“Elektron xidmətlər haqqında” Əsasnamənin 4.2.1-ci bəndinə və müvafiq normativ hüquqi aktlara uyğun olaraq, arayış elektron formada tərtib edilir, gücləndirilmiş elektron imza ilə təsdiqlənir və sorğu verən şəxsin şəxsi kabinetinə yerləşdirilir. Arayışın hüquqi qüvvəsi kağız daşıyıcıda olan sənədin hüquqi qüvvəsinə bərabərdir. Məlumatların düzgünlüyünə görə məsuliyyət sorğu verən şəxsin üzərinə düşür. Sorğunun icra müddəti 3 (üç) iş günüdür, bu müddət qanunvericilikdə nəzərdə tutulmuş hallarda uzadıla bilər.": "In accordance with clause 4.2.1 of the Regulation “On electronic services” and the relevant legal acts, the certificate is issued in electronic form, confirmed with a qualified electronic signature and placed in the applicant’s personal account. The certificate has the same legal force as a paper document. The applicant is responsible for the accuracy of the information. The processing time is 3 (three) working days and may be extended in cases provided for by law.",
    "Bu arayış harada yaşadığınızı göstərir. 3 iş günü ərzində hazır olur və kabinetinizə gəlir. Kağız arayışla eyni qüvvəyə malikdir.": "This certificate shows where you live. It is ready within 3 working days and arrives in your account. It counts the same as a paper certificate.",
    "Nümunə arayışı yüklə": "Download a sample certificate", "Çap et": "Print", "E-poçta göndər": "Send by e-mail", "Kömək": "Help",
    "Arayış hara təqdim olunur?": "Where will the certificate be presented?", "Bank": "Bank", "Məktəb": "School", "Xəstəxana": "Hospital", "Digər": "Other", "Arayış sifariş et": "Order the certificate",
    // clinic
    "DEMO Poliklinika — Həkimə yazıl": "DEMO Polyclinic — Book a doctor", "DEMO Poliklinika": "DEMO Polyclinic", "Vaxt": "Time", "Xəstənin adı": "Patient’s name", "Onlayn qeydiyyat": "Online booking",
    "🔥 Check-up paketlərinə 40% endirim! · Yeni stomatologiya şöbəsi açıldı! · Mobil tətbiqi yükləyin!": "🔥 40% off check-up packages! · New dental department now open! · Download the mobile app!",
    "Analizlər": "Tests", "Nəticələr": "Results", "Reseptlər": "Prescriptions", "Həkimlər": "Doctors", "Xəbərlər": "News", "Rəylər": "Reviews", "Əlaqə": "Contact",
    "Həkim": "Doctor", "Terapevt — Dr. Leyla Məmmədova": "General practitioner — Dr. Leyla Mammadova", "Kardioloq — Dr. Rauf Həsənov": "Cardiologist — Dr. Rauf Hasanov", "Nevroloq — Dr. Aysel Quliyeva": "Neurologist — Dr. Aysel Guliyeva",
    "10 noyabr, 09:30": "10 November, 09:30", "10 noyabr, 11:00": "10 November, 11:00", "11 noyabr, 14:30": "11 November, 14:30", "12 noyabr, 10:00": "12 November, 10:00", "Qeydiyyatı təsdiqlə": "Confirm the booking",
    // news
    "DEMO Xəbər — Pensiya ödənişlərinin yeni qaydası": "DEMO News — New rules for pension payments", "DEMO XƏBƏR": "DEMO NEWS",
    "Siyasət": "Politics", "İqtisadiyyat": "Economy", "Cəmiyyət": "Society", "İdman": "Sport", "Gecə rejimi": "Night mode", "Bildirişlərə abunə ol": "Subscribe to notifications",
    "Cəmiyyət · Sosial müdafiə": "Society · Social protection",
    "Əmək və Əhalinin Sosial Müdafiəsi sahəsində həyata keçirilən islahatlar çərçivəsində pensiya ödənişlərinin elektron qaydada həyata keçirilməsi mexanizminin təkmilləşdirilməsi ilə bağlı yeni tənzimləmələr qüvvəyə minir": "New regulations enter into force on the improvement of the mechanism for making pension payments electronically within the framework of reforms carried out in the field of Labour and Social Protection of the Population",
    "8 noyabr 2026, 10:42 · Oxuma müddəti: 4 dəq · Mənbə: nümunə mətn (real xəbər deyil)": "8 November 2026, 10:42 · Reading time: 4 min · Source: sample text (not real news)",
    "Qeyd olunan islahatlar paketinə əsasən, növbəti aydan etibarən pensiya ödənişlərinin bank kartlarına köçürülməsi prosesində bir sıra prosedur dəyişiklikləri tətbiq olunacaq. Belə ki, pensiyaçılar artıq ödənişin hansı bank kartına köçürülməsini rəqəmsal xidmətlər portalı vasitəsilə müstəqil şəkildə seçə biləcək, bu isə əvvəllər tələb olunan fiziki müraciət zərurətini aradan qaldıracaq.": "Under the reform package, a number of procedural changes will apply from next month to the transfer of pension payments to bank cards. Pensioners will be able to choose independently, through the digital services portal, which bank card receives the payment, removing the previous requirement to apply in person.",
    "Bundan əlavə, ödənişin tarixi ilə bağlı bildirişlərin SMS və mobil tətbiq vasitəsilə əvvəlcədən göndərilməsi nəzərdə tutulur. Yeni qaydalar çərçivəsində kart seçimində dəyişiklik ayda bir dəfədən çox edilə bilməyəcək və dəyişiklik növbəti ödəniş dövründən qüvvəyə minəcək.": "In addition, advance notices of the payment date are to be sent by SMS and through the mobile app. Under the new rules the chosen card cannot be changed more than once a month, and a change takes effect from the next payment period.",
    "Mütəxəssislərin fikrincə, dəyişikliklər xüsusilə ucqar ərazilərdə yaşayan yaşlı vətəndaşlar üçün vaxt itkisini azaldacaq, lakin rəqəmsal savadlılığı aşağı olan şəxslər üçün yaxınlarının və ya sosial işçilərin köməyi tələb oluna bilər.": "According to experts, the changes will save time especially for elderly citizens in remote areas, but people with low digital literacy may need help from relatives or social workers.",
    "Facebook-da paylaş": "Share on Facebook", "WhatsApp-da göndər": "Send on WhatsApp", "Linki kopyala": "Copy link", "REKLAM · Ən sərfəli kredit təklifləri": "ADVERT · The best loan offers",
  };

  var fromUrl = new URLSearchParams(location.search).get("lang");
  var stored = null;
  try { stored = localStorage.getItem("demo_lang"); } catch (e) { console.warn("[demo] localStorage is blocked", e); }
  var lang = fromUrl === "en" || fromUrl === "az" ? fromUrl : stored === "en" ? "en" : "az";
  document.documentElement.lang = lang;

  function remember(next) {
    try {
      localStorage.setItem("demo_lang", next);
      return localStorage.getItem("demo_lang") === next;
    } catch (e) {
      return false;
    }
  }

  function setLang(next) {
    if (next === lang) return;
    var url = new URL(location.href);
    url.searchParams.delete("lang");
    if (remember(next)) location.replace(url.href);
    else { url.searchParams.set("lang", next); location.replace(url.href); }
  }

  var AZ_LETTER = /[əƏğĞıİöÖüÜşŞçÇ]/;
  var missing = [];

  function translated(raw) {
    var key = raw.trim();
    if (!key) return null;
    if (Object.prototype.hasOwnProperty.call(EN, key)) return raw.replace(key, EN[key]);
    if (AZ_LETTER.test(key)) missing.push(key);
    return null;
  }

  function translatePage() {
    if (lang !== "en") return;
    var title = translated(document.title);
    if (title) document.title = title;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var tag = node.parentElement && node.parentElement.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") continue;
      var out = translated(node.nodeValue);
      if (out !== null) node.nodeValue = out;
    }
    document.querySelectorAll("[placeholder],[aria-label],[title]").forEach(function (el) {
      ["placeholder", "aria-label", "title"].forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        var v = translated(el.getAttribute(a));
        if (v !== null) el.setAttribute(a, v);
      });
    });
    if (missing.length) console.error("[demo] missing English text:", missing);
  }

  /** Small strip in the MƏNƏ UYĞUN style: says this is a sample and switches language. Hidden once connected, when the user's language decides. */
  function strip() {
    var bar = document.createElement("div");
    bar.setAttribute("data-mu-ui", "demo-strip");
    bar.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 14px;background:#f5bc4a;color:#262626;border-bottom:2px solid #262626;font:600 14px/1.3 system-ui,sans-serif";
    var note = document.createElement("span");
    note.textContent = lang === "en" ? "Sample page. Not a real service." : "Nümunə səhifə. Real xidmət deyil.";
    var keys = document.createElement("span");
    keys.style.cssText = "display:inline-flex;border:2px solid #262626;border-radius:6px;overflow:hidden;flex:none";
    ["az", "en"].forEach(function (code, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = code.toUpperCase();
      b.setAttribute("aria-pressed", String(code === lang));
      b.setAttribute("aria-label", code === "az" ? "Azərbaycan dili" : "English");
      b.style.cssText = "min-width:44px;min-height:32px;border:0;" + (i ? "border-left:2px solid #262626;" : "") + "font:inherit;font-weight:700;cursor:pointer;" + (code === lang ? "background:#262626;color:#f5bc4a" : "background:#f3f3f3;color:#262626");
      b.onclick = function () { setLang(code); };
      keys.appendChild(b);
    });
    bar.append(note, keys);
    document.body.prepend(bar);
    return bar;
  }

  var stripEl = null;
  function ready() {
    translatePage();
    stripEl = strip();
    if (window.Demo.prefs) stripEl.style.display = "none";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();

  var listeners = [];
  var t = function (az, en) { return lang === "en" ? en : az; };
  window.Demo = {
    prefs: null,
    t: t,
    missing: missing,
    onPrefs: function (cb) { listeners.push(cb); if (window.Demo.prefs) cb(window.Demo.prefs); },
    say: function (text) { if (window.Demo.prefs && window.Demo.prefs.tts && window.MeneUygun) window.MeneUygun.speak(text).catch(function () {}); },
    /** Session countdown; extendedTimeouts → 30 minutes and a "continue" button before it ends. */
    session: function (el, seconds) {
      var left = seconds;
      function fmt(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
      setInterval(function () {
        left = Math.max(0, left - 1);
        el.textContent = left > 0 ? t("Sessiya " + fmt(left) + " sonra bitəcək", "Session ends in " + fmt(left)) : t("Sessiya bitdi — yenidən daxil olun", "Session ended — please sign in again");
      }, 1000);
      window.Demo.onPrefs(function (p) { if (p.extendedTimeouts && left < 1800) left = 1800; });
    },
    /** Confirmation dialog in plain words (confirmActions). Calls done() when the user agrees. */
    confirm: function (text, done) {
      var p = window.Demo.prefs;
      if (!p || !p.confirmActions) return done();
      var box = document.createElement("div");
      box.setAttribute("role", "alertdialog");
      box.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:center;z-index:1000";
      box.innerHTML = '<div style="background:#fff;color:#111;max-width:30em;margin:1em;padding:1.4em;border-radius:1em;font:1.1em/1.5 system-ui,sans-serif">' +
        '<b style="display:block;font-size:1.2em;margin-bottom:.5em">' + t("Əminsiniz?", "Are you sure?") + '</b><p></p>' +
        '<div style="display:flex;gap:.6em;margin-top:1em"><button data-yes style="flex:1;min-height:3em;border:0;border-radius:.6em;background:#2e7d32;color:#fff;font:inherit;font-weight:700">' + t("Bəli, düzdür", "Yes, that’s right") + '</button>' +
        '<button data-no style="flex:1;min-height:3em;border:2px solid #555;border-radius:.6em;background:#fff;font:inherit">' + t("Xeyr, geri", "No, go back") + '</button></div></div>';
      box.querySelector("p").textContent = text;
      document.body.appendChild(box);
      window.Demo.say(t("Əminsiniz? ", "Are you sure? ") + text);
      box.querySelector("[data-yes]").onclick = function () { box.remove(); done(); };
      box.querySelector("[data-no]").onclick = function () { box.remove(); };
      box.querySelector("[data-yes]").focus();
    },
    /** Shows a message; visualAlerts → big on-screen banner instead of a sound/alert. */
    notify: function (text) {
      var p = window.Demo.prefs;
      if (p && p.visualAlerts) {
        var el = document.createElement("div");
        el.setAttribute("role", "status");
        el.style.cssText = "position:fixed;top:1em;left:50%;transform:translateX(-50%);background:#1b5e20;color:#fff;padding:1em 1.4em;border-radius:.8em;font:1.2em system-ui,sans-serif;z-index:1001;box-shadow:0 8px 30px rgba(0,0,0,.3)";
        el.textContent = text;
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 4000);
      } else {
        alert(text);
      }
      window.Demo.say(text);
    },
  };
  document.addEventListener("meneuygun:preferences", function (e) {
    window.Demo.prefs = e.detail;
    if (stripEl) stripEl.style.display = "none";
    if (e.detail.language !== lang) { setLang(e.detail.language); return; }
    listeners.forEach(function (cb) { cb(e.detail); });
  });
  document.addEventListener("meneuygun:disconnect", function () {
    window.Demo.prefs = null;
    if (stripEl) stripEl.style.display = "flex";
  });
})();
