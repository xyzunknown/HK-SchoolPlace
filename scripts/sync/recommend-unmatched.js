#!/usr/bin/env node

const { buildSchoolNameVariants, normalizeDistrictName, normalizeSchoolName } = require("./lib/normalize");
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
  const schoolCandidates = buildCandidateRows(schools, aliases);
  const { data: unmatched, error } = await client
    .from("unmatched_records")
    .select("id, raw_name, normalized_name, stage, district, grade, suggested_school_id, status")
    .eq("status", "pending")
    .is("suggested_school_id", null)
    .limit(2000);

  if (error) {
    throw new Error(`Failed to load unmatched records: ${error.message}`);
  }

  const updates = [];
  const preview = [];

  for (const record of unmatched || []) {
    const suggestion = recommendSchool(record, schoolCandidates);
    if (!suggestion) {
      continue;
    }

    updates.push({
      id: record.id,
      suggested_school_id: suggestion.school.id
    });

    if (preview.length < 30) {
      preview.push({
        raw_name: record.raw_name,
        district: record.district,
        school_name: suggestion.school.name_zh,
        score: Number(suggestion.score.toFixed(3)),
        reason: suggestion.reason
      });
    }
  }

  for (const update of updates) {
    const { error: updateError } = await client
      .from("unmatched_records")
      .update({ suggested_school_id: update.suggested_school_id })
      .eq("id", update.id);

    if (updateError) {
      throw new Error(`Failed to update unmatched record ${update.id}: ${updateError.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        scanned: unmatched?.length || 0,
        suggested: updates.length,
        preview
      },
      null,
      2
    )
  );
}

function buildCandidateRows(schools, aliases) {
  const aliasMap = new Map();

  for (const school of schools) {
    aliasMap.set(school.id, new Set(buildSchoolNameVariants(school.name_zh)));
    if (school.name_en) {
      for (const variant of buildSchoolNameVariants(school.name_en)) {
        aliasMap.get(school.id).add(variant);
      }
    }
  }

  for (const alias of aliases) {
    if (!aliasMap.has(alias.school_id)) {
      aliasMap.set(alias.school_id, new Set());
    }
    aliasMap.get(alias.school_id).add(alias.normalized_alias_name);
  }

  return schools.map((school) => ({
    ...school,
    normalizedDistrict: normalizeDistrictName(school.district),
    variants: Array.from(aliasMap.get(school.id) || [])
  }));
}

function recommendSchool(record, candidates) {
  const normalizedDistrict = normalizeDistrictName(record.district || "");
  const rawVariants = buildSchoolNameVariants(record.raw_name);
  const normalizedRaw = record.normalized_name || normalizeSchoolName(record.raw_name);

  const ranked = candidates
    .filter((candidate) => candidate.stage === record.stage)
    .filter((candidate) => !normalizedDistrict || candidate.normalizedDistrict === normalizedDistrict)
    .map((candidate) => {
      const variantScores = candidate.variants.map((variant) => similarity(normalizedRaw, variant));
      const bestScore = variantScores.length > 0 ? Math.max(...variantScores) : 0;
      const exactVariant = candidate.variants.find((variant) => rawVariants.includes(variant));

      return {
        school: candidate,
        score: exactVariant ? 1 : bestScore,
        reason: exactVariant ? "exact_variant" : "similarity"
      };
    })
    .filter((item) => item.score >= 0.84)
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) {
    return null;
  }

  const [first, second] = ranked;
  if (first.score === 1 && (!second || second.score <= 0.9)) {
    return first;
  }

  if (first.score >= 0.93 && (!second || first.score - second.score >= 0.08)) {
    return first;
  }

  return null;
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
