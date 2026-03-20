import { findSchoolById } from "@/lib/repositories/school-repository";
import { mockComparisons, mockFavorites } from "@/lib/mock-user-data";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase";
import { SchoolListItem } from "@/lib/types";

type UserSchoolRepositoryErrorReason =
  | "auth_unavailable"
  | "read_failed"
  | "write_failed";

type UserSchoolRow = {
  schools:
    | UserSchoolRecord
    | Array<UserSchoolRecord>
    | null;
};

type UserSchoolRecord = {
    id: string;
    name_zh: string;
    name_en: string | null;
    stage: SchoolListItem["stage"];
    district: string;
    school_type: string | null;
    session_type: string | null;
    school_net: string | null;
    band: string | null;
    vacancies:
      | Array<{
          id: string;
          school_id: string;
          grade: string;
          status: "available" | "waiting" | "full" | "unknown";
          count: number | null;
          updated_at: string;
          is_stale: boolean;
          source: string;
        }>
      | null;
};

export class UserSchoolRepositoryError extends Error {
  constructor(public reason: UserSchoolRepositoryErrorReason) {
    super(reason);
    this.name = "UserSchoolRepositoryError";
  }
}

export function isUserSchoolRepositoryError(error: unknown): error is UserSchoolRepositoryError {
  return error instanceof UserSchoolRepositoryError;
}

