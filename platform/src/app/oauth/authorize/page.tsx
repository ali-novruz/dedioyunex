import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { parseAuthorize, OAuthError } from "@/lib/oauth";
import { Consent } from "./Consent";

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params[k] = v;
  const self = `/oauth/authorize?${new URLSearchParams(params)}`;

  let req;
  try {
    req = parseAuthorize(params);
  } catch (e) {
    const msg = e instanceof OAuthError ? e.message : "Sorğu düzgün deyil";
    return (
      <div className="stack">
        <h1 className="h1">Qoşulmaq mümkün olmadı</h1>
        <p className="error" role="alert">{msg}</p>
        <p className="muted">Bu pəncərəni bağlayıb sayta qayıdın.</p>
      </div>
    );
  }

  const user = await currentUser();
  if (!user) redirect(`/giris?next=${encodeURIComponent(self)}`);

  const where = req.origin ? new URL(req.origin).host : "mobil tətbiq";
  return (
    <div className="stack">
      <h1 className="h1">
        <b>{req.client.name}</b> ayarlarınızı istəyir
      </h1>
      <p className="lead">{where}</p>
      {!user.onboarded && (
        <div className="notice stack">
          <p>Siz hələ ayarlarınızı qurmamısınız. Əvvəlcə qursanız, sayt dərhal sizə uyğunlaşacaq.</p>
          <a className="btn btn-secondary btn-block" href={`/qeydiyyat?next=${encodeURIComponent(self)}`}>Əvvəlcə ayarlarımı qurum</a>
        </div>
      )}
      <div className="card stack">
        <p className="font-bold">✓ Paylaşılacaq: interfeys ayarlarınız</p>
        <p className="muted">Yazı ölçüsü, rənglər, səsli oxunuş, sadə rejim və digər görünüş ayarları.</p>
        <p className="font-bold">✗ Paylaşılmayacaq</p>
        <p className="muted">Adınız, e-poçtunuz, seçdiyiniz çətinliklər və hər hansı sağlamlıq məlumatı.</p>
      </div>
      <Consent params={params} />
      <p className="muted text-[.9rem]">İstədiyiniz vaxt “Bağlı xidmətlər” bölməsindən bu icazəni ləğv edə bilərsiniz. ({user.email})</p>
    </div>
  );
}
