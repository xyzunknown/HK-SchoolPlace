const { createClient } = require("@supabase/supabase-js");

const fs = require("fs");
const path = require("path");

const { normalizeSchoolName } = require("./normalize");

function getSupabaseAdminClient(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function assertSyncWritePrerequisites(client) {
  if (!client) {
    throw new Error("Supabase admin client is required for write mode");
  }

  const checks = [
    { table: "schools", columns: "id" },
    { table: "vacancies", columns: "id" },
    { table: "raw_data", columns: "id" },
    { table: "sync_logs", columns: "id" },
    { table: "unmatched_records", columns: "id" },
    { table: "school_alias", columns: "id" }
  ];

  for (const check of checks) {
    const { error } = await client.from(check.table).select(check.columns).limit(1);
    if (error) {
      throw new Error(`Write-mode preflight failed on ${check.table}: ${error.message}`);
    }
  }
}

async function insertSyncLogStart(client, payload) {
  if (!client) {
    return { id: "dry-run-log" };
  }

  const { data, error } = await client
    .from("sync_logs")
    .insert({
      source: payload.source,
      run_type: payload.run_type,
      status: "running",
      message: payload.message || null,
      started_at: payload.started_at
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to insert sync log: ${error.message}`);
  }

  return data;
}

async function finishSyncLog(client, id, payload) {
  if (!client || !id) {
    return;
  }

  const { error } = await client
    .from("sync_logs")
    .update({
      status: payload.status,
      records_fetched: payload.records_fetched,
      records_parsed: payload.records_parsed,
      records_matched: payload.records_matched,
      records_updated: payload.records_updated,
      message: payload.message || null,
      finished_at: payload.finished_at
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update sync log: ${error.message}`);
  }
}

async function insertRawData(client, payload) {
  if (!client) {
    return { id: "dry-run-raw" };
  }

  const { data, error } = await client
    .from("raw_data")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to insert raw data: ${error.message}`);
  }

  return data;
}

async function listSchoolsAndAliases(client) {
  if (!client) {
    return loadLocalFixtureSchools();
  }

  const [schoolsResult, aliasesResult] = await Promise.all([
    fetchAllRows(client, "schools", "id, name_zh, name_en, normalized_name, stage, district, address_zh, is_active, created_at", (query) =>
      query.eq("is_active", true).order("id")
    ),
    fetchAllRows(client, "school_alias", "id, school_id, normalized_alias_name, source", (query) =>
      query.order("id")
    )
  ]);

  const { data: schools, error: schoolError } = schoolsResult;
  const { data: aliases, error: aliasError } = aliasesResult;

  if (schoolError) {
    throw new Error(`Failed to load schools: ${schoolError.message}`);
  }
  if (aliasError) {
    throw new Error(`Failed to load aliases: ${aliasError.message}`);
  }

  return {
    schools: schools || [],
    aliases: aliases || []
  };
}

async function fetchAllRows(client, table, columns, applyQuery, pageSize = 1000) {
  const rows = [];
  let from = 0;

  while (true) {
    let query = client.from(table).select(columns);
    query = applyQuery(query).range(from, from + pageSize - 1);
    const { data, error } = await query;
    if (error) {
      return { data: null, error };
    }

    rows.push(...(data || []));
    if (!data || data.length < pageSize) {
      return { data: rows, error: null };
    }

    from += pageSize;
  }
}

function buildSchoolContextFromRecords(records) {
  const schools = records.map((item, index) => ({
    id: item.external_id || `runtime-school-${index + 1}`,
    name_zh: item.name_zh,
    name_en: item.name_en || null,
    normalized_name: normalizeSchoolName(item.name_zh || item.name_en || ""),
    stage: item.stage,
    district: item.district,
    address_zh: item.address_zh || null,
    is_active: true,
    created_at: null
  }));

  const aliases = schools.flatMap((school) => {
    const results = [];
    if (school.name_en) {
      results.push({
        id: `${school.id}-en`,
        school_id: school.id,
        normalized_alias_name: normalizeSchoolName(school.name_en),
        source: "runtime"
      });
    }
    return results;
  });

  return { schools, aliases };
}

function loadLocalFixtureSchools() {
  const rootDir = path.resolve(__dirname, "..", "..", "..");
  const schoolPath = path.join(rootDir, "data", "sync-fixtures", "school-master.json");
  if (!fs.existsSync(schoolPath)) {
    return { schools: [], aliases: [] };
  }

  const items = JSON.parse(fs.readFileSync(schoolPath, "utf8"));
  const schools = items.map((item, index) => ({
    id: item.external_id || `fixture-school-${index + 1}`,
    name_zh: item.name_zh,
    name_en: item.name_en || null,
    normalized_name: normalizeSchoolName(item.name_zh || item.name_en || ""),
    stage: item.stage,
    district: item.district,
    address_zh: item.address_zh || null,
    is_active: true,
    created_at: null
  }));

  const aliases = schools.flatMap((school) => {
    const results = [];
    if (school.name_en) {
      results.push({
        id: `${school.id}-en`,
        school_id: school.id,
        normalized_alias_name: normalizeSchoolName(school.name_en),
        source: "fixture"
      });
    }
    return results;
  });

  return { schools, aliases };
}

module.exports = {
  assertSyncWritePrerequisites,
  buildSchoolContextFromRecords,
  finishSyncLog,
  getSupabaseAdminClient,
  insertRawData,
  insertSyncLogStart,
  listSchoolsAndAliases
};
