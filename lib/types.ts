export type Stage = "kg" | "primary" | "secondary";

export type VacancyStatus = "available" | "waiting" | "full" | "unknown";

export type Vacancy = {
  id: string;
  schoolId: string;
  grade: string;
  status: VacancyStatus;
  count: number | null;
  updatedAt: string;
  isStale: boolean;
  source: string;
};

export type School = {
  id: string;
  nameZh: string;
  nameEn: string | null;
  stage: Stage;
  district: string;
  schoolType: string | null;
  sessionType: string | null;
  schoolNet: string | null;
  band: string | null;
  addressZh: string | null;
  addressEn?: string | null;
  phone: string | null;
  website: string | null;
  tuitionFee: number | null;
  curriculum?: string | null;
  isSchemeParticipant: boolean | null;
  vacancies: Vacancy[];
};

export type SchoolListItem = {
  id: string;
  nameZh: string;
  nameEn: string | null;
  stage: Stage;
  district: string;
  schoolType: string | null;
  sessionType: string | null;
  schoolNet: string | null;
  band: string | null;
  vacancy: Vacancy | null;
};

export type AdminSchoolListItem = SchoolListItem & {
  isActive: boolean;
  latestUpdatedAt: string | null;
};

export type AdminSchoolDetail = School & {
  isActive: boolean;
  latestUpdatedAt: string | null;
};

export type AdminSchoolOption = {
  id: string;
  nameZh: string;
  stage: Stage;
  district: string;
};

export type AdminVacancy = Vacancy & {
  schoolNameZh: string;
  stage: Stage;
  district: string;
  sourceUrl: string | null;
  effectiveDate: string | null;
  adminNote: string | null;
};

export type SchoolAliasItem = {
  id: string;
  schoolId: string;
  schoolNameZh: string;
  aliasName: string;
  normalizedAliasName: string;
  source: string;
  createdAt: string;
};

export type SyncLogItem = {
  id: string;
  source: string;
  runType: string;
  status: "running" | "success" | "partial_success" | "fail";
  recordsFetched: number;
  recordsParsed: number;
  recordsMatched: number;
  recordsUpdated: number;
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type UnmatchedRecordStatus = "pending" | "resolved" | "ignored";

export type UnmatchedRecordItem = {
  id: string;
  source: string;
  rawName: string;
  normalizedName: string;
  stage: Stage;
  district: string | null;
  grade: string | null;
  suggestedSchoolId: string | null;
  suggestedSchoolName: string | null;
  status: UnmatchedRecordStatus;
  resolvedSchoolId: string | null;
  resolvedSchoolName: string | null;
  createdAt: string;
  updatedAt: string;
};
