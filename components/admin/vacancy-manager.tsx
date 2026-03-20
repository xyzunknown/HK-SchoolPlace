"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminVacancy } from "@/lib/types";

type Props = {
  vacancies: AdminVacancy[];
};

export function VacancyManager({ vacancies }: Props) {
  return (
    <div className="admin-table-wrap glass-card">
      <table className="admin-table">
        <thead>
          <tr>
            <th>學校 / 年級</th>
            <th>狀態</th>
            <th>來源</th>
            <th>更新 / 生效</th>
            <th>備註</th>
            <th>處理</th>
          </tr>
        </thead>
        <tbody>
          {vacancies.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="admin-table-empty">目前沒有符合條件的 vacancy 記錄。</div>
              </td>
            </tr>
          ) : (
            vacancies.map((vacancy) => <VacancyRow key={vacancy.id} vacancy={vacancy} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function VacancyRow({ vacancy }: { vacancy: AdminVacancy }) {
  const router = useRouter();
  const [form, setForm] = useState({
    isStale: vacancy.isStale,
    adminNote: vacancy.adminNote ?? "",
  });
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    saved: boolean;
  }>({
    loading: false,
    error: null,
    saved: false,
  });

  async function handleSave() {
    setState({ loading: true, error: null, saved: false });

    const response = await fetch(`/api/admin/v1/vacancies/${vacancy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_stale: form.isStale,
        admin_note: form.adminNote.trim() ? form.adminNote.trim() : null,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;

      setState({
        loading: false,
        error: payload?.error?.message ?? "更新 vacancy 失敗",
        saved: false,
      });
      return;
    }

    setState({ loading: false, error: null, saved: true });
    startTransition(() => router.refresh());
  }

  return (
    <tr>
      <td style={{ minWidth: 220 }}>
        <div className="admin-cell-stack">
          <strong>{vacancy.schoolNameZh}</strong>
          <span className="text-muted" style={{ fontSize: "var(--font-small)" }}>
            {stageLabel(vacancy.stage)} · {vacancy.district} · {vacancy.grade}
          </span>
        </div>
      </td>
      <td>
        <div className="admin-cell-stack">
          <span className={`chip ${statusClass(vacancy.status)}`}>{statusLabel(vacancy.status)}</span>
          <span className="text-muted" style={{ fontSize: "var(--font-small)" }}>
            {vacancy.count === null ? "未提供數量" : `${vacancy.count} 個學位`}
          </span>
        </div>
      </td>
      <td>
        <div className="admin-cell-stack">
          <span className="chip">{vacancy.source}</span>
          {vacancy.sourceUrl ? (
            <a
              href={vacancy.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="primary-link"
              style={{ fontSize: "var(--font-small)" }}
            >
              查看來源 ↗
            </a>
          ) : null}
        </div>
      </td>
      <td className="text-muted" style={{ fontSize: "var(--font-small)" }}>
        <div className="admin-cell-stack">
          <span>更新於 {formatDateTime(vacancy.updatedAt)}</span>
          <span>{vacancy.effectiveDate ? `生效日 ${vacancy.effectiveDate}` : "未提供生效日"}</span>
        </div>
      </td>
      <td style={{ minWidth: 260 }}>
        <div className="admin-cell-stack">
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.isStale}
              onChange={(event) =>
                setForm((current) => ({ ...current, isStale: event.target.checked }))
              }
            />
            <span>標記為 stale</span>
          </label>
          <textarea
            className="input admin-textarea admin-textarea-sm"
            value={form.adminNote}
            placeholder="例如：來源 PDF 缺少數量，待人工覆核"
            onChange={(event) =>
              setForm((current) => ({ ...current, adminNote: event.target.value }))
            }
          />
        </div>
      </td>
      <td style={{ minWidth: 180 }}>
        <div className="admin-cell-stack">
          <button type="button" className="btn-secondary" disabled={state.loading} onClick={handleSave}>
            {state.loading ? "儲存中..." : "儲存"}
          </button>
          {state.error ? <span className="admin-feedback admin-feedback-error">{state.error}</span> : null}
          {state.saved && !state.error ? <span className="admin-feedback">已更新</span> : null}
        </div>
      </td>
    </tr>
  );
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
    case "available":
      return "有位";
    case "waiting":
      return "候補";
    case "full":
      return "滿額";
    default:
      return "未知";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "available":
      return "status-success";
    case "waiting":
      return "status-partial";
    case "full":
      return "status-fail";
    default:
      return "status-running";
  }
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
