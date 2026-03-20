"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-HK">
      <body>
        <main className="page-shell">
          <section
            className="empty-state glass-card animate-fade-in"
            style={{ marginTop: "var(--sp-12)" }}
          >
            <div className="empty-state-icon" style={{ fontSize: "4rem" }}>⚠️</div>
            <h3 style={{ fontSize: "var(--font-title)" }}>應用程式暫時出現問題</h3>
            <p className="text-muted">
              請重新整理頁面；如果問題持續，稍後再試。
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: "var(--sp-6)", display: "inline-flex" }}
              onClick={() => reset()}
            >
              重新載入
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
