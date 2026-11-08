import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { StartAnonymous } from "@/components/StartAnonymous";

export default async function Home() {
  const user = await currentUser();
  if (user) redirect(user.onboarded ? "/ev" : "/qeydiyyat");

  return (
    <div className="stack">
      <h1 className="h1">Rəqəmsal dünyanı özünə uyğunlaşdır</h1>
      <p className="lead">
        Yazı ölçüsünü, rəngləri, səsli oxunuşu bir dəfə qurun. MƏNƏ UYĞUN-a qoşulan bütün sayt və tətbiqlər avtomatik sizə uyğunlaşacaq.
      </p>
      <Link href="/giris" className="btn btn-primary btn-block text-[1.25rem]">
        Başla
      </Link>
      <StartAnonymous />

      <h2 className="h2">Necə işləyir?</h2>
      <ol className="stack">
        <li className="card">
          <b>1. Danışın və ya seçin.</b> “Yazılar xırdadır, oxuya bilmirəm” deyin — köməkçi ayarları özü qurur. İstəsəniz əl ilə seçin.
        </li>
        <li className="card">
          <b>2. Bir düymə.</b> Qoşulan saytda “MƏNƏ UYĞUN-dan ayarları gətir” düyməsinə basın və icazə verin.
        </li>
        <li className="card">
          <b>3. Hər yerdə avtomatik.</b> Sayt dərhal sizə uyğunlaşır. Ayarı burada dəyişsəniz, hər yerdə dəyişir.
        </li>
      </ol>

      <div className="notice">
        <b>Məxfilik:</b> adınız, e-poçtunuz və seçdiyiniz çətinliklər heç bir sayta ötürülmür. Yalnız sizin gördüyünüz və təsdiqlədiyiniz interfeys ayarları (yazı ölçüsü, rənglər və s.) ötürülür.
        <br />
        <b>Təhlükəsizlik:</b> MƏNƏ UYĞUN heç vaxt şifrə, kart məlumatı və ya pul istəmir.
      </div>

      <p className="muted">
        Saytınızı qoşmaq istəyirsiniz? <Link href="/developers" className="font-bold text-[var(--brand)] underline">Tərtibatçılar üçün</Link>
      </p>
    </div>
  );
}
