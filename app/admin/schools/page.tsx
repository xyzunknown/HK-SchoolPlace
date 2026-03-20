import Link from "next/link";
import type { Route } from "next";
import { ensureAdminPageAccess } from "@/lib/admin-page";
import { listAdminSchools } from "@/lib/repositories/admin-repository";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSchoolsPage({ searchParams }: Props) {
  await ensureAdminPageAccess();

  const params = await searchParams;
  const keyword = single(params.keyword) ?? null;
  const district = single(params.district) ?? null;
  const stage = single(params.stage) ?? null;
  const isActive = parseActive(single(params.is_active) ?? null);

  const schools = await listAdminSchools({
    keyword,
    district,
    stage: parseStage(stage),
    isActive: isActive ?? undefined,
  });

  return (
    <main className="page-shell" style={{ paddingTop: "var(--sp-4)" }}>
      <section className="animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>後台 / 學校管理</p>
        <h1 style={{ fontSize: "var(--font-title)" }}>學校管理</h1>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <form className="admin-toolbar" method="get">
          <input className="input" name="keyword" defaultValue={keyword ?? ""} placeholder="搜尋學校名稱" />
          <input className="input" name="district" defaultValue={district ?? ""} placeholder="地區" />
          <div className="select-wrap">
            <select className="select" name="stage" defaultValue={stage ?? ""}>
              <option value="">全部學段</option>
              <option value="kg">幼稚園</option>
              <option value="primary">小學</option>
              <option value="secondary">中學</option>
            </select>
          </div>
          <div className="select-wrap">
            <select className="select" name="is_active" defaultValue={isActive === null ? "" : String(isActive)}>
              <option value="">全部狀態</option>
              <option value="true">展示中</option>
              <option value="false">隱藏</option>
            </select>
          </div>
          <button type="submit" className="btn-secondary">套用</button>
          <Link href="/admin/schools" className="btn-ghost">清除</Link>
        </form>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <div className="chip-group">
          <span className="chip active">共 {schools.length} 間</span>
          {keyword && <span className="chip">關鍵字：{keyword}</span>}
          {district && <span className="chip">地區：{district}</span>}
          {stage && <span className="chip">學段：{stageLabel(stage)}</span>}
          {isActive !== null && <span className="chip">狀態：{isActive ? "展示中" : "隱藏"}</span>}
        </div>
      </section>

      <section className="animate-slide-up" style={{ animationDelay: "80ms", marginTop: "var(--sp-5)" }}>
        <div className="admin-table-wrap glass-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>學校</th>
                <th>學段</th>
                <th>地區</th>
                <th>類型</th>
                <th>狀態</th>
                <th>最近更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school) => (
                <tr key={school.id}>
                  <td>
                    <Link href={`/admin/schools/${school.id}` as Route} className="primary-link">
                      <strong>{school.nameZh}</strong>
                    </Link>
                    {school.nameEn && (
                      <div className="text-muted" style={{ fontSize: "var(--font-small)" }}>
                        {school.nameEn}
                      </div>
                    )}
                  </td>
                  <td>{stageLabel(school.stage)}</td>
                  <td>{school.district}</td>
                  <td>{school.schoolType ?? "—"}</td>
                  <td>
                    <span className={`chip ${school.isActive ? "status-success" : "status-fail"}`}>
                      {school.isActive ? "展示中" : "隱藏"}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: "var(--font-small)" }}>
                    {school.latestUpdatedAt ? formatDateTime(school.latestUpdatedAt) : "—"}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <Link href={`/admin/schools/${school.id}` as Route} className="btn-secondary">
                        編輯
                      </Link>
                      <Link href={`/schools/${school.id}`} className="btn-ghost" target="_blank">
                        前台
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseActive(value: string | null) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function parseStage(value: string | null) {
  if (value === "kg" || value === "primary" || value === "secondary") {
    return value;
  }

  return undefined;
}

function stageLabel(stage: string) {
  switch (stage) {
    case "primary": return "小學";
    case "secondary": return "中學";
    default: return "幼稚園";
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
