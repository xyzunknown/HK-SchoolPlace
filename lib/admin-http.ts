import { requireAdminUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { parseBoolean, parsePositiveInt } from "@/lib/query";

export async function ensureAdminResponse() {
  const result = await requireAdminUser();
  if (!result.ok) {
    return jsonError(result.code, result.message, result.status);
  }

  return null;
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(searchParams.get("page_size"), 20);

  return {
    page,
    pageSize,
    error: pageSize > 50 ? jsonError("INVALID_QUERY", "page_size must be 50 or less", 400) : null
  };
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const start = (page - 1) * pageSize;

  return {
    data: items.slice(start, start + pageSize),
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize)
    }
  };
}

export function parseOptionalBoolean(value: string | null) {
  return parseBoolean(value);
}
