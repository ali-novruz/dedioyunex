import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";
import { safeNext } from "@/lib/next-path";
import { StartAnonymous } from "@/components/StartAnonymous";


export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const user = await currentUser();
  if (user && user.email) redirect(next || (user.onboarded ? "/ev" : "/qeydiyyat"));
  const adding = !!user; // signed in without e-mail: the code adds the e-mail to this account
  return (
    <div className="stack">
      <h1 className="h1">{adding ? "E-poçt əlavə edin" : "Daxil olun"}</h1>
      <p className="lead">
        {adding
          ? "E-poçt əlavə etsəniz, ayarlarınızı başqa telefon və kompüterlərdə də istifadə edə bilərsiniz."
          : "Şifrə lazım deyil. E-poçtunuza 6 rəqəmli kod göndərəcəyik."}
      </p>
      <LoginForm next={next || (adding ? "/xidmetler" : "")} />
      {!adding && <StartAnonymous next={next} />}
      <p className="notice">MƏNƏ UYĞUN heç vaxt şifrə, kart məlumatı və ya pul istəmir.</p>
    </div>
  );
}
