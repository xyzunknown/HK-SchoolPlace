import Link from "next/link";
import type { Route } from "next";
import { ensureAdminPageAccess } from "@/lib/admin-page";
import {
  listAdminSchools,
  listAdminVacancies,
  listSyncLogs,
  listUnmatchedRecords
} from "@/lib/repositories/admin-repository";

export default async function AdminPage() {
  await ensureAdminPageAccess();

  const [schools, logs, pendingUnmatched, staleVacancies] = await Promise.all([
    listAdminSchools({}),
    listSyncLogs(),
    listUnmatchedRecords({ status: "pending" }),
    listAdminVacancies({ isStale: true }),
  ]);

  const activeSchools = schools.filter((s) => s.isActive).length;
  const latestLog = logs[0];
  const successLogs = logs.filter((l) => l.status === "success").length;
  const failedLogs = logs.filter((l) => l.status === "fail" || l.status === "partial_success").length;

  return (
    <main className="page-shell" style={{ paddingTop: "var(--sp-4)" }}>
      <section className="animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>後台管理</p>
        <h1 style={{ fontSize: "var(--font-title)" }}>總覽</h1>
        <p className="text-muted">管理學校主資料、未匹配記錄與同步結果。</p>
      </section>

      {/* Stats cards */}
      <section className="stats-grid animate-slide-up" style={{ marginTop: "var(--sp-6)" }}>
        <div className="glass-card stat-card">
          <span className="stat-number">{schools.length}</span>
          <span className="text-muted">總學校數</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-number">{activeSchools}</span>
          <span className="text-muted">展示中</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-number">{logs.length}</span>
          <span className="text-muted">同步記錄</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-number">{successLogs}</span>
          <span className="text-muted">成功同步</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-number">{pendingUnmatched.length}</span>
          <span className="text-muted">待處理 unmatched</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-number">{staleVacancies.length}</span>
          <span className="text-muted">Stale vacancy</span>
        </div>
      </section>

      {/* Quick access */}
      <section className="animate-slide-up" style={{ animationDelay: "100ms", marginTop: "var(--sp-8)" }}>
        <div className="section-header">
          <h2>快速入口</h2>
        </div>
        <div className="school-grid" style={{ marginTop: "var(--sp-4)" }}>
          <Link href="/admin/schools" className="glass-card admin-module-card">
            <span className="admin-module-icon">🏫</span>
            <h3>學校管理</h3>
            <p className="text-muted">查看學校主數據、展示狀態和核心資料。</p>
          </Link>
          <Link href="/admin/unmatched-records" className="glass-card admin-module-card">
            <span className="admin-module-icon">🧩</span>
            <h3>未匹配記錄</h3>
            <p className="text-muted">查看待處理 unmatched records，並直接 resolve / ignore。</p>
          </Link>
          <Link href={"/admin/vacancies" as Route} className="glass-card admin-module-card">
            <span className="admin-module-icon">📌</span>
            <h3>Vacancy 管理</h3>
            <p className="text-muted">查看 stale 狀態、人工備註與同步後需要覆核的學位記錄。</p>
          </Link>
          <Link href="/admin/aliases" className="glass-card admin-module-card">
            <span className="admin-module-icon">🔗</span>
            <h3>Alias 管理</h3>
            <p className="text-muted">建立與維護別名，減少下次同步的未匹配項目。</p>
          </Link>
          <Link href="/admin/sync-logs" className="glass-card admin-module-card">
            <span className="admin-module-icon">🔄</span>
            <h3>同步日誌</h3>
            <p className="text-muted">查看數據源運行狀態、抓取數量和失敗信息。</p>
          </Link>
        </div>
      </section>

      {/* Latest sync */}
      {latestLog && (
        <section className="animate-slide-up" style={{ animationDelay: "200ms", marginTop: "var(--sp-8)" }}>
          <div className="section-header">
            <h2>最近同步</h2>
          </div>
          <div className="glass-card" style={{ padding: "var(--sp-6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--sp-3)" }}>
              <div>
                <p style={{ fontWeight: 600 }}>{latestLog.source} · {latestLog.runType}</p>
                <p className="text-muted" style={{ fontSize: "var(--font-small)" }}>
                  {formatDateTime(latestLog.startedAt)}
                </p>
              </div>
              <span className={`chip ${statusClass(latestLog.status)}`}>
                {statusLabel(latestLog.status)}
              </span>
            </div>
            <div className="card-meta" style={{ marginTop: "var(--sp-3)" }}>
              <span className="chip">抓取 {latestLog.recordsFetched}</span>
              <span className="chip">解析 {latestLog.recordsParsed}</span>
              <span className="chip">匹配 {latestLog.recordsMatched}</span>
              <span className="chip">更新 {latestLog.recordsUpdated}</span>
            </div>
          </div>
        </section>
      )}

      <section className="animate-slide-up" style={{ animationDelay: "260ms", marginTop: "var(--sp-8)" }}>
        <div className="section-header">
          <h2>待處理重點</h2>
        </div>
        <div className="admin-summary-grid">
          <Link href="/admin/unmatched-records?status=pending" className="glass-card admin-summary-card">
            <strong>{pendingUnmatched.length} 條 unmatched 待處理</strong>
            <p className="text-muted">優先處理 pending 項目，減少下一輪同步反覆卡住。</p>
          </Link>
          <Link href={"/admin/vacancies?is_stale=true" as Route} className="glass-card admin-summary-card">
            <strong>{staleVacancies.length} 條 stale vacancy</strong>
            <p className="text-muted">建議先檢查來源是否過期，必要時補註記或重跑同步。</p>
          </Link>
          <Link href="/admin/sync-logs?status=fail" className="glass-card admin-summary-card">
            <strong>{failedLogs} 條失敗 / 部分成功日誌</strong>
            <p className="text-muted">直接跳到同步日誌排查失敗原因與最新運行結果。</p>
          </Link>
        </div>
      </section>
    </main>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "success": return "成功";
    case "partial_success": return "部分成功";
    case "fail": return "失敗";
    case "running": return "運行中";
    default: return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "success": return "status-success";
    case "partial_success": return "status-partial";
    case "fail": return "status-fail";
    default: return "status-running";
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
