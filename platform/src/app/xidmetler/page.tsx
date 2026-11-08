import { requireUser } from "@/lib/session";
import { connectionsOf } from "@/lib/oauth";
import { env } from "@/lib/env";
import { Connections } from "./Connections";
import { AccountActions } from "./AccountActions";

export default async function ServicesPage() {
  const user = await requireUser("/xidmetler");
  const list = connectionsOf(user.id);
  const demo = env.demoPartnerOrigins[0] ?? null;
  return (
    <div className="stack">
      <h1 className="h1">Bağlı xidmətlər</h1>
      <p className="lead">Ayarlarınızı görə bilən sayt və tətbiqlər. İstədiyinizi bir toxunuşla ayıra bilərsiniz.</p>
      <Connections initial={list} demoUrl={demo} />
      <h2 className="h2">Hesab</h2>
      <p className="muted">Daxil olduğunuz e-poçt: <b>{user.email}</b></p>
      <AccountActions />
    </div>
  );
}
