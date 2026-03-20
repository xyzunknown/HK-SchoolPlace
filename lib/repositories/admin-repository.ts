import { mapSchoolRow, mapVacancyRow, toSchoolListItem } from "@/lib/mappers";
import {
  mockAdminVacancies,
  mockAliases,
  mockSyncLogs,
  mockUnmatchedRecords
} from "@/lib/mock-admin-data";
import { schools as mockSchools } from "@/lib/mock-data";
import { normalizeSchoolName } from "@/lib/normalize";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  AdminSchoolOption,
  AdminSchoolDetail,
  AdminSchoolListItem,
  AdminVacancy,
  SchoolAliasItem,
  School,
  Stage,
  SyncLogItem,
  UnmatchedRecordItem,
  UnmatchedRecordStatus
} from "@/lib/types";

export type AdminSchoolFilters = {
  stage?: Stage;
  district?: string | null;
  keyword?: string | null;
  isActive?: boolean;
};

export type AdminSchoolPatch = Partial<{
  nameZh: string;
  nameEn: string | null;
  district: string;
  addressZh: string | null;
  addressEn: string | null;
  phone: string | null;
  website: string | null;
  schoolType: string | null;
  sessionType: string | null;
  schoolNet: string | null;
  band: string | null;
  tuitionFee: number | null;
  curriculum: string | null;
  isSchemeParticipant: boolean | null;
  isActive: boolean;
}>;

export type VacancyFilters = {
  schoolId?: string | null;
  status?: AdminVacancy["status"] | null;
  source?: string | null;
  isStale?: boolean;
};

export type AliasFilters = {
  keyword?: string | null;
  schoolId?: string | null;
  source?: string | null;
};

export type SyncLogFilters = {
  source?: string | null;
  status?: SyncLogItem["status"] | null;
};

export type UnmatchedFilters = {
  source?: string | null;
  status?: UnmatchedRecordStatus | null;
};

