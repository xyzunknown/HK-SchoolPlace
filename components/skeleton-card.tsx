export function SkeletonCard() {
  return (
    <article className="glass-card school-card skeleton-card">
      <div className="card-top">
        <div>
          <div className="skeleton skeleton-text" style={{ width: "80px", height: "12px" }} />
          <div className="skeleton skeleton-text" style={{ width: "160px", height: "22px", marginTop: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: "120px", height: "14px", marginTop: 6 }} />
        </div>
        <div className="vacancy-panel">
          <div className="skeleton skeleton-badge" style={{ width: "56px", height: "28px" }} />
          <div className="skeleton skeleton-text" style={{ width: "48px", height: "28px", marginTop: 4 }} />
          <div className="skeleton skeleton-text" style={{ width: "72px", height: "12px", marginTop: 4 }} />
        </div>
      </div>
      <div className="card-meta" style={{ marginTop: 12 }}>
        <div className="skeleton skeleton-badge" style={{ width: "50px", height: "20px" }} />
        <div className="skeleton skeleton-badge" style={{ width: "40px", height: "20px" }} />
      </div>
    </article>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="school-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
