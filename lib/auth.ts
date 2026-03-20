import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { headers } from "next/headers";

import { getSupabaseUserRole } from "@/lib/auth-user";
import {
  createSupabaseServerClient,
  parseSupabaseSessionCookie,
  SUPABASE_AUTH_STORAGE_KEY,
} from "@/lib/supabase";

type UserContext = {
  userId: string | null;
  email: string | null;
  role: string | null;
  isAdmin: boolean;
  accessToken: string | null;
};

export async function getRequestUserContext(): Promise<UserContext> {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  const bearerToken = getBearerToken(authorization);

  const cookieStore = await cookies();
  const session = parseSupabaseSessionCookie(cookieStore.get(SUPABASE_AUTH_STORAGE_KEY)?.value);
  const accessToken = bearerToken ?? session?.access_token ?? null;

  if (!accessToken) {
    return {
      userId: null,
      email: null,
      role: null,
      isAdmin: false,
      accessToken: null,
    };
  }

  const supabase = createSupabaseServerClient(accessToken);
  if (!supabase) {
    return {
      userId: null,
      email: null,
      role: null,
      isAdmin: false,
      accessToken: null,
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return {
      userId: null,
      email: null,
      role: null,
      isAdmin: false,
      accessToken: null,
    };
  }

  await ensureDatabaseUserRecord(user, accessToken);
  const role = getSupabaseUserRole(user);

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
    isAdmin: role === "admin",
    accessToken,
  };
}

export async function requireAdminUser() {
  const user = await getRequestUserContext();

  if (!user.userId) {
    return { ok: false as const, status: 401, code: "UNAUTHORIZED", message: "login required" };
  }

  if (!user.isAdmin) {
    return { ok: false as const, status: 403, code: "FORBIDDEN", message: "admin role required" };
  }

  return { ok: true as const, user };
}

async function ensureDatabaseUserRecord(user: User, accessToken: string) {
  const supabase = createSupabaseServerClient(accessToken);
  if (!supabase) {
    return;
  }

  await supabase.from("users").upsert(
    {
      id: user.id,
      auth_provider: getAuthProvider(user),
      email: user.email ?? null,
      phone: user.phone ?? null,
    },
    { onConflict: "id" }
  );
}

function getAuthProvider(user: User) {
  const provider = user.app_metadata?.provider;
  if (typeof provider === "string" && provider.length > 0) {
    return provider;
  }

  const identities = user.identities;
  if (Array.isArray(identities) && identities.length > 0) {
    const firstIdentity = identities[0]?.provider;
    if (typeof firstIdentity === "string" && firstIdentity.length > 0) {
      return firstIdentity;
    }
  }

  return "supabase";
}

function getBearerToken(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
