import { getSupabaseBrowserClient } from "@/lib/supabase";

export const USER_LISTS_UPDATED_EVENT = "user-lists-updated";

async function getAuthHeaders() {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return {} as Record<string, string>;
  }

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    return {} as Record<string, string>;
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  } satisfies Record<string, string>;
}

function notifyUserListsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(USER_LISTS_UPDATED_EVENT));
  }
}

export type SchoolListResponse = {
  data: SchoolListItemAPI[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export type SchoolListItemAPI = {
  id: string;
  nameZh: string;
  nameEn: string | null;
  stage: string;
  district: string;
  schoolType: string | null;
  sessionType: string | null;
  schoolNet: string | null;
  band: string | null;
  vacancy: VacancyAPI | null;
  isFavorited: boolean;
  isInComparison: boolean;
};

export type VacancyAPI = {
  id: string;
  schoolId: string;
  grade: string;
  status: "available" | "waiting" | "full" | "unknown";
  count: number | null;
  updatedAt: string;
  isStale: boolean;
  source: string;
};

export type FiltersResponse = {
  data: {
    districts: string[];
    schoolTypes: string[];
    sessionTypes: string[];
    schoolNets: string[];
    bands: string[];
  };
};

export type ApiErrorResponse = {
  error?: {
    code: string;
    message: string;
  };
};

export async function fetchSchools(params: Record<string, string>): Promise<SchoolListResponse> {
  const query = new URLSearchParams(params).toString();
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/v1/schools?${query}`, {
    credentials: "include",
    headers,
  });
  return res.json();
}

export async function fetchFilters(stage?: string): Promise<FiltersResponse> {
  const query = stage ? `?stage=${stage}` : "";
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/v1/filters${query}`, {
    credentials: "include",
    headers,
  });
  return res.json();
}

export async function fetchFavorites(): Promise<{ data?: SchoolListItemAPI[] } & ApiErrorResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/v1/favorites", {
    credentials: "include",
    headers,
  });
  return res.json();
}

export async function addFavorite(schoolId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/v1/favorites", {
    method: "POST",
    credentials: "include",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ school_id: schoolId }),
  });
  const data = await res.json();
  if (!data?.error) {
    notifyUserListsUpdated();
  }
  return data;
}

export async function removeFavorite(schoolId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/v1/favorites/${schoolId}`, {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  const data = await res.json();
  if (!data?.error) {
    notifyUserListsUpdated();
  }
  return data;
}

export async function fetchComparisons(): Promise<{ data?: SchoolListItemAPI[] } & ApiErrorResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/v1/comparisons", {
    credentials: "include",
    headers,
  });
  return res.json();
}

export async function addComparison(schoolId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/v1/comparisons", {
    method: "POST",
    credentials: "include",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ school_id: schoolId }),
  });
  const data = await res.json();
  if (!data?.error) {
    notifyUserListsUpdated();
  }
  return data;
}

export async function removeComparison(schoolId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/v1/comparisons/${schoolId}`, {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  const data = await res.json();
  if (!data?.error) {
    notifyUserListsUpdated();
  }
  return data;
}
