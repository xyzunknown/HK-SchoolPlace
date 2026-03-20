"use client";

import Link from "next/link";
import { SchoolListItemAPI } from "@/lib/api-client";
import { VacancyBadge } from "@/components/vacancy-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { CompareButton } from "@/components/compare-button";

type Props = {
  school: SchoolListItemAPI;
  index?: number;
};

export function SchoolCard({ school, index = 0 }: Props) {
  const vacancy = school.vacancy;

  return (
    <article
      className="glass-card school-card animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      <Link href={`/schools/${school.id}`} className="card-link">
        <div className="card-top">
          <div className="card-info">
            <p className="card-eyebrow">{stageLabel(school.stage)} · {school.district}</p>
            <h3>{school.nameZh}</h3>
            {school.nameEn && <p className="text-muted card-name-en">{school.nameEn}</p>}
          </div>
          {vacancy ? (
            <div className="vacancy-panel">
              <VacancyBadge status={vacancy.status} />
              <strong className="vacancy-count">
                {vacancy.count !== null ? vacancy.count : "—"}
              </strong>
              <span className="vacancy-meta">
                {vacancy.count !== null ? "個學位" : vacancy.status === "available" ? "有位" : ""}
              </span>
            </div>
          ) : (
            <div className="vacancy-panel">
              <VacancyBadge status="unknown" />
              <strong className="vacancy-count">—</strong>
              <span className="vacancy-meta">暫無數據</span>
            </div>
          )}
        </div>

        <div className="card-meta">
          {school.schoolType && <span className="chip">{school.schoolType}</span>}
          {school.sessionType && <span className="chip">{school.sessionType}</span>}
          {school.schoolNet && <span className="chip">校網 {school.schoolNet}</span>}
          {school.band && <span className="chip">Band {school.band}</span>}
          {vacancy?.isStale && (
            <span className="chip" style={{ color: "var(--vacancy-waiting)", borderColor: "var(--vacancy-waiting)" }}>
              數據較舊
            </span>
          )}
        </div>
      </Link>

      <div className="card-actions">
        <FavoriteButton schoolId={school.id} initialFavorited={school.isFavorited} />
        <CompareButton schoolId={school.id} initialInComparison={school.isInComparison} />
        <Link href={`/schools/${school.id}`} className="btn-primary card-detail-btn">
          查看詳情
        </Link>
      </div>
    </article>
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
