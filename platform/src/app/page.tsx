import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { pageT } from "@/lib/lang-server";
import { StartAnonymous } from "@/components/StartAnonymous";
import { Window } from "@/components/Window";
import { TryIt } from "@/components/TryIt";

export default async function Home() {
  const user = await currentUser();
  if (user) redirect(user.onboarded ? "/ev" : "/qeydiyyat");
  const { l } = await pageT();

  const steps = [
    {
      title: l("Danışın və ya seçin", "Speak or choose"),
      text: l(
        "“Yazılar xırdadır, oxuya bilmirəm” deyin, köməkçi ayarları özü qursun. İstəsəniz əl ilə seçin.",
        "Say “the text is too small, I can’t read it” and the assistant sets things up. Or choose by hand.",
      ),
    },
    {
      title: l("Bir düymə basın", "Press one button"),
      text: l(
        "Qoşulan saytda “MƏNƏ UYĞUN-dan ayarları gətir” düyməsinə basın və icazə verin.",
        "On a connected site, press “Bring my MƏNƏ UYĞUN settings” and give permission.",
      ),
    },
    {
      title: l("Hər yerdə işləsin", "It works everywhere"),
      text: l(
        "Sayt dərhal sizə uyğunlaşır. Ayarı burada dəyişsəniz, hər yerdə dəyişir.",
        "The site adapts at once. Change a setting here and it changes everywhere.",
      ),
    },
  ];

  return (
    <div className="stack">
      <div className="hero">
        <Window title={l("Şəxsi əlçatanlıq profili", "Personal accessibility profile")} className="hero-window">
          <h1 className="hero-name">MƏNƏ UYĞUN</h1>
          <p className="tagline mt-3">{l("Bir dəfə qur, hər xidmətdə özünə uyğun istifadə et.", "Set it up once. Use every service your way.")}</p>
        </Window>
        <div className="hero-keys">
          <Link href="/giris" className="btn btn-primary btn-block text-[1.25rem]">
            {l("Başla", "Get started")}
          </Link>
          <StartAnonymous keyOnly />
        </div>
      </div>

      <Link href="/tehlukesiz" className="btn btn-alarm btn-block">
        {l("Kimsə zəng edib kod və ya pul istəyir", "Someone is asking me for a code or money")}
      </Link>

      <h2 className="h2">{l("Özünüz sınayın", "Try it yourself")}</h2>
      <Window title={l("Canlı nümunə", "Live example")}>
        <TryIt />
      </Window>

      <h2 className="h2">{l("Necə işləyir?", "How does it work?")}</h2>
      <Window title={l("Üç addım", "Three steps")}>
        <ol className="rows">
          {steps.map((s, i) => (
            <li key={s.title} className="step">
              <span className="step-n" aria-hidden>{i + 1}</span>
              <div>
                <h3 className="h3">{s.title}</h3>
                <p className="muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Window>

      <h2 className="h2">{l("Məlumatınız sizindir", "Your data stays yours")}</h2>
      <Window title={l("Məxfilik", "Privacy")}>
        <div className="rows">
          <p>{l("Adınız, e-poçtunuz və seçdiyiniz çətinliklər heç bir sayta ötürülmür. Yalnız sizin təsdiqlədiyiniz interfeys ayarları ötürülür.", "Your name, e-mail and the difficulties you choose are never passed to any site. Only the interface settings you approve are shared.")}</p>
          <p className="font-semibold">{l("MƏNƏ UYĞUN heç vaxt şifrə, kart məlumatı və ya pul istəmir.", "MƏNƏ UYĞUN never asks for a password, card details or money.")}</p>
        </div>
      </Window>

      <p className="pt-3">
        {l("Saytınızı qoşmaq istəyirsiniz?", "Want to connect your site?")}{" "}
        <Link href="/developers" className="textlink">{l("Tərtibatçılar üçün", "For developers")}</Link>
      </p>
    </div>
  );
}
