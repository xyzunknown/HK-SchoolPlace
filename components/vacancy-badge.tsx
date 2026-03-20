"use client";

import { VacancyStatus } from "@/lib/types";

const statusMap: Record<VacancyStatus, { label: string; className: string; icon: string }> = {
  available: {
    label: "有位",
    className: "vacancy-available",
    icon: "●",
  },
  waiting: {
    label: "候補",
    className: "vacancy-waiting",
    icon: "◐",
  },
  full: {
    label: "已滿",
    className: "vacancy-full",
    icon: "○",
  },
  unknown: {
    label: "待確認",
    className: "vacancy-unknown",
    icon: "·",
  },
};

export function VacancyBadge({ status, size = "default" }: { status: VacancyStatus; size?: "small" | "default" | "large" }) {
  const config = statusMap[status];
  const sizeClass = size === "large" ? "vacancy-badge-lg" : size === "small" ? "vacancy-badge-sm" : "";

  return (
    <span className={`vacancy-badge ${config.className} ${sizeClass}`}>
      <span className="vacancy-badge-dot">{config.icon}</span>
      {config.label}
    </span>
  );
}
