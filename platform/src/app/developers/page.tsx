import Link from "next/link";
import { currentUser } from "@/lib/session";
import { clientsOf } from "@/lib/clients";
import { env } from "@/lib/env";
import { pageT } from "@/lib/lang-server";
import { Window } from "@/components/Window";
import { ClientManager } from "./ClientManager";

function Code({ children }: { children: string }) {
  return (
    <pre className="code"><code>{children}</code></pre>
  );
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="inline-code">{children}</code>;
}

export default async function DevelopersPage() {
  const user = await currentUser();
  const base = env.appUrl;
  const mine = user ? await clientsOf(user.id) : [];
  const { l } = await pageT();
  const id = l("SIZIN_CLIENT_ID", "YOUR_CLIENT_ID");
  return (
    <div className="stack">
      <h1 className="h1">{l("Saytınızı Cizzy-yə qoşun", "Connect your site to Cizzy")}</h1>
      <p className="lead">
        {l("Bir sətir kod. Saytınız istifadəçinin yazı ölçüsü, kontrast, səsli oxunuş, sadə rejim və digər ayarlarına avtomatik uyğunlaşır.", "One line of code. Your site adapts automatically to each user’s text size, contrast, reading aloud, simple mode and other settings.")}
      </p>

      <h2 className="h2">{l("1. Saytınızı qeydiyyatdan keçirin", "1. Register your site")}</h2>
      {user ? (
        <ClientManager initial={mine} base={base} />
      ) : (
        <Window title={l("Qeydiyyat", "Registration")}>
          <p>
            {l("Qeydiyyat üçün", "To register,")} <Link className="textlink" href="/giris?next=/developers">{l("daxil olun", "sign in")}</Link>. {l("Sizə client_id veriləcək.", "You will receive a client_id.")}
          </p>
        </Window>
      )}

      <h2 className="h2">{l("2. Skripti <head> hissəsinə əlavə edin", "2. Add the script to <head>")}</h2>
      <Window title="HTML">
        <div className="stack">
          <Code>{`<script src="${base}/sdk.js" data-client-id="${id}" async></script>`}</Code>
          <p className="muted">
            {l(
              "Bu qədər. Skript saytın sağ aşağı küncündə “Cizzy-dən ayarları gətir” düyməsini göstərir və heç bir dəyişiklik etmədən yazıları, kontrastı, rəngləri, düymələri, animasiyaları, reklamları və səsli oxunuşu idarə edir. async ilə qoşun: Cizzy serveri cavab verməsə belə saytınız heç vaxt gözləmir və bloklanmır, istifadəçinin son ayarları cihazda saxlanılır və dərhal tətbiq olunur.",
              "That’s all. The script shows a “Bring my Cizzy settings” button in the bottom-right corner and, with no other changes, controls text, contrast, colours, buttons, animations, ads and reading aloud. Load it with async: even if the Cizzy server does not respond, your site never waits or blocks, and the user’s last settings are kept on the device and applied at once.",
            )}
          </p>
        </div>
      </Window>

      <h2 className="h2">{l("Platformaya görə", "By platform")}</h2>
      <Window title={l("Quraşdırma", "Installation")}>
        <div className="rows">
          <details className="fold">
            <summary>Next.js (App Router)</summary>
            <Code>{`// app/layout.tsx
import Script from "next/script";

<html>
  <head>
    <Script src="${base}/sdk.js" data-client-id="${id}" strategy="afterInteractive" />
  </head>
  ...`}</Code>
          </details>
          <details className="fold">
            <summary>React / Vite / Vue / Angular (index.html)</summary>
            <Code>{`<!-- index.html, ${l("<head> içində", "inside <head>")} -->
<script src="${base}/sdk.js" data-client-id="${id}" async></script>`}</Code>
          </details>
          <details className="fold">
            <summary>WordPress</summary>
            <p className="muted mb-2">{l("“WPCode” və ya “Insert Headers and Footers” plaginində “Header” bölməsinə yapışdırın, ya da temanın functions.php faylına:", "Paste it into the “Header” section of the “WPCode” or “Insert Headers and Footers” plugin, or add this to your theme’s functions.php:")}</p>
            <Code>{`add_action('wp_head', function () {
  echo '<script src="${base}/sdk.js" data-client-id="${id}" async></script>';
}, 1);`}</Code>
          </details>
          <details className="fold">
            <summary>{l("Content-Security-Policy istifadə edirsinizsə", "If you use a Content-Security-Policy")}</summary>
            <Code>{`script-src ${base};
connect-src ${base};
font-src ${base};`}</Code>
          </details>
        </div>
      </Window>

      <h2 className="h2">{l("3. İstəyə görə: daha dəqiq inteqrasiya", "3. Optional: finer integration")}</h2>
      <Window title={l("Dəqiq nəzarət", "Fine control")}>
        <div className="rows">
          <div className="stack">
            <h3 className="h3">{l("Düyməni öz yerinizə qoyun", "Place the button yourself")}</h3>
            <Code>{`<div data-cz-button></div>   <!-- ${l("düymə burada görünəcək, küncdəki düymə yox olacaq", "the button appears here, the corner button goes away")} -->
<!-- ${l("küncdə düymə istəmirsinizsə", "no corner button at all")}: <script ... data-floating="false"> -->`}</Code>
          </div>
          <div className="stack">
            <h3 className="h3">{l("Sadə rejimdə nə gizlənsin, nə önə çıxsın", "What simple mode hides and highlights")}</h3>
            <Code>{`<section data-cz-simple="hide">${l("Kampaniyalar, əlavə menyular…", "Promotions, extra menus…")}</section>
<a data-cz-simple="primary" href="/pay">${l("Ödəniş", "Payment")}</a>
<div data-cz-distraction>${l("Reklam", "Advert")}</div>
<aside data-cz-simple="keep">${l("Vacib yan panel", "Important side panel")}</aside>`}</Code>
          </div>
          <div className="stack">
            <h3 className="h3">{l("Xidmətin özünün tətbiq etdiyi ayarlar (B növü)", "Settings the service applies itself (type B)")}</h3>
            <p className="muted">
              {l("Bütün ayarlar <html> elementində atribut kimi görünür:", "Every setting appears as an attribute on <html>:")} <C>data-cz-confirm-actions</C>, <C>data-cz-extended-timeouts</C>, <C>data-cz-plain-language</C>, <C>data-cz-step-by-step</C>, <C>data-cz-visual-alerts</C>, <C>data-cz-language=&quot;az&quot;</C>.
            </p>
            <Code>{`Cizzy.on("preferences", (p) => {
  if (p.extendedTimeouts) session.setTimeout(30 * 60);
  if (p.confirmActions) payButton.dataset.confirm = "1";
});

html[data-cz-plain-language] .legal-text { display: none; }
html[data-cz-plain-language] .simple-text { display: block; }`}</Code>
          </div>
          <div className="stack">
            <h3 className="h3">{l("Tokens rejimi: dizaynı tam özünüz idarə edin", "Tokens mode: keep full control of your design")}</h3>
            <Code>{`<script src="${base}/sdk.js" data-client-id="..." data-mode="tokens"></script>

/* ${l("SDK heç nəyi dəyişmir, yalnız dəyişənləri verir", "The SDK changes nothing, it only provides variables")} */
html { font-size: calc(100% * var(--cz-font-scale, 1)); }
html[data-cz-contrast="high"] { --text: #000; --bg: #fff; }
html[data-cz-contrast="dark"] { --text: #fff; --bg: #000; }`}</Code>
          </div>
          <div className="stack">
            <h3 className="h3">{l("Uyğunluq: hansı ayarları özünüz dəstəkləyirsiniz", "Compatibility: which settings you support")}</h3>
            <p className="muted">{l("B növ ayarları tətbiq edirsinizsə, siyahını bildirin. İstifadəçi “Bu sayt ayarlarınızdan 9/10-nu dəstəkləyir” görəcək.", "If you implement type B settings, list them. The user will see “This site supports 9 of your 10 settings”.")}</p>
            <Code>{`<script src="${base}/sdk.js" data-client-id="..." data-supports="confirmActions,extendedTimeouts,plainLanguage" async></script>`}</Code>
          </div>
          <div className="stack">
            <h3 className="h3">{l("Saytınızı yoxlayın", "Check your site")}</h3>
            <p className="muted">{l("Ünvanın sonuna ?cz-check əlavə edin. Səhifə 200% yazı ölçüsündə yoxlanılır: üfüqi sürüşmə, kəsilən mətnlər, kiçik düymələr, aşağı kontrast, adsız ikonlar. Konsolda:", "Add ?cz-check to the address. The page is tested at 200% text size for sideways scrolling, clipped text, small buttons, low contrast and unnamed icons. In the console:")} <C>await Cizzy.check()</C></p>
          </div>
          <div className="stack">
            <h3 className="h3">{l("Açıq sxem", "Open schema")}</h3>
            <p className="muted">{l("Bütün ayarlar, dəyərlər və WCAG / ISO/IEC 24751 uyğunluqları:", "All settings, values and WCAG / ISO/IEC 24751 mappings:")} <a className="textlink" href="/v1/schema">{`${base}/v1/schema`}</a></p>
          </div>
          <div className="stack">
            <h3 className="h3">JavaScript API</h3>
            <Code>{`Cizzy.connect()
Cizzy.disconnect()
Cizzy.refresh()
Cizzy.preferences
Cizzy.isConnected
Cizzy.speak("${l("Mətn", "Text")}")
Cizzy.compatibility    // { active, supported, unsupported[] }
await Cizzy.check()
Cizzy.on("connect" | "disconnect" | "preferences" | "error", cb)
document.addEventListener("cizzy:preferences", (e) => e.detail)`}</Code>
          </div>
        </div>
      </Window>

      <h2 className="h2">{l("Qoruma və formalar", "Protection and forms")}</h2>
      <Window title="Action Guard">
        <div className="rows">
          <div className="stack">
            <h3 className="h3">{l("Vacib düymələri işarələyin", "Mark the important buttons")}</h3>
            <p className="muted">{l("İstifadəçi basanda aydın təsdiq ekranı çıxır. Yoxlama brauzerdə aparılır, əməliyyat məlumatı serverə getmir.", "When pressed, a clear confirmation appears. The check runs in the browser and no action data goes to a server.")}</p>
            <Code>{`<button data-cz-guard="payment" data-cz-guard-amount="45 AZN">${l("Ödə", "Pay")}</button>
<button data-cz-guard="delete">${l("Sil", "Delete")}</button>
<button data-cz-guard="submit" data-cz-guard-text="${l("Sifarişiniz göndərilir.", "Your order is being sent.")}">${l("Göndər", "Send")}</button>
<button data-cz-guard="subscribe">${l("Abunə ol", "Subscribe")}</button>`}</Code>
          </div>
          <div className="stack">
            <h3 className="h3">Form Guide</h3>
            <p className="muted">{l("3 və daha çox sahəsi olan formalar avtomatik addım-addım göstərilir. İzahı özünüz yaza bilərsiniz.", "Forms with 3 or more fields are shown step by step automatically. You can write the explanation yourself.")}</p>
            <Code>{`<input name="fin" data-cz-help="${l("Şəxsiyyət vəsiqənizdəki 7 işarəli kod", "The 7-character code on your ID card")}">
<form data-cz-form-guide="off">...</form>`}</Code>
          </div>
        </div>
      </Window>

      <h2 className="h2">REST API</h2>
      <Window title="REST">
        <Code>{`GET  ${base}/oauth/authorize   (OAuth 2.0 + PKCE)
POST ${base}/oauth/token
GET  ${base}/v1/preferences    Authorization: Bearer <token>
POST ${base}/oauth/revoke`}</Code>
      </Window>
    </div>
  );
}
