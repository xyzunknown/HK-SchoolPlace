import { ensureAdminResponse, paginate, parsePagination } from "@/lib/admin-http";
import { listSyncLogs } from "@/lib/repositories/admin-repository";

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

  const items = await listSyncLogs({
    source: searchParams.get("source"),
    status: searchParams.get("status") as
      | "running"
      | "success"
      | "partial_success"
      | "fail"
      | null
  });

  return Response.json(paginate(items, page, pageSize));
}
