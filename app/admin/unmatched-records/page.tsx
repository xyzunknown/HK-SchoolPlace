import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { UnmatchedRecordsManager } from "@/components/admin/unmatched-records-manager";
import { ensureAdminPageAccess } from "@/lib/admin-page";
import {
  listAdminSchoolOptions,
  listUnmatchedRecords,
} from "@/lib/repositories/admin-repository";
import type { UnmatchedRecordStatus } from "@/lib/types";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statusItems: { value: "all" | UnmatchedRecordStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待處理" },
  { value: "resolved", label: "已處理" },
  { value: "ignored", label: "已忽略" },
];

export default async function AdminUnmatchedRecordsPage({ searchParams }: Props) {
  await ensureAdminPageAccess();

  const params = await searchParams;
  const selectedStatus = parseStatus(single(params.status) ?? null);
  const records = await listUnmatchedRecords({
    status: selectedStatus === "all" ? null : selectedStatus,
  });
  const schoolOptions = await listAdminSchoolOptions();

  return (
    <main className="page-shell" style={{ paddingTop: "var(--sp-4)" }}>
      <section className="animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>後台 / 未匹配記錄</p>
        <h1 style={{ fontSize: "var(--font-title)" }}>Unmatched Records</h1>
        <p className="text-muted">集中處理同步後仍未匹配的學校名，並視情況建立 alias。</p>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <div className="chip-group">
          {statusItems.map((item) => (
            <Link
              key={item.value}
              href={item.value === "all" ? "/admin/unmatched-records" : `/admin/unmatched-records?status=${item.value}`}
              className={`chip ${selectedStatus === item.value ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <div className="chip-group">
          <span className="chip active">目前 {records.length} 條</span>
          <span className="chip">篩選：{statusLabel(selectedStatus)}</span>
        </div>
      </section>

      <section className="animate-slide-up" style={{ animationDelay: "80ms", marginTop: "var(--sp-5)" }}>
        {records.length === 0 ? (
          <EmptyState
            icon="✅"
            title="目前沒有符合條件的 unmatched records"
            description="可切換其他狀態篩選，或等待下一次同步匯入新的待處理記錄。"
          />
        ) : (
          <UnmatchedRecordsManager records={records} schoolOptions={schoolOptions} />
        )}
      </section>
    </main>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | null): "all" | UnmatchedRecordStatus {
  if (value === "resolved" || value === "ignored" || value === "pending") {
    return value;
  }

  return "all";
}

function statusLabel(value: "all" | UnmatchedRecordStatus) {
  switch (value) {
    case "pending":
      return "待處理";
    case "resolved":
      return "已處理";
    case "ignored":
      return "已忽略";
    default:
      return "全部";
  }
}
