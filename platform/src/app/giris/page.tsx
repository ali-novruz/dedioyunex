import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";

function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const user = await currentUser();
  if (user) redirect(next || (user.onboarded ? "/ev" : "/qeydiyyat"));
  return (
    <div className="stack">
      <h1 className="h1">Daxil olun</h1>
      <p className="lead">Şifrə lazım deyil. E-poçtunuza 6 rəqəmli kod göndərəcəyik.</p>
      <LoginForm next={next} />
    </div>
  );
}
