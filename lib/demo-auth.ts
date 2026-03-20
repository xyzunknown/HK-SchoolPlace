"use client";

import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseUserRole } from "@/lib/auth-user";
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserEnv,
  syncSupabaseSessionCookie,
} from "@/lib/supabase";

const AUTH_CHANGE_EVENT = "auth-change";
const PENDING_AUTH_ACTION_STORAGE_KEY = "pending-auth-action";

export type AuthUser = {
  id: string;
  email: string | null;
  role: string | null;
  isAdmin: boolean;
};

export type PendingAuthAction = {
  kind: "favorite" | "comparison";
  intent: "add" | "remove";
  schoolId: string;
  next: string;
  createdAt: number;
};

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

function mapUser(user: User | null): AuthUser | null {
  if (!user) {
    return null;
  }

  const role = getSupabaseUserRole(user);

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    isAdmin: role === "admin",
  };
}

async function readCurrentUser() {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  try {
    const {
      data: { session },
    } = await client.auth.getSession();
    syncSupabaseSessionCookie(session);
    return mapUser(session?.user ?? null);
  } catch {
    return null;
  }
}

export function hasAuthConfig() {
  return hasSupabaseBrowserEnv();
}

export async function loginDemoUser(next = getCurrentPath()) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase Auth 未配置，請先設定環境變數。");
  }

  const redirectTo = new URL("/auth/callback", window.location.origin);
  redirectTo.searchParams.set("next", next);

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
    }
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function logoutDemoUser() {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return;
  }

  await client.auth.signOut();
  syncSupabaseSessionCookie(null);
  clearPendingAuthAction();
  notifyAuthChanged();
}

export function rememberPendingAuthAction(action: PendingAuthAction) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PENDING_AUTH_ACTION_STORAGE_KEY, JSON.stringify(action));
}

export function consumePendingAuthAction(
  matcher: (action: PendingAuthAction) => boolean
) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_AUTH_ACTION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const action = JSON.parse(raw) as PendingAuthAction;
    if (!matcher(action)) {
      return null;
    }

    window.sessionStorage.removeItem(PENDING_AUTH_ACTION_STORAGE_KEY);
    return action;
  } catch {
    window.sessionStorage.removeItem(PENDING_AUTH_ACTION_STORAGE_KEY);
    return null;
  }
}

export function clearPendingAuthAction() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_AUTH_ACTION_STORAGE_KEY);
}

export function getCurrentPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    void readCurrentUser()
      .then((nextUser) => {
        setUser(nextUser);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setUser(null);
      setLoading(false);
      return;
    }

    refresh();

    const handleChange = () => refresh();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      syncSupabaseSessionCookie(session);
      setUser(mapUser(session?.user ?? null));
      setLoading(false);
      notifyAuthChanged();
    });

    window.addEventListener("storage", handleChange);
    window.addEventListener(AUTH_CHANGE_EVENT, handleChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", handleChange);
      window.removeEventListener(AUTH_CHANGE_EVENT, handleChange);
    };
  }, [refresh]);

  const login = useCallback(async (next?: string) => {
    return loginDemoUser(next);
  }, []);

  const logout = useCallback(async () => {
    await logoutDemoUser();
    setUser(null);
    setLoading(false);
  }, []);

  return {
    user,
    loading,
    refresh,
    login,
    logout,
  };
}

export const useDemoAuth = useAuth;
