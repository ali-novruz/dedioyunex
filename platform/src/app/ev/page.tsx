import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";
import { Assistant } from "./Assistant";
import { ActiveSettings } from "./ActiveSettings";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ mic?: string }> }) {
  const user = await requireUser("/ev");
  if (!user.onboarded) redirect("/qeydiyyat");
  const { mic } = await searchParams;
  const ai = env.ai;
  return (
    <div className="stack">
      <h1 className="h1">Sizə necə uyğunlaşaq?</h1>
      <p className="lead">Düyməyə basın və çətinliyinizi öz sözlərinizlə deyin. Məsələn: “Yazılar xırdadır, gözüm yaxşı görmür.”</p>
      <Assistant sttMode={env.sttMode} aiReady={!!(ai.baseUrl && ai.apiKey && ai.chatModel)} autoStart={mic === "1"} />
      <Link href="/ayarlar" className="btn btn-secondary btn-block text-[1.15rem]">
        ⚙️ Özüm tənzimləyim
      </Link>
      <ActiveSettings />
    </div>
  );
}
