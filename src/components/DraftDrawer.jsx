import { getLocalizedDraftLabel, getLocalizedOptionLabel, t } from "../lib/i18n";

function formatDate(value, locale) {
  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
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
  onSelectDraft,
  locale
}) {
  return (
    <aside className={`drafts ${isOpen ? "is-open" : ""}`}>
      <div className="drafts__header">
        <div>
          <p className="panel__label">{t(locale, "drafts.eyebrow")}</p>
          <h2 className="drafts__title">{t(locale, "drafts.title")}</h2>
        </div>
        <button className="icon-button" onClick={onClose} type="button">
          {t(locale, "drafts.close")}
        </button>
      </div>

      {drafts.length === 0 ? (
        <p className="drafts__empty">{t(locale, "drafts.empty")}</p>
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
                {getLocalizedDraftLabel(draft.config, locale)}
              </strong>
              <span className="draft-card__meta">
                {getLocalizedOptionLabel(locale, "scenario", draft.config.scenario)} /{" "}
                {formatDate(draft.createdAt, locale)}
              </span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
