function parseVacancyPayload(raw) {
  const payload = parseJsonPayload(raw);
  const items = Array.isArray(payload) ? payload : payload.items;

  if (!Array.isArray(items)) {
    throw new Error("Vacancy payload must be an array or an object with items[]");
  }

  return items.map((item) => ({
    source: String(item.source || "edb"),
    source_url: optionalString(item.source_url) || raw.target,
    school_name: requiredString(item.school_name, "school_name"),
    stage: requiredStage(item.stage),
    district: optionalString(item.district),
    grade: requiredString(item.grade, "grade"),
    status: parseStatus(item.status),
    count: optionalCount(item.count),
    effective_date: requiredDate(item.effective_date)
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

function requiredStage(value) {
  if (value === "kg" || value === "primary" || value === "secondary") {
    return value;
  }
  throw new Error("stage must be one of kg/primary/secondary");
}

function parseStatus(value) {
  if (value === "available" || value === "waiting" || value === "full" || value === "unknown") {
    return value;
  }
  return "unknown";
}

function optionalCount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("count must be a non-negative number or null");
  }
  return value;
}

function requiredDate(value) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error("effective_date is required and must be a valid date");
  }
  return value;
}

module.exports = {
  parseVacancyPayload
};
