import { getRequestUserContext } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import {
  isUserSchoolRepositoryError,
  removeFavoriteSchool
} from "@/lib/repositories/user-school-repository";

type Context = {
  params: Promise<{ school_id: string }>;
};

export async function DELETE(_request: Request, context: Context) {
  const user = await getRequestUserContext();
  if (!user.userId) {
    return jsonError("UNAUTHORIZED", "login required", 401);
  }

  const { school_id } = await context.params;
  try {
    await removeFavoriteSchool(user.userId, school_id, user.accessToken);
  } catch (error) {
    if (isUserSchoolRepositoryError(error) && error.reason === "auth_unavailable") {
      return jsonError("UNAUTHORIZED", "login required", 401);
    }

    return jsonError("WRITE_FAILED", "failed to remove favorite", 500);
  }

  return jsonOk({
    school_id,
    favorited: false
  });
}
