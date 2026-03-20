import { ensureAdminResponse } from "@/lib/admin-http";
import { jsonError, jsonOk } from "@/lib/http";
import { updateAdminSchool } from "@/lib/repositories/admin-repository";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const authError = await ensureAdminResponse();
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || Object.keys(body).length === 0) {
    return jsonError("INVALID_BODY", "request body is required", 400);
  }

  const { id } = await context.params;
  const updated = await updateAdminSchool(id, {
    nameZh: asString(body.name_zh),
    nameEn: asNullableString(body.name_en),
    district: asString(body.district),
    addressZh: asNullableString(body.address_zh),
    addressEn: asNullableString(body.address_en),
    phone: asNullableString(body.phone),
    website: asNullableString(body.website),
    schoolType: asNullableString(body.school_type),
    sessionType: asNullableString(body.session_type),
    schoolNet: asNullableString(body.school_net),
    band: asNullableString(body.band),
    tuitionFee: asNullableNumber(body.tuition_fee),
    curriculum: asNullableString(body.curriculum),
    isSchemeParticipant: asNullableBoolean(body.is_scheme_participant),
    isActive: typeof body.is_active === "boolean" ? body.is_active : undefined
  });

  if (!updated) {
    return jsonError("NOT_FOUND", "school not found", 404);
  }

  return jsonOk(updated);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNullableString(value: unknown) {
  return typeof value === "string" || value === null ? value : undefined;
}

function asNullableNumber(value: unknown) {
  return typeof value === "number" || value === null ? value : undefined;
}

function asNullableBoolean(value: unknown) {
  return typeof value === "boolean" || value === null ? value : undefined;
}
