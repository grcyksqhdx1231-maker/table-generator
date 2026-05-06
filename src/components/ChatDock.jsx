import { useState } from "react";
import { t } from "../lib/i18n";
import EmptyState from "./EmptyState";
import Icon from "./Icon";

export default function ChatDock({
  visible,
  isBusy,
  aiNote,
  status,
  serverReady,
  serverProviderLabel,
  serverModel,
  understanding,
  variants,
  activeVariantId,
  designLocks,
  hasSketch,
  onGenerateDirections,
  onApplyLocalEdit,
  onApplyVariant,
  onToggleLock,
  locale
}) {
  const LOCK_GROUPS = [
    { key: "shape", label: t(locale, "chat.lockShape") },
    { key: "dimensions", label: t(locale, "chat.lockSize") },
    { key: "material", label: t(locale, "chat.lockMaterial") },
    { key: "surface", label: t(locale, "chat.lockSurface") },
    { key: "legs", label: t(locale, "chat.lockLegs") }
  ];

  const LOCAL_EDIT_SCOPES = [
    { value: "overall", label: t(locale, "chat.scopeOverall") },
    { value: "front_edge", label: t(locale, "chat.scopeFrontEdge") },
    { value: "left_side", label: t(locale, "chat.scopeLeft") },
    { value: "center", label: t(locale, "chat.scopeCenter") },
    { value: "legs", label: t(locale, "chat.scopeLegs") }
  ];

  const [prompt, setPrompt] = useState(
    locale === "zh"
      ? "我想要一张适合两个人的桌子，轮廓安静，三角细节细密。"
      : "I want a table for two people with a calm sculptural silhouette and fine triangle detail."
  );
  const [localEditInstruction, setLocalEditInstruction] = useState(
    locale === "zh"
      ? "整体尺寸不变，前缘收紧一点，桌面更轻薄。"
      : "Keep the overall size, but tighten the front edge and make the tabletop feel lighter."
  );
  const [localEditScope, setLocalEditScope] = useState("overall");

  return (
    <aside className={`chat-dock ${visible ? "is-visible" : ""}`}>
      <div className="chat-dock__inner">
        <div className="panel__split">
          <div>
            <p className="panel__label">{t(locale, "chat.assistant")}</p>
            <h2 className="chat-dock__title">{t(locale, "chat.title")}</h2>
          </div>
          <div className="chat-dock__badges">
            <span className={`status-chip ${serverReady ? "is-ready" : ""}`}>
              {serverReady ? `${serverProviderLabel} / ${serverModel}` : t(locale, "common.noAi")}
            </span>
            <span className={`status-chip ${hasSketch ? "is-ready" : ""}`}>
              {hasSketch ? t(locale, "common.sketchOn") : t(locale, "common.sketchOff")}
            </span>
          </div>
        </div>

        <section className="chat-dock__section chat-dock__section--prompt">
          <div className="panel__split panel__split--tight">
            <div>
              <p className="panel__label">{t(locale, "chat.unifiedInput")}</p>
              <h3 className="panel__mini-title">{t(locale, "chat.inputTitle")}</h3>
            </div>
          </div>
          <textarea
            className="prompt-input chat-dock__input"
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={t(locale, "chat.promptPlaceholder")}
            rows="7"
            value={prompt}
          />
          <div className="panel__actions">
          <button
            className={`primary-button generate-button ${isBusy ? "is-loading" : ""}`}
            disabled={isBusy}
            onClick={() => onGenerateDirections(prompt)}
            type="button"
          >
              <Icon name="generate" />
              {isBusy ? t(locale, "chat.generating") : t(locale, "chat.generate")}
            </button>
          </div>
        </section>

        <section className="chat-dock__section chat-dock__section--locks">
          <div className="panel__split panel__split--tight">
            <div>
              <p className="panel__label">{t(locale, "chat.locks")}</p>
              <h3 className="panel__mini-title">{t(locale, "chat.locksTitle")}</h3>
            </div>
          </div>
          <div className="chat-dock__lock-grid">
            {LOCK_GROUPS.map((lock) => (
              <button
                key={lock.key}
                className={`segmented__button ${
                  designLocks[lock.key] ? "is-active" : ""
                }`}
                onClick={() => onToggleLock(lock.key)}
                type="button"
              >
                <Icon name={designLocks[lock.key] ? "lock" : "unlock"} />
                {lock.label}
              </button>
            ))}
          </div>
        </section>

        <section className="chat-dock__section chat-dock__section--understanding">
          <div className="panel__split panel__split--tight">
            <div>
              <p className="panel__label">{t(locale, "chat.understanding")}</p>
              <h3 className="panel__mini-title">{t(locale, "chat.understandingTitle")}</h3>
            </div>
          </div>
          {understanding?.summary ? (
            <div className="chat-dock__understanding">
              <p className="chat-dock__understanding-main">{understanding.summary}</p>
              <div className="chat-dock__facts">
                <p>
                  <strong>{t(locale, "chat.intent")}</strong>
                  {understanding.intent}
                </p>
                <p>
                  <strong>{t(locale, "chat.constraints")}</strong>
                  {understanding.constraints}
                </p>
                <p>
                  <strong>{t(locale, "chat.sketchInfluence")}</strong>
                  {understanding.sketchInfluence}
                </p>
                <p>
                  <strong>{t(locale, "chat.nextQuestion")}</strong>
                  {understanding.nextQuestion}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              compact
              detail={t(locale, "chat.understandingEmpty")}
              locale={locale}
              variant="ai"
            />
          )}
        </section>

        <section className="chat-dock__section chat-dock__section--variants">
          <div className="panel__split panel__split--tight">
            <div>
              <p className="panel__label">{t(locale, "chat.variants")}</p>
              <h3 className="panel__mini-title">{t(locale, "chat.variantsTitle")}</h3>
            </div>
          </div>
          <div className="chat-dock__variants">
            {variants.length ? (
              variants.map((variant) => (
                <article
                  key={variant.id}
                  className={`variant-card ${
                    activeVariantId === variant.id ? "is-active" : ""
                  }`}
                >
                  <div className="panel__split panel__split--tight">
                    <div>
                      <p className="panel__label">{variant.emphasis}</p>
                      <h4 className="variant-card__title">{variant.title}</h4>
                    </div>
                    <button
                      className="ghost-button"
                      onClick={() => onApplyVariant(variant)}
                      type="button"
                    >
                      <Icon name="next" />
                      {activeVariantId === variant.id
                        ? t(locale, "common.active")
                        : t(locale, "common.useThis")}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                compact
                detail={t(locale, "chat.variantsEmpty")}
                locale={locale}
                variant={isBusy ? "loading" : "ai"}
              />
            )}
          </div>
        </section>

        <section className="chat-dock__section chat-dock__section--local-edit">
          <div className="panel__split panel__split--tight">
            <div>
              <p className="panel__label">{t(locale, "chat.localEdit")}</p>
              <h3 className="panel__mini-title">{t(locale, "chat.localEditTitle")}</h3>
            </div>
          </div>
          <label className="chat-dock__field">
            <span className="panel__label">{t(locale, "chat.scope")}</span>
            <select
              className="chat-dock__select"
              onChange={(event) => setLocalEditScope(event.target.value)}
              value={localEditScope}
            >
              {LOCAL_EDIT_SCOPES.map((scope) => (
                <option key={scope.value} value={scope.value}>
                  {scope.label}
                </option>
              ))}
            </select>
          </label>
          <textarea
            className="prompt-input chat-dock__edit-input"
            onChange={(event) => setLocalEditInstruction(event.target.value)}
            placeholder={t(locale, "chat.localPlaceholder")}
            rows="4"
            value={localEditInstruction}
          />
          <div className="panel__actions">
            <button
              className="ghost-button"
              disabled={isBusy}
              onClick={() =>
                onApplyLocalEdit(prompt, {
                  scope: localEditScope,
                  instruction: localEditInstruction
                })
              }
              type="button"
            >
              <Icon name="edit" />
              {isBusy ? t(locale, "chat.applying") : t(locale, "chat.apply")}
            </button>
          </div>
        </section>

        {status ? <p className="panel__status">{status}</p> : null}
      </div>
    </aside>
  );
}
