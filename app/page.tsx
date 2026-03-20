import Link from "next/link";
import { getFilters } from "@/lib/schools";

const stages = [
  {
    value: "kg",
    label: "幼稚園",
    icon: "🎒",
    description: "K1-K3 學位空缺查詢",
    available: true,
  },
  {
    value: "primary",
    label: "小學",
    icon: "📚",
    description: "即將推出",
    available: false,
  },
  {
    value: "secondary",
    label: "中學",
    icon: "🎓",
    description: "即將推出",
    available: false,
  },
] as const;

export default function HomePage() {
  const filters = getFilters("kg");

  return (
    <main className="page-shell">
      {/* Hero */}
      <section className="hero animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>
          學位通 · HKSchoolPlace
        </p>
        <h1>
          更快搵到
          <br />
          <span style={{ color: "var(--primary)" }}>有學位</span>嘅學校
        </h1>
        <p className="text-secondary" style={{ maxWidth: 520, fontSize: "1.125rem", lineHeight: 1.7 }}>
          即時查閱全港學校學位空缺，支援篩選、收藏、對比。
          <br />
          數據每日自動更新，助你第一時間掌握最新學位資訊。
        </p>
      </section>

      <section className="animate-slide-up" style={{ animationDelay: "70ms" }}>
        <div className="glass-card quick-search-panel">
          <div className="section-header" style={{ marginBottom: "var(--sp-4)" }}>
            <h2>快速搜尋幼稚園學位</h2>
            <p className="text-muted">先選地區，再決定是否只看有位，兩步就能進入列表頁。</p>
          </div>

          <form action="/schools" method="get" className="quick-search-form">
            <input type="hidden" name="stage" value="kg" />
            <label className="admin-field">
              <span className="admin-field-label">地區</span>
              <div className="select-wrap">
                <select className="select" name="district" defaultValue="">
                  <option value="">全港地區</option>
                  {filters.districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="admin-checkbox">
              <input type="checkbox" name="has_vacancy" value="true" defaultChecked />
              <span>只看有位學校</span>
            </label>

            <button type="submit" className="btn-primary">
              立即查找
            </button>
          </form>

          <div className="chip-group" style={{ marginTop: "var(--sp-4)" }}>
            {filters.districts.slice(0, 6).map((district) => (
              <Link
                key={district}
                href={`/schools?stage=kg&district=${encodeURIComponent(district)}&has_vacancy=true`}
                className="chip"
              >
                {district}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stage selection */}
      <section className="animate-slide-up" style={{ animationDelay: "120ms" }}>
        <div className="section-header">
          <h2>選擇學段開始查找</h2>
          <p className="text-muted">點選學段進入學校列表</p>
        </div>
        <div className="stage-cards stagger">
          {stages.map((stage) =>
            stage.available ? (
              <Link
                key={stage.value}
                href={`/schools?stage=${stage.value}`}
                className="glass-card stage-card stage-card-active animate-slide-up"
              >
                <span className="stage-card-icon">{stage.icon}</span>
                <h3>{stage.label}</h3>
                <p className="text-muted">{stage.description}</p>
                <span className="btn-primary" style={{ marginTop: "auto" }}>
                  開始查找 →
                </span>
              </Link>
            ) : (
              <div
                key={stage.value}
                className="glass-card stage-card stage-card-disabled animate-slide-up"
              >
                <span className="stage-card-icon">{stage.icon}</span>
                <h3>{stage.label}</h3>
                <p className="text-muted">{stage.description}</p>
                <span className="chip" style={{ marginTop: "auto", opacity: 0.5 }}>
                  🔒 敬請期待
                </span>
              </div>
            )
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="animate-slide-up" style={{ animationDelay: "240ms" }}>
        <div className="stats-grid">
          <div className="glass-card stat-card">
            <span className="stat-number">25+</span>
            <span className="text-muted">間幼稚園</span>
          </div>
          <div className="glass-card stat-card">
            <span className="stat-number">10</span>
            <span className="text-muted">個地區覆蓋</span>
          </div>
          <div className="glass-card stat-card">
            <span className="stat-number">每日</span>
            <span className="text-muted">自動更新數據</span>
          </div>
        </div>
      </section>
    </main>
  );
}
