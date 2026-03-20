import { mapSchoolRow, toSchoolListItem } from "@/lib/mappers";
import { districtsByStage, schools as mockSchools } from "@/lib/mock-data";
import { mockComparisons, mockFavorites } from "@/lib/mock-user-data";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient, getSupabaseServerClient } from "@/lib/supabase";
import { School, SchoolListItem, Stage, VacancyStatus } from "@/lib/types";

export type SchoolQuery = {
  stage: Stage;
  district?: string | null;
  keyword?: string | null;
  hasVacancy?: boolean;
  schoolType?: string | null;
  sessionType?: string | null;
  schoolNet?: string | null;
  band?: string | null;
  sort?: "recommended" | "updated_desc" | "name_asc";
};

export type SchoolUserState = {
  isFavorited: boolean;
  isInComparison: boolean;
};

export async function findSchools(query: SchoolQuery): Promise<SchoolListItem[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const dbSchools = await findSchoolsFromSupabase(query);
    return dbSchools.map(toSchoolListItem);
  }

  return findSchoolsFromMock(query).map(toSchoolListItem);
}

export async function findSchoolById(id: string): Promise<School | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("schools")
      .select(`
        id,
        name_zh,
        name_en,
        stage,
        district,
        school_type,
        session_type,
        school_net,
        band,
        address_zh,
        phone,
        website,
        tuition_fee,
        is_scheme_participant,
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
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return mapSchoolRow(data as any, (data as any).vacancies ?? []);
  }

  return mockSchools.find((school) => school.id === id) ?? null;
}

export async function getSchoolUserStateMap(
  schoolIds: string[],
  options?: {
    userId?: string | null;
    accessToken?: string | null;
  }
): Promise<Map<string, SchoolUserState>> {
  const uniqueSchoolIds = Array.from(new Set(schoolIds.filter(Boolean)));
  const stateMap = new Map<string, SchoolUserState>(
    uniqueSchoolIds.map((schoolId) => [
      schoolId,
      { isFavorited: false, isInComparison: false }
    ])
  );

  if (uniqueSchoolIds.length === 0 || !options?.userId) {
    return stateMap;
  }

  if (!hasSupabaseEnv()) {
    const favoriteIds = mockFavorites.get(options.userId) ?? new Set<string>();
    const comparisonIds = mockComparisons.get(options.userId) ?? new Set<string>();

    uniqueSchoolIds.forEach((schoolId) => {
      stateMap.set(schoolId, {
        isFavorited: favoriteIds.has(schoolId),
        isInComparison: comparisonIds.has(schoolId)
      });
    });

    return stateMap;
  }

  if (!options.accessToken) {
    return stateMap;
  }

  const supabase = createSupabaseServerClient(options.accessToken);
  if (!supabase) {
    return stateMap;
  }

  const [favoritesResult, comparisonsResult] = await Promise.all([
    supabase
      .from("favorites")
      .select("school_id")
      .eq("user_id", options.userId)
      .in("school_id", uniqueSchoolIds),
    supabase
      .from("comparisons")
      .select("school_id")
      .eq("user_id", options.userId)
      .in("school_id", uniqueSchoolIds)
  ]);

  if (favoritesResult.error) {
    throw favoritesResult.error;
  }

  if (comparisonsResult.error) {
    throw comparisonsResult.error;
  }

  const favoriteIds = new Set((favoritesResult.data ?? []).map((row) => row.school_id));
  const comparisonIds = new Set((comparisonsResult.data ?? []).map((row) => row.school_id));

  uniqueSchoolIds.forEach((schoolId) => {
    stateMap.set(schoolId, {
      isFavorited: favoriteIds.has(schoolId),
      isInComparison: comparisonIds.has(schoolId)
    });
  });

  return stateMap;
}

export async function getSchoolUserState(
  schoolId: string,
  options?: {
    userId?: string | null;
    accessToken?: string | null;
  }
): Promise<SchoolUserState> {
  const stateMap = await getSchoolUserStateMap([schoolId], options);
  return stateMap.get(schoolId) ?? { isFavorited: false, isInComparison: false };
}

export function getSchoolFilters(stage?: Stage) {
  const stages = stage ? [stage] : (["kg", "primary", "secondary"] as Stage[]);
  const districtSet = new Set<string>();

  stages.forEach((currentStage) => {
    districtsByStage[currentStage].forEach((district) => districtSet.add(district));
  });

  return {
    districts: Array.from(districtSet),
    schoolTypes: ["官立", "津贴", "私立", "非牟利"],
    sessionTypes: ["全日", "半日"],
    schoolNets: ["34", "41", "46"],
    bands: ["1", "2", "3"]
  };
}

function findSchoolsFromMock(query: SchoolQuery): School[] {
  const keyword = query.keyword?.trim().toLowerCase();

  let result = mockSchools.filter((school) => school.stage === query.stage);

  if (query.district) {
    result = result.filter((school) => school.district === query.district);
  }

  if (keyword) {
    result = result.filter((school) => {
      return (
        school.nameZh.toLowerCase().includes(keyword) ||
        school.nameEn?.toLowerCase().includes(keyword)
      );
    });
  }

  if (query.hasVacancy) {
    result = result.filter((school) => school.vacancies.some((vacancy) => vacancy.status === "available"));
  }

  if (query.schoolType) {
    result = result.filter((school) => school.schoolType === query.schoolType);
  }

  if (query.sessionType) {
    result = result.filter((school) => school.sessionType === query.sessionType);
  }

  if (query.schoolNet) {
    result = result.filter((school) => school.schoolNet === query.schoolNet);
  }

  if (query.band) {
    result = result.filter((school) => school.band === query.band);
  }

  return sortSchools(result, query.sort);
}

async function findSchoolsFromSupabase(query: SchoolQuery): Promise<School[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  let request = supabase
    .from("schools")
    .select(`
      id,
      name_zh,
      name_en,
      stage,
      district,
      school_type,
      session_type,
      school_net,
      band,
      address_zh,
      phone,
      website,
      tuition_fee,
      is_scheme_participant,
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
    `)
    .eq("stage", query.stage)
    .eq("is_active", true);

  if (query.district) {
    request = request.eq("district", query.district);
  }

  if (query.schoolType) {
    request = request.eq("school_type", query.schoolType);
  }

  if (query.sessionType) {
    request = request.eq("session_type", query.sessionType);
  }

  if (query.schoolNet) {
    request = request.eq("school_net", query.schoolNet);
  }

  if (query.band) {
    request = request.eq("band", query.band);
  }

  if (query.keyword) {
    request = request.or(`name_zh.ilike.%${query.keyword}%,name_en.ilike.%${query.keyword}%`);
  }

  const { data, error } = await request;
  if (error || !data) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schools = data.map((row: any) => mapSchoolRow(row, row.vacancies ?? []));

  if (query.hasVacancy) {
    schools = schools.filter((school) => school.vacancies.some((vacancy) => vacancy.status === "available"));
  }

  return sortSchools(schools, query.sort);
}

function sortSchools(schools: School[], sort: SchoolQuery["sort"]) {
  switch (sort) {
    case "name_asc":
      return schools.sort((a, b) => a.nameZh.localeCompare(b.nameZh, "zh-Hant"));
    case "updated_desc":
      return schools.sort((a, b) => {
        const left = a.vacancies[0]?.updatedAt ?? "";
        const right = b.vacancies[0]?.updatedAt ?? "";
        return right.localeCompare(left);
      });
    case "recommended":
    default:
      return schools.sort((a, b) => compareRecommended(toSchoolListItem(a), toSchoolListItem(b)));
  }
}

function compareRecommended(left: SchoolListItem, right: SchoolListItem): number {
  const leftRank = vacancyRank(left.vacancy?.status);
  const rightRank = vacancyRank(right.vacancy?.status);

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftUpdated = left.vacancy?.updatedAt ?? "";
  const rightUpdated = right.vacancy?.updatedAt ?? "";
  if (leftUpdated !== rightUpdated) {
    return rightUpdated.localeCompare(leftUpdated);
  }

  return left.nameZh.localeCompare(right.nameZh, "zh-Hant");
}

function vacancyRank(status?: VacancyStatus) {
  switch (status) {
    case "available":
      return 0;
    case "waiting":
      return 1;
    case "full":
      return 2;
    case "unknown":
    default:
      return 3;
  }
}
