"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchFavorites, removeFavorite, SchoolListItemAPI } from "@/lib/api-client";
import { VacancyBadge } from "@/components/vacancy-badge";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-card";
import { LoginModal } from "@/components/login-modal";
import { showToast } from "@/components/toast";
import { useAuth } from "@/lib/demo-auth";

export default function FavoritesPage() {
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
    fetchFavorites()
      .then((res) => {
        if (res?.error?.code === "UNAUTHORIZED") {
          setSchools([]);
          setErrorMessage(null);
          return;
        }

        if (res?.error) {
          setSchools([]);
          setErrorMessage("暫時未能載入你嘅收藏資料，請稍後再試。");
          return;
        }

        setSchools(res.data ?? []);
        setErrorMessage(null);
      })
      .catch(() => {
        setSchools([]);
        setErrorMessage("暫時未能載入你嘅收藏資料，請稍後再試。");
      })
      .finally(() => setLoading(false));
  }, [authLoading, reloadKey, user]);

  const handleRemove = async (schoolId: string) => {
    try {
      const result = await removeFavorite(schoolId);
      if (result?.error?.code === "UNAUTHORIZED") {
        setLoginOpen(true);
        return;
      }
      if (result?.error) {
        showToast("取消收藏失敗，請稍後再試", "error");
        return;
      }
      setSchools((prev) => prev.filter((s) => s.id !== schoolId));
      showToast("已取消收藏", "info");
    } catch {
      showToast("取消收藏失敗，請稍後再試", "error");
    }
  };

  return (
    <main className="page-shell">
      <section className="hero animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>我的收藏</p>
        <h1>收藏嘅學校</h1>
        <p className="text-muted">喺學校列表或詳情頁面點擊愛心即可收藏</p>
      </section>

      {loading || authLoading ? (
        <SkeletonGrid count={4} />
      ) : !user ? (
        <>
          <EmptyState
            icon="🔐"
            title="登入後先可以查看收藏"
            description="登入後可同步你收藏嘅學校，之後可以隨時返嚟查看"
            actionLabel="立即登入"
            actionHref="#login"
            onAction={() => setLoginOpen(true)}
          />
          <LoginModal
            open={loginOpen}
            onClose={() => setLoginOpen(false)}
            onLoginSuccess={() => setLoginOpen(false)}
          />
        </>
      ) : errorMessage ? (
        <EmptyState
          icon="⚠️"
          title="暫時未能載入收藏"
          description={errorMessage}
          actionLabel="重新載入"
          onAction={() => setReloadKey((value) => value + 1)}
        />
      ) : schools.length === 0 ? (
        <EmptyState
          icon="💛"
          title="仲未有收藏嘅學校"
          description="去學校列表睇下，搵到心儀嘅學校就可以收藏"
          actionLabel="瀏覽學校列表"
          actionHref="/schools?stage=kg"
        />
      ) : (
        <section className="school-grid stagger">
          {schools.map((school, index) => (
            <article
              key={school.id}
              className="glass-card school-card animate-slide-up"
              style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
            >
              <Link href={`/schools/${school.id}`} className="card-link">
                <div className="card-top">
                  <div className="card-info">
                    <p className="card-eyebrow">{school.district}</p>
                    <h3>{school.nameZh}</h3>
                    {school.nameEn && <p className="text-muted card-name-en">{school.nameEn}</p>}
                  </div>
                  {school.vacancy && (
                    <div className="vacancy-panel">
                      <VacancyBadge status={school.vacancy.status} />
                      <strong className="vacancy-count">
                        {school.vacancy.count !== null ? school.vacancy.count : "—"}
                      </strong>
                    </div>
                  )}
                </div>
                <div className="card-meta">
                  {school.schoolType && <span className="chip">{school.schoolType}</span>}
                  {school.sessionType && <span className="chip">{school.sessionType}</span>}
                </div>
              </Link>
              <div className="card-actions">
                <button
                  type="button"
                  className="btn-ghost btn-danger-text"
                  onClick={() => handleRemove(school.id)}
                >
                  取消收藏
                </button>
                <Link href={`/schools/${school.id}`} className="btn-primary card-detail-btn">
                  查看詳情
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
