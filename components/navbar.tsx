"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoginModal } from "@/components/login-modal";
import { useAuth } from "@/lib/demo-auth";
import {
  USER_LISTS_UPDATED_EVENT,
  fetchComparisons,
  fetchFavorites,
} from "@/lib/api-client";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [comparisonCount, setComparisonCount] = useState(0);
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!user) {
      setFavoriteCount(0);
      setComparisonCount(0);
      return;
    }

    let active = true;

    const loadCounts = async () => {
      const [favoritesRes, comparisonsRes] = await Promise.all([
        fetchFavorites(),
        fetchComparisons(),
      ]);

      if (!active) {
        return;
      }

      setFavoriteCount(favoritesRes.data?.length ?? 0);
      setComparisonCount(comparisonsRes.data?.length ?? 0);
    };

    void loadCounts();

    const handleListsUpdated = () => {
      void loadCounts();
    };

    window.addEventListener(USER_LISTS_UPDATED_EVENT, handleListsUpdated);

    return () => {
      active = false;
      window.removeEventListener(USER_LISTS_UPDATED_EVENT, handleListsUpdated);
    };
  }, [user]);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/" className="nav-logo">
            <span className="nav-logo-icon">🎓</span>
            <span>學位通</span>
          </Link>

          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="切換選單"
          >
            <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-line ${menuOpen ? "open" : ""}`} />
          </button>

          <div className={`nav-links ${menuOpen ? "nav-links-open" : ""}`}>
            <Link href="/schools?stage=kg" className="nav-link" onClick={() => setMenuOpen(false)}>
              學校列表
            </Link>
            <Link href="/favorites" className="nav-link" onClick={() => setMenuOpen(false)}>
              我的收藏
              {user && favoriteCount > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "1.35rem",
                    height: "1.35rem",
                    marginLeft: "0.45rem",
                    padding: "0 0.35rem",
                    borderRadius: "999px",
                    background: "rgba(22, 163, 74, 0.12)",
                    color: "var(--primary)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {favoriteCount}
                </span>
              ) : null}
            </Link>
            <Link href="/compare" className="nav-link" onClick={() => setMenuOpen(false)}>
              學校對比
              {user && comparisonCount > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "1.35rem",
                    height: "1.35rem",
                    marginLeft: "0.45rem",
                    padding: "0 0.35rem",
                    borderRadius: "999px",
                    background: "rgba(251, 191, 36, 0.16)",
                    color: "#9a6700",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {comparisonCount}
                </span>
              ) : null}
            </Link>
            <Link href="/admin" className="nav-link nav-link-subtle" onClick={() => setMenuOpen(false)}>
              後台
            </Link>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginLeft: "0.5rem",
                paddingLeft: "0.75rem",
                borderLeft: "1px solid rgba(27, 67, 50, 0.12)",
              }}
            >
              <span
                className="text-muted"
                style={{ fontSize: "0.9rem", whiteSpace: "nowrap" }}
              >
                {loading ? "檢查登入中..." : user ? `已登入 · ${user.email ?? user.id}` : "未登入"}
              </span>
              {user ? (
                <span
                  className="text-muted"
                  style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}
                >
                  收藏 {favoriteCount} / 對比 {comparisonCount}
                </span>
              ) : null}
              {user ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    void logout();
                    setMenuOpen(false);
                  }}
                  style={{ padding: "0.55rem 0.85rem" }}
                >
                  登出
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setLoginOpen(true);
                    setMenuOpen(false);
                  }}
                  style={{ padding: "0.55rem 0.85rem" }}
                >
                  登入
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={() => setLoginOpen(false)}
      />
    </>
  );
}
