function parseSchoolMasterPayload(raw) {
  const payload = parseJsonPayload(raw);
  const items = Array.isArray(payload) ? payload : payload.items;

  if (!Array.isArray(items)) {
    throw new Error("School master payload must be an array or an object with items[]");
  }

  return items.map((item) => ({
    source: String(item.source || "data_gov_hk"),
    external_id: item.external_id ? String(item.external_id) : null,
    name_zh: requiredString(item.name_zh, "name_zh"),
    name_en: optionalString(item.name_en),
    stage: requiredStage(item.stage),
    district: requiredString(item.district, "district"),
    address_zh: optionalString(item.address_zh),
    address_en: optionalString(item.address_en),
    phone: optionalString(item.phone),
    website: optionalString(item.website),
    school_type: optionalString(item.school_type),
    session_type: optionalString(item.session_type),
    school_net: optionalString(item.school_net),
    band: optionalString(item.band),
    tuition_fee: optionalNumber(item.tuition_fee),
    curriculum: optionalString(item.curriculum),
    is_scheme_participant: optionalBoolean(item.is_scheme_participant)
  }));
}

function parseJsonPayload(raw) {
  try {
    return JSON.parse(raw.bodyText);
  } catch (error) {
    throw new Error(`Failed to parse JSON payload from ${raw.target}: ${error.message}`);
  }
}

function requiredString(value, key) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function optionalNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function requiredStage(value) {
  if (value === "kg" || value === "primary" || value === "secondary") {
    return value;
  }
  throw new Error("stage must be one of kg/primary/secondary");
}

module.exports = {
  parseSchoolMasterPayload
};
