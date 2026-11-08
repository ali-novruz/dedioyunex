import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { pageT } from "@/lib/lang-server";
import { LoginForm } from "./LoginForm";
import { safeNext } from "@/lib/next-path";
import { StartAnonymous } from "@/components/StartAnonymous";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const user = await currentUser();
  if (user && user.email) redirect(next || (user.onboarded ? "/ev" : "/qeydiyyat"));
  const adding = !!user; // signed in without e-mail: the code adds the e-mail to this account
  const { l } = await pageT();
  return (
    <div className="stack">
      <h1 className="h1">{adding ? l("E-poçt əlavə edin", "Add your e-mail") : l("Daxil olun", "Sign in")}</h1>
      <p className="lead">
        {adding
          ? l("E-poçt əlavə etsəniz, ayarlarınızı başqa telefon və kompüterlərdə də istifadə edə bilərsiniz.", "With an e-mail you can use your settings on other phones and computers too.")
          : l("Şifrə lazım deyil. E-poçtunuza 6 rəqəmli kod göndərəcəyik.", "No password needed. We will send a 6-digit code to your e-mail.")}
      </p>
      <LoginForm next={next || (adding ? "/xidmetler" : "")} />
      {!adding && <StartAnonymous next={next} />}
      <p className="notice">{l("MƏNƏ UYĞUN heç vaxt şifrə, kart məlumatı və ya pul istəmir.", "MƏNƏ UYĞUN never asks for a password, card details or money.")}</p>
    </div>
  );
}
