import { getDraftLabel } from "../lib/catalog";

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch (_error) {
    return value;
  }
}

export default function DraftDrawer({
  drafts,
  isOpen,
  onClose,
  onSelectDraft
}) {
  return (
    <aside className={`drafts ${isOpen ? "is-open" : ""}`}>
      <div className="drafts__header">
        <div>
          <p className="panel__label">Saved Drafts</p>
          <h2 className="drafts__title">Material memories</h2>
        </div>
        <button className="icon-button" onClick={onClose} type="button">
          Close
        </button>
      </div>

      {drafts.length === 0 ? (
        <p className="drafts__empty">
          No draft yet. Save a composition to compare it later.
        </p>
      ) : (
        <div className="drafts__list">
          {drafts.map((draft) => (
            <button
              key={draft.id}
              className="draft-card"
              onClick={() => onSelectDraft(draft)}
              type="button"
            >
              <span className="draft-card__label">{draft.label}</span>
              <strong className="draft-card__title">
                {getDraftLabel(draft.config)}
              </strong>
              <span className="draft-card__meta">
                {draft.config.scenario.replace("_", " ")} / {formatDate(draft.createdAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
