import { createClient, type Session } from "@supabase/supabase-js";

import { getRequiredEnv, hasSupabaseEnv } from "@/lib/env";

export const SUPABASE_AUTH_STORAGE_KEY = "hkschoolplace-auth-token";

let browserlessClient:
  | ReturnType<typeof createClient>
  | null = null;

let browserClient:
  | ReturnType<typeof createClient>
  | null = null;

export function getSupabaseServerClient() {
  return createSupabaseServerClient();
}

export function createSupabaseServerClient(accessToken?: string) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  if (!accessToken) {
    if (!browserlessClient) {
      browserlessClient = createClient(
        getRequiredEnv("SUPABASE_URL"),
        getRequiredEnv("SUPABASE_ANON_KEY"),
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      );
    }

    return browserlessClient;
  }

  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
}

export function hasSupabaseBrowserEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseBrowserClient() {
  if (!hasSupabaseBrowserEnv()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: SUPABASE_AUTH_STORAGE_KEY
        }
      }
    );
  }

  return browserClient;
}

export function parseSupabaseSessionCookie(value: string | undefined): Session | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as Session;
  } catch {
    return null;
  }
}

export function syncSupabaseSessionCookie(session: Session | null) {
  if (typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (!session) {
    document.cookie = `${SUPABASE_AUTH_STORAGE_KEY}=; Path=/; SameSite=Lax; Max-Age=0${secure}`;
    return;
  }

  document.cookie = `${SUPABASE_AUTH_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(session))}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`;
}
