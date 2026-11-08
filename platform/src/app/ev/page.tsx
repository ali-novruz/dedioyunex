import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { tr } from "@/lib/lang";
import { env } from "@/lib/env";
import { Icon } from "@/components/Icons";
import { Assistant } from "./Assistant";
import { ActiveSettings } from "./ActiveSettings";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ mic?: string }> }) {
  const user = await requireUser("/ev");
  if (!user.onboarded) redirect("/qeydiyyat");
  const { mic } = await searchParams;
  const ai = env.ai;
  const l = tr(user.prefs.language);
  return (
    <div className="stack">
      <h1 className="h1">{l("Sizə necə uyğunlaşaq?", "How can we suit you?")}</h1>
      <p className="lead">
        {l("Çətinliyinizi öz sözlərinizlə deyin və ya yazın. Məsələn: “Yazılar xırdadır, gözüm yaxşı görmür.”", "Say or type what is difficult, in your own words. For example: “The text is too small, I can’t see well.”")}
      </p>
      <Assistant sttMode={env.sttMode} aiReady={!!(ai.baseUrl && ai.apiKey && ai.chatModel)} autoStart={mic === "1"} />
      <Link href="/ayarlar" className="btn btn-secondary btn-block text-[1.15rem]">
        <Icon name="sliders" /> {l("Özüm tənzimləyim", "I’ll set it up myself")}
      </Link>
      <ActiveSettings />
      <p className="pt-4">
        <Link href="/tehlukesiz" className="btn btn-danger btn-small">
          <Icon name="warn" /> {l("Kimsə zəng edib kod və ya pul istəyir", "Someone is asking me for a code or money")}
        </Link>
      </p>
    </div>
  );
}
