# HKSchoolPlace API 详细设计

## 1. 文档目标

本文档定义 HKSchoolPlace MVP 阶段的接口约定，供前后端并行开发使用。

目标：
- 明确请求参数和返回结构
- 明确鉴权要求
- 明确错误码和状态码
- 明确列表页、详情页、收藏、对比、后台操作接口

接口前缀：
- 用户端：`/api/v1`
- 后台端：`/api/admin/v1`

数据格式：
- 请求和响应均使用 `application/json`
- 时间字段统一使用 ISO 8601，带时区

## 2. 通用约定

### 2.1 状态码

- `200 OK`：读取成功
- `201 Created`：创建成功
- `400 Bad Request`：请求参数错误
- `401 Unauthorized`：未登录
- `403 Forbidden`：无权限
- `404 Not Found`：资源不存在
- `409 Conflict`：资源状态冲突
- `422 Unprocessable Entity`：业务校验失败
- `500 Internal Server Error`：服务端错误

### 2.2 通用错误返回

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "stage is required"
  }
}
```

### 2.3 分页约定

请求参数：
- `page`：默认 `1`
- `page_size`：默认 `20`，最大 `50`

响应格式：

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

### 2.4 鉴权

- 用户接口中的收藏、对比、收藏列表、对比列表接口要求登录
- 后台接口要求管理员权限（`users.role = 'admin'`）
- 用户身份以服务端 session 或 token 解析结果为准，不信任前端传入 `user_id`
- 登录方式：Google OAuth（通过 Supabase Auth）
- 后台接口中间件需检查当前用户 `role = 'admin'`，非管理员返回 `403`

## 3. 枚举定义

### 3.1 学段

- `kg`
- `primary`
- `secondary`

### 3.2 Vacancy 状态

- `available`
- `waiting`
- `full`
- `unknown`

### 3.3 推荐排序

- `recommended`
- `updated_desc`
- `name_asc`

## 4. 用户端接口

## 4.1 获取学校列表

### `GET /api/v1/schools`

用途：
- 列表页获取学校结果

Query 参数：
- `stage` string required
- `district` string optional
- `keyword` string optional
- `has_vacancy` boolean optional
- `school_type` string optional
- `session_type` string optional
- `school_net` string optional
- `band` string optional
- `page` integer optional
- `page_size` integer optional
- `sort` string optional

规则：
- `stage` 必填
- `sort` 仅允许 `recommended`、`updated_desc`、`name_asc`
- `has_vacancy=true` 表示仅返回存在 `available` 状态 vacancy 的学校

成功响应示例：

```json
{
  "data": [
    {
      "id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001",
      "name_zh": "ABC幼稚园",
      "name_en": "ABC Kindergarten",
      "stage": "kg",
      "district": "九龙城",
      "school_type": "非牟利",
      "session_type": "全日",
      "school_net": null,
      "band": null,
      "is_favorited": false,
      "is_in_comparison": false,
      "vacancy": {
        "grade": "K1",
        "status": "available",
        "count": 8,
        "updated_at": "2026-03-18T10:00:00+08:00",
        "is_stale": false,
        "source": "edb"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 145,
    "total_pages": 8
  }
}
```

失败情况：
- 缺少 `stage` 返回 `400`
- `page_size > 50` 返回 `400`

## 4.2 获取学校详情

### `GET /api/v1/schools/:id`

用途：
- 详情页获取学校详细信息

路径参数：
- `id` UUID required

成功响应示例：

```json
{
  "data": {
    "id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001",
    "name_zh": "ABC幼稚园",
    "name_en": "ABC Kindergarten",
    "stage": "kg",
    "district": "九龙城",
    "address_zh": "九龙城示例路 1 号",
    "address_en": null,
    "phone": "1234 5678",
    "website": "https://example.edu.hk",
    "school_type": "非牟利",
    "session_type": "全日",
    "school_net": null,
    "band": null,
    "tuition_fee": 2800,
    "curriculum": null,
    "is_scheme_participant": true,
    "is_favorited": false,
    "is_in_comparison": false,
    "vacancies": [
      {
        "id": "c47e0fd2-e560-40f9-8b1a-7aa9f53c2001",
        "grade": "K1",
        "status": "available",
        "count": 8,
        "updated_at": "2026-03-18T10:00:00+08:00",
        "is_stale": false,
        "source": "edb"
      }
    ]
  }
}
```

失败情况：
- 学校不存在返回 `404`

## 4.3 获取筛选项

### `GET /api/v1/filters`

用途：
- 首页和列表页获取筛选器选项

可选 Query 参数：
- `stage` string optional

成功响应示例：

```json
{
  "data": {
    "districts": ["中西区", "湾仔", "九龙城"],
    "school_types": ["官立", "津贴", "私立", "非牟利"],
    "session_types": ["全日", "半日"],
    "school_nets": ["34", "41"],
    "bands": ["1", "2", "3"]
  }
}
```

## 4.4 创建收藏

### `POST /api/v1/favorites`

鉴权：
- 需要登录

请求体：

```json
{
  "school_id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001"
}
```

成功响应：

```json
{
  "data": {
    "school_id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001",
    "favorited": true
  }
}
```

规则：
- 若已收藏，返回 `200`，不重复创建
- 若学校不存在，返回 `404`

## 4.5 取消收藏

### `DELETE /api/v1/favorites/:school_id`

鉴权：
- 需要登录

成功响应：

```json
{
  "data": {
    "school_id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001",
    "favorited": false
  }
}
```

规则：
- 即使原本不存在，也可返回 `200`

## 4.6 获取我的收藏

### `GET /api/v1/favorites`

鉴权：
- 需要登录

成功响应示例：

```json
{
  "data": [
    {
      "id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001",
      "name_zh": "ABC幼稚园",
      "name_en": "ABC Kindergarten",
      "stage": "kg",
      "district": "九龙城",
      "school_type": "非牟利",
      "session_type": "全日",
      "school_net": null,
      "band": null,
      "is_favorited": true,
      "is_in_comparison": false,
      "favorited_at": "2026-03-15T14:30:00+08:00",
      "vacancy": {
        "grade": "K1",
        "status": "available",
        "count": 8,
        "updated_at": "2026-03-18T10:00:00+08:00",
        "is_stale": false,
        "source": "edb"
      }
    }
  ]
}
```

说明：
- 返回结构复用学校列表卡片结构，增加 `favorited_at` 字段
- 按收藏时间倒序排列（最新收藏在前）
- 无分页（MVP 阶段收藏数量不会太多）

## 4.7 创建对比项

### `POST /api/v1/comparisons`

鉴权：
- 需要登录

请求体：

```json
{
  "school_id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001"
}
```

成功响应：

```json
{
  "data": {
    "school_id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001",
    "in_comparison": true,
    "total": 3
  }
}
```

规则：
- 同一用户最多 5 条
- 超限返回 `422`
- 已存在则返回 `200`

错误示例：

```json
{
  "error": {
    "code": "COMPARISON_LIMIT_REACHED",
    "message": "comparison limit is 5"
  }
}
```

## 4.8 删除对比项

### `DELETE /api/v1/comparisons/:school_id`

鉴权：
- 需要登录

成功响应：

```json
{
  "data": {
    "school_id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001",
    "in_comparison": false
  }
}
```

## 4.9 获取我的对比列表

### `GET /api/v1/comparisons`

鉴权：
- 需要登录

成功响应示例：

```json
{
  "data": [
    {
      "id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001",
      "name_zh": "ABC幼稚园",
      "name_en": "ABC Kindergarten",
      "stage": "kg",
      "district": "九龙城",
      "school_type": "非牟利",
      "session_type": "全日",
      "school_net": null,
      "band": null,
      "tuition_fee": 2800,
      "is_scheme_participant": true,
      "vacancy": {
        "grade": "K1",
        "status": "available",
        "count": 8,
        "updated_at": "2026-03-18T10:00:00+08:00",
        "is_stale": false
      }
    }
  ]
}
```

说明：
- 对比列表返回比普通列表更多的字段（学费、是否参加计划等），用于对比表格展示
- 按加入对比的时间正序排列
- 无分页（最多 5 条）

## 5. 后台接口

后台接口全部要求管理员权限。

## 5.1 获取学校列表

### `GET /api/admin/v1/schools`

用途：
- 后台学校管理列表

支持：
- `keyword`
- `stage`
- `district`
- `is_active`
- `page`
- `page_size`

返回：
- 包含基础学校信息
- 包含最近 vacancy 更新时间

## 5.2 更新学校

### `PATCH /api/admin/v1/schools/:id`

可更新字段：
- `name_zh`
- `name_en`
- `district`
- `address_zh`
- `address_en`
- `phone`
- `website`
- `school_type`
- `session_type`
- `school_net`
- `band`
- `tuition_fee`
- `curriculum`
- `is_scheme_participant`
- `is_active`

请求示例：

```json
{
  "district": "九龙城",
  "website": "https://example.edu.hk",
  "is_active": true
}
```

## 5.3 获取 vacancy 列表

### `GET /api/admin/v1/vacancies`

支持：
- `school_id`
- `status`
- `source`
- `is_stale`
- `page`
- `page_size`

## 5.4 更新 vacancy

### `PATCH /api/admin/v1/vacancies/:id`

MVP 建议仅允许以下能力：
- 标记 `is_stale`
- 备注异常

说明：
- MVP 不建议后台随意手改核心 vacancy 数值，避免与同步逻辑冲突

## 5.5 获取 alias 列表

### `GET /api/admin/v1/aliases`

支持：
- `keyword`
- `school_id`
- `source`

## 5.6 创建 alias

### `POST /api/admin/v1/aliases`

请求示例：

```json
{
  "school_id": "e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001",
  "alias_name": "ABC KG",
  "source": "manual"
}
```

规则：
- 服务端需生成 `normalized_alias_name`

## 5.7 更新 alias

### `PATCH /api/admin/v1/aliases/:id`

可更新：
- `alias_name`
- `school_id`

## 5.8 获取同步日志

### `GET /api/admin/v1/sync-logs`

支持：
- `source`
- `status`
- `page`
- `page_size`

响应应包含：
- 开始时间
- 完成时间
- 抓取数量
- 解析数量
- 匹配数量
- 更新数量
- 错误信息

## 6. 服务端实现建议

### 6.1 列表页推荐排序

`recommended` 建议按以下优先级排序：
1. `vacancy.status = available`
2. `vacancy.updated_at desc`
3. `schools.name_zh asc`

### 6.2 Vacancy 聚合规则

列表页通常只展示一个主 vacancy，可采用：
- 幼稚园优先显示 `K1`
- 小学优先显示 `P1`
- 中学优先显示与入学年级相关的 vacancy

详情页则返回该学校全部 vacancy 记录。

### 6.3 缓存建议

可缓存：
- `/api/v1/filters`
- 热门列表页查询

不建议缓存：
- 收藏/对比接口

## 7. 已确认事项

以下问题已确认（详见 `docs/MVP决策记录.md`）：

- MVP 第一版仅上线幼稚园数据，API 参数层面支持三学段
- 登录方案：Google OAuth（Supabase Auth）
- 不做推荐学校接口
- 后台不允许直接修改 vacancy 核心数值（status/count），仅允许标记 stale 和备注

## 8. 后台未匹配记录接口

### 8.1 获取未匹配记录列表

### `GET /api/admin/v1/unmatched-records`

用途：
- 后台管理员查看抓取过程中无法匹配的学校记录

支持：
- `source` string optional
- `status` string optional（`pending` / `resolved` / `ignored`）
- `page` integer optional
- `page_size` integer optional

成功响应示例：

```json
{
  “data”: [
    {
      “id”: “a1b2c3d4-...”,
      “source”: “edb”,
      “raw_name”: “ABC KG (分校)”,
      “normalized_name”: “abc kg 分校”,
      “stage”: “kg”,
      “district”: “九龙城”,
      “grade”: “K1”,
      “suggested_school_id”: “e6f87f6f-...”,
      “suggested_school_name”: “ABC幼稚园”,
      “status”: “pending”,
      “created_at”: “2026-03-18T10:00:00+08:00”
    }
  ],
  “pagination”: {
    “page”: 1,
    “page_size”: 20,
    “total”: 5,
    “total_pages”: 1
  }
}
```

### 8.2 处理未匹配记录

### `PATCH /api/admin/v1/unmatched-records/:id`

用途：
- 管理员将未匹配记录绑定到已有学校或标记忽略

请求示例（绑定到学校）：

```json
{
  “status”: “resolved”,
  “resolved_school_id”: “e6f87f6f-4fd0-48c0-b3e9-3d8924f1e001”,
  “create_alias”: true
}
```

请求示例（忽略）：

```json
{
  “status”: “ignored”
}
```

规则：
- `create_alias = true` 时，自动为该学校创建 alias 记录
- `resolved_school_id` 在 `status = resolved` 时必填
