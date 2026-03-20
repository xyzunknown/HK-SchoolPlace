"use client";

import { useState } from "react";
import { showToast } from "@/components/toast";
import { hasAuthConfig, loginDemoUser } from "@/lib/demo-auth";

type Props = {
  open: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
};

export function LoginModal({ open, onClose, onLoginSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const authConfigured = hasAuthConfig();

  if (!open) return null;

  const handleGoogleLogin = async () => {
    if (!authConfigured) {
      showToast("未設定 Supabase Auth，請先配置環境變數。", "error");
      return;
    }

    setLoading(true);
    try {
      await loginDemoUser();
      setLoading(false);
      onLoginSuccess?.();
    } catch (error) {
      setLoading(false);
      showToast(
        error instanceof Error ? error.message : "登入失敗，請稍後再試",
        "error"
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>登入帳戶</h2>
          <button className="btn-ghost modal-close" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="text-muted">登入後即可收藏學校同加入對比列表。</p>
          <button
            className="btn-google"
            onClick={handleGoogleLogin}
            disabled={loading || !authConfigured}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" className="google-icon">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? "跳轉登入中..." : "使用 Google 帳戶登入"}
          </button>
          {!authConfigured ? (
            <p className="text-muted" style={{ fontSize: "12px", marginTop: "0.75rem" }}>
              請先設定 `NEXT_PUBLIC_SUPABASE_URL` 同 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
            </p>
          ) : null}
        </div>
        <div className="modal-footer">
          <p className="text-muted" style={{ fontSize: "12px" }}>
            透過 Supabase Auth 建立真實登入 session，完成後會返回目前頁面
          </p>
        </div>
      </div>
    </div>
  );
}
