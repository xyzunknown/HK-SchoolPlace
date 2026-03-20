"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminSchoolOption, UnmatchedRecordItem } from "@/lib/types";

type Props = {
  records: UnmatchedRecordItem[];
  schoolOptions: AdminSchoolOption[];
};

export function UnmatchedRecordsManager({ records, schoolOptions }: Props) {
  return (
    <div className="admin-table-wrap glass-card">
      <table className="admin-table">
        <thead>
          <tr>
            <th>未匹配名稱</th>
            <th>建議學校</th>
            <th>狀態</th>
            <th>來源</th>
            <th>建立時間</th>
            <th>處理</th>
          </tr>
        </thead>
          <tbody>
            {records.map((record) => (
              <UnmatchedRecordRow key={record.id} record={record} schoolOptions={schoolOptions} />
            ))}
          </tbody>
        </table>
    </div>
  );
}

function UnmatchedRecordRow({
  record,
  schoolOptions,
}: {
  record: UnmatchedRecordItem;
  schoolOptions: AdminSchoolOption[];
}) {
  const router = useRouter();
  const stageSchools = useMemo(
    () => schoolOptions.filter((school) => school.stage === record.stage),
    [record.stage, schoolOptions]
  );
  const [selectedSchoolId, setSelectedSchoolId] = useState(
    record.resolvedSchoolId ?? record.suggestedSchoolId ?? stageSchools[0]?.id ?? ""
  );
  const [createAlias, setCreateAlias] = useState(true);
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  async function handleResolve() {
    if (!selectedSchoolId) {
      setState({ loading: false, error: "請先選擇要綁定的學校" });
      return;
    }

    setState({ loading: true, error: null });

    const response = await fetch(`/api/admin/v1/unmatched-records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "resolved",
        resolved_school_id: selectedSchoolId,
        create_alias: createAlias,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;

      setState({
        loading: false,
        error: payload?.error?.message ?? "處理 unmatched record 失敗",
      });
      return;
    }

    setState({ loading: false, error: null });
    startTransition(() => router.refresh());
  }

  async function handleIgnore() {
    setState({ loading: true, error: null });

    const response = await fetch(`/api/admin/v1/unmatched-records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "ignored",
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;

      setState({
        loading: false,
        error: payload?.error?.message ?? "忽略 unmatched record 失敗",
      });
      return;
    }

    setState({ loading: false, error: null });
    startTransition(() => router.refresh());
  }

  return (
    <tr>
      <td style={{ minWidth: 220 }}>
        <div className="admin-cell-stack">
          <strong>{record.rawName}</strong>
          <span className="text-muted" style={{ fontSize: "var(--font-small)" }}>
            {record.normalizedName}
          </span>
          <div className="chip-group">
            <span className="chip">{stageLabel(record.stage)}</span>
            {record.district ? <span className="chip">{record.district}</span> : null}
            {record.grade ? <span className="chip">{record.grade}</span> : null}
          </div>
        </div>
      </td>
      <td style={{ minWidth: 180 }}>
        {record.suggestedSchoolName ? (
          <div className="admin-cell-stack">
            <span>{record.suggestedSchoolName}</span>
            <span className="text-muted" style={{ fontSize: "var(--font-small)" }}>
              建議匹配
            </span>
          </div>
        ) : (
          <span className="text-muted">暫無建議</span>
        )}
      </td>
      <td>
        <div className="admin-cell-stack">
          <span className={`chip ${statusClass(record.status)}`}>{statusLabel(record.status)}</span>
          {record.resolvedSchoolName ? (
            <span className="text-muted" style={{ fontSize: "var(--font-small)" }}>
              已綁定：{record.resolvedSchoolName}
            </span>
          ) : null}
        </div>
      </td>
      <td>
        <span className="chip">{record.source}</span>
      </td>
      <td className="text-muted" style={{ fontSize: "var(--font-small)" }}>
        <div className="admin-cell-stack">
          <span>{formatDateTime(record.createdAt)}</span>
          <span>更新於 {formatDateTime(record.updatedAt)}</span>
        </div>
      </td>
      <td style={{ minWidth: 320 }}>
        {record.status === "pending" ? (
          <div className="admin-cell-stack">
            <select
              className="input"
              value={selectedSchoolId}
              onChange={(event) => setSelectedSchoolId(event.target.value)}
              disabled={stageSchools.length === 0}
            >
              <option value="">選擇學校</option>
              {stageSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.nameZh} · {school.district}
                </option>
              ))}
            </select>

            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={createAlias}
                onChange={(event) => setCreateAlias(event.target.checked)}
              />
              <span>resolve 時同步建立 alias</span>
            </label>

            <div className="admin-actions">
              <button type="button" className="btn-primary" disabled={state.loading} onClick={handleResolve}>
                {state.loading ? "提交中..." : "Resolve"}
              </button>
              <button type="button" className="btn-ghost" disabled={state.loading} onClick={handleIgnore}>
                Ignore
              </button>
            </div>
            {stageSchools.length === 0 ? (
              <p className="admin-feedback admin-feedback-error">目前沒有相同學段的學校可供綁定。</p>
            ) : null}
            {state.error ? <p className="admin-feedback admin-feedback-error">{state.error}</p> : null}
          </div>
        ) : (
          <div className="admin-cell-stack">
            <span className="text-muted">
              {record.status === "resolved" ? "此記錄已完成處理" : "此記錄已標記為忽略"}
            </span>
            {record.resolvedSchoolName ? (
              <span className="chip active">{record.resolvedSchoolName}</span>
            ) : null}
          </div>
        )}
      </td>
    </tr>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function stageLabel(stage: string) {
  switch (stage) {
    case "primary":
      return "小學";
    case "secondary":
      return "中學";
    default:
      return "幼稚園";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "resolved":
      return "已處理";
    case "ignored":
      return "已忽略";
    default:
      return "待處理";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "resolved":
      return "status-success";
    case "ignored":
      return "status-fail";
    default:
      return "status-running";
  }
}
