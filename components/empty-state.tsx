export function EmptyState({
  icon = "📭",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state glass-card animate-fade-in">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      {description ? <p className="text-muted">{description}</p> : null}
      {actionLabel && (actionHref || onAction) ? (
        onAction ? (
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 16, display: "inline-flex" }}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : (
          <a href={actionHref} className="btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
            {actionLabel}
          </a>
        )
      ) : null}
    </div>
  );
}
