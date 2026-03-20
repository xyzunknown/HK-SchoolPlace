#!/usr/bin/env node

const { assertSyncWritePrerequisites, finishSyncLog, getSupabaseAdminClient, insertSyncLogStart } = require("./lib/db");
const { printResult, summarizeError } = require("./lib/output");
const { markVacanciesStale } = require("./lib/persist");
const { createRuntime } = require("./lib/runtime");

main().catch((error) => {
  printResult(summarizeError(error, "run-stale-check"));
  process.exit(1);
});

async function main() {
  const runtime = createRuntime(process.argv);
  const client = runtime.isWriteMode ? getSupabaseAdminClient(runtime.env) : null;
  const startedAt = runtime.now.toISOString();
  const hours = runtime.options.staleHours;

  if (runtime.isWriteMode) {
    await assertSyncWritePrerequisites(client);
  }

  const log = await insertSyncLogStart(client, {
    source: "system",
    run_type: "stale_check",
    started_at: startedAt,
    message: runtime.isDryRun ? "dry-run mode" : null
  });

  try {
    const result = await markVacanciesStale(client, hours, startedAt);

    await finishSyncLog(client, log.id, {
      status: "success",
      records_fetched: 0,
      records_parsed: 0,
      records_matched: result.updated,
      records_updated: result.updated,
      message: result.threshold ? `threshold=${result.threshold}` : null,
      finished_at: new Date().toISOString()
    });

    printResult({
      ok: true,
      executionMode: runtime.executionMode,
      dryRun: runtime.isDryRun,
      wroteToDatabase: runtime.isWriteMode,
      staleHours: hours,
      threshold: result.threshold || null,
      updated: result.updated,
      syncLogId: log.id,
      verification: buildVerification(runtime, log.id, result.threshold)
    });
  } catch (error) {
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

function buildVerification(runtime, logId, threshold) {
  if (runtime.isDryRun) {
    return {
      summary: "dry-run only; vacancy rows were not modified",
      nextCommand: "node scripts/sync/run-stale-check.js --write"
    };
  }

  return {
    summary: "write mode completed; verify sync_logs and stale vacancy rows in Supabase",
    syncLogId: logId,
    threshold,
    tables: ["vacancies", "sync_logs"],
    recommendedChecks: [
      `select * from sync_logs where id = '${logId}';`,
      threshold
        ? `select id, school_id, grade, updated_at, is_stale from vacancies where updated_at < '${threshold}' order by updated_at asc limit 20;`
        : "select id, school_id, grade, updated_at, is_stale from vacancies order by updated_at desc limit 20;"
    ]
  };
}
