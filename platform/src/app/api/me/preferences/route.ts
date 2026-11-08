import { handle, jsonBody } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { replacePreferences, updatePreferences } from "@/lib/users";

/** PATCH: partial update. PUT: full replace (used by "reset"). */
export function PATCH(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    return { preferences: updatePreferences(user.id, await jsonBody(req)) };
  });
}

export function PUT(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    return { preferences: replacePreferences(user.id, await jsonBody(req)) };
  });
}
