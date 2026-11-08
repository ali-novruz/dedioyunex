import Link from "next/link";
import { requireUser } from "@/lib/session";
import { connectionsOf } from "@/lib/oauth";
import { env } from "@/lib/env";
import { tr } from "@/lib/lang";
import { Connections } from "./Connections";
import { AccountActions } from "./AccountActions";
import { TransferQr } from "./TransferQr";
import { TrustedContact } from "./TrustedContact";
import { getContact } from "@/lib/users";

export default async function ServicesPage() {
  const user = await requireUser("/xidmetler");
  const list = await connectionsOf(user.id);
  const demo = env.demoPartnerOrigins[0] ?? null;
  const l = tr(user.prefs.language);
  const contact = await getContact(user.id);
  return (
    <div className="stack">
      <h1 className="h1">{l("Bağlı xidmətlər", "Connected services")}</h1>
      <p className="lead">{l("Ayarlarınızı görə bilən sayt və tətbiqlər. İstədiyinizi bir toxunuşla ayıra bilərsiniz.", "The sites and apps that can see your settings. You can disconnect any of them with one tap.")}</p>
      <Connections initial={list} demoUrl={demo} />
      <h2 className="h2">{l("Təhlükəsizlik", "Safety")}</h2>
      <TrustedContact initial={contact} />
      <h2 className="h2">{l("Başqa cihaz", "Another device")}</h2>
      <TransferQr />
      <h2 className="h2">{l("Hesab", "Account")}</h2>
      {user.email ? (
        <p>{l("Daxil olduğunuz e-poçt:", "Signed in as:")} <b>{user.email}</b></p>
      ) : (
        <div className="notice stack">
          <p>{l("Hesabınız e-poçtsuzdur, ayarlar yalnız bu cihazdadır.", "Your account has no e-mail, so your settings are on this device only.")}</p>
          <Link className="btn btn-primary btn-block" href="/giris">{l("E-poçt əlavə et", "Add an e-mail")}</Link>
        </div>
      )}
      <AccountActions />
    </div>
  );
}
