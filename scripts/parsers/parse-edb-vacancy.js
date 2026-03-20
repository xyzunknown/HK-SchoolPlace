function parseEdbVacancyPayload(raw) {
  if (raw.sourceType === "fixture_json") {
    const payload = JSON.parse(raw.bodyText);
    if (!Array.isArray(payload)) {
      throw new Error("Fixture vacancy payload must be an array");
    }
    return payload;
  }

  if (!Array.isArray(raw.documents) || raw.documents.length === 0) {
    throw new Error("EDB vacancy payload must include parsed PDF documents");
  }

  const records = [];

  for (const document of raw.documents) {
    const district = parseDistrict(document.text);
    const effectiveDate = parseEffectiveDate(document.text);
    const lines = normalizeLines(document.text);
    const rows = extractSchoolRows(lines);

    for (const row of rows) {
      records.push({
        source: "edb",
        source_url: document.url,
        school_name: row.schoolName,
        stage: "kg",
        district,
        grade: "K1",
        status: mapVacancyStatus(row.k1),
        count: null,
        effective_date: effectiveDate
      });
      records.push({
        source: "edb",
        source_url: document.url,
        school_name: row.schoolName,
        stage: "kg",
        district,
        grade: "K2",
        status: mapVacancyStatus(row.k2),
        count: null,
        effective_date: effectiveDate
      });
      records.push({
        source: "edb",
        source_url: document.url,
        school_name: row.schoolName,
        stage: "kg",
        district,
        grade: "K3",
        status: mapVacancyStatus(row.k3),
        count: null,
        effective_date: effectiveDate
      });
    }
  }

  return records;
}

function normalizeLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseDistrict(text) {
  const firstLine = normalizeLines(text)[0] || "";
  const match = firstLine.match(/^(.+?)\s+[A-Za-z]/);
  return match ? match[1].trim() : null;
}

function parseEffectiveDate(text) {
  const match = text.match(/as at (\d{1,2} \w+ \d{4})/i);
  if (match) {
    return toIsoDate(match[1]);
  }
  const zh = text.match(/截至(\d{4}年\d{1,2}月\d{1,2}日)/);
  if (zh) {
    return toIsoDate(zh[1]);
  }
  throw new Error("Could not determine vacancy effective date");
}

function toIsoDate(value) {
  if (value.includes("年")) {
    const parts = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!parts) {
      throw new Error(`Invalid Chinese date: ${value}`);
    }
    return `${parts[1]}-${parts[2].padStart(2, "0")}-${parts[3].padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed.toISOString().slice(0, 10);
}

function extractSchoolRows(lines) {
  const rows = [];
  let index = lines.findIndex((line) => line === "K1 K2 K3" || line === "K1 K2 K3".replace(/ /g, " "));
  if (index < 0) {
    index = lines.findIndex((line) => line.includes("K1") && line.includes("K2") && line.includes("K3"));
  }
  if (index < 0) {
    throw new Error("Could not locate vacancy table header");
  }

  let current = null;
  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^1\./.test(line) || line.startsWith("注意事項") || line.startsWith("Points to Note")) {
      break;
    }

    const rowMatch = line.match(/^(\d+)\s+(.+)$/);
    if (rowMatch) {
      if (current && current.schoolName && current.k1 && current.k2 && current.k3) {
        rows.push(current);
      }
      current = {
        schoolName: rowMatch[2].trim(),
        englishLine: "",
        k1: null,
        k2: null,
        k3: null
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const vacancyMatch = line.match(/(.+?)\s+((?:\d{4}\s?\d{4}|\d{8}))?\s*(Y|N|P|NA)\s+(Y|N|P|NA)\s+(Y|N|P|NA)$/);
    if (vacancyMatch) {
      current.englishLine = vacancyMatch[1].trim();
      current.k1 = vacancyMatch[3];
      current.k2 = vacancyMatch[4];
      current.k3 = vacancyMatch[5];
      rows.push(current);
      current = null;
      continue;
    }

    const multilineVacancyMatch = line.match(/^((?:\d{4}\s?\d{4}|\d{8}))\s+(Y|N|P|NA)\s+(Y|N|P|NA)\s+(Y|N|P|NA)$/);
    if (multilineVacancyMatch) {
      current.k1 = multilineVacancyMatch[2];
      current.k2 = multilineVacancyMatch[3];
      current.k3 = multilineVacancyMatch[4];
      rows.push(current);
      current = null;
      continue;
    }

    current.englishLine = current.englishLine ? `${current.englishLine} ${line}` : line;
  }

  return rows.filter((row) => row.schoolName && row.k1 && row.k2 && row.k3);
}

function mapVacancyStatus(value) {
  switch (value) {
    case "Y":
      return "available";
    case "N":
      return "full";
    case "P":
      return "waiting";
    case "NA":
    default:
      return "unknown";
  }
}

module.exports = {
  parseEdbVacancyPayload
};
