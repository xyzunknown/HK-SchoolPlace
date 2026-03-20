const ENV_FALLBACKS: Record<string, string[]> = {
  SUPABASE_URL: ["NEXT_PUBLIC_SUPABASE_URL"],
  SUPABASE_ANON_KEY: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
};

export function getEnv(name: string) {
  const candidates = [name, ...(ENV_FALLBACKS[name] ?? [])];

  for (const candidate of candidates) {
    const value = process.env[candidate];
    if (value) {
      return value;
    }
  }

  return "";
}

export function hasSupabaseEnv() {
  return Boolean(getEnv("SUPABASE_URL") && getEnv("SUPABASE_ANON_KEY"));
}

export function getRequiredEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}
