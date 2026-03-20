"use client";

import type { FormEvent } from "react";
import { startTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { AdminSchoolDetail } from "@/lib/types";

type Props = {
  school: AdminSchoolDetail;
};

type FormState = {
  nameZh: string;
  nameEn: string;
  district: string;
  addressZh: string;
  addressEn: string;
  phone: string;
  website: string;
  schoolType: string;
  sessionType: string;
  schoolNet: string;
  band: string;
  tuitionFee: string;
  curriculum: string;
  isSchemeParticipant: "unknown" | "true" | "false";
  isActive: boolean;
};

export function SchoolEditor({ school }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    nameZh: school.nameZh,
    nameEn: school.nameEn ?? "",
    district: school.district,
    addressZh: school.addressZh ?? "",
    addressEn: school.addressEn ?? "",
    phone: school.phone ?? "",
    website: school.website ?? "",
    schoolType: school.schoolType ?? "",
    sessionType: school.sessionType ?? "",
    schoolNet: school.schoolNet ?? "",
    band: school.band ?? "",
    tuitionFee: school.tuitionFee === null ? "" : String(school.tuitionFee),
    curriculum: school.curriculum ?? "",
    isSchemeParticipant:
      school.isSchemeParticipant === true
        ? "true"
        : school.isSchemeParticipant === false
          ? "false"
          : "unknown",
    isActive: school.isActive,
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.nameZh.trim() || !form.district.trim()) {
      setState({
        loading: false,
        error: "學校名稱與地區不可留空",
        saved: false,
      });
      return;
    }

    setState({ loading: true, error: null, saved: false });

    const response = await fetch(`/api/admin/v1/schools/${school.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name_zh: form.nameZh.trim(),
        name_en: nullableString(form.nameEn),
        district: form.district.trim(),
        address_zh: nullableString(form.addressZh),
        address_en: nullableString(form.addressEn),
        phone: nullableString(form.phone),
        website: nullableString(form.website),
        school_type: nullableString(form.schoolType),
        session_type: nullableString(form.sessionType),
        school_net: nullableString(form.schoolNet),
        band: nullableString(form.band),
        tuition_fee: nullableNumber(form.tuitionFee),
        curriculum: nullableString(form.curriculum),
        is_scheme_participant: nullableBoolean(form.isSchemeParticipant),
        is_active: form.isActive,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;

      setState({
        loading: false,
        error: payload?.error?.message ?? "更新學校資料失敗",
        saved: false,
      });
      return;
    }

    setState({ loading: false, error: null, saved: true });
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: "grid", gap: "var(--sp-5)" }}>
      <section className="glass-card" style={{ padding: "var(--sp-6)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "var(--sp-4)",
            flexWrap: "wrap",
          }}
        >
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h2>學校基本資料</h2>
            <p>調整前台展示用主資料；儲存後將立即反映在學校列表與詳情頁。</p>
          </div>
          <div className="chip-group">
            <span className="chip active">{stageLabel(school.stage)}</span>
            <span className={`chip ${form.isActive ? "status-success" : "status-fail"}`}>
              {form.isActive ? "展示中" : "隱藏"}
            </span>
            {school.latestUpdatedAt ? (
              <span className="chip">最近更新 {formatDateTime(school.latestUpdatedAt)}</span>
            ) : null}
          </div>
        </div>
      </section>

      <form className="glass-card" style={{ padding: "var(--sp-6)" }} onSubmit={handleSubmit}>
        <div className="admin-two-column-form">
          <label className="admin-field">
            <span className="admin-field-label">中文名稱</span>
            <input
              className="input"
              value={form.nameZh}
              onChange={(event) => setForm((current) => ({ ...current, nameZh: event.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">英文名稱</span>
            <input
              className="input"
              value={form.nameEn}
              onChange={(event) => setForm((current) => ({ ...current, nameEn: event.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">地區</span>
            <input
              className="input"
              value={form.district}
              onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">學校類型</span>
            <input
              className="input"
              value={form.schoolType}
              onChange={(event) => setForm((current) => ({ ...current, schoolType: event.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">上課時段</span>
            <input
              className="input"
              value={form.sessionType}
              onChange={(event) => setForm((current) => ({ ...current, sessionType: event.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">校網 / Band</span>
            <div className="admin-inline-form admin-compact-grid">
              <input
                className="input"
                placeholder="校網"
                value={form.schoolNet}
                onChange={(event) => setForm((current) => ({ ...current, schoolNet: event.target.value }))}
              />
              <input
                className="input"
                placeholder="Band"
                value={form.band}
                onChange={(event) => setForm((current) => ({ ...current, band: event.target.value }))}
              />
            </div>
          </label>

          <label className="admin-field admin-field-span-2">
            <span className="admin-field-label">中文地址</span>
            <input
              className="input"
              value={form.addressZh}
              onChange={(event) => setForm((current) => ({ ...current, addressZh: event.target.value }))}
            />
          </label>

          <label className="admin-field admin-field-span-2">
            <span className="admin-field-label">英文地址</span>
            <input
              className="input"
              value={form.addressEn}
              onChange={(event) => setForm((current) => ({ ...current, addressEn: event.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">電話</span>
            <input
              className="input"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">網站</span>
            <input
              className="input"
              value={form.website}
              onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">學費</span>
            <input
              className="input"
              inputMode="numeric"
              placeholder="例如 2800"
              value={form.tuitionFee}
              onChange={(event) => setForm((current) => ({ ...current, tuitionFee: event.target.value }))}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">計劃參與</span>
            <select
              className="input"
              value={form.isSchemeParticipant}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isSchemeParticipant: event.target.value as FormState["isSchemeParticipant"],
                }))
              }
            >
              <option value="unknown">未知</option>
              <option value="true">已參加</option>
              <option value="false">未參加</option>
            </select>
          </label>

          <label className="admin-field admin-field-span-2">
            <span className="admin-field-label">課程 / 備註</span>
            <textarea
              className="input admin-textarea"
              value={form.curriculum}
              onChange={(event) => setForm((current) => ({ ...current, curriculum: event.target.value }))}
            />
          </label>
        </div>

        <div className="admin-actions" style={{ marginTop: "var(--sp-5)" }}>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            <span>於前台展示此學校</span>
          </label>

          <button type="submit" className="btn-primary" disabled={state.loading}>
            {state.loading ? "儲存中..." : "儲存變更"}
          </button>
          <Link href={`/schools/${school.id}`} className="btn-secondary" target="_blank">
            查看前台
          </Link>
        </div>

        {state.error ? <p className="admin-feedback admin-feedback-error">{state.error}</p> : null}
        {state.saved && !state.error ? <p className="admin-feedback">已儲存學校資料</p> : null}
      </form>
    </div>
  );
}

function nullableString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableBoolean(value: FormState["isSchemeParticipant"]) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
