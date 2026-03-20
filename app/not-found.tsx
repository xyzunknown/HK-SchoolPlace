import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="empty-state glass-card animate-fade-in" style={{ marginTop: "var(--sp-12)" }}>
        <div className="empty-state-icon" style={{ fontSize: "4rem" }}>🔍</div>
        <h3 style={{ fontSize: "var(--font-title)" }}>找不到頁面</h3>
        <p className="text-muted">
          呢個頁面可能已被移除或者唔存在
        </p>
        <Link
          href="/"
          className="btn-primary"
          style={{ marginTop: "var(--sp-6)", display: "inline-flex" }}
        >
          返回首頁
        </Link>
      </section>
    </main>
  );
}
