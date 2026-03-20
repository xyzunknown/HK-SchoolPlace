# AI Handoff

## 1. 项目概览

- 项目名：HKSchoolPlace
- 技术栈：Next.js 15 App Router、React 19、TypeScript、Supabase
- 当前阶段：可运营 MVP，已完成真实链路与一轮后台/前台体验增强
- 当前状态：真实 Supabase Auth、后台运营页、用户端关键体验增强均已落地；P2 扩展项暂未启动

## 2. 单一事实来源

优先级从高到低：

1. 本文件 `AI_HANDOFF.md`
2. `TODO.md`
3. `PLAN.md`
4. `开发需求文档.md`
5. `API详细设计.md`
6. `抓取同步设计.md`
7. 代码现状

说明：

- 如果文档与代码不一致，以本文件对“当前真实状态”的描述为准。
- 如果 PRD/API 文档描述的是目标态，而代码尚未完成，应优先按照 `TODO.md` 与 `PLAN.md` 推进，不要擅自假设“已完成”。

## 3. 当前真实状态

### 3.1 已验证可运行

- 首页 `/`
- 学校列表页 `/schools`
- 学校详情页 `/schools/[id]`
- 收藏页 `/favorites`
- 对比页 `/compare`
- 后台首页 `/admin`
- 后台学校列表 `/admin/schools`
- 后台学校编辑页 `/admin/schools/[id]`
- 后台 vacancy 管理页 `/admin/vacancies`
- 后台同步日志 `/admin/sync-logs`
- 用户端 API 路由与后台 API 路由均已存在
- Supabase migration 已存在
- 同步脚本可运行，支持显式 `--write` / `--dry-run`，默认 npm 命令已切到真实写库主路径

### 3.2 仍然是 mock / demo 的部分

- 收藏与对比在未配置 Supabase 环境变量时仍可回退到内存 mock 数据，仅供本地无 Supabase 配置时演示
- 后台首页统计在未配置 Supabase 环境时仍会回退 mock 数据

### 3.3 部分完成但未闭环

- 收藏/对比接口与 `/favorites`、`/compare` 页面已基于 Supabase session + 真实用户数据工作
- 学校列表 `GET /api/v1/schools` 与详情 `GET /api/v1/schools/:id` 已能基于当前用户返回真实 `isFavorited`、`isInComparison`
- 学校列表卡片与详情页操作按钮已使用服务端返回的真实初始用户态；登录态变化后列表会重新拉取，按钮本地状态也会随 prop 同步
- 收藏/对比仅在未配置 Supabase 环境变量时才回退到内存 mock；一旦配置 Supabase，将不再把 mock 当主链路
- 数据层仍同时承载 mock 回退、Supabase 查询、排序与映射，后续可再拆职责
- 同步脚本在配置 `SUPABASE_SERVICE_ROLE_KEY` 后，默认 npm 运行路径已切到真实写库；dry-run 与 fixture 仅保留作调试/验证辅助
- 后台 Alias / unmatched record 已补齐页面闭环；学校编辑、vacancy 处理和日志排查也已形成后台操作流
- 首页已补快速搜索面板；列表页与详情页已完成一轮体验增强

## 4. 当前页面状态

### 4.1 用户端

| 页面 | 状态 | 说明 |
| --- | --- | --- |
| `/` | 可用 | MVP 入口页，已补快速搜索面板与热门地区快捷入口 |
| `/schools` | 可用 | 支持搜索、筛选、排序、分页、学段切换、结果摘要 |
| `/schools/[id]` | 可用 | 展示 vacancy 和学校资料，支持收藏/对比，首屏已补摘要卡片 |
| `/favorites` | 可用 | 已接真实收藏数据，支持未登录、空态、错误态 |
| `/compare` | 可用 | 已接真实对比数据，支持未登录、空态、错误态 |

### 4.2 后台

| 页面 | 状态 | 说明 |
| --- | --- | --- |
| `/admin` | 可用 | 已补待处理指标、快捷入口与运营重点 |
| `/admin/schools` | 可用 | 支持筛选、进入学校编辑页、跳转前台 |
| `/admin/schools/[id]` | 可用 | 支持编辑学校主资料与展示状态 |
| `/admin/vacancies` | 可用 | 支持筛选 vacancy、维护 stale 状态与 admin note |
| `/admin/sync-logs` | 可用 | 支持来源/状态筛选，并提供失败排查快捷入口 |
| `/admin/aliases` | 可用 | 支持列表、关键字筛选、创建 alias、编辑 alias |
| `/admin/unmatched-records` | 可用 | 支持列表、狀態篩選、查看建議學校、resolve / ignore，resolve 時可選建立 alias |

## 5. 当前 API 状态

### 5.1 用户端 API

