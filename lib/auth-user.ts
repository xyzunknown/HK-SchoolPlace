type RoleMetadata = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

export function getSupabaseUserRole(user: RoleMetadata) {
  const appRole = readRoleValue(user.app_metadata?.role);
  if (appRole) {
    return appRole;
  }

  const appRoles = readRoleList(user.app_metadata?.roles);
  if (appRoles.includes("admin")) {
    return "admin";
  }

  const userRole = readRoleValue(user.user_metadata?.role);
  if (userRole) {
    return userRole;
  }

  const userRoles = readRoleList(user.user_metadata?.roles);
  if (userRoles.includes("admin")) {
    return "admin";
  }

  return null;
}

function readRoleValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim().toLowerCase() || null;
}

function readRoleList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}
