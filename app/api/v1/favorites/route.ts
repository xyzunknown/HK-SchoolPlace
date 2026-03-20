import { getRequestUserContext } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import {
  addFavoriteSchool,
  isUserSchoolRepositoryError,
  listFavoriteSchools
} from "@/lib/repositories/user-school-repository";

export async function GET() {
  const user = await getRequestUserContext();
  if (!user.userId) {
    return jsonError("UNAUTHORIZED", "login required", 401);
  }

  try {
    return jsonOk(await listFavoriteSchools(user.userId, user.accessToken));
  } catch (error) {
    if (isUserSchoolRepositoryError(error) && error.reason === "auth_unavailable") {
      return jsonError("UNAUTHORIZED", "login required", 401);
    }

    return jsonError("READ_FAILED", "failed to load favorites", 500);
  }
}

export async function POST(request: Request) {
  const user = await getRequestUserContext();
  if (!user.userId) {
    return jsonError("UNAUTHORIZED", "login required", 401);
  }

  const body = (await request.json().catch(() => null)) as { school_id?: string } | null;

  if (!body?.school_id) {
    return jsonError("INVALID_BODY", "school_id is required", 400);
  }

  try {
    const result = await addFavoriteSchool(user.userId, body.school_id, user.accessToken);
    if (!result.ok && result.reason === "not_found") {
      return jsonError("NOT_FOUND", "school not found", 404);
    }

    if (!result.ok) {
      return jsonError("WRITE_FAILED", "failed to save favorite", 500);
    }

    return jsonOk({
      school_id: body.school_id,
      favorited: true
    });
  } catch (error) {
    if (isUserSchoolRepositoryError(error) && error.reason === "auth_unavailable") {
      return jsonError("UNAUTHORIZED", "login required", 401);
    }

    return jsonError("WRITE_FAILED", "failed to save favorite", 500);
  }
}
