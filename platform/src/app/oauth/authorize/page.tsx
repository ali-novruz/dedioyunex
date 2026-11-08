import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { parseAuthorize, OAuthError } from "@/lib/oauth";
import { pageT } from "@/lib/lang-server";
import { Icon } from "@/components/Icons";
import { Window } from "@/components/Window";
import { Consent } from "./Consent";

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const raw = await searchParams;
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params[k] = v;
  const self = `/oauth/authorize?${new URLSearchParams(params)}`;
  const { l, lang } = await pageT();

  let req;
  try {
    req = await parseAuthorize(params);
  } catch (e) {
    const msg = e instanceof OAuthError ? (lang === "en" ? e.en : e.message) : l("Sorğu düzgün deyil", "The request is not valid");
    return (
      <div className="stack">
        <h1 className="h1">{l("Qoşulmaq mümkün olmadı", "Could not connect")}</h1>
        <p className="error" role="alert">{msg}</p>
        <p>{l("Bu pəncərəni bağlayıb sayta qayıdın.", "Close this window and go back to the site.")}</p>
      </div>
    );
  }

  const user = await currentUser();
  if (!user) redirect(`/giris?next=${encodeURIComponent(self)}`);

  const where = req.origin ? new URL(req.origin).host : l("mobil tətbiq", "mobile app");
  return (
    <div className="stack">
      <h1 className="h1">
        {l(`${req.client.name} ayarlarınızı istəyir`, `${req.client.name} is asking for your settings`)}
      </h1>
      <p className="lead">{where}</p>
      {req.client.verified ? (
        <p className="ok">{l("Təsdiqlənmiş tərəfdaş. Cizzy bu xidməti yoxlayıb.", "Verified partner. Cizzy has checked this service.")}</p>
      ) : (
        <p className="error">{l("Bu xidmət hələ Cizzy tərəfindən yoxlanılmayıb. Yalnız tanıdığınız və etibar etdiyiniz sayta icazə verin.", "Cizzy has not checked this service yet. Only allow sites you know and trust.")}</p>
      )}
      {!user.onboarded && (
        <div className="notice stack">
          <p>{l("Siz hələ ayarlarınızı qurmamısınız. Əvvəlcə qursanız, sayt dərhal sizə uyğunlaşacaq.", "You have not set up your settings yet. If you do that first, the site will adapt to you at once.")}</p>
          <a className="btn btn-secondary btn-block" href={`/qeydiyyat?next=${encodeURIComponent(self)}`}>{l("Əvvəlcə ayarlarımı qurum", "Set up my settings first")}</a>
        </div>
      )}
      <Window title={l("İcazə", "Permission")}>
        <div className="rows">
          <div>
            <p className="h3 flex items-center gap-2"><Icon name="check" /> {l("Paylaşılacaq: interfeys ayarlarınız", "Will be shared: your interface settings")}</p>
            <p className="muted">{l("Yazı ölçüsü, rənglər, səsli oxunuş, sadə rejim və digər görünüş ayarları.", "Text size, colours, reading aloud, simple mode and other display settings.")}</p>
          </div>
          <div>
            <p className="h3 flex items-center gap-2"><Icon name="cross" /> {l("Paylaşılmayacaq", "Will not be shared")}</p>
            <p className="muted">{l("Adınız, e-poçtunuz və seçdiyiniz çətinliklər. Xidmət yalnız sizin təsdiqlədiyiniz interfeys ayarlarını alır.", "Your name, your e-mail and the difficulties you chose. The service receives only the interface settings you approve.")}</p>
          </div>
        </div>
      </Window>
      <div className="notice">
        <b>{l("Diqqət:", "Careful:")}</b> {l("Cizzy heç vaxt şifrə, kart məlumatı və ya pul istəmir. Belə bir şey istənilirsə, bu səhifəni bağlayın.", "Cizzy never asks for a password, card details or money. If you are asked for any of these, close this page.")}
      </div>
      <Consent params={params} />
      <p className="text-[.95rem]">{l("İstədiyiniz vaxt “Bağlı xidmətlər” bölməsindən bu icazəni ləğv edə bilərsiniz.", "You can cancel this permission at any time under “Connected services”.")}{user.email ? ` (${user.email})` : ""}</p>
    </div>
  );
}
