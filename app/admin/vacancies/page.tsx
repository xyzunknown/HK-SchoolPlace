import Link from "next/link";
import type { Route } from "next";

import { VacancyManager } from "@/components/admin/vacancy-manager";
import { EmptyState } from "@/components/empty-state";
import { ensureAdminPageAccess } from "@/lib/admin-page";
import { listAdminSchoolOptions, listAdminVacancies } from "@/lib/repositories/admin-repository";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statusItems = [
  { value: "all", label: "全部" },
  { value: "available", label: "有位" },
  { value: "waiting", label: "候補" },
  { value: "full", label: "滿額" },
  { value: "unknown", label: "未知" },
] as const;

const staleItems = [
  { value: "all", label: "全部新鮮度" },
  { value: "false", label: "最新" },
  { value: "true", label: "Stale" },
] as const;

export default async function AdminVacanciesPage({ searchParams }: Props) {
  await ensureAdminPageAccess();

  const params = await searchParams;
  const schoolId = single(params.school_id) ?? "";
  const status = parseStatus(single(params.status) ?? null);
  const stale = parseStale(single(params.is_stale) ?? null);

  const [vacancies, schoolOptions] = await Promise.all([
    listAdminVacancies({
      schoolId: schoolId || null,
      status: status === "all" ? null : status,
      isStale: stale ?? undefined,
    }),
    listAdminSchoolOptions(),
  ]);

  const staleCount = vacancies.filter((item) => item.isStale).length;
  const actionableCount = vacancies.filter((item) => item.status === "waiting" || item.isStale).length;

  return (
    <main className="page-shell" style={{ paddingTop: "var(--sp-4)" }}>
      <section className="animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>後台 / Vacancy 管理</p>
        <h1 style={{ fontSize: "var(--font-title)" }}>Vacancy 管理</h1>
        <p className="text-muted">集中處理學位記錄、stale 狀態與人工備註，支援同步後快速覆核。</p>
      </section>

      <section className="admin-summary-grid animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <div className="glass-card admin-kpi-card">
          <span className="stat-number">{vacancies.length}</span>
          <span className="text-muted">符合條件記錄</span>
        </div>
        <div className="glass-card admin-kpi-card">
          <span className="stat-number">{staleCount}</span>
          <span className="text-muted">Stale 記錄</span>
        </div>
        <div className="glass-card admin-kpi-card">
          <span className="stat-number">{actionableCount}</span>
          <span className="text-muted">待關注項目</span>
        </div>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <form className="admin-toolbar" method="get">
          <div className="select-wrap">
            <select className="select" name="school_id" defaultValue={schoolId}>
              <option value="">全部學校</option>
              {schoolOptions.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.nameZh} · {school.district}
                </option>
              ))}
            </select>
          </div>

          <div className="chip-group">
            {statusItems.map((item) => (
              <label key={item.value} className={`chip ${status === item.value ? "active" : ""}`}>
                <input
                  className="visually-hidden"
                  type="radio"
                  name="status"
                  value={item.value}
                  defaultChecked={status === item.value}
                />
                {item.label}
              </label>
            ))}
          </div>

          <div className="chip-group">
            {staleItems.map((item) => (
              <label key={item.value} className={`chip ${String(stale) === item.value || (stale === null && item.value === "all") ? "active" : ""}`}>
                <input
                  className="visually-hidden"
                  type="radio"
                  name="is_stale"
                  value={item.value}
                  defaultChecked={String(stale) === item.value || (stale === null && item.value === "all")}
                />
                {item.label}
              </label>
            ))}
          </div>

          <button type="submit" className="btn-secondary">套用篩選</button>
          <Link href={"/admin/vacancies" as Route} className="btn-ghost">清除</Link>
        </form>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <div className="chip-group">
          <span className="chip active">記錄 {vacancies.length} 條</span>
          {schoolId ? <span className="chip">已限制單一學校</span> : null}
          {status !== "all" ? <span className="chip">狀態：{status}</span> : null}
          {stale !== null ? <span className="chip">stale：{stale ? "true" : "false"}</span> : null}
        </div>
      </section>

      <section className="animate-slide-up" style={{ animationDelay: "80ms", marginTop: "var(--sp-5)" }}>
        {vacancies.length === 0 ? (
          <EmptyState
            icon="📭"
            title="目前沒有符合條件的 vacancy"
            description="可調整篩選條件，或等待下一輪同步寫入新的學位記錄。"
          />
        ) : (
          <VacancyManager vacancies={vacancies} />
        )}
      </section>
    </main>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | null) {
  if (value === "available" || value === "waiting" || value === "full" || value === "unknown") {
    return value;
  }

  return "all";
}

function parseStale(value: string | null) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}
