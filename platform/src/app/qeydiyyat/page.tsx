import { requireUser } from "@/lib/session";
import { CategoryPicker } from "./CategoryPicker";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
  const user = await requireUser("/qeydiyyat");
  return (
    <div className="stack">
      <h1 className="h1">{user.onboarded ? "Ehtiyaclarınız" : "Xoş gəlmisiniz!"}</h1>
      <p className="lead">
        Sizə nə çətinlik yaradır? Bir neçəsini seçə bilərsiniz. Bu, yalnız sizə uyğun ayarları göstərmək üçündür və heç bir sayta ötürülmür.
      </p>
      <CategoryPicker initial={user.categories} firstTime={!user.onboarded} next={safe} />
    </div>
  );
}
