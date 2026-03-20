"use client";

import type { FormEvent } from "react";
import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminSchoolOption, SchoolAliasItem } from "@/lib/types";

type Props = {
  aliases: SchoolAliasItem[];
  schoolOptions: AdminSchoolOption[];
};

export function AliasManager({ aliases, schoolOptions }: Props) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState({
    schoolId: schoolOptions[0]?.id ?? "",
    aliasName: "",
  });
  const [createState, setCreateState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  const schoolsById = useMemo(
    () => new Map(schoolOptions.map((school) => [school.id, school])),
    [schoolOptions]
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createForm.schoolId || !createForm.aliasName.trim()) {
      setCreateState({ loading: false, error: "請先選擇學校並輸入 alias 名稱" });
      return;
    }

    setCreateState({ loading: true, error: null });

    const response = await fetch("/api/admin/v1/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: createForm.schoolId,
        alias_name: createForm.aliasName.trim(),
        source: "manual",
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;

      setCreateState({
        loading: false,
        error: payload?.error?.message ?? "建立 alias 失敗",
      });
      return;
    }

    setCreateForm({
      schoolId: createForm.schoolId,
      aliasName: "",
    });
    setCreateState({ loading: false, error: null });
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: "grid", gap: "var(--sp-5)" }}>
      <section className="glass-card" style={{ padding: "var(--sp-6)" }}>
        <div className="section-header" style={{ marginBottom: "var(--sp-4)" }}>
          <h2>新增 Alias</h2>
          <p>手動建立 alias，供未來同步自動匹配使用。</p>
        </div>

        <form className="admin-form-grid" onSubmit={handleCreate}>
          <label className="admin-field">
            <span className="admin-field-label">對應學校</span>
            <select
              className="input"
              value={createForm.schoolId}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, schoolId: event.target.value }))
              }
            >
              {schoolOptions.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.nameZh} · {stageLabel(school.stage)} · {school.district}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Alias 名稱</span>
            <input
              className="input"
              placeholder="例如：ABC KG (分校)"
              value={createForm.aliasName}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, aliasName: event.target.value }))
              }
            />
          </label>

          <div className="admin-actions">
            <button type="submit" className="btn-primary" disabled={createState.loading}>
              {createState.loading ? "建立中..." : "建立 Alias"}
            </button>
            <span className="chip">來源：manual</span>
          </div>
        </form>

        {createState.error ? <p className="admin-feedback admin-feedback-error">{createState.error}</p> : null}
      </section>

      <section className="admin-table-wrap glass-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Alias</th>
              <th>對應學校</th>
              <th>來源</th>
              <th>建立時間</th>
              <th>編輯</th>
            </tr>
          </thead>
          <tbody>
            {aliases.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-table-empty">暫時未有 alias，可先建立第一條。</div>
                </td>
              </tr>
            ) : (
              aliases.map((alias) => (
                <AliasRow
                  key={alias.id}
                  alias={alias}
                  schoolOptions={schoolOptions}
                  schoolLabel={formatSchoolLabel(schoolsById.get(alias.schoolId))}
                />
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function AliasRow({
  alias,
  schoolOptions,
  schoolLabel,
}: {
  alias: SchoolAliasItem;
  schoolOptions: AdminSchoolOption[];
  schoolLabel: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    schoolId: alias.schoolId,
    aliasName: alias.aliasName,
  });
  const [state, setState] = useState<{ loading: boolean; error: string | null; saved: boolean }>({
    loading: false,
    error: null,
    saved: false,
  });

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.schoolId || !form.aliasName.trim()) {
      setState({ loading: false, error: "學校與 alias 名稱不可留空", saved: false });
      return;
    }

    setState({ loading: true, error: null, saved: false });

    const response = await fetch(`/api/admin/v1/aliases/${alias.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: form.schoolId,
        alias_name: form.aliasName.trim(),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;

      setState({
        loading: false,
        error: payload?.error?.message ?? "更新 alias 失敗",
        saved: false,
      });
      return;
    }

    setState({ loading: false, error: null, saved: true });
    startTransition(() => router.refresh());
  }

  return (
    <tr>
      <td>
        <div className="admin-cell-stack">
          <strong>{alias.aliasName}</strong>
          <span className="text-muted" style={{ fontSize: "var(--font-small)" }}>
            {alias.normalizedAliasName}
          </span>
        </div>
      </td>
      <td>
        <div className="admin-cell-stack">
          <span>{alias.schoolNameZh}</span>
          <span className="text-muted" style={{ fontSize: "var(--font-small)" }}>
            {schoolLabel}
          </span>
        </div>
      </td>
      <td>
        <span className="chip">{alias.source}</span>
      </td>
      <td className="text-muted" style={{ fontSize: "var(--font-small)" }}>
        {formatDateTime(alias.createdAt)}
      </td>
      <td style={{ minWidth: 300 }}>
        <form className="admin-inline-form" onSubmit={handleSave}>
          <select
            className="input"
            value={form.schoolId}
            onChange={(event) =>
              setForm((current) => ({ ...current, schoolId: event.target.value }))
            }
          >
            {schoolOptions.map((school) => (
              <option key={school.id} value={school.id}>
                {school.nameZh} · {stageLabel(school.stage)} · {school.district}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={form.aliasName}
            onChange={(event) =>
              setForm((current) => ({ ...current, aliasName: event.target.value }))
            }
          />
          <button type="submit" className="btn-secondary" disabled={state.loading}>
            {state.loading ? "儲存中..." : "儲存"}
          </button>
        </form>
        {state.error ? <p className="admin-feedback admin-feedback-error">{state.error}</p> : null}
        {state.saved && !state.error ? <p className="admin-feedback">已更新</p> : null}
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

function formatSchoolLabel(school: AdminSchoolOption | undefined) {
  if (!school) {
    return "學校資料已不存在";
  }

  return `${stageLabel(school.stage)} · ${school.district}`;
}