| 接口 | 状态 | 说明 |
| --- | --- | --- |
| `GET /api/v1/schools` | 可用 | 支持 stage、筛选、排序、分页，并按当前用户返回真实 `isFavorited` / `isInComparison` |
| `GET /api/v1/schools/:id` | 可用 | 返回学校详情，并按当前用户返回真实 `isFavorited` / `isInComparison` |
| `GET /api/v1/filters` | 可用 | 返回筛选项 |
| `GET/POST /api/v1/favorites` | 可用 | 基于 Supabase session 识别用户并读写真实 favorites |
| `DELETE /api/v1/favorites/:school_id` | 可用 | 基于 Supabase session 删除真实 favorites |
| `GET/POST /api/v1/comparisons` | 可用 | 基于 Supabase session 识别用户并读写真实 comparisons |
| `DELETE /api/v1/comparisons/:school_id` | 可用 | 基于 Supabase session 删除真实 comparisons |

已知差距：

- `favorites` / `comparisons` migration 已有表结构与 comparisons 上限 trigger，但当前仓库里未看到 RLS policy 定义；当前仓库仍按服务端 session + 用户 id 读写实现

### 5.2 后台 API

| 接口 | 状态 | 说明 |
| --- | --- | --- |
| `GET /api/admin/v1/schools` | 可用 | 列表存在 |
| `PATCH /api/admin/v1/schools/:id` | 可用 | repository 已支持更新 |
| `GET /api/admin/v1/vacancies` | 可用 | 列表存在 |
| `PATCH /api/admin/v1/vacancies/:id` | 可用 | 支持改 `is_stale` / `admin_note` |
| `GET /api/admin/v1/aliases` | 可用 | 列表存在 |
| `POST /api/admin/v1/aliases` | 可用 | 可创建 alias |
| `PATCH /api/admin/v1/aliases/:id` | 可用 | 可更新 alias |
| `GET /api/admin/v1/sync-logs` | 可用 | 可读日志 |
| `GET /api/admin/v1/unmatched-records` | 可用 | 可读未匹配记录 |
| `PATCH /api/admin/v1/unmatched-records/:id` | 可用 | 可 resolve / ignore |

已知差距：

- 后台鉴权已改为 Supabase session + 用户 metadata 角色校验
- 后台页面已覆盖学校管理、vacancy 管理、Alias、unmatched record、sync logs 的核心操作流

## 6. 当前数据层状态

### 6.1 Supabase

- 已存在 migration
- `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 已在 `.env.example` 中声明
- 真实鉴权额外需要 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
- API route 通过 Supabase session cookie 还原当前用户

### 6.2 Mock 回退

- 无 Supabase 环境时，学校列表、详情、收藏、对比、后台数据仍可回退到本地 mock
- 收藏/对比在已配置 Supabase 环境时不再回退 mock 主链路；mock 仅用于本地未配置 Supabase 的演示与静态开发
- 这使项目便于演示，但也导致“真实完成度”容易被误判

### 6.3 代码组织风险

- `lib/repositories/school-repository.ts` 同时负责 mock、Supabase、筛选、排序
- `lib/demo-auth.ts` 文件名仍保留，但内部已改为真实 Supabase Auth hook；后续可再更名清理

## 7. 当前同步链路状态

### 7.1 已有能力

- 学校主数据同步脚本
- vacancy 同步脚本
- stale 检查脚本
- raw_data / sync_logs / unmatched_records 写入逻辑
- vacancy upsert 写库逻辑
- school master insert / update 写库逻辑

### 7.2 当前默认体验

- `npm run sync:school-master`、`npm run sync:vacancy`、`npm run sync:stale` 默认都走 `--write`
- `npm run sync:*:dry-run` 明确作为不写库辅助模式
- fixture 保留用于 parser / matcher 调试和最小回归，不再是同步主路径
- 写库前会先检查 `schools`、`vacancies`、`raw_data`、`sync_logs`、`unmatched_records`、`school_alias` 可访问性，缺项会直接失败

### 7.3 已知缺口

- 缺少同步链路自动化测试
- 回滚仍以人工 SQL / 备份策略为主，尚未建立一键回滚脚本

## 8. 当前测试与工程保障

- 已验证：类型检查、生产构建
- 未建立：单元测试
- 未建立：API 集成测试
- 未建立：同步脚本回归测试
- 未建立：部署文档 / 运维手册

## 9. 给下一个 AI 的工作原则

1. 先看本文件，再看 `TODO.md` 与 `PLAN.md`。
2. 不要默认把 mock 逻辑当作正式实现。
3. 除非明确要求，不要同时改鉴权、前端、后台、同步脚本多个大模块。
4. 每次只完成一个垂直切片，并补最少验证。
5. 如果发现 PRD 与代码不一致，先更新文档状态，再改代码。

## 10. 明确不该做的事

- 不要先大规模重构 UI
- 不要先做地图、推荐、复杂搜索
- 不要在未接真实 auth 前扩展更多用户态功能
- 不要在没有测试或验证脚本的情况下大改同步逻辑

## 11. 推荐下一步

按 `PLAN.md` 继续推进 P2 前的收口工作：

1. 为 P0/P1 现有能力补最少自动化测试
2. 再补部署 / 运维文档
3. 评估是否继续保留剩余 mock 回退
