"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

const sidebarLinks: {
  href:
    | "/admin"
    | "/admin/schools"
    | "/admin/vacancies"
    | "/admin/sync-logs"
    | "/admin/aliases"
    | "/admin/unmatched-records";
  label: string;
  icon: string;
}[] = [
  { href: "/admin", label: "總覽", icon: "📊" },
  { href: "/admin/schools", label: "學校管理", icon: "🏫" },
  { href: "/admin/vacancies", label: "Vacancy 管理", icon: "📌" },
  { href: "/admin/unmatched-records", label: "未匹配記錄", icon: "🧩" },
  { href: "/admin/aliases", label: "Alias 管理", icon: "🔗" },
  { href: "/admin/sync-logs", label: "同步日誌", icon: "🔄" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ marginBottom: "var(--sp-6)" }}>
          <Link href="/admin" className="nav-logo" style={{ fontSize: "1.1rem" }}>
            <span>🎓</span>
            <span>學位通後台</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              className={`sidebar-link ${
                pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`))
                  ? "active"
                  : ""
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "var(--sp-6)" }}>
          <Link href="/" className="sidebar-link">
            <span>←</span>
            <span>返回前台</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
