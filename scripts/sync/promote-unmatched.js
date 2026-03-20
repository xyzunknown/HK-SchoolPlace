#!/usr/bin/env node

const {
  buildSchoolNameVariants,
  extractBracketTokens,
  normalizeDistrictName,
  normalizeSchoolName
} = require("./lib/normalize");
const { getSupabaseAdminClient, listSchoolsAndAliases } = require("./lib/db");
const { createRuntime } = require("./lib/runtime");

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

async function main() {
  const runtime = createRuntime(process.argv);
  const client = getSupabaseAdminClient(runtime.env);
  if (!client) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const { schools, aliases } = await listSchoolsAndAliases(client);
  const schoolMap = new Map(schools.map((school) => [school.id, school]));
  const aliasMap = new Map();
  const schoolsByDistrict = new Map();

  for (const alias of aliases) {
    const list = aliasMap.get(alias.school_id) || new Set();
    list.add(alias.normalized_alias_name);
    aliasMap.set(alias.school_id, list);
  }

  for (const school of schools) {
    const key = normalizeDistrictName(school.district || "");
    const list = schoolsByDistrict.get(key) || [];
    list.push(school);
    schoolsByDistrict.set(key, list);
  }

  const { data: unmatched, error } = await client
    .from("unmatched_records")
    .select("id, raw_name, district, suggested_school_id, status")
    .eq("status", "pending")
    .limit(2000);

  if (error) {
    throw new Error(`Failed to load unmatched records: ${error.message}`);
  }

  const aliasInserts = [];
  const resolveIds = [];
  const preview = [];
  const aliasDedup = new Set(
    aliases.map((alias) => `${alias.school_id}::${alias.normalized_alias_name}`)
  );

  for (const record of unmatched || []) {
    const school = findPromotableSchool(record, schoolMap, aliasMap, schoolsByDistrict);
    if (!school) {
      continue;
    }

    const normalizedAlias = normalizeSchoolName(record.raw_name);
    if (!aliasDedup.has(`${school.id}::${normalizedAlias}`)) {
      aliasDedup.add(`${school.id}::${normalizedAlias}`);
      aliasInserts.push({
        school_id: school.id,
        alias_name: record.raw_name,
        normalized_alias_name: normalizedAlias,
        source: "manual"
      });
    }

    resolveIds.push({
      id: record.id,
      schoolId: school.id
    });

    if (preview.length < 30) {
      preview.push({
        raw_name: record.raw_name,
        school_name: school.name_zh
      });
    }
  }

  if (aliasInserts.length > 0) {
    const { error: aliasError } = await client.from("school_alias").insert(aliasInserts);
    if (aliasError) {
      throw new Error(`Failed to insert aliases: ${aliasError.message}`);
    }
  }

  for (const item of resolveIds) {
    const { error: updateError } = await client
      .from("unmatched_records")
      .update({
        status: "resolved",
        resolved_school_id: item.schoolId
      })
      .eq("id", item.id);

    if (updateError) {
      throw new Error(`Failed to resolve unmatched record ${item.id}: ${updateError.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        scanned: unmatched?.length || 0,
        aliasesInserted: aliasInserts.length,
        resolved: resolveIds.length,
        preview
      },
      null,
      2
    )
  );
}

function isSafePromotion(rawName, school, normalizedAliases) {
  const rawVariants = new Set(buildSchoolNameVariants(rawName));
  const schoolVariants = new Set(buildSchoolNameVariants(school.name_zh));

  if (school.name_en) {
    for (const variant of buildSchoolNameVariants(school.name_en)) {
      schoolVariants.add(variant);
    }
  }

  for (const variant of normalizedAliases || []) {
    schoolVariants.add(variant);
  }

  for (const variant of rawVariants) {
    if (schoolVariants.has(variant)) {
      return true;
    }
  }

  return false;
}

function findPromotableSchool(record, schoolMap, aliasMap, schoolsByDistrict) {
  if (record.suggested_school_id) {
    const suggested = schoolMap.get(record.suggested_school_id);
    if (suggested && isSafePromotion(record.raw_name, suggested, aliasMap.get(suggested.id))) {
      return suggested;
    }
  }

  const districtKey = normalizeDistrictName(record.district || "");
  const districtSchools = schoolsByDistrict.get(districtKey) || [];
  const baseVariants = new Set(buildSchoolNameVariants(record.raw_name));
  const bracketTokens = extractBracketTokens(record.raw_name);

  const candidates = districtSchools.filter((school) => {
    const schoolVariants = new Set(buildSchoolNameVariants(school.name_zh));
    if (school.name_en) {
      for (const variant of buildSchoolNameVariants(school.name_en)) {
        schoolVariants.add(variant);
      }
    }

    const hasBaseMatch = Array.from(baseVariants).some((variant) => schoolVariants.has(variant));
    if (!hasBaseMatch) {
      return false;
    }

    if (bracketTokens.length === 0) {
      return true;
    }

    const normalizedAddress = normalizeSchoolName(school.address_zh || "");
    return bracketTokens.some((token) => normalizedAddress.includes(token));
  });

  if (candidates.length !== 1) {
    return null;
  }

  return candidates[0];
}
