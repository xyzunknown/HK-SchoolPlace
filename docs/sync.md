# Sync Runbook

本文件说明 HKSchoolPlace 当前同步链路的正式运行方式。

## 运行模式

- 真实写库模式：主路径。配置 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY` 后，使用 `--write`，会真正写入 `schools`、`vacancies`、`raw_data`、`sync_logs`、`unmatched_records`
- dry-run 模式：辅助排查。使用 `--dry-run`，不会写库，主要用于本地调 parser、matcher、源站连通性

当前 `package.json` 约定：

- `npm run sync:school-master`：真实写库
- `npm run sync:vacancy`：真实写库
- `npm run sync:stale`：真实写库
- `npm run sync:school-master:dry-run`：dry-run
- `npm run sync:vacancy:dry-run`：dry-run
- `npm run sync:stale:dry-run`：dry-run

如果直接调用脚本，也遵循同样规则：

```bash
node scripts/sync/run-source.js school-master --write
node scripts/sync/run-source.js vacancy --write
node scripts/sync/run-stale-check.js --write

node scripts/sync/run-source.js school-master --dry-run
node scripts/sync/run-source.js vacancy --dry-run
node scripts/sync/run-stale-check.js --dry-run
```

## 环境变量

真实写库至少需要：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

同步源默认读取：

- `SCHOOL_MASTER_SOURCE_URL`
- `VACANCY_SOURCE_URL`

可选变量：

- `SCHOOL_MATCH_SOURCE_URL`
  只在 vacancy 的 dry-run 下有用，用来加载一份真实学校主数据建立匹配索引；不填则退回本地 fixture 学校数据

## 写库前保护

写库模式开始前会做 preflight：

- 检查 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`
- 检查 `schools`
- 检查 `vacancies`
- 检查 `raw_data`
- 检查 `sync_logs`
- 检查 `unmatched_records`
- 检查 `school_alias`

任一表缺失或 service role 无权限，脚本会直接失败，不会静默退回 dry-run。

此外：

- 抓取失败、解析失败时不会执行业务写入
- parser 产出 0 条记录时会直接失败，避免把“源站结构变了”的情况误记成成功
- 当前同步不会删除既有 `schools` 或 `vacancies` 数据，只会做 insert / update / upsert；源站失败不会把旧线上数据清空

## 常用命令

真实写库：

```bash
npm run sync:school-master
npm run sync:vacancy
npm run sync:stale
```

dry-run：

```bash
npm run sync:school-master:dry-run
npm run sync:vacancy:dry-run
npm run sync:stale:dry-run
```

覆盖 source：

```bash
node scripts/sync/run-source.js school-master --dry-run --url ./data/sync-fixtures/school-master.json
node scripts/sync/run-source.js vacancy --dry-run --url ./data/sync-fixtures/vacancies-edb.json
node scripts/sync/run-source.js vacancy --dry-run --url /tmp/wan-chai-vacancy.pdf --school-source /tmp/school-live.json
```

说明：

- fixture 现在主要用于 dry-run、本地 parser/matcher 调试、最小回归验证
- fixture 不再是同步主路径

## 写库后如何验证

每次脚本完成后会在 stdout 输出：

- `executionMode`
- `wroteToDatabase`
- `syncLogId`
- `rawDataId`
- `verification.recommendedChecks`

建议在 Supabase SQL Editor 执行以下检查。

检查最近一次日志：

```sql
select id, source, run_type, status, records_fetched, records_parsed, records_matched, records_updated, message, started_at, finished_at
from sync_logs
order by started_at desc
limit 10;
```

检查原始抓取内容：

```sql
select id, source, source_type, status, fetched_at, error_message
from raw_data
order by fetched_at desc
limit 10;
```

检查学校主数据：

```sql
select id, name_zh, district, updated_at
from schools
order by updated_at desc
limit 20;
```

检查 vacancy：

```sql
select id, school_id, grade, status, source, effective_date, updated_at, is_stale
from vacancies
order by updated_at desc
limit 20;
```

检查未匹配记录：

```sql
select id, source, raw_name, normalized_name, status, suggested_school_id, raw_data_id, created_at
from unmatched_records
order by created_at desc
limit 20;
```

## 推荐运行顺序

首次接真实库时，建议：

1. `npm run sync:school-master`
2. `npm run sync:vacancy`
3. `npm run sync:stale`
4. 打开后台 `/admin/sync-logs`
5. 在 Supabase SQL Editor 核对 `sync_logs`、`raw_data`、`unmatched_records`

## 最小验证建议

如果要先验证链路本身，再跑真实源：

1. 先跑 `npm run sync:school-master:dry-run`
2. 再跑 `npm run sync:vacancy:dry-run`
3. 确认 parser / matcher 输出正常后，再执行真实写库命令
