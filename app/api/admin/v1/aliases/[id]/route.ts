import { ensureAdminResponse } from "@/lib/admin-http";
import { jsonError, jsonOk } from "@/lib/http";
import { updateAlias } from "@/lib/repositories/admin-repository";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const authError = await ensureAdminResponse();
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => null)) as
    | { school_id?: string; alias_name?: string }
    | null;

  if (!body || (!body.school_id && !body.alias_name)) {
    return jsonError("INVALID_BODY", "school_id or alias_name is required", 400);
  }

  const { id } = await context.params;
  const updated = await updateAlias(id, {
    schoolId: body.school_id,
    aliasName: body.alias_name
  });

  if (!updated) {
    return jsonError("NOT_FOUND", "alias not found", 404);
  }

  return jsonOk(updated);
}
