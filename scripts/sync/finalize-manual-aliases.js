#!/usr/bin/env node

const { getSupabaseAdminClient } = require("./lib/db");
const { normalizeSchoolName } = require("./lib/normalize");
const { createRuntime } = require("./lib/runtime");

const FINAL_MAPPINGS = [
  {
    raw_name: "柴灣浸信會學前教育中心呂明才幼稚園",
    school_id: "ab7a63e9-6f38-4e60-b87e-33856eaf5045"
  },
  {
    raw_name: "聖文嘉中英文幼稚園",
    school_id: "b92f15f8-9b01-4071-9f4f-1d6e21fd55f3"
  },
  {
    raw_name: "藍如溪盛成皿教育基金邊耀良幼稚園",
    school_id: "8c5c9ef4-f59a-4df7-8c0d-28855ea4e4e6"
  },
  {
    raw_name: "中華基督教會福幼第二幼稚園",
    school_id: "90e9cb61-f620-44c5-9f84-d17cee7725be"
  },
  {
    raw_name: "基督教安得兒幼稚園",
    school_id: "e4e95a46-780c-4621-a3e8-37033eeecdb5"
  },
  {
    raw_name: "救世軍大元幼兒學校",
    school_id: "0a762b76-ff94-4022-8a83-7d1cc39f7ad8"
  },
  {
    raw_name: "力行幼稚園（梅窩鄉事會路）",
    school_id: "7028e33c-4241-484e-bf04-1354bd42b810"
  },
  {
    raw_name: "宣道會上書房中英文幼稚園",
    school_id: "1db4709e-3965-481d-8c8d-85b4ed739604"
  },
  {
    raw_name: "啓思幼稚園（杏花邨）",
    school_id: "f1c2cff7-7a44-48ec-ae1f-de0bf815b707"
  },
  {
    raw_name: "明我幼稚園（海寧街）",
    school_id: "0980099c-1b9a-4b94-a745-8affd9745e74"
  },
  {
    raw_name: "明我幼稚園（西灣河街）",
    school_id: "c5a8c336-1b61-4c37-af65-654a68f8cdd6"
  }
];

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

  const normalizedNames = FINAL_MAPPINGS.map((item) => normalizeSchoolName(item.raw_name));
  const { data: existingAliases, error: aliasError } = await client
    .from("school_alias")
    .select("id, school_id, alias_name, normalized_alias_name")
    .in("normalized_alias_name", normalizedNames);

  if (aliasError) {
    throw new Error(`Failed to load existing aliases: ${aliasError.message}`);
  }

  const aliasKeys = new Set(
    (existingAliases || []).map((item) => `${item.school_id}::${item.normalized_alias_name}`)
  );
  const aliasesByName = new Map((existingAliases || []).map((item) => [item.alias_name, item]));
  const aliasesByNormalized = new Map(
    (existingAliases || []).map((item) => [item.normalized_alias_name, item])
  );

  const aliasInserts = [];
  const aliasUpdates = [];
  for (const item of FINAL_MAPPINGS) {
    const normalized = normalizeSchoolName(item.raw_name);
    const existing = aliasesByName.get(item.raw_name);
    if (existing) {
      if (existing.school_id !== item.school_id) {
        aliasUpdates.push({
          id: existing.id,
          school_id: item.school_id,
          alias_name: item.raw_name,
          normalized_alias_name: normalized
        });
      }
      continue;
    }

    const normalizedExisting = aliasesByNormalized.get(normalized);
    if (normalizedExisting) {
      if (
        normalizedExisting.school_id !== item.school_id ||
        normalizedExisting.alias_name !== item.raw_name
      ) {
        aliasUpdates.push({
          id: normalizedExisting.id,
          school_id: item.school_id,
          alias_name: item.raw_name,
          normalized_alias_name: normalized
        });
      }
      continue;
    }

    if (!aliasKeys.has(`${item.school_id}::${normalized}`)) {
      aliasInserts.push({
        school_id: item.school_id,
        alias_name: item.raw_name,
        normalized_alias_name: normalized,
        source: "manual"
      });
    }
  }

  if (aliasInserts.length > 0) {
    const { error } = await client.from("school_alias").insert(aliasInserts);
    if (error) {
      throw new Error(`Failed to insert final aliases: ${error.message}`);
    }
  }

  for (const item of aliasUpdates) {
    const { error } = await client
      .from("school_alias")
      .update({
        school_id: item.school_id,
        alias_name: item.alias_name,
        normalized_alias_name: item.normalized_alias_name
      })
      .eq("id", item.id);

    if (error) {
      throw new Error(`Failed to update alias ${item.id}: ${error.message}`);
    }
  }

  let resolved = 0;
  for (const item of FINAL_MAPPINGS) {
    const { error, count } = await client
      .from("unmatched_records")
      .update({
        status: "resolved",
        resolved_school_id: item.school_id,
        suggested_school_id: item.school_id
      }, { count: "exact" })
      .eq("status", "pending")
      .eq("raw_name", item.raw_name);

    if (error) {
      throw new Error(`Failed to resolve ${item.raw_name}: ${error.message}`);
    }
    resolved += count || 0;
  }

  console.log(
    JSON.stringify(
        {
          aliasesInserted: aliasInserts.length,
          aliasesUpdated: aliasUpdates.length,
          resolved,
          mappings: FINAL_MAPPINGS
        },
      null,
      2
    )
  );
}
