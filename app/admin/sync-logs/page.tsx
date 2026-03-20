import Link from "next/link";
import type { Route } from "next";
import { ensureAdminPageAccess } from "@/lib/admin-page";
import { listSyncLogs } from "@/lib/repositories/admin-repository";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSyncLogsPage({ searchParams }: Props) {
  await ensureAdminPageAccess();

  const params = await searchParams;
  const status = single(params.status) ?? null;
  const source = single(params.source) ?? null;
  const logs = await listSyncLogs({
    status: parseStatus(status),
    source,
  });
  const sources = Array.from(new Set(logs.map((log) => log.source))).sort((left, right) =>
    left.localeCompare(right, "zh-HK")
  );
  const failedCount = logs.filter((log) => log.status === "fail").length;
  const partialCount = logs.filter((log) => log.status === "partial_success").length;

  return (
    <main className="page-shell" style={{ paddingTop: "var(--sp-4)" }}>
      <section className="animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>後台 / 同步日誌</p>
        <h1 style={{ fontSize: "var(--font-title)" }}>同步日誌</h1>
        <p className="text-muted">查看數據源運行狀態、抓取數量和失敗信息</p>
      </section>

      <section className="admin-summary-grid animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <div className="glass-card admin-kpi-card">
          <span className="stat-number">{logs.length}</span>
          <span className="text-muted">符合條件日誌</span>
        </div>
        <div className="glass-card admin-kpi-card">
          <span className="stat-number">{failedCount}</span>
          <span className="text-muted">失敗</span>
        </div>
        <div className="glass-card admin-kpi-card">
          <span className="stat-number">{partialCount}</span>
          <span className="text-muted">部分成功</span>
        </div>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <form className="admin-toolbar" method="get">
          <div className="chip-group">
            {[
              { value: "", label: "全部狀態" },
              { value: "success", label: "成功" },
              { value: "partial_success", label: "部分成功" },
              { value: "fail", label: "失敗" },
              { value: "running", label: "運行中" },
            ].map((item) => (
              <label key={item.value || "all"} className={`chip ${(status ?? "") === item.value ? "active" : ""}`}>
                <input
                  className="visually-hidden"
                  type="radio"
                  name="status"
                  value={item.value}
                  defaultChecked={(status ?? "") === item.value}
                />
                {item.label}
              </label>
            ))}
          </div>

          <div className="select-wrap">
            <select className="select" name="source" defaultValue={source ?? ""}>
              <option value="">全部來源</option>
              {sources.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-secondary">套用篩選</button>
          <Link href="/admin/sync-logs" className="btn-ghost">清除</Link>
        </form>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <div className="chip-group">
          <span className="chip active">最近 {logs.length} 條</span>
          {status ? <span className="chip">狀態：{statusLabel(status)}</span> : null}
          {source ? <span className="chip">來源：{source}</span> : null}
        </div>
      </section>

      <section className="animate-slide-up" style={{ animationDelay: "80ms", marginTop: "var(--sp-5)" }}>
        <div className="school-grid stagger">
          {logs.map((log) => (
            <article key={log.id} className="glass-card school-card animate-slide-up">
              <div className="card-top">
                <div>
                  <p className="card-eyebrow">{log.source}</p>
                  <h3>{log.runType}</h3>
                </div>
                <span className={`chip ${statusClass(log.status)}`}>
                  {statusLabel(log.status)}
                </span>
              </div>
              <div className="card-meta" style={{ marginTop: "var(--sp-3)" }}>
                <span className="chip">抓取 {log.recordsFetched}</span>
                <span className="chip">解析 {log.recordsParsed}</span>
                <span className="chip">匹配 {log.recordsMatched}</span>
                <span className="chip">更新 {log.recordsUpdated}</span>
              </div>
              <div style={{ marginTop: "var(--sp-3)" }}>
                <p className="text-muted" style={{ fontSize: "var(--font-small)" }}>
                  開始於 {formatDateTime(log.startedAt)}
                </p>
                <p className="text-muted" style={{ fontSize: "var(--font-small)" }}>
                  {log.finishedAt ? `結束於 ${formatDateTime(log.finishedAt)}` : "仍在運行..."}
                </p>
              </div>
              {log.message ? (
                <div style={{ marginTop: "var(--sp-2)" }}>
                  <p className="text-muted" style={{ fontSize: "var(--font-small)", color: "var(--vacancy-waiting)" }}>
                    {log.message}
                  </p>
                  {(log.status === "fail" || log.status === "partial_success") && (
                    <div className="admin-actions" style={{ marginTop: "var(--sp-2)" }}>
                      <Link href="/admin/unmatched-records?status=pending" className="btn-ghost">
                        查看 unmatched
                      </Link>
                      <Link href={"/admin/vacancies?is_stale=true" as Route} className="btn-ghost">
                        查看 stale vacancy
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-faint" style={{ fontSize: "var(--font-small)", marginTop: "var(--sp-2)" }}>
                  本次無錯誤信息
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | null) {
  if (value === "running" || value === "success" || value === "partial_success" || value === "fail") {
    return value;
  }

  return null;
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
