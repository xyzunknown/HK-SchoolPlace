import { ensureAdminResponse } from "@/lib/admin-http";
import { jsonError, jsonOk } from "@/lib/http";
import { resolveUnmatchedRecord } from "@/lib/repositories/admin-repository";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const authError = await ensureAdminResponse();
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => null)) as
    | { status?: "resolved" | "ignored"; resolved_school_id?: string; create_alias?: boolean }
    | null;

  if (!body?.status || (body.status === "resolved" && !body.resolved_school_id)) {
    return jsonError(
      "INVALID_BODY",
      "status is required, and resolved_school_id is required when status is resolved",
      400
    );
  }

  const { id } = await context.params;
  const updated = await resolveUnmatchedRecord({
    id,
    status: body.status,
    resolvedSchoolId: body.resolved_school_id,
    createAlias: body.create_alias
  });

  if (!updated) {
    return jsonError("NOT_FOUND", "unmatched record not found", 404);
  }

  return jsonOk(updated);
}
