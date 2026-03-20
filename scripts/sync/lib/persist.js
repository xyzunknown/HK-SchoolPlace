const { normalizeSchoolName } = require("./normalize");

async function persistSchoolMaster(client, records, context) {
  if (!client) {
    return {
      updated: records.length,
      created: 0,
      unmatched: []
    };
  }

  const unmatched = [];
  let updated = 0;
  let created = 0;

  for (const record of records) {
    const normalizedName = normalizeSchoolName(record.name_zh || record.name_en || "");
    const existing = context.findExistingSchool(record);
    const payload = {
      name_zh: record.name_zh,
      name_en: record.name_en,
      normalized_name: normalizedName,
      stage: record.stage,
      district: record.district,
      address_zh: record.address_zh,
      address_en: record.address_en,
      phone: record.phone,
      website: record.website,
      school_type: record.school_type,
      session_type: record.session_type,
      school_net: record.school_net,
      band: record.band,
      tuition_fee: record.tuition_fee,
      curriculum: record.curriculum,
      is_scheme_participant: record.is_scheme_participant
    };

    if (existing) {
      const { error } = await client.from("schools").update(payload).eq("id", existing.id);
      if (error) {
        unmatched.push({
          source: record.source || "data_gov_hk",
          reason: error.message,
          raw_name: record.name_zh,
          normalized_name: normalizedName,
          district: record.district,
          stage: record.stage
        });
        continue;
      }
      updated += 1;
      continue;
    }

    const { error } = await client.from("schools").insert(payload);
    if (error) {
      unmatched.push({
        source: record.source || "data_gov_hk",
        reason: error.message,
        raw_name: record.name_zh,
        normalized_name: normalizedName,
        district: record.district,
        stage: record.stage
      });
      continue;
    }
    created += 1;
  }

  return {
    updated: updated + created,
    created,
    unmatched
  };
}

async function persistVacancies(client, matchResults, context) {
  if (!client) {
    return {
      updated: matchResults.filter((item) => item.school).length,
      unmatched: buildUnmatched(matchResults)
    };
  }

  let updated = 0;
  const unmatched = [];

  for (const item of matchResults) {
    if (!item.school) {
      unmatched.push({
        raw_name: item.record.school_name,
        normalized_name: item.normalizedName,
        source: item.record.source,
        district: item.record.district,
        grade: item.record.grade,
        stage: item.record.stage,
        suggested_school_id: item.suggestion?.id || null
      });
      continue;
    }

    const { error } = await client.from("vacancies").upsert(
      {
        school_id: item.school.id,
        grade: item.record.grade,
        status: item.record.status,
        count: item.record.count,
        source: item.record.source,
        source_url: item.record.source_url,
        effective_date: item.record.effective_date,
        updated_at: context.now,
        is_stale: false
      },
      {
        onConflict: "school_id,grade,source"
      }
    );

    if (error) {
      unmatched.push({
        raw_name: item.record.school_name,
        normalized_name: item.normalizedName,
        source: item.record.source,
        district: item.record.district,
        grade: item.record.grade,
        stage: item.record.stage,
        suggested_school_id: item.school.id,
        reason: error.message
      });
      continue;
    }

    updated += 1;
  }

  return {
    updated,
    unmatched
  };
}

async function persistUnmatchedRecords(client, unmatched, rawDataId, stage) {
  if (!client || unmatched.length === 0) {
    return;
  }

  const rows = unmatched.map((item) => ({
    source: item.source || "unknown",
    raw_name: item.raw_name,
    normalized_name: item.normalized_name,
    stage: item.stage || stage,
    district: item.district || null,
    grade: item.grade || null,
    suggested_school_id: item.suggested_school_id || null,
    status: "pending",
    raw_data_id: rawDataId || null
  }));

  const { error } = await client.from("unmatched_records").insert(rows);
  if (error) {
    throw new Error(`Failed to insert unmatched records: ${error.message}`);
  }
}

async function markVacanciesStale(client, hours, nowIso) {
  if (!client) {
    return { updated: 0 };
  }

  const threshold = new Date(Date.parse(nowIso) - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("vacancies")
    .update({ is_stale: true, admin_note: `Marked stale by sync script at ${nowIso}` })
    .lt("updated_at", threshold)
    .eq("is_stale", false)
    .select("id");

  if (error) {
    throw new Error(`Failed to mark stale vacancies: ${error.message}`);
  }

  return { updated: data?.length || 0, threshold };
}

function buildUnmatched(matchResults) {
  return matchResults
    .filter((item) => !item.school)
    .map((item) => ({
      raw_name: item.record.school_name,
      normalized_name: item.normalizedName,
      source: item.record.source,
      district: item.record.district,
      grade: item.record.grade,
      stage: item.record.stage,
      suggested_school_id: item.suggestion?.id || null
    }));
}

module.exports = {
  markVacanciesStale,
  persistSchoolMaster,
  persistUnmatchedRecords,
  persistVacancies
};
