import { getLocalizedDraftLabel, getLocalizedOptionLabel, t } from "../lib/i18n";
import EmptyState from "./EmptyState";
import Icon from "./Icon";

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
  onUploadDraftToGallery,
  locale
}) {
  return (
    <aside className={`drafts ${isOpen ? "is-open" : ""}`}>
      <div className="drafts__header">
        <div>
          <p className="panel__label">{t(locale, "drafts.eyebrow")}</p>
          <h2 className="drafts__title">{t(locale, "drafts.title")}</h2>
        </div>
        <button
          aria-label={t(locale, "drafts.close")}
          className="icon-button icon-button--square"
          onClick={onClose}
          type="button"
        >
          <Icon name="close" />
        </button>
      </div>

      {drafts.length === 0 ? (
        <EmptyState
          compact
          detail={t(locale, "drafts.empty")}
          locale={locale}
          title={locale === "zh" ? "草稿库还是空的" : "No drafts yet"}
          variant="drafts"
        />
      ) : (
        <div className="drafts__list">
          {drafts.map((draft) => (
            <article key={draft.id} className="draft-card">
              <span className="draft-card__label">{draft.label}</span>
              <strong className="draft-card__title">
                {getLocalizedDraftLabel(draft.config, locale)}
              </strong>
              <span className="draft-card__meta">
                {getLocalizedOptionLabel(locale, "scenario", draft.config.scenario)} /{" "}
                {formatDate(draft.createdAt, locale)}
              </span>
              <div className="panel__actions panel__actions--wrap">
                <button
                  className="ghost-button"
                  onClick={() => onSelectDraft(draft)}
                  type="button"
                >
                  <Icon name="download" />
                  {locale === "zh" ? "恢复方案" : "Restore"}
                </button>
                <button
                  className="primary-button"
                  onClick={() => onUploadDraftToGallery(draft)}
                  type="button"
                >
                  <Icon name="upload" />
                  {locale === "zh" ? "上传到 Gallery" : "Upload To Gallery"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}
