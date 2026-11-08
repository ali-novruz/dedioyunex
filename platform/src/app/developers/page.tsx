import Link from "next/link";
import { currentUser } from "@/lib/session";
import { clientsOf } from "@/lib/clients";
import { env } from "@/lib/env";
import { ClientManager } from "./ClientManager";

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl bg-[#14181f] p-4 text-[.8rem] leading-relaxed text-[#e8eaed]">
      <code>{children}</code>
    </pre>
  );
}

export default async function DevelopersPage() {
  const user = await currentUser();
  const base = env.appUrl;
  const mine = user ? await clientsOf(user.id) : [];
  return (
    <div className="stack">
      <h1 className="h1">Saytınızı MƏNƏ UYĞUN-a qoşun</h1>
      <p className="lead">
        Bir sətir kod. Saytınız istifadəçinin yazı ölçüsü, kontrast, səsli oxunuş, sadə rejim və digər ayarlarına avtomatik uyğunlaşır.
      </p>

      <h2 className="h2">1. Saytınızı qeydiyyatdan keçirin</h2>
      {user ? (
        <ClientManager initial={mine} base={base} />
      ) : (
        <p className="card">
          Qeydiyyat üçün <Link className="font-bold text-[var(--brand)] underline" href="/giris?next=/developers">daxil olun</Link>. Sizə <code>client_id</code> veriləcək.
        </p>
      )}

      <h2 className="h2">2. Skripti &lt;head&gt; hissəsinə əlavə edin</h2>
      <Code>{`<script src="${base}/sdk.js" data-client-id="SIZIN_CLIENT_ID" async></script>`}</Code>
      <p className="muted">
        Bu qədər. Skript saytın sağ aşağı küncündə “MƏNƏ UYĞUN-dan ayarları gətir” düyməsini göstərir və heç bir dəyişiklik etmədən (avtomatik rejim) yazıları,
        kontrastı, rəngləri, düymələri, animasiyaları, reklamları və səsli oxunuşu idarə edir. <code>async</code> ilə qoşun: MƏNƏ UYĞUN serveri cavab verməsə belə saytınız heç vaxt gözləmir və bloklanmır (fail-open) — istifadəçinin son ayarları cihazda saxlanılır və dərhal tətbiq olunur.
      </p>

      <h2 className="h2">Platformaya görə</h2>
      <div className="stack">
        <details className="card">
          <summary className="cursor-pointer font-bold">Next.js (App Router)</summary>
          <Code>{`// app/layout.tsx
import Script from "next/script";

<html>
  <head>
    <Script src="${base}/sdk.js" data-client-id="SIZIN_CLIENT_ID" strategy="afterInteractive" />
  </head>
  ...`}</Code>
        </details>
        <details className="card">
          <summary className="cursor-pointer font-bold">React / Vite / Vue / Angular (index.html)</summary>
          <Code>{`<!-- index.html, <head> içində -->
<script src="${base}/sdk.js" data-client-id="SIZIN_CLIENT_ID" async></script>`}</Code>
        </details>
        <details className="card">
          <summary className="cursor-pointer font-bold">WordPress</summary>
          <p className="muted">“WPCode” və ya “Insert Headers and Footers” plaginində “Header” bölməsinə yapışdırın, ya da temanın <code>functions.php</code> faylına:</p>
          <Code>{`add_action('wp_head', function () {
  echo '<script src="${base}/sdk.js" data-client-id="SIZIN_CLIENT_ID" async></script>';
}, 1);`}</Code>
        </details>
        <details className="card">
          <summary className="cursor-pointer font-bold">Content-Security-Policy istifadə edirsinizsə</summary>
          <Code>{`script-src ${base};
connect-src ${base};
font-src ${base};`}</Code>
        </details>
      </div>

      <h2 className="h2">3. İstəyə görə: daha dəqiq inteqrasiya</h2>
      <div className="stack">
        <div className="card stack">
          <b>Düyməni öz yerinizə qoyun</b>
          <Code>{`<div data-mu-button></div>   <!-- düymə burada görünəcək, küncdəki düymə yox olacaq -->
<!-- küncdə düymə istəmirsinizsə: <script ... data-floating="false"> -->`}</Code>
        </div>
        <div className="card stack">
          <b>Sadə rejimdə nə gizlənsin, nə önə çıxsın</b>
          <Code>{`<section data-mu-simple="hide">Kampaniyalar, əlavə menyular…</section>
<a data-mu-simple="primary" href="/odenis">Ödəniş</a>
<div data-mu-distraction>Reklam</div>          <!-- "Reklamları gizlət" açıq olanda gizlənir -->
<aside data-mu-simple="keep">Vacib yan panel</aside>`}</Code>
        </div>
        <div className="card stack">
          <b>Xidmətin özünün tətbiq etdiyi ayarlar (B növü)</b>
          <p className="muted">
            Bütün ayarlar <code>&lt;html&gt;</code> elementində atribut kimi görünür: <code>data-mu-confirm-actions</code>, <code>data-mu-extended-timeouts</code>,{" "}
            <code>data-mu-plain-language</code>, <code>data-mu-step-by-step</code>, <code>data-mu-visual-alerts</code>, <code>data-mu-language=&quot;az&quot;</code> və s.
          </p>
          <Code>{`MeneUygun.on("preferences", (p) => {
  if (p.extendedTimeouts) session.setTimeout(30 * 60);  // sessiyanı uzat
  if (p.confirmActions) payButton.dataset.confirm = "1"; // ödənişdən əvvəl soruş
});

// CSS ilə:
html[data-mu-plain-language] .legal-text { display: none; }
html[data-mu-plain-language] .simple-text { display: block; }`}</Code>
        </div>
        <div className="card stack">
          <b>Tokens rejimi — dizaynı tam özünüz idarə edin</b>
          <Code>{`<script src="${base}/sdk.js" data-client-id="..." data-mode="tokens"></script>

/* SDK heç nəyi dəyişmir, yalnız dəyişənləri verir: */
html { font-size: calc(100% * var(--mu-font-scale, 1)); }
html[data-mu-contrast="high"] { --text: #000; --bg: #fff; }
html[data-mu-contrast="dark"] { --text: #fff; --bg: #000; }`}</Code>
        </div>
        <div className="card stack">
          <b>Uyğunluq: hansı ayarları özünüz dəstəkləyirsiniz</b>
          <p className="muted">B növ ayarları tətbiq edirsinizsə, siyahını bildirin — istifadəçi “Bu sayt ayarlarınızdan 9/10-nu dəstəkləyir” görəcək.</p>
          <Code>{`<script src="${base}/sdk.js" data-client-id="..." data-supports="confirmActions,extendedTimeouts,plainLanguage" async></script>`}</Code>
        </div>
        <div className="card stack">
          <b>Saytınızı yoxlayın</b>
          <p className="muted">Ünvanın sonuna <code>?mu-check</code> əlavə edin (məs. <code>https://saytim.az/?mu-check</code>): səhifə 200% yazı ölçüsündə yoxlanılır — üfüqi sürüşmə, kəsilən mətnlər, kiçik düymələr, aşağı kontrast, adsız ikonlar. Konsolda: <code>await MeneUygun.check()</code>.</p>
        </div>
        <div className="card stack">
          <b>Açıq sxem</b>
          <p className="muted">Bütün ayarlar, dəyərlər və WCAG / ISO/IEC 24751 uyğunluqları: <a className="font-bold text-[var(--brand)] underline" href="/v1/schema">{`${base}/v1/schema`}</a></p>
        </div>
        <div className="card stack">
          <b>JavaScript API</b>
          <Code>{`MeneUygun.connect()        // düyməsiz qoşulma (klik içində çağırın)
MeneUygun.disconnect()
MeneUygun.refresh()        // ən son ayarları çək
MeneUygun.preferences      // hazırkı ayarlar və ya null
MeneUygun.isConnected
MeneUygun.speak("Mətn")    // istifadəçinin səs ayarları ilə oxu
MeneUygun.compatibility    // { active, supported, unsupported[] }
await MeneUygun.check()    // uyğunluq hesabatı
MeneUygun.on("connect" | "disconnect" | "preferences" | "error", cb)
document.addEventListener("meneuygun:preferences", (e) => e.detail)`}</Code>
        </div>
      </div>

      <h2 className="h2">Mobil tətbiqlər</h2>
      <p className="muted">
        Android (Kotlin/Compose) və iOS (Swift/SwiftUI) SDK-ları eyni hesabla işləyir. Qeydiyyatda “Mobil redirect URI” daxil edin (məs. <code>myapp://callback</code>).
      </p>
      <Code>{`// Android
MeneUygun.init(context, clientId = "SIZIN_CLIENT_ID", baseUrl = "${base}", redirectUri = "myapp://callback")
setContent { MeneUygunTheme { MeneUygunConnectButton(); App() } }

// iOS
MeneUygun.shared.configure(clientId: "SIZIN_CLIENT_ID", baseURL: URL(string: "${base}")!, redirectURI: "myapp://callback")
ContentView().meneUygun()`}</Code>

      <h2 className="h2">REST API</h2>
      <Code>{`GET  ${base}/oauth/authorize   (OAuth 2.0 + PKCE)
POST ${base}/oauth/token
GET  ${base}/v1/preferences    Authorization: Bearer <token>
POST ${base}/oauth/revoke`}</Code>
    </div>
  );
}
