import { getRequestUserContext } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getSchoolUserState } from "@/lib/repositories/school-repository";
import { getSchoolById } from "@/lib/schools";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const user = await getRequestUserContext();
  const school = await getSchoolById(id);

  if (!school) {
    return jsonError("NOT_FOUND", "school not found", 404);
  }

  const userState = await getSchoolUserState(id, {
    userId: user.userId,
    accessToken: user.accessToken
  });

  return jsonOk({
    ...school,
    ...userState
  });
}
