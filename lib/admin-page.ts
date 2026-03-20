import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth";

export async function ensureAdminPageAccess() {
  const result = await requireAdminUser();

  if (!result.ok) {
    redirect("/");
  }

  return result.user;
}
