import { School, SchoolListItem, Vacancy } from "@/lib/types";

type SchoolRow = {
  id: string;
  name_zh: string;
  name_en: string | null;
  stage: School["stage"];
  district: string;
  school_type: string | null;
  session_type: string | null;
  school_net: string | null;
  band: string | null;
  address_zh: string | null;
  address_en: string | null;
  phone: string | null;
  website: string | null;
  tuition_fee: number | null;
  curriculum: string | null;
  is_scheme_participant: boolean | null;
};

type VacancyRow = {
  id: string;
  school_id: string;
  grade: string;
  status: Vacancy["status"];
  count: number | null;
  updated_at: string;
  is_stale: boolean;
  source: string;
};

export function mapSchoolRow(row: SchoolRow, vacancies: VacancyRow[]): School {
  return {
    id: row.id,
    nameZh: row.name_zh,
    nameEn: row.name_en,
    stage: row.stage,
    district: row.district,
    schoolType: row.school_type,
    sessionType: row.session_type,
    schoolNet: row.school_net,
    band: row.band,
    addressZh: row.address_zh,
    addressEn: row.address_en,
    phone: row.phone,
    website: row.website,
    tuitionFee: row.tuition_fee,
    curriculum: row.curriculum,
    isSchemeParticipant: row.is_scheme_participant,
    vacancies: vacancies.map(mapVacancyRow)
  };
}

export function mapVacancyRow(row: VacancyRow): Vacancy {
  return {
    id: row.id,
    schoolId: row.school_id,
    grade: row.grade,
    status: row.status,
    count: row.count,
    updatedAt: row.updated_at,
    isStale: row.is_stale,
    source: row.source
  };
}

export function toSchoolListItem(school: School): SchoolListItem {
  return {
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
  };
}
