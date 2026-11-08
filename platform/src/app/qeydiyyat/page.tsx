import { requireUser } from "@/lib/session";
import { tr } from "@/lib/lang";
import { CategoryPicker } from "./CategoryPicker";
import { safeNext } from "@/lib/next-path";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = safeNext(next);
  const user = await requireUser("/qeydiyyat");
  const l = tr(user.prefs.language);
  return (
    <div className="stack">
      <h1 className="h1">{user.onboarded ? l("Ehtiyaclarınız", "Your needs") : l("Xoş gəlmisiniz!", "Welcome!")}</h1>
      <p className="lead">
        {l(
          "Sizə nə çətinlik yaradır? Bir neçəsini seçə bilərsiniz. Bu, yalnız sizə uyğun ayarları göstərmək üçündür və heç bir sayta ötürülmür.",
          "What is difficult for you? You can choose several. This only decides which settings we show you, and it is never passed to any site.",
        )}
      </p>
      <CategoryPicker initial={user.categories} firstTime={!user.onboarded} next={safe} />
    </div>
  );
}
