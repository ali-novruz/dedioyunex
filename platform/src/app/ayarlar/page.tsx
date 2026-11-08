import { requireUser } from "@/lib/session";
import { tr } from "@/lib/lang";
import { SettingsEditor } from "./SettingsEditor";

export default async function SettingsPage() {
  const user = await requireUser("/ayarlar");
  const l = tr(user.prefs.language);
  return (
    <div className="stack">
      <h1 className="h1">{l("Ayarlarım", "My settings")}</h1>
      <p className="lead">{l("Hər dəyişiklik dərhal ekranda görünür və avtomatik yadda saxlanılır.", "Every change shows on screen at once and is saved automatically.")}</p>
      <SettingsEditor categories={user.categories} />
    </div>
  );
}
