const {
  buildSchoolNameVariants,
  extractBracketTokens,
  normalizeDistrictName,
  normalizeSchoolName
} = require("../sync/lib/normalize");

function buildSchoolIndexes(schools, aliases) {
  const schoolsByExact = new Map();
  const aliasesByExact = new Map();
  const schoolsByStageAndDistrict = new Map();
  const aliasesByStageAndDistrict = new Map();

  for (const school of schools) {
    const exactKeys = new Set([school.normalized_name]);
    for (const key of buildSchoolNameVariants(school.name_zh)) {
      exactKeys.add(key);
    }
    for (const key of buildSchoolNameVariants(school.name_en)) {
      exactKeys.add(key);
    }

    for (const key of Array.from(exactKeys).filter(Boolean)) {
      appendIndex(schoolsByExact, key, school);
      appendIndex(
        schoolsByStageAndDistrict,
        compositeKey(key, school.stage, normalizeDistrictName(school.district)),
        school
      );
    }
  }

  for (const alias of aliases) {
    const school = schools.find((item) => item.id === alias.school_id);
    if (!school) {
      continue;
    }
    appendIndex(aliasesByExact, alias.normalized_alias_name, school);
    appendIndex(
      aliasesByStageAndDistrict,
      compositeKey(alias.normalized_alias_name, school.stage, normalizeDistrictName(school.district)),
      school
    );
  }

  return {
    aliasesByExact,
    aliasesByStageAndDistrict,
    schoolsByExact,
    schoolsByStageAndDistrict
  };
}

function matchVacancyRecord(record, indexes) {
  const normalizedVariants = buildSchoolNameVariants(record.school_name);
  for (const normalized of normalizedVariants) {
    const aliasMatches = indexes.aliasesByExact.get(normalized) || [];
    const aliasPick = pickCandidate(aliasMatches, record, normalized);
    if (aliasPick) {
      return { normalizedName: normalized, school: aliasPick, confidence: "alias_exact" };
    }
  }

  for (const normalized of normalizedVariants) {
    const exactMatches = indexes.schoolsByExact.get(normalized) || [];
    const exactPick = pickCandidate(exactMatches, record, normalized);
    if (exactPick) {
      return { normalizedName: normalized, school: exactPick, confidence: "exact" };
    }
  }

  for (const normalized of normalizedVariants) {
    const scopedAliasMatches = indexes.aliasesByStageAndDistrict.get(
      compositeKey(normalized, record.stage, normalizeDistrictName(record.district || ""))
    ) || [];
    const scopedAliasPick = pickCandidate(scopedAliasMatches, record, normalized);
    if (scopedAliasPick) {
      return { normalizedName: normalized, school: scopedAliasPick, confidence: "alias_stage_district" };
    }
  }

  for (const normalized of normalizedVariants) {
    const scopedMatches = indexes.schoolsByStageAndDistrict.get(
      compositeKey(normalized, record.stage, normalizeDistrictName(record.district || ""))
    ) || [];
    const scopedPick = pickCandidate(scopedMatches, record, normalized);
    if (scopedPick) {
      return { normalizedName: normalized, school: scopedPick, confidence: "stage_district" };
    }
  }

  const normalized = normalizedVariants[0] || normalizeSchoolName(record.school_name);
  return {
    normalizedName: normalized,
    school: null,
    confidence: "unmatched",
    suggestion: suggestSchool(normalized, record, indexes)
  };
}

function findExistingSchoolForMasterRecord(record, indexes) {
  const normalizedVariants = buildSchoolNameVariants(record.name_zh || record.name_en || "");
  for (const normalized of normalizedVariants) {
    const exactMatches = indexes.schoolsByExact.get(normalized) || [];
    const exactPick = pickCanonicalExactSchool(exactMatches, normalized, record.district);
    if (exactPick) {
      return exactPick;
    }
  }

  for (const normalized of normalizedVariants) {
    const scopedMatches = indexes.schoolsByStageAndDistrict.get(
      compositeKey(normalized, record.stage, normalizeDistrictName(record.district))
    ) || [];
    const scopedPick = pickCanonicalExactSchool(scopedMatches, normalized, record.district);
    if (scopedPick) {
      return scopedPick;
    }
  }

  return null;
}