export async function listFavoriteSchools(
  userId: string,
  accessToken?: string | null
): Promise<SchoolListItem[]> {
  const supabase = getUserScopedSupabaseClient(accessToken);
  if (!supabase) {
    return listMockUserSchools(mockFavorites, userId);
  }

  const { data, error } = await supabase
    .from("favorites")
    .select(`
      school_id,
      schools (
        id,
        name_zh,
        name_en,
        stage,
        district,
        school_type,
        session_type,
        school_net,
        band,
        vacancies (
          id,
          school_id,
          grade,
          status,
          count,
          updated_at,
          is_stale,
          source
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    throw new UserSchoolRepositoryError("read_failed");
  }

  return mapUserSchoolRows(data as unknown as UserSchoolRow[]);
}

export async function addFavoriteSchool(
  userId: string,
  schoolId: string,
  accessToken?: string | null
) {
  const school = await findSchoolById(schoolId);
  if (!school) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const supabase = getUserScopedSupabaseClient(accessToken);
  if (supabase) {
    const { error } = await supabase
      .from("favorites")
      .upsert({ user_id: userId, school_id: schoolId }, { onConflict: "user_id,school_id" });

    if (error) {
      throw new UserSchoolRepositoryError("write_failed");
    }

    return { ok: true as const };
  }

  const set = ensureSet(mockFavorites, userId);
  set.add(schoolId);
  return { ok: true as const };
}

export async function removeFavoriteSchool(
  userId: string,
  schoolId: string,
  accessToken?: string | null
) {
  const supabase = getUserScopedSupabaseClient(accessToken);
  if (supabase) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("school_id", schoolId);

    if (error) {
      throw new UserSchoolRepositoryError("write_failed");
    }

    return { ok: true as const };
  }

  ensureSet(mockFavorites, userId).delete(schoolId);
  return { ok: true as const };
}

export async function listComparisonSchools(
  userId: string,
  accessToken?: string | null
): Promise<SchoolListItem[]> {
  const supabase = getUserScopedSupabaseClient(accessToken);
  if (supabase) {
    const { data, error } = await supabase
      .from("comparisons")
      .select(`
        school_id,
        schools (
          id,
          name_zh,
          name_en,
          stage,
          district,
          school_type,
          session_type,
          school_net,
          band,
          vacancies (
            id,
            school_id,
            grade,
            status,
            count,
            updated_at,
            is_stale,
            source
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      throw new UserSchoolRepositoryError("read_failed");
    }

    return mapUserSchoolRows(data as unknown as UserSchoolRow[]);
  }

  return listMockUserSchools(mockComparisons, userId);
}

export async function addComparisonSchool(
  userId: string,
  schoolId: string,
  accessToken?: string | null
) {
  const school = await findSchoolById(schoolId);
  if (!school) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const supabase = getUserScopedSupabaseClient(accessToken);
  if (supabase) {
    const { count, error: countError } = await supabase
      .from("comparisons")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      throw new UserSchoolRepositoryError("read_failed");
    }

    const { data: existingRow, error: existingError } = await supabase
      .from("comparisons")
      .select("id")
      .eq("user_id", userId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (existingError) {
      throw new UserSchoolRepositoryError("read_failed");
    }

    if (!existingRow && (count ?? 0) >= 5) {
      return { ok: false as const, reason: "limit_reached" as const };
    }

    const { error } = await supabase
      .from("comparisons")
      .upsert({ user_id: userId, school_id: schoolId }, { onConflict: "user_id,school_id" });

    if (error) {
      if (isComparisonLimitError(error)) {
        return { ok: false as const, reason: "limit_reached" as const };
      }

      throw new UserSchoolRepositoryError("write_failed");
    }

    const total = existingRow ? count ?? 0 : Math.min((count ?? 0) + 1, 5);
    return { ok: true as const, total };
  }

  const set = ensureSet(mockComparisons, userId);
  if (!set.has(schoolId) && set.size >= 5) {
    return { ok: false as const, reason: "limit_reached" as const };
  }

  set.add(schoolId);
  return { ok: true as const, total: set.size };
}

export async function removeComparisonSchool(
  userId: string,
  schoolId: string,
  accessToken?: string | null
) {
  const supabase = getUserScopedSupabaseClient(accessToken);
  if (supabase) {
    const { error } = await supabase
      .from("comparisons")
      .delete()
      .eq("user_id", userId)
      .eq("school_id", schoolId);

    if (error) {
      throw new UserSchoolRepositoryError("write_failed");
    }

    return { ok: true as const };
  }

  ensureSet(mockComparisons, userId).delete(schoolId);
  return { ok: true as const };
}

async function listMockUserSchools(
  sourceMap: Map<string, Set<string>>,
  userId: string
): Promise<SchoolListItem[]> {
  const ids = Array.from(sourceMap.get(userId) ?? []);
  const merged = await Promise.all(ids.map((id) => findSchoolById(id)));

  return merged
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((school) => ({
      id: school.id,
      nameZh: school.nameZh,
      nameEn: school.nameEn,
      stage: school.stage,
      district: school.district,
      schoolType: school.schoolType,
      sessionType: school.sessionType,
      schoolNet: school.schoolNet,
      band: school.band,
      vacancy: school.vacancies[0] ?? null
    }))
    .sort((a, b) => {
      const indexA = ids.indexOf(a.id);
      const indexB = ids.indexOf(b.id);
      return indexA - indexB;
    });
}

function ensureSet(map: Map<string, Set<string>>, userId: string) {
  let set = map.get(userId);
  if (!set) {
    set = new Set<string>();
    map.set(userId, set);
  }

  return set;
}

function getUserScopedSupabaseClient(accessToken?: string | null) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  if (!accessToken) {
    throw new UserSchoolRepositoryError("auth_unavailable");
  }

  const supabase = createSupabaseServerClient(accessToken);
  if (!supabase) {
    throw new UserSchoolRepositoryError("auth_unavailable");
  }

  return supabase;
}

function mapUserSchoolRows(rows: UserSchoolRow[]): SchoolListItem[] {
  return rows
    .map((row) => normalizeSchoolRow(row.schools))
    .filter((school): school is UserSchoolRecord => Boolean(school))
    .map((school) => ({
      id: school.id,
      nameZh: school.name_zh,
      nameEn: school.name_en,
      stage: school.stage,
      district: school.district,
      schoolType: school.school_type,
      sessionType: school.session_type,
      schoolNet: school.school_net,
      band: school.band,
      vacancy: school.vacancies?.[0]
        ? {
            id: school.vacancies[0].id,
            schoolId: school.vacancies[0].school_id,
            grade: school.vacancies[0].grade,
            status: school.vacancies[0].status,
            count: school.vacancies[0].count,
            updatedAt: school.vacancies[0].updated_at,
            isStale: school.vacancies[0].is_stale,
            source: school.vacancies[0].source,
          }
        : null,
    }));
}

function normalizeSchoolRow(school: UserSchoolRow["schools"]): UserSchoolRecord | null {
  if (Array.isArray(school)) {
    return school[0] ?? null;
  }

  return school;
}

function isComparisonLimitError(error: { code?: string; message?: string; details?: string | null }) {
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return error.code === "P0001" || message.includes("最多 5") || message.includes("limit");
}
