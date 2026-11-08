import { requireUser } from "@/lib/session";
import { connectionsOf } from "@/lib/oauth";
import { env } from "@/lib/env";
import { Connections } from "./Connections";
import { AccountActions } from "./AccountActions";
import { TransferQr } from "./TransferQr";
import Link from "next/link";

export default async function ServicesPage() {
  const user = await requireUser("/xidmetler");
  const list = await connectionsOf(user.id);
  const demo = env.demoPartnerOrigins[0] ?? null;
  return (
    <div className="stack">
      <h1 className="h1">Bağlı xidmətlər</h1>
      <p className="lead">Ayarlarınızı görə bilən sayt və tətbiqlər. İstədiyinizi bir toxunuşla ayıra bilərsiniz.</p>
      <Connections initial={list} demoUrl={demo} />
      <h2 className="h2">Hesab</h2>
      {user.email ? (
        <p className="muted">Daxil olduğunuz e-poçt: <b>{user.email}</b></p>
      ) : (
        <div className="notice stack">
          <p>Hesabınız e-poçtsuzdur — ayarlar yalnız bu cihazdadır.</p>
          <Link className="btn btn-primary btn-block" href="/giris">E-poçt əlavə et</Link>
        </div>
      )}
      <TransferQr />
      <AccountActions />
    </div>
  );
}
