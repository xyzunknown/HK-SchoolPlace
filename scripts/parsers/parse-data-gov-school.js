function parseDataGovSchoolPayload(raw) {
  const payload = JSON.parse(raw.bodyText);
  if (!Array.isArray(payload)) {
    throw new Error("data.gov.hk school payload must be an array");
  }

  if (payload.length > 0 && "name_zh" in payload[0] && "stage" in payload[0]) {
    return payload;
  }

  const kindergartenRows = payload.filter((row) => {
    const level = String(row["SCHOOL LEVEL"] || "").toUpperCase();
    return level === "KINDERGARTEN" || level === "KINDERGARTEN-CUM-CHILD CARE CENTRES";
  });
  const grouped = new Map();

  for (const row of kindergartenRows) {
    const key = buildSchoolKey(row);
    const current = grouped.get(key) || createSchoolRecord(row);
    current.sessionTypes.add(mapSession(row["SESSION"], row["學校授課時間"]));
    current.sourceRowIds.push(String(row["SCHOOL NO."] || ""));
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).map((item) => ({
    source: "data_gov_hk",
    external_id: item.sourceRowIds[0] || null,
    name_zh: item.name_zh,
    name_en: item.name_en,
    stage: "kg",
    district: item.district,
    address_zh: item.address_zh,
    address_en: item.address_en,
    phone: sanitize(item.phone),
    website: sanitizeUrl(item.website),
    school_type: item.school_type,
    session_type: combineSessions(Array.from(item.sessionTypes)),
    school_net: null,
    band: null,
    tuition_fee: null,
    curriculum: null,
    is_scheme_participant: null
  }));
}

function createSchoolRecord(row) {
  return {
    name_zh: sanitize(row["中文名稱"]),
    name_en: sanitize(row["ENGLISH NAME"]),
    district: sanitize(row["分區"]) || sanitize(row["DISTRICT"]),
    address_zh: sanitize(row["中文地址"]),
    address_en: sanitize(row["ENGLISH ADDRESS"]),
    phone: sanitize(row["聯絡電話"]) || sanitize(row["TELEPHONE"]),
    website: sanitize(row["網頁"]) || sanitize(row["WEBSITE"]),
    school_type:
      sanitize(row["中文類別"]) ||
      sanitize(row["學校類型"]) ||
      sanitize(row["資助種類"]) ||
      sanitizeFinanceType(row["FINANCE TYPE"]),
    sessionTypes: new Set(),
    sourceRowIds: []
  };
}

function buildSchoolKey(row) {
  return [
    sanitize(row["中文名稱"]) || sanitize(row["ENGLISH NAME"]),
    sanitize(row["中文地址"]) || sanitize(row["ENGLISH ADDRESS"]),
    sanitize(row["分區"]) || sanitize(row["DISTRICT"])
  ].join("::");
}

function mapSession(sessionEn, sessionZh) {
  const value = (sessionZh || sessionEn || "").toString().trim().toUpperCase();
  if (value === "全日" || value === "WHOLE DAY") {
    return "全日";
  }
  if (value === "上午" || value === "A.M.") {
    return "半日（上午）";
  }
  if (value === "下午" || value === "P.M.") {
    return "半日（下午）";
  }
  return sanitize(sessionZh) || sanitize(sessionEn) || "未知";
}

function combineSessions(sessions) {
  const unique = Array.from(new Set(sessions.filter(Boolean)));
  if (unique.length === 0) {
    return null;
  }
  if (unique.length === 1) {
    return unique[0];
  }
  if (unique.includes("全日") && unique.some((item) => item.startsWith("半日"))) {
    return "全日及半日";
  }
  return unique.join(" / ");
}

function sanitize(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === "N.A.") {
    return null;
  }
  return trimmed;
}

function sanitizeUrl(value) {
  const url = sanitize(value);
  if (!url) {
    return null;
  }
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function sanitizeFinanceType(value) {
  const normalized = sanitize(value);
  if (!normalized) {
    return null;
  }

  const map = {
    PRIVATE: "私立",
    AIDED: "資助",
    GOVERNMENT: "官立",
    DSS: "直資"
  };

  return map[normalized.toUpperCase()] || normalized;
}

module.exports = {
  parseDataGovSchoolPayload
};
