import { getRequestUserContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { getSchoolUserStateMap } from "@/lib/repositories/school-repository";
import { listSchools } from "@/lib/schools";
import { parseBoolean, parsePositiveInt, parseStage } from "@/lib/query";

const allowedSort = new Set(["recommended", "updated_desc", "name_asc"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stage = parseStage(searchParams.get("stage"));

  if (!stage) {
    return jsonError("INVALID_QUERY", "stage is required", 400);
  }

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(searchParams.get("page_size"), 20);
  if (pageSize > 50) {
    return jsonError("INVALID_QUERY", "page_size must be 50 or less", 400);
  }

  const sort = searchParams.get("sort") ?? "recommended";
  if (!allowedSort.has(sort)) {
    return jsonError("INVALID_QUERY", "sort is invalid", 400);
  }

  const user = await getRequestUserContext();

  const schools = await listSchools({
    stage,
    district: searchParams.get("district"),
    keyword: searchParams.get("keyword"),
    hasVacancy: parseBoolean(searchParams.get("has_vacancy")),
    schoolType: searchParams.get("school_type"),
    sessionType: searchParams.get("session_type"),
    schoolNet: searchParams.get("school_net"),
    band: searchParams.get("band"),
    sort: sort as "recommended" | "updated_desc" | "name_asc"
  });

  const total = schools.length;
  const start = (page - 1) * pageSize;
  const pagedSchools = schools.slice(start, start + pageSize);
  const userStateMap = await getSchoolUserStateMap(
    pagedSchools.map((school) => school.id),
    {
      userId: user.userId,
      accessToken: user.accessToken
    }
  );
  const data = pagedSchools.map((school) => ({
    ...school,
    ...(userStateMap.get(school.id) ?? {
      isFavorited: false,
      isInComparison: false
    })
  }));

  return Response.json({
    data,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize)
    }
  });
}
