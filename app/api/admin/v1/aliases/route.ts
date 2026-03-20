import { ensureAdminResponse, paginate, parsePagination } from "@/lib/admin-http";
import { jsonCreated, jsonError } from "@/lib/http";
import { createAlias, listAliases } from "@/lib/repositories/admin-repository";

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

  const items = await listAliases({
    keyword: searchParams.get("keyword"),
    schoolId: searchParams.get("school_id"),
    source: searchParams.get("source")
  });

  return Response.json(paginate(items, page, pageSize));
}

export async function POST(request: Request) {
  const authError = await ensureAdminResponse();
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => null)) as
    | { school_id?: string; alias_name?: string; source?: string }
    | null;

  if (!body?.school_id || !body.alias_name || !body.source) {
    return jsonError("INVALID_BODY", "school_id, alias_name and source are required", 400);
  }

  const created = await createAlias({
    schoolId: body.school_id,
    aliasName: body.alias_name,
    source: body.source
  });

  if (!created) {
    return jsonError("NOT_FOUND", "school not found", 404);
  }

  return jsonCreated(created);
}
