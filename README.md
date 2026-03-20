# HKSchoolPlace

香港学校学位查询 MVP 骨架项目。

## 当前内容

- 文档：产品、API、数据库、抓取同步设计
- Next.js App Router 骨架
- 学校列表页和详情页基础页面
- 后台 `/admin`、`/admin/schools`、`/admin/sync-logs` 页面骨架
- 用户端 API 占位实现
- 后台 `/api/admin/v1/*` 管理接口
- 可切换真实写库 / dry-run 的同步脚本
- Supabase-ready 数据访问层，未配置环境变量时自动回退到 mock 数据

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 复制环境变量

```bash
cp .env.example .env.local
```

3. 启动开发环境

```bash
npm run dev
```

## Supabase 迁移

当前项目已经放好 Supabase 风格的 migration：

- [supabase/migrations/20260318010000_init_schema.sql](/Users/xyz/Documents/hkschoolplace/supabase/migrations/20260318010000_init_schema.sql)
- [supabase/migrations/20260318010100_seed_mock_schools.sql](/Users/xyz/Documents/hkschoolplace/supabase/migrations/20260318010100_seed_mock_schools.sql)

如果你本地有 Supabase CLI，后续可以按这个流程走：

```bash
supabase start
supabase db reset
```

在没有配置 Supabase 环境变量时，公开页面仍可使用 mock 数据，但登录、收藏、对比和后台鉴权不会工作。

## Supabase Auth 登录配置

前端登录态已改为真实 Supabase Auth，会在浏览器建立 session cookie，并由 API route 读取该 session 识别当前用户。

本地需要同时配置以下变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

建议本地先把 `NEXT_PUBLIC_*` 与服务端变量填成同一组项目值。

管理员权限默认读取 Supabase Auth 用户的 metadata：

- `app_metadata.role = "admin"`，或
- `app_metadata.roles` 包含 `"admin"`

如未设置上述 metadata，后台 API 会返回 `403 FORBIDDEN`。

## 后台接口

当前已补齐以下后台接口：

- `GET /api/admin/v1/schools`
- `PATCH /api/admin/v1/schools/:id`
- `GET /api/admin/v1/vacancies`
- `PATCH /api/admin/v1/vacancies/:id`
- `GET /api/admin/v1/aliases`
- `POST /api/admin/v1/aliases`
- `PATCH /api/admin/v1/aliases/:id`
- `GET /api/admin/v1/sync-logs`
- `GET /api/admin/v1/unmatched-records`
- `PATCH /api/admin/v1/unmatched-records/:id`

调试后台接口时，不再支持 `x-demo-role`；需要先通过 Supabase Auth 登录，并为当前用户写入管理员 metadata。

## 同步脚本

同步链路现在区分两种明确模式：

- 真实写库：主路径。配置 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY` 后，默认使用 `--write`
- `dry-run`：辅助模式。显式传 `--dry-run`，不会写库，主要用于 parser / matcher 调试

当前已接入的官方源：

- 学校主数据：`data.gov.hk / School Location and Information` JSON
- vacancy：教育局 `K1-K3 Vacancy` 入口页，脚本会自动发现各区 PDF 并解析

真实写库命令：

```bash
npm run sync:school-master
npm run sync:vacancy
npm run sync:stale
```

dry-run 命令：

```bash
npm run sync:school-master:dry-run
npm run sync:vacancy:dry-run
npm run sync:stale:dry-run
```

临时覆盖数据源：

```bash
node scripts/sync/run-source.js school-master --dry-run --url ./data/sync-fixtures/school-master.json
node scripts/sync/run-source.js vacancy --dry-run --url ./data/sync-fixtures/vacancies-edb.json
node scripts/sync/run-source.js vacancy --dry-run --url /tmp/wan-chai-vacancy.pdf --school-source /tmp/school-live.json
node scripts/sync/run-stale-check.js --write --stale-hours 72
```

说明：

- 写库模式启动前会检查 `schools`、`vacancies`、`raw_data`、`sync_logs`、`unmatched_records`、`school_alias` 是否可访问；缺任何一项都会直接失败，不会静默退回 dry-run
- parser 如果产出 0 条记录，会直接失败，避免把异常源站结果误记成成功
- 当前同步不会删除既有业务数据；源站失败不会清空线上 `schools` 或 `vacancies`
- `--school-source` 或 `SCHOOL_MATCH_SOURCE_URL` 仅用于 vacancy 的 dry-run 匹配索引
- fixture 保留用于 dry-run、本地调试和最小回归验证，不再是主路径

完整运行说明见 [docs/sync.md](/Users/xyz/Documents/hkschoolplace/docs/sync.md)。

相关文件：

- [scripts/sync/run-source.js](/Users/xyz/Documents/hkschoolplace/scripts/sync/run-source.js)
- [scripts/sync/run-stale-check.js](/Users/xyz/Documents/hkschoolplace/scripts/sync/run-stale-check.js)
- [scripts/crawlers/fetch-source.js](/Users/xyz/Documents/hkschoolplace/scripts/crawlers/fetch-source.js)
- [scripts/parsers/parse-school-master.js](/Users/xyz/Documents/hkschoolplace/scripts/parsers/parse-school-master.js)
- [scripts/parsers/parse-vacancy.js](/Users/xyz/Documents/hkschoolplace/scripts/parsers/parse-vacancy.js)
- [scripts/matchers/match-schools.js](/Users/xyz/Documents/hkschoolplace/scripts/matchers/match-schools.js)
- [data/sync-fixtures/school-master.json](/Users/xyz/Documents/hkschoolplace/data/sync-fixtures/school-master.json)
- [data/sync-fixtures/vacancies-edb.json](/Users/xyz/Documents/hkschoolplace/data/sync-fixtures/vacancies-edb.json)

## 下一步建议

- 将 `lib/repositories/school-repository.ts` 拆分为更细的 service / repository
- 把 fixture 同步脚本替换成真实抓取器与写库逻辑

# HK-SchoolPlace
