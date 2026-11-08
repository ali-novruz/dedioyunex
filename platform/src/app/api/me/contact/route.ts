import { handle, jsonBody } from "@/lib/http";
import { requireApiUser, AuthError } from "@/lib/session";
import { getContact, setContact } from "@/lib/users";
import { bi } from "@/lib/lang";

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** The trusted person who is told when the user presses the scam button. Never shared with sites. */
export function GET() {
  return handle(async () => {
    const user = await requireApiUser();
    return { contact: await getContact(user.id) };
  });
}

export function PUT(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await jsonBody(req);
    const name = clean(body.name, 60);
    const phone = clean(body.phone, 24);
    const email = clean(body.email, 200);
    if (name.length < 2) throw new AuthError(bi("Adı yazın.", "Enter the name."));
    if (!/^\+?[0-9][0-9 ()-]{6,22}$/.test(phone)) throw new AuthError(bi("Telefon nömrəsi düzgün deyil. Nümunə: +994501234567", "That phone number is not valid. Example: +994501234567"));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError(bi("E-poçt ünvanı düzgün deyil", "That e-mail address is not valid"));
    const contact = { name, phone, email: email || null };
    await setContact(user.id, contact);
    return { contact };
  });
}

export function DELETE() {
  return handle(async () => {
    const user = await requireApiUser();
    await setContact(user.id, null);
    return { ok: true };
  });
}
