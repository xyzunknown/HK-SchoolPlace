import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getRequestUserContext } from "@/lib/auth";
import { getSchoolUserState } from "@/lib/repositories/school-repository";
import { getSchoolById } from "@/lib/schools";
import { VacancyBadge } from "@/components/vacancy-badge";
import { SchoolDetailActions } from "./detail-actions";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const school = await getSchoolById(id);
  if (!school) return {};
  return {
    title: `${school.nameZh} — 學位空缺`,
    description: `查看${school.nameZh}嘅最新學位空缺資訊、學校資料同聯絡方式。`,
  };
}

export default async function SchoolDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getRequestUserContext();
  const school = await getSchoolById(id);

  if (!school) {
    notFound();
  }

  const userState = await getSchoolUserState(id, {
    userId: user.userId,
    accessToken: user.accessToken
  });

  const primaryVacancy = school.vacancies[0] ?? null;

  return (
    <main className="page-shell">
      {/* Breadcrumb */}
      <nav className="animate-fade-in" style={{ marginBottom: "var(--sp-4)" }}>
        <Link href={`/schools?stage=${school.stage}`} className="primary-link" style={{ fontSize: "var(--font-meta)" }}>
          ← 返回{stageLabel(school.stage)}列表
        </Link>
      </nav>

      {/* School header */}
      <section className="animate-slide-up">
        <div className="glass-card" style={{ padding: "var(--sp-8)" }}>
          <p className="card-eyebrow" style={{ color: "var(--primary)" }}>
            {stageLabel(school.stage)} · {school.district}
          </p>
          <h1 style={{ fontSize: "var(--font-title)", margin: "var(--sp-2) 0" }}>
            {school.nameZh}
          </h1>
          {school.nameEn && (
            <p className="text-muted" style={{ fontSize: "var(--font-body)" }}>
              {school.nameEn}
            </p>
          )}

          {/* Action buttons — client component */}
          <SchoolDetailActions
            schoolId={school.id}
            initialFavorited={userState.isFavorited}
            initialInComparison={userState.isInComparison}
          />
        </div>
      </section>

      <section className="animate-slide-up" style={{ animationDelay: "40ms", marginTop: "var(--sp-5)" }}>
        <div className="detail-summary-grid">
          <div className="glass-card detail-summary-card">
            <span className="card-eyebrow">最新更新</span>
            <strong>{primaryVacancy ? formatHongKongDate(primaryVacancy.updatedAt) : "暫無記錄"}</strong>
            <span className="text-muted">依最新 vacancy 記錄顯示</span>
          </div>
          <div className="glass-card detail-summary-card">
            <span className="card-eyebrow">學位追蹤</span>
            <strong>{school.vacancies.length} 個年級</strong>
            <span className="text-muted">
              {school.vacancies.some((vacancy) => vacancy.isStale)
                ? "部分數據較舊，建議同時留意更新日期"
                : "目前顯示的是最新同步結果"}
            </span>
          </div>
          <div className="glass-card detail-summary-card">
            <span className="card-eyebrow">快速聯絡</span>
            <div className="detail-link-group">
              {school.phone ? (
                <a href={`tel:${school.phone}`} className="btn-secondary">
                  致電學校
                </a>
              ) : null}
              {school.website ? (
                <a href={school.website} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  官方網站 ↗
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Vacancy Hero */}
      {school.vacancies.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: "80ms", marginTop: "var(--sp-5)" }}>
          <div className="section-header">
            <h2>學位空缺</h2>
          </div>
          <div className="vacancy-hero-grid">
            {school.vacancies.map((vacancy) => (
              <div
                key={vacancy.id}
                className={`glass-card detail-vacancy-hero vacancy-hero-${vacancy.status}`}
              >
                <VacancyBadge status={vacancy.status} size="large" />
                <div className="vacancy-number">
                  {vacancy.count !== null ? vacancy.count : "—"}
                </div>
                <div className="vacancy-label">
                  {vacancy.grade} {vacancy.count !== null ? "個學位" : ""}
                </div>
                <p className="text-muted" style={{ fontSize: "var(--font-small)", marginTop: "var(--sp-2)" }}>
                  更新於 {formatHongKongDate(vacancy.updatedAt)}
                </p>
                {vacancy.isStale && (
                  <p style={{ fontSize: "var(--font-small)", color: "var(--vacancy-waiting)", marginTop: "var(--sp-1)" }}>
                    ⚠ 數據可能較舊，僅供參考
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* School info grid */}
      <section className="animate-slide-up" style={{ animationDelay: "160ms", marginTop: "var(--sp-5)" }}>
        <div className="section-header">
          <h2>學校資料</h2>
        </div>
        <div className="glass-card" style={{ padding: "var(--sp-6)" }}>
          <dl className="detail-kv">
            <div>
              <dt>學段</dt>
              <dd>{stageLabel(school.stage)}</dd>
            </div>
            <div>
              <dt>地區</dt>
              <dd>{school.district}</dd>
            </div>
            <div>
              <dt>類型</dt>
              <dd>{school.schoolType ?? "—"}</dd>
            </div>
            <div>
              <dt>時段</dt>
              <dd>{school.sessionType ?? "—"}</dd>
            </div>
            <div>
              <dt>學費</dt>
              <dd>
                {school.tuitionFee !== null
                  ? school.tuitionFee === 0
                    ? "免費（幼稚園教育計劃）"
                    : `HK$ ${school.tuitionFee.toLocaleString()} / 年`
                  : "—"
                }
              </dd>
            </div>
            <div>
              <dt>參加幼稚園教育計劃</dt>
              <dd>
                {school.isSchemeParticipant === true
                  ? "✓ 已參加"
                  : school.isSchemeParticipant === false
                  ? "✕ 未參加"
                  : "—"
                }
              </dd>
            </div>
            <div>
              <dt>地址</dt>
              <dd>{school.addressZh ?? "—"}</dd>
            </div>
            <div>
              <dt>電話</dt>
              <dd>
                {school.phone ? (
                  <a href={`tel:${school.phone}`} className="primary-link">
                    {school.phone}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {school.website && (
              <div>
                <dt>官方網站</dt>
                <dd>
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-link"
                  >
                    前往官網 ↗
                  </a>
                </dd>
              </div>
            )}
            {school.schoolNet && (
              <div>
                <dt>校網</dt>
                <dd>{school.schoolNet}</dd>
              </div>
            )}
            {school.band && (
              <div>
                <dt>Band</dt>
                <dd>Band {school.band}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* Data source notice */}
      <section className="animate-fade-in" style={{ animationDelay: "240ms", marginTop: "var(--sp-5)" }}>
        <p className="text-faint" style={{ fontSize: "var(--font-small)", textAlign: "center" }}>
          數據來源：教育局 · 學校官網 · 自動抓取 · 僅供參考
        </p>
      </section>
    </main>
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

function formatHongKongDate(value: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
