#!/usr/bin/env node

const path = require("path");

const {
  assertSyncWritePrerequisites,
  buildSchoolContextFromRecords,
  finishSyncLog,
  getSupabaseAdminClient,
  insertRawData,
  insertSyncLogStart,
  listSchoolsAndAliases
} = require("./lib/db");
const { buildSchoolIndexes, findExistingSchoolForMasterRecord, matchVacancyRecord } = require("../matchers/match-schools");
const { printResult, summarizeError } = require("./lib/output");
const { persistSchoolMaster, persistUnmatchedRecords, persistVacancies } = require("./lib/persist");
const { createRuntime } = require("./lib/runtime");
const { sourceConfigs } = require("./config");

main().catch((error) => {
  printResult(summarizeError(error, "run-source"));
  process.exit(1);
});

async function main() {
  const runtime = createRuntime(process.argv);
  const config = sourceConfigs[runtime.mode];

  if (!config) {
    throw new Error(`Unsupported sync mode: ${runtime.mode}`);
  }

  const parserModule = require(path.join(__dirname, config.parserModule));
  const parse = parserModule[config.parserExport];
  const crawlerModule = require(path.join(__dirname, config.crawlerModule));
  const crawl = crawlerModule[config.crawlerExport];
  const client = runtime.isWriteMode ? getSupabaseAdminClient(runtime.env) : null;
  const startedAt = runtime.now.toISOString();

  if (runtime.isWriteMode) {
    await assertSyncWritePrerequisites(client);
  }

  const log = await insertSyncLogStart(client, {
    source: config.sourceLabel,
    run_type: config.syncType,
    started_at: startedAt,
    message: runtime.isDryRun ? "dry-run mode" : null
  });

  let rawDataId = null;

  try {
    const raw = await crawl(config, runtime);
    const parsed = parse(raw);
    assertParsedRecords(parsed, config);

    rawDataId = (await insertRawData(client, {
      source: config.sourceLabel,
      source_type: config.syncType,
      payload: serializeRawPayload(raw),
      status: "success"
    })).id;

    const schoolContext = await loadSchoolContext(runtime, client);
    const indexes = buildSchoolIndexes(schoolContext.schools, schoolContext.aliases);

    let updated = 0;
    let matched = 0;
    let unmatched = [];

    if (runtime.mode === "school-master") {
      const result = await persistSchoolMaster(client, parsed, {
        findExistingSchool(record) {
          return findExistingSchoolForMasterRecord(record, indexes);
        }
      });
      updated = result.updated;
      matched = result.updated;
      unmatched = result.unmatched;
    }

    if (runtime.mode === "vacancy") {
      const matchResults = parsed.map((record) => ({
        record,
        ...matchVacancyRecord(record, indexes)
      }));
      matched = matchResults.filter((item) => item.school).length;

      const result = await persistVacancies(client, matchResults, {
        now: startedAt
      });
      updated = result.updated;
      unmatched = result.unmatched;
    }

    if (unmatched.length > 0) {
      await persistUnmatchedRecords(client, unmatched, rawDataId, parsed[0]?.stage || "kg");
    }

    const finalStatus = unmatched.length > 0 ? "partial_success" : "success";
    await finishSyncLog(client, log.id, {
      status: finalStatus,
      records_fetched: parsed.length,
      records_parsed: parsed.length,
      records_matched: matched,
      records_updated: updated,
      message: unmatched.length > 0 ? `${unmatched.length} unmatched record(s)` : null,
      finished_at: new Date().toISOString()
    });

    printResult({
      ok: true,
      mode: runtime.mode,
      executionMode: runtime.executionMode,
      dryRun: runtime.isDryRun,
      wroteToDatabase: runtime.isWriteMode,
      source: config.sourceLabel,
      target: resolveTarget(runtime, config),
      recordsFetched: parsed.length,
      recordsParsed: parsed.length,
      recordsMatched: matched,
      recordsUpdated: updated,
      unmatched,
      syncLogId: log.id,
      rawDataId,
      verification: buildSyncVerification({
        runtime,
        logId: log.id,
        rawDataId,
        unmatchedCount: unmatched.length
      })
    });
  } catch (error) {
    await insertRawData(client, {
      source: config.sourceLabel,
      source_type: config.syncType,
      payload: {
        target: resolveTarget(runtime, config)
      },
      status: "fail",
      error_message: error instanceof Error ? error.message : String(error)
    }).catch(() => null);

    await finishSyncLog(client, log.id, {
      status: "fail",
      records_fetched: 0,
      records_parsed: 0,
      records_matched: 0,
      records_updated: 0,
      message: error instanceof Error ? error.message : String(error),
      finished_at: new Date().toISOString()
    }).catch(() => null);

    throw error;
  }
}

function resolveTarget(runtime, config) {
  return (
    runtime.options.url ||
    runtime.env[config.envUrlKey] ||
    (runtime.isDryRun ? config.fixturePath : config.defaultUrl) ||
    config.defaultUrl ||
    config.fixturePath
  );
}

function assertParsedRecords(parsed, config) {
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Parsed zero records for ${config.name}; aborting before any data mutation`);
  }
}

async function loadSchoolContext(runtime, client) {
  if (client) {
    return listSchoolsAndAliases(client);
  }

  if (runtime.mode === "school-master") {
    return listSchoolsAndAliases(client);
  }

  const schoolSourceConfig = sourceConfigs["school-master"];
  const crawlerModule = require(path.join(__dirname, schoolSourceConfig.crawlerModule));
  const parserModule = require(path.join(__dirname, schoolSourceConfig.parserModule));
  const crawl = crawlerModule[schoolSourceConfig.crawlerExport];
  const parse = parserModule[schoolSourceConfig.parserExport];

  const schoolRuntime = {
    ...runtime,
    options: {
      ...runtime.options,
      url: runtime.options.schoolSource || runtime.env.SCHOOL_MATCH_SOURCE_URL || null
    }
  };

  const raw = await crawl(schoolSourceConfig, schoolRuntime);
  const parsed = parse(raw);
  return buildSchoolContextFromRecords(parsed);
}

function serializeRawPayload(raw) {
  if (raw.sourceType === "edb_vacancy_pdf_bundle") {
    return {
      target: raw.target,
      source_type: raw.sourceType,
      documents: raw.documents.map((item) => ({
        url: item.url,
        text: item.text
      }))
    };
  }

  return {
    target: raw.target,
    source_type: raw.sourceType || "generic",
    content_type: raw.contentType,
    body: raw.bodyText
  };
}

function buildSyncVerification({ runtime, logId, rawDataId, unmatchedCount }) {
  if (runtime.isDryRun) {
    return {
      summary: "dry-run only; database tables were not modified",
      nextCommand: `node scripts/sync/run-source.js ${runtime.mode} --write`
    };
  }

  return {
    summary: "write mode completed; verify sync_logs, raw_data and business tables in Supabase",
    syncLogId: logId,
    rawDataId,
    unmatchedCount,
    tables: ["schools", "vacancies", "raw_data", "sync_logs", "unmatched_records"],
    recommendedChecks: [
      `select * from sync_logs where id = '${logId}';`,
      rawDataId ? `select * from raw_data where id = '${rawDataId}';` : null,
      unmatchedCount > 0 ? "select * from unmatched_records order by created_at desc limit 20;" : "select * from vacancies order by updated_at desc limit 20;"
    ].filter(Boolean)
  };
}
