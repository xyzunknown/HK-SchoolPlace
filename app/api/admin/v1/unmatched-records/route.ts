import { ensureAdminResponse, paginate, parsePagination } from "@/lib/admin-http";
import { listUnmatchedRecords } from "@/lib/repositories/admin-repository";

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

  const items = await listUnmatchedRecords({
    source: searchParams.get("source"),
    status: searchParams.get("status") as "pending" | "resolved" | "ignored" | null
  });

  return Response.json(paginate(items, page, pageSize));
}
