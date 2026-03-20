import { ensureAdminResponse } from "@/lib/admin-http";
import { jsonError, jsonOk } from "@/lib/http";
import { updateAdminVacancy } from "@/lib/repositories/admin-repository";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const authError = await ensureAdminResponse();
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || Object.keys(body).length === 0) {
    return jsonError("INVALID_BODY", "request body is required", 400);
  }

  const { id } = await context.params;
  const updated = await updateAdminVacancy(id, {
    isStale: typeof body.is_stale === "boolean" ? body.is_stale : undefined,
    adminNote: typeof body.admin_note === "string" || body.admin_note === null ? body.admin_note : undefined
  });

  if (!updated) {
    return jsonError("NOT_FOUND", "vacancy not found", 404);
  }

  return jsonOk(updated);
}
