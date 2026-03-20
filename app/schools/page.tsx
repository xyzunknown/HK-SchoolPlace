"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchSchools, fetchFilters, SchoolListResponse, SchoolListItemAPI } from "@/lib/api-client";
import { SchoolCard } from "@/components/school-card";
import { SearchBar } from "@/components/search-bar";
import { FilterChips } from "@/components/filter-chips";
import { SortSelect } from "@/components/sort-select";
import { Pagination } from "@/components/pagination";
import { SkeletonGrid } from "@/components/skeleton-card";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/lib/demo-auth";

const stageItems = [
  { value: "kg", label: "幼稚園" },
  { value: "primary", label: "小學" },
  { value: "secondary", label: "中學" },
] as const;

function SchoolListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const stage = searchParams.get("stage") || "kg";
  const keyword = searchParams.get("keyword") || "";
  const district = searchParams.get("district") || "";
  const schoolType = searchParams.get("school_type") || "";
  const sessionType = searchParams.get("session_type") || "";
  const hasVacancy = searchParams.get("has_vacancy") || "";
  const sort = searchParams.get("sort") || "recommended";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [data, setData] = useState<SchoolListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    districts: string[];
    schoolTypes: string[];
    sessionTypes: string[];
  }>({ districts: [], schoolTypes: [], sessionTypes: [] });

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset page to 1 when filters change (except when changing page itself)
      if (key !== "page") {
        params.set("page", "1");
      }
      router.push(`/schools?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Load filters
  useEffect(() => {
    fetchFilters(stage).then((res) => {
      setFilters(res.data);
    });
  }, [stage]);

  // Load schools
  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { stage, page: String(page), page_size: "12" };
    if (keyword) params.keyword = keyword;
    if (district) params.district = district;
    if (schoolType) params.school_type = schoolType;
    if (sessionType) params.session_type = sessionType;
    if (hasVacancy) params.has_vacancy = hasVacancy;
    if (sort) params.sort = sort;

    fetchSchools(params)
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, [stage, keyword, district, schoolType, sessionType, hasVacancy, sort, page, user?.id]);

  const filterGroups = [
    {
      key: "district",
      label: "地區",
      options: filters.districts.map((d) => ({ label: d, value: d })),
    },
    {
      key: "school_type",
      label: "類型",
      options: filters.schoolTypes.map((t) => ({ label: t, value: t })),
    },
    {
      key: "session_type",
      label: "時段",
      options: filters.sessionTypes.map((s) => ({ label: s, value: s })),
    },
    {
      key: "has_vacancy",
      label: "學位",
      options: [{ label: "只看有位", value: "true" }],
    },
  ];

  const activeFilters: Record<string, string> = {};
  if (district) activeFilters.district = district;
  if (schoolType) activeFilters.school_type = schoolType;
  if (sessionType) activeFilters.session_type = sessionType;
  if (hasVacancy) activeFilters.has_vacancy = hasVacancy;

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  const availableCount = data?.data.filter((school) => school.vacancy?.status === "available").length ?? 0;
  const staleCount = data?.data.filter((school) => school.vacancy?.isStale).length ?? 0;
  const hasQuery = Boolean(keyword || district || schoolType || sessionType || hasVacancy || sort !== "recommended");

  const clearFilters = useCallback(() => {
    router.push(`/schools?stage=${stage}`, { scroll: false });
  }, [router, stage]);

  return (
    <main className="page-shell">
      {/* Header */}
      <section className="hero animate-fade-in" style={{ paddingBottom: 0 }}>
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>學校列表</p>
        <h1>{stageLabel(stage)}</h1>
        <p className="text-muted" style={{ maxWidth: 640 }}>
          先看 vacancy，再按地區、類型和上課時段縮小範圍。
        </p>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-4)" }}>
        <div className="chip-group">
          {stageItems.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`chip ${stage === item.value ? "active" : ""}`}
              onClick={() => updateParam("stage", item.value)}
            >
              {item.label}
            </button>
          ))}
          {hasQuery ? (
            <button type="button" className="chip" onClick={clearFilters}>
              清除條件
            </button>
          ) : null}
        </div>
      </section>

      {/* Search + Sort bar */}
      <section className="list-toolbar animate-slide-up">
        <SearchBar value={keyword} onChange={(v) => updateParam("keyword", v)} />
        <SortSelect value={sort} onChange={(v) => updateParam("sort", v)} />
      </section>

      {/* Filter chips */}
      <section className="animate-slide-up" style={{ animationDelay: "60ms" }}>
        <FilterChips
          groups={filterGroups}
          activeFilters={activeFilters}
          onChange={updateParam}
        />
      </section>

      {/* Results count */}
      <section className="list-results-bar animate-fade-in">
        <p className="text-muted">
          {loading ? (
            "搜尋中..."
          ) : data ? (
            <>
              共 <strong style={{ color: "var(--text-primary)" }}>{data.pagination.total}</strong> 間{stageLabel(stage)}
              {activeFilterCount > 0 && (
                <span> · {activeFilterCount} 個篩選條件</span>
              )}
            </>
          ) : null}
        </p>
      </section>

      {!loading && data ? (
        <section className="admin-summary-grid animate-fade-in" style={{ marginTop: "var(--sp-4)" }}>
          <div className="glass-card admin-kpi-card">
            <span className="stat-number">{data.pagination.total}</span>
            <span className="text-muted">搜尋結果</span>
          </div>
          <div className="glass-card admin-kpi-card">
            <span className="stat-number">{availableCount}</span>
            <span className="text-muted">當前頁有位</span>
          </div>
          <div className="glass-card admin-kpi-card">
            <span className="stat-number">{staleCount}</span>
            <span className="text-muted">當前頁較舊數據</span>
          </div>
        </section>
      ) : null}

      {/* School list */}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : data && data.data.length > 0 ? (
        <>
          <section className="school-grid stagger">
            {data.data.map((school: SchoolListItemAPI, i: number) => (
              <SchoolCard key={school.id} school={school} index={i} />
            ))}
          </section>
          <section style={{ marginTop: "var(--sp-8)", display: "flex", justifyContent: "center" }}>
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.total_pages}
              onChange={(p) => updateParam("page", String(p))}
            />
          </section>
        </>
      ) : (
        <EmptyState
          icon="🔍"
          title="未搵到符合條件嘅學校"
          description="試下調整篩選條件或清除搜尋關鍵字"
          actionLabel={hasQuery ? "清除篩選" : "返回首頁"}
          actionHref={hasQuery ? undefined : "/"}
          onAction={hasQuery ? clearFilters : undefined}
        />
      )}
    </main>
  );
}

export default function SchoolsPage() {
  return (
    <Suspense fallback={
      <main className="page-shell">
        <section className="hero animate-fade-in">
          <p className="card-eyebrow" style={{ color: "var(--primary)" }}>學校列表</p>
          <h1>幼稚園</h1>
        </section>
        <SkeletonGrid count={6} />
      </main>
    }>
      <SchoolListContent />
    </Suspense>
  );
}

function stageLabel(stage: string) {
  switch (stage) {
    case "primary": return "小學";
    case "secondary": return "中學";
    case "kg":
    default: return "幼稚園";
  }
}
