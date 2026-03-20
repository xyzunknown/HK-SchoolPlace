"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient, syncSupabaseSessionCookie } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setErrorMessage("未設定 Supabase Auth 環境變數。");
      return;
    }

    const errorDescription = searchParams.get("error_description");
    const next = normalizeNextPath(searchParams.get("next"));

    if (errorDescription) {
      setErrorMessage(errorDescription);
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const finishIfReady = async () => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session) {
        return false;
      }

      syncSupabaseSessionCookie(session);

      if (!cancelled) {
        window.location.replace(next);
      }

      return true;
    };

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) {
        return;
      }

      if (event === "SIGNED_IN" || session) {
        syncSupabaseSessionCookie(session ?? null);
        window.location.replace(next);
      }
    });

    void finishIfReady()
      .then((done) => {
        if (done || cancelled) {
          return;
        }

        timeoutId = window.setTimeout(async () => {
          const success = await finishIfReady();
          if (!success && !cancelled) {
            setErrorMessage("登入未完成，請返回上一頁再試。");
          }
        }, 1500);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "登入失敗，請稍後再試。");
        }
      });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [searchParams]);

  return (
    <main className="page-shell">
      <section className="hero animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>帳戶登入</p>
        <h1>{errorMessage ? "登入未完成" : "正在完成登入"}</h1>
        <p className="text-muted">
          {errorMessage ?? "請稍候，我們正在建立你的 Supabase session。"}
        </p>
      </section>
    </main>
  );
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}
