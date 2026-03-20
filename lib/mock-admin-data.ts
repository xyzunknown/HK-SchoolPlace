import { schools as mockSchools } from "@/lib/mock-data";
import { normalizeSchoolName } from "@/lib/normalize";
import {
  AdminVacancy,
  SchoolAliasItem,
  SyncLogItem,
  UnmatchedRecordItem
} from "@/lib/types";

const now = "2026-03-18T12:00:00+08:00";

export const mockSyncLogs: SyncLogItem[] = [
  {
    id: "sync-001",
    source: "edb",
    runType: "vacancy",
    status: "success",
    recordsFetched: 182,
    recordsParsed: 182,
    recordsMatched: 176,
    recordsUpdated: 168,
    message: null,
    startedAt: "2026-03-18T09:00:00+08:00",
    finishedAt: "2026-03-18T09:02:12+08:00"
  },
  {
    id: "sync-002",
    source: "data_gov_hk",
    runType: "school_master",
    status: "partial_success",
    recordsFetched: 1200,
    recordsParsed: 1195,
    recordsMatched: 1178,
    recordsUpdated: 43,
    message: "5 records missing district value",
    startedAt: "2026-03-17T03:00:00+08:00",
    finishedAt: "2026-03-17T03:08:40+08:00"
  },
  {
    id: "sync-003",
    source: "third_party",
    runType: "vacancy",
    status: "fail",
    recordsFetched: 0,
    recordsParsed: 0,
    recordsMatched: 0,
    recordsUpdated: 0,
    message: "source structure changed",
    startedAt: "2026-03-16T22:00:00+08:00",
    finishedAt: "2026-03-16T22:00:09+08:00"
  }
];

export const mockAliases: SchoolAliasItem[] = mockSchools.slice(0, 4).map((school, index) => ({
  id: `alias-00${index + 1}`,
  schoolId: school.id,
  schoolNameZh: school.nameZh,
  aliasName: school.nameEn ?? school.nameZh,
  normalizedAliasName: normalizeSchoolName(school.nameEn ?? school.nameZh),
  source: index % 2 === 0 ? "manual" : "edb",
  createdAt: now
}));

export const mockAdminVacancies: AdminVacancy[] = mockSchools.flatMap((school) =>
  school.vacancies.map((vacancy) => ({
    ...vacancy,
    schoolNameZh: school.nameZh,
    stage: school.stage,
    district: school.district,
    sourceUrl: null,
    effectiveDate: vacancy.updatedAt.slice(0, 10),
    adminNote: null
  }))
);

export const mockUnmatchedRecords: UnmatchedRecordItem[] = [
  {
    id: "unmatched-001",
    source: "edb",
    rawName: "ABC KG (分校)",
    normalizedName: normalizeSchoolName("ABC KG 分校"),
    stage: "kg",
    district: "九龍城",
    grade: "K1",
    suggestedSchoolId: mockSchools[0]?.id ?? null,
    suggestedSchoolName: mockSchools[0]?.nameZh ?? null,
    status: "pending",
    resolvedSchoolId: null,
    resolvedSchoolName: null,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "unmatched-002",
    source: "third_party",
    rawName: "Victoria Kinder Garden",
    normalizedName: normalizeSchoolName("Victoria Kinder Garden"),
    stage: "kg",
    district: "中西區",
    grade: "K2",
    suggestedSchoolId: mockSchools[3]?.id ?? null,
    suggestedSchoolName: mockSchools[3]?.nameZh ?? null,
    status: "pending",
    resolvedSchoolId: null,
    resolvedSchoolName: null,
    createdAt: now,
    updatedAt: now
  }
];
