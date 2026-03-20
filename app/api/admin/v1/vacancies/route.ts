import { ensureAdminResponse, paginate, parseOptionalBoolean, parsePagination } from "@/lib/admin-http";
import { listAdminVacancies } from "@/lib/repositories/admin-repository";

export async function GET(request: Request) {
  const authError = await ensureAdminResponse();
  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const { page, pageSize, error } = parsePagination(searchParams);
  if (error) {
    return error;
  }

  const items = await listAdminVacancies({
    schoolId: searchParams.get("school_id"),
    status: searchParams.get("status") as
      | "available"
      | "waiting"
      | "full"
      | "unknown"
      | null,
    source: searchParams.get("source"),
    isStale: parseOptionalBoolean(searchParams.get("is_stale"))
  });

  return Response.json(paginate(items, page, pageSize));
}
