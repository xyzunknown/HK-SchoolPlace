"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchComparisons, removeComparison, SchoolListItemAPI } from "@/lib/api-client";
import { VacancyBadge } from "@/components/vacancy-badge";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-card";
import { LoginModal } from "@/components/login-modal";
import { showToast } from "@/components/toast";
import { useAuth } from "@/lib/demo-auth";

export default function ComparePage() {
  const [schools, setSchools] = useState<SchoolListItemAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setSchools([]);
      setErrorMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    fetchComparisons()
      .then((res) => {
        if (res?.error?.code === "UNAUTHORIZED") {
          setSchools([]);
          setErrorMessage(null);
          return;
        }

        if (res?.error) {
          setSchools([]);
          setErrorMessage("暫時未能載入你嘅對比資料，請稍後再試。");
          return;
        }

        setSchools(res.data ?? []);
        setErrorMessage(null);
      })
      .catch(() => {
        setSchools([]);
        setErrorMessage("暫時未能載入你嘅對比資料，請稍後再試。");
      })
      .finally(() => setLoading(false));
  }, [authLoading, reloadKey, user]);

  const handleRemove = async (schoolId: string) => {
    try {
      const result = await removeComparison(schoolId);
      if (result?.error?.code === "UNAUTHORIZED") {
        setLoginOpen(true);
        return;
      }
      if (result?.error) {
        showToast("移除對比失敗，請稍後再試", "error");
        return;
      }
      setSchools((prev) => prev.filter((s) => s.id !== schoolId));
      showToast("已移除對比", "info");
    } catch {
      showToast("移除對比失敗，請稍後再試", "error");
    }
  };

  if (loading || authLoading) {
    return (
      <main className="page-shell">
        <section className="hero animate-fade-in">
          <p className="card-eyebrow" style={{ color: "var(--primary)" }}>學校對比</p>
          <h1>對比學校</h1>
        </section>
        <SkeletonGrid count={3} />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page-shell">
        <section className="hero animate-fade-in">
          <p className="card-eyebrow" style={{ color: "var(--primary)" }}>學校對比</p>
          <h1>對比學校</h1>
        </section>
        <EmptyState
          icon="🔐"
          title="登入後先可以查看對比列表"
          description="登入後可保存你加入對比嘅學校，方便之後繼續比較"
          actionLabel="立即登入"
          actionHref="#login"
          onAction={() => setLoginOpen(true)}
        />
        <LoginModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onLoginSuccess={() => setLoginOpen(false)}
        />
      </main>
    );
  }

  if (schools.length === 0) {
    if (errorMessage) {
      return (
        <main className="page-shell">
          <section className="hero animate-fade-in">
            <p className="card-eyebrow" style={{ color: "var(--primary)" }}>學校對比</p>
            <h1>對比學校</h1>
          </section>
          <EmptyState
            icon="⚠️"
            title="暫時未能載入對比"
            description={errorMessage}
            actionLabel="重新載入"
            onAction={() => setReloadKey((value) => value + 1)}
          />
        </main>
      );
    }

    return (
      <main className="page-shell">
        <section className="hero animate-fade-in">
          <p className="card-eyebrow" style={{ color: "var(--primary)" }}>學校對比</p>
          <h1>對比學校</h1>
        </section>
        <EmptyState
          icon="📊"
          title="仲未有加入對比嘅學校"
          description="喺學校列表點擊對比按鈕，最多可以加入 5 間學校進行對比"
          actionLabel="瀏覽學校列表"
          actionHref="/schools?stage=kg"
        />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>學校對比</p>
        <h1>對比學校</h1>
        <p className="text-muted">
          已加入 {schools.length}/5 間學校
        </p>
      </section>

      {/* Mobile card view & desktop table */}
      {/* Cards for mobile */}
      <section className="compare-cards-mobile animate-slide-up">
        {schools.map((school, index) => (
          <article
            key={school.id}
            className="glass-card school-card animate-slide-up"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="card-top">
              <div className="card-info">
                <p className="card-eyebrow">{school.district}</p>
                <h3>{school.nameZh}</h3>
              </div>
              {school.vacancy && (
                <div className="vacancy-panel">
                  <VacancyBadge status={school.vacancy.status} />
                  <strong className="vacancy-count">
                    {school.vacancy.count ?? "—"}
                  </strong>
                </div>
              )}
            </div>
            <div className="card-meta">
              {school.schoolType && <span className="chip">{school.schoolType}</span>}
              {school.sessionType && <span className="chip">{school.sessionType}</span>}
            </div>
            <div className="card-actions">
              <button
                type="button"
                className="btn-ghost btn-danger-text"
                onClick={() => handleRemove(school.id)}
              >
                移除
              </button>
              <Link href={`/schools/${school.id}`} className="btn-primary card-detail-btn">
                查看詳情
              </Link>
            </div>
          </article>
        ))}
      </section>

      {/* Desktop comparison table */}
      <section className="compare-table-section animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="compare-table-wrap">
          <table className="admin-table compare-table">
            <thead>
              <tr>
                <th>學校</th>
                <th>地區</th>
                <th>類型</th>
                <th>時段</th>
                <th>學位狀態</th>
                <th>學位數量</th>
                <th>更新時間</th>
                <th style={{ width: 100 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school) => (
                <tr key={school.id}>
                  <td>
                    <Link href={`/schools/${school.id}`} className="primary-link">
                      <strong>{school.nameZh}</strong>
                    </Link>
                    {school.nameEn && (
                      <div className="text-muted" style={{ fontSize: "var(--font-small)" }}>
                        {school.nameEn}
                      </div>
                    )}
                  </td>
                  <td>{school.district}</td>
                  <td>{school.schoolType ?? "—"}</td>
                  <td>{school.sessionType ?? "—"}</td>
                  <td>
                    {school.vacancy ? (
                      <VacancyBadge status={school.vacancy.status} size="small" />
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td>
                    <strong>
                      {school.vacancy?.count !== null && school.vacancy?.count !== undefined
                        ? school.vacancy.count
                        : "—"}
                    </strong>
                  </td>
                  <td className="text-muted" style={{ fontSize: "var(--font-small)" }}>
                    {school.vacancy?.updatedAt
                      ? formatHongKongDate(school.vacancy.updatedAt)
                      : "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost btn-danger-text"
                      onClick={() => handleRemove(school.id)}
                      style={{ fontSize: "var(--font-small)" }}
                    >
                      移除
                    </button>
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

function formatHongKongDate(value: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