function suggestSchool(normalizedName, record, indexes) {
  const candidates = [];
  for (const [key, schools] of indexes.schoolsByStageAndDistrict.entries()) {
    const [, stage, district] = key.split("::");
    if (stage !== record.stage) {
      continue;
    }
    if (record.district && district !== normalizeDistrictName(record.district)) {
      continue;
    }

    const score = similarity(normalizedName, key.split("::")[0]);
    if (score >= 0.7) {
      for (const school of schools) {
        candidates.push({ school, score });
      }
    }
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.school || null;
}

function similarity(left, right) {
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }

  const longer = left.length >= right.length ? left : right;
  const shorter = left.length >= right.length ? right : left;

  let hits = 0;
  for (const char of shorter) {
    if (longer.includes(char)) {
      hits += 1;
    }
  }

  return hits / longer.length;
}

function appendIndex(index, key, value) {
  if (!key) {
    return;
  }

  const list = index.get(key) || [];
  if (!list.some((item) => item.id === value.id)) {
    list.push(value);
  }
  index.set(key, list);
}

function pickCandidate(matches, record, normalizedName) {
  if (!matches || matches.length === 0) {
    return null;
  }

  const preferredMatches = matches.filter((school) => school.normalized_name === normalizedName);
  if (preferredMatches.length > 0) {
    const preferredPick = pickFromCandidateSet(preferredMatches, record);
    if (preferredPick) {
      return preferredPick;
    }
  }

  return pickFromCandidateSet(matches, record);
}

function pickFromCandidateSet(matches, record) {
  if (!matches || matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  const bracketTokens = extractBracketTokens(record.school_name);
  if (bracketTokens.length > 0) {
    const addressMatches = matches.filter((school) => {
      const normalizedAddress = normalizeSchoolName(school.address_zh || "");
      return bracketTokens.some((token) => normalizedAddress.includes(token));
    });

    if (addressMatches.length === 1) {
      return addressMatches[0];
    }
  }

  const groups = new Map();
  for (const school of matches) {
    const key = `${school.normalized_name}::${normalizeDistrictName(school.district || "")}`;
    const list = groups.get(key) || [];
    list.push(school);
    groups.set(key, list);
  }

  if (groups.size === 1) {
    return pickCanonicalSchool(Array.from(groups.values())[0]);
  }

  return null;
}

function pickCanonicalExactSchool(matches, normalizedName, district) {
  const preferred = matches.filter((school) => school.normalized_name === normalizedName);
  if (preferred.length === 0) {
    return null;
  }

  const districtMatches = preferred.filter(
    (school) => normalizeDistrictName(school.district || "") === normalizeDistrictName(district || "")
  );

  if (districtMatches.length === 1) {
    return districtMatches[0];
  }

  if (districtMatches.length > 1) {
    return pickCanonicalSchool(districtMatches);
  }

  if (preferred.length === 1) {
    return preferred[0];
  }

  return pickCanonicalSchool(preferred);
}

function pickCanonicalSchool(matches) {
  return matches
    .slice()
    .sort((left, right) => {
      const leftCreatedAt = left.created_at || "";
      const rightCreatedAt = right.created_at || "";
      if (leftCreatedAt !== rightCreatedAt) {
        return leftCreatedAt.localeCompare(rightCreatedAt);
      }
      return left.id.localeCompare(right.id);
    })[0];
}

function compositeKey(normalizedName, stage, district) {
  return `${normalizedName}::${stage}::${district || ""}`;
}

module.exports = {
  buildSchoolIndexes,
  findExistingSchoolForMasterRecord,
  matchVacancyRecord
};
