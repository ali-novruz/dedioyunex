import { handle, jsonBody } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { setCategories } from "@/lib/users";

export function PUT(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await jsonBody(req);
    return { categories: await setCategories(user.id, body.categories) };
  });
}