export async function listAdminSchools(filters: AdminSchoolFilters = {}): Promise<AdminSchoolListItem[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
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
        address_en,
        phone,
        website,
        tuition_fee,
        curriculum,
        is_scheme_participant,
        is_active,
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
      `);

    if (filters.stage) {
      request = request.eq("stage", filters.stage);
    }
    if (filters.district) {
      request = request.eq("district", filters.district);
    }
    if (typeof filters.isActive === "boolean") {
      request = request.eq("is_active", filters.isActive);
    }
    if (filters.keyword) {
      request = request.or(`name_zh.ilike.%${filters.keyword}%,name_en.ilike.%${filters.keyword}%`);
    }

    const { data, error } = await request.order("updated_at", { ascending: false });
    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row) => {
      const school = mapSchoolRow(row, row.vacancies ?? []);
      return toAdminSchoolItem(school, row.is_active ?? true);
    });
  }

  return mockSchools
    .filter((school) => matchesSchoolFilters(school, filters))
    .map((school) => toAdminSchoolItem(school, true));
}

export async function getAdminSchoolById(id: string): Promise<AdminSchoolDetail | null> {
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
        address_en,
        phone,
        website,
        tuition_fee,
        curriculum,
        is_scheme_participant,
        is_active,
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
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const school = mapSchoolRow(data as any, (data as any).vacancies ?? []);
    return {
      ...school,
      isActive: (data as any).is_active ?? true,
      latestUpdatedAt: school.vacancies[0]?.updatedAt ?? null,
    };
  }

  const target = mockSchools.find((school) => school.id === id);
  if (!target) {
    return null;
  }

  return {
    ...target,
    isActive: true,
    latestUpdatedAt: target.vacancies[0]?.updatedAt ?? null,
  };
}

export async function updateAdminSchool(id: string, patch: AdminSchoolPatch): Promise<School | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const updates = mapSchoolPatchToDb(patch);
    if ("name_zh" in updates) {
      updates.normalized_name = normalizeSchoolName(updates.name_zh as string);
    }

    const { data, error } = await supabase
      .from("schools")
      .update(updates)
      .eq("id", id)
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
        address_en,
        phone,
        website,
        tuition_fee,
        curriculum,
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
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapSchoolRow(data as any, (data as any).vacancies ?? []);
  }

  const target = mockSchools.find((school) => school.id === id);
  if (!target) {
    return null;
  }

  Object.assign(target, {
    nameZh: patch.nameZh ?? target.nameZh,
    nameEn: patch.nameEn === undefined ? target.nameEn : patch.nameEn,
    district: patch.district ?? target.district,
    addressZh: patch.addressZh === undefined ? target.addressZh : patch.addressZh,
    phone: patch.phone === undefined ? target.phone : patch.phone,
    website: patch.website === undefined ? target.website : patch.website,
    schoolType: patch.schoolType === undefined ? target.schoolType : patch.schoolType,
    sessionType: patch.sessionType === undefined ? target.sessionType : patch.sessionType,
    schoolNet: patch.schoolNet === undefined ? target.schoolNet : patch.schoolNet,
    band: patch.band === undefined ? target.band : patch.band,
    tuitionFee: patch.tuitionFee === undefined ? target.tuitionFee : patch.tuitionFee,
    isSchemeParticipant:
      patch.isSchemeParticipant === undefined ? target.isSchemeParticipant : patch.isSchemeParticipant
  });

  return target;
}

export async function listAdminSchoolOptions(filters: { stage?: Stage } = {}): Promise<AdminSchoolOption[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let request = supabase
      .from("schools")
      .select("id, name_zh, stage, district")
      .order("name_zh", { ascending: true });

    if (filters.stage) {
      request = request.eq("stage", filters.stage);
    }

    const { data, error } = await request;
    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row) => ({
      id: row.id,
      nameZh: row.name_zh,
      stage: row.stage,
      district: row.district
    }));
  }

  return mockSchools
    .filter((school) => (filters.stage ? school.stage === filters.stage : true))
    .map((school) => ({
      id: school.id,
      nameZh: school.nameZh,
      stage: school.stage,
      district: school.district
    }))
    .sort((left, right) => left.nameZh.localeCompare(right.nameZh, "zh-HK"));
}

export async function listAdminVacancies(filters: VacancyFilters = {}): Promise<AdminVacancy[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let request = supabase
      .from("vacancies")
      .select(`
        id,
        school_id,
        grade,
        status,
        count,
        source,
        source_url,
        effective_date,
        updated_at,
        is_stale,
        admin_note,
        schools (
          name_zh,
          stage,
          district
        )
      `);

    if (filters.schoolId) {
      request = request.eq("school_id", filters.schoolId);
    }
    if (filters.status) {
      request = request.eq("status", filters.status);
    }
    if (filters.source) {
      request = request.eq("source", filters.source);
    }
    if (typeof filters.isStale === "boolean") {
      request = request.eq("is_stale", filters.isStale);
    }

    const { data, error } = await request.order("updated_at", { ascending: false });
    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row) => ({
      ...mapVacancyRow(row),
      schoolNameZh: row.schools?.name_zh ?? "",
      stage: row.schools?.stage ?? "kg",
      district: row.schools?.district ?? "",
      sourceUrl: row.source_url ?? null,
      effectiveDate: row.effective_date ?? null,
      adminNote: row.admin_note ?? null
    }));
  }

  return mockAdminVacancies.filter((item) => matchesVacancyFilters(item, filters));
}

export async function updateAdminVacancy(
  id: string,
  patch: { isStale?: boolean; adminNote?: string | null }
): Promise<AdminVacancy | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("vacancies")
      .update({
        is_stale: patch.isStale,
        admin_note: patch.adminNote
      })
      .eq("id", id)
      .select(`
        id,
        school_id,
        grade,
        status,
        count,
        source,
        source_url,
        effective_date,
        updated_at,
        is_stale,
        admin_note,
        schools (
          name_zh,
          stage,
          district
        )
      `)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      ...mapVacancyRow(data as any),
      schoolNameZh: (data as any).schools?.name_zh ?? "",
      stage: (data as any).schools?.stage ?? "kg",
      district: (data as any).schools?.district ?? "",
      sourceUrl: (data as any).source_url ?? null,
      effectiveDate: (data as any).effective_date ?? null,
      adminNote: (data as any).admin_note ?? null
    };
  }

  const target = mockAdminVacancies.find((item) => item.id === id);
  if (!target) {
    return null;
  }

  if (typeof patch.isStale === "boolean") {
    target.isStale = patch.isStale;
  }
  if (patch.adminNote !== undefined) {
    target.adminNote = patch.adminNote;
  }

  return target;
}

export async function listAliases(filters: AliasFilters = {}): Promise<SchoolAliasItem[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let request = supabase
      .from("school_alias")
      .select(`
        id,
        school_id,
        alias_name,
        normalized_alias_name,
        source,
        created_at,
        schools (
          name_zh
        )
      `);

    if (filters.schoolId) {
      request = request.eq("school_id", filters.schoolId);
    }
    if (filters.source) {
      request = request.eq("source", filters.source);
    }
    if (filters.keyword) {
      request = request.ilike("alias_name", `%${filters.keyword}%`);
    }

    const { data, error } = await request.order("created_at", { ascending: false });
    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      schoolNameZh: row.schools?.name_zh ?? "",
      aliasName: row.alias_name,
      normalizedAliasName: row.normalized_alias_name,
      source: row.source,
      createdAt: row.created_at
    }));
  }

  return mockAliases.filter((item) => matchesAliasFilters(item, filters));
}

export async function createAlias(input: {
  schoolId: string;
  aliasName: string;
  source: string;
}): Promise<SchoolAliasItem | null> {
  const supabase = getSupabaseServerClient();
  const normalizedAliasName = normalizeSchoolName(input.aliasName);

  if (supabase) {
    const { data, error } = await supabase
      .from("school_alias")
      .insert({
        school_id: input.schoolId,
        alias_name: input.aliasName,
        normalized_alias_name: normalizedAliasName,
        source: input.source
      })
      .select(`
        id,
        school_id,
        alias_name,
        normalized_alias_name,
        source,
        created_at,
        schools (
          name_zh
        )
      `)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as any;
    return {
      id: row.id,
      schoolId: row.school_id,
      schoolNameZh: row.schools?.name_zh ?? "",
      aliasName: row.alias_name,
      normalizedAliasName: row.normalized_alias_name,
      source: row.source,
      createdAt: row.created_at
    };
  }

  const school = mockSchools.find((item) => item.id === input.schoolId);
  if (!school) {
    return null;
  }

  const created: SchoolAliasItem = {
    id: `alias-${mockAliases.length + 1}`,
    schoolId: input.schoolId,
    schoolNameZh: school.nameZh,
    aliasName: input.aliasName,
    normalizedAliasName,
    source: input.source,
    createdAt: new Date().toISOString()
  };
  mockAliases.unshift(created);
  return created;
}

export async function updateAlias(
  id: string,
  patch: { schoolId?: string; aliasName?: string }
): Promise<SchoolAliasItem | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const updates: Record<string, unknown> = {};
    if (patch.schoolId) {
      updates.school_id = patch.schoolId;
    }
    if (patch.aliasName) {
      updates.alias_name = patch.aliasName;
      updates.normalized_alias_name = normalizeSchoolName(patch.aliasName);
    }

    const { data, error } = await supabase
      .from("school_alias")
      .update(updates)
      .eq("id", id)
      .select(`
        id,
        school_id,
        alias_name,
        normalized_alias_name,
        source,
        created_at,
        schools (
          name_zh
        )
      `)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as any;
    return {
      id: row.id,
      schoolId: row.school_id,
      schoolNameZh: row.schools?.name_zh ?? "",
      aliasName: row.alias_name,
      normalizedAliasName: row.normalized_alias_name,
      source: row.source,
      createdAt: row.created_at
    };
  }

  const target = mockAliases.find((item) => item.id === id);
  if (!target) {
    return null;
  }

  if (patch.schoolId) {
    const school = mockSchools.find((item) => item.id === patch.schoolId);
    if (!school) {
      return null;
    }
    target.schoolId = patch.schoolId;
    target.schoolNameZh = school.nameZh;
  }
  if (patch.aliasName) {
    target.aliasName = patch.aliasName;
    target.normalizedAliasName = normalizeSchoolName(patch.aliasName);
  }

  return target;
}

export async function listSyncLogs(filters: SyncLogFilters = {}): Promise<SyncLogItem[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let request = supabase
      .from("sync_logs")
      .select(`
        id,
        source,
        run_type,
        status,
        records_fetched,
        records_parsed,
        records_matched,
        records_updated,
        message,
        started_at,
        finished_at
      `);

    if (filters.source) {
      request = request.eq("source", filters.source);
    }
    if (filters.status) {
      request = request.eq("status", filters.status);
    }

    const { data, error } = await request.order("started_at", { ascending: false }).limit(100);
    if (error || !data) {
      return [];
    }

    return (data as any[]).map((row) => ({
      id: row.id,
      source: row.source,
      runType: row.run_type,
      status: row.status,
      recordsFetched: row.records_fetched,
      recordsParsed: row.records_parsed,
      recordsMatched: row.records_matched,
      recordsUpdated: row.records_updated,
      message: row.message,
      startedAt: row.started_at,
      finishedAt: row.finished_at
    }));
  }

  return mockSyncLogs.filter((item) => {
    if (filters.source && item.source !== filters.source) {
      return false;
    }
    if (filters.status && item.status !== filters.status) {
      return false;
    }
    return true;
  });
}

export async function listUnmatchedRecords(filters: UnmatchedFilters = {}): Promise<UnmatchedRecordItem[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let request = supabase
      .from("unmatched_records")
      .select(`
        id,
        source,
        raw_name,
        normalized_name,
        stage,
        district,
        grade,
        suggested_school_id,
        resolved_school_id,
        status,
        created_at,
        updated_at
      `);

    if (filters.source) {
      request = request.eq("source", filters.source);
    }
    if (filters.status) {
      request = request.eq("status", filters.status);
    }

    const { data, error } = await request.order("created_at", { ascending: false });
    if (error || !data) {
      return [];
    }

    const schoolIds = Array.from(
      new Set(
        (data as any[])
          .flatMap((row) => [row.suggested_school_id, row.resolved_school_id])
          .filter(Boolean)
      )
    );
    const schoolNameMap = await getSchoolNameMap(schoolIds);

    return (data as any[]).map((row) => ({
      id: row.id,
      source: row.source,
      rawName: row.raw_name,
      normalizedName: row.normalized_name,
      stage: row.stage,
      district: row.district,
      grade: row.grade,
      suggestedSchoolId: row.suggested_school_id,
      suggestedSchoolName: schoolNameMap.get(row.suggested_school_id) ?? null,
      status: row.status,
      resolvedSchoolId: row.resolved_school_id,
      resolvedSchoolName: schoolNameMap.get(row.resolved_school_id) ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  return mockUnmatchedRecords.filter((item) => {
    if (filters.source && item.source !== filters.source) {
      return false;
    }
    if (filters.status && item.status !== filters.status) {
      return false;
    }
    return true;
  });
}

export async function resolveUnmatchedRecord(input: {
  id: string;
  status: "resolved" | "ignored";
  resolvedSchoolId?: string;
  createAlias?: boolean;
}): Promise<UnmatchedRecordItem | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("unmatched_records")
      .update({
        status: input.status,
        resolved_school_id: input.status === "resolved" ? input.resolvedSchoolId : null
      })
      .eq("id", input.id)
      .select(`
        id,
        source,
        raw_name,
        normalized_name,
        stage,
        district,
        grade,
        suggested_school_id,
        resolved_school_id,
        status,
        created_at,
        updated_at
      `)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as any;
    if (input.status === "resolved" && input.createAlias && input.resolvedSchoolId) {
      await createAlias({
        schoolId: input.resolvedSchoolId,
        aliasName: row.raw_name,
        source: "manual"
      });
    }

    return {
      id: row.id,
      source: row.source,
      rawName: row.raw_name,
      normalizedName: row.normalized_name,
      stage: row.stage,
      district: row.district,
      grade: row.grade,
      suggestedSchoolId: row.suggested_school_id,
      suggestedSchoolName: null,
      status: row.status,
      resolvedSchoolId: row.resolved_school_id,
      resolvedSchoolName: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  const target = mockUnmatchedRecords.find((item) => item.id === input.id);
  if (!target) {
    return null;
  }

  target.status = input.status;
  target.resolvedSchoolId = input.status === "resolved" ? input.resolvedSchoolId ?? null : null;
  target.updatedAt = new Date().toISOString();

  if (input.status === "resolved" && input.createAlias && input.resolvedSchoolId) {
    await createAlias({
      schoolId: input.resolvedSchoolId,
      aliasName: target.rawName,
      source: "manual"
    });
  }

  return target;
}

function toAdminSchoolItem(school: School, isActive: boolean): AdminSchoolListItem {
  return {
    ...toSchoolListItem(school),
    isActive,
    latestUpdatedAt: school.vacancies[0]?.updatedAt ?? null
  };
}

function matchesSchoolFilters(school: School, filters: AdminSchoolFilters) {
  if (filters.stage && school.stage !== filters.stage) {
    return false;
  }
  if (filters.district && school.district !== filters.district) {
    return false;
  }
  if (typeof filters.isActive === "boolean" && filters.isActive !== true) {
    return false;
  }
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    return (
      school.nameZh.toLowerCase().includes(keyword) ||
      school.nameEn?.toLowerCase().includes(keyword) === true
    );
  }
  return true;
}

function matchesVacancyFilters(item: AdminVacancy, filters: VacancyFilters) {
  if (filters.schoolId && item.schoolId !== filters.schoolId) {
    return false;
  }
  if (filters.status && item.status !== filters.status) {
    return false;
  }
  if (filters.source && item.source !== filters.source) {
    return false;
  }
  if (typeof filters.isStale === "boolean" && item.isStale !== filters.isStale) {
    return false;
  }
  return true;
}

function matchesAliasFilters(item: SchoolAliasItem, filters: AliasFilters) {
  if (filters.schoolId && item.schoolId !== filters.schoolId) {
    return false;
  }
  if (filters.source && item.source !== filters.source) {
    return false;
  }
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    return (
      item.aliasName.toLowerCase().includes(keyword) ||
      item.schoolNameZh.toLowerCase().includes(keyword)
    );
  }
  return true;
}

function mapSchoolPatchToDb(patch: AdminSchoolPatch) {
  const updates: Record<string, unknown> = {};
  if (patch.nameZh !== undefined) updates.name_zh = patch.nameZh;
  if (patch.nameEn !== undefined) updates.name_en = patch.nameEn;
  if (patch.district !== undefined) updates.district = patch.district;
  if (patch.addressZh !== undefined) updates.address_zh = patch.addressZh;
  if (patch.addressEn !== undefined) updates.address_en = patch.addressEn;
  if (patch.phone !== undefined) updates.phone = patch.phone;
  if (patch.website !== undefined) updates.website = patch.website;
  if (patch.schoolType !== undefined) updates.school_type = patch.schoolType;
  if (patch.sessionType !== undefined) updates.session_type = patch.sessionType;
  if (patch.schoolNet !== undefined) updates.school_net = patch.schoolNet;
  if (patch.band !== undefined) updates.band = patch.band;
  if (patch.tuitionFee !== undefined) updates.tuition_fee = patch.tuitionFee;
  if (patch.curriculum !== undefined) updates.curriculum = patch.curriculum;
  if (patch.isSchemeParticipant !== undefined) {
    updates.is_scheme_participant = patch.isSchemeParticipant;
  }
  if (patch.isActive !== undefined) updates.is_active = patch.isActive;
  return updates;
}

async function getSchoolNameMap(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return new Map(
      mockSchools
        .filter((school) => ids.includes(school.id))
        .map((school) => [school.id, school.nameZh])
    );
  }

  const { data } = await supabase.from("schools").select("id, name_zh").in("id", ids);
  return new Map(((data as any[]) ?? []).map((row) => [row.id, row.name_zh]));
}
