import { currentUser } from "@/lib/session";
import { getContact } from "@/lib/users";
import { pageT } from "@/lib/lang-server";
import { SafetyScreen } from "./SafetyScreen";

export default async function SafePage() {
  const user = await currentUser();
  const { l } = await pageT();
  const contact = user ? await getContact(user.id) : null;
  return (
    <div className="stack">
      <h1 className="h1">{l("Bu fırıldaqdır. Heç nə göndərməyin.", "This is a scam. Do not send anything.")}</h1>
      <SafetyScreen signedIn={!!user} safeUntil={user?.safeUntil ?? null} contact={contact && { name: contact.name, phone: contact.phone }} />
    </div>
  );
}
