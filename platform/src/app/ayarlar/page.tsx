import { requireUser } from "@/lib/session";
import { SettingsEditor } from "./SettingsEditor";

export default async function SettingsPage() {
  const user = await requireUser("/ayarlar");
  return (
    <div className="stack">
      <h1 className="h1">Ayarlarım</h1>
      <p className="lead">Hər dəyişiklik dərhal ekranda görünür və avtomatik yadda saxlanılır.</p>
      <SettingsEditor categories={user.categories} />
    </div>
  );
}
