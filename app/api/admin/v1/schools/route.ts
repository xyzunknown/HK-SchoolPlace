import { ensureAdminResponse, paginate, parseOptionalBoolean, parsePagination } from "@/lib/admin-http";
import { jsonError } from "@/lib/http";
import { parseStage } from "@/lib/query";
import { listAdminSchools } from "@/lib/repositories/admin-repository";

export async function GET(request: Request) {
  const authError = await ensureAdminResponse();
  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const stageParam = searchParams.get("stage");
  const stage = stageParam ? (parseStage(stageParam) ?? undefined) : undefined;

  if (stageParam && !stage) {
    return jsonError("INVALID_QUERY", "stage is invalid", 400);
  }

  const { page, pageSize, error } = parsePagination(searchParams);
  if (error) {
    return error;
  }

  const items = await listAdminSchools({
    stage,
    district: searchParams.get("district"),
    keyword: searchParams.get("keyword"),
    isActive: parseOptionalBoolean(searchParams.get("is_active"))
  });

  return Response.json(paginate(items, page, pageSize));
}
