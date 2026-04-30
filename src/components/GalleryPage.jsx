import { useMemo, useState } from "react";
import { getLocalizedOptionLabel } from "../lib/i18n";
import {
  COLOR_FAMILIES,
  getColorFamilyLabel,
  getColorFamilyMeta,
  getGalleryEstimate
} from "../lib/marketplace";

function formatMoney(value, locale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function getCopy(locale) {
  if (locale === "zh") {
    return {
      back: "\u8fd4\u56de\u4e3b\u754c\u9762",
      home: "\u8fd4\u56de\u5f00\u59cb",
      profile: "\u4e2a\u4eba\u4e3b\u9875",
      eyebrow: "Gallery",
      title: "\u4e03\u8272\u7cfb\u5b9a\u5236\u573a\u666f",
      note: "\u6309\u7167\u7ea2\u3001\u68d5\u3001\u84dd\u3001\u7d2b\u3001\u7c73\u3001\u7070\u3001\u9ed1\u7684\u8272\u7cfb\u6d4f\u89c8\u573a\u666f\u684c\u6b3e\uff0c\u5e76\u67e5\u770b\u90e8\u4ef6\u62a5\u4ef7\u3002",
      generateSeries: "\u751f\u6210\u5f53\u524d 7 \u8272\u7cfb\u5217",
      publishDraft: "\u8349\u7a3f\u4e0a\u4f20",
      favorites: "\u6536\u85cf",
      cart: "\u8d2d\u7269\u8f66",
      detail: "\u67e5\u770b\u8be6\u60c5",
      addCart: "\u52a0\u5165\u8d2d\u7269\u8f66",
      removeFavorite: "\u53d6\u6d88\u6536\u85cf",
      addFavorite: "\u6536\u85cf",
      sourceDrafts: "\u8349\u7a3f\u4e0a\u4f20 Gallery",
      emptyDrafts: "\u6682\u65f6\u6ca1\u6709\u53ef\u4e0a\u4f20\u7684\u8349\u7a3f",
      parts: "\u90e8\u4ef6\u62a5\u4ef7",
      tabletop: "\u684c\u9762",
      legs: "\u684c\u817f",
      modules: "\u4e09\u89d2\u6a21\u5757\u7cfb\u7edf",
      finish: "\u8868\u9762\u4e0e\u7ec4\u88c5",
      total: "\u5408\u8ba1",
      room: "\u7a7a\u95f4",
      palette: "\u8272\u76d8",
      close: "\u5173\u95ed"
    };
  }

  return {
    back: "Back To Studio",
    home: "Home",
    profile: "Profile",
    eyebrow: "Gallery",
    title: "Seven Color-Family Scenes",
    note: "Browse table scenes across red, brown, blue, purple, beige, gray, and black families, then inspect the part breakdown.",
    generateSeries: "Generate 7-Color Series",
    publishDraft: "Upload Draft",
    favorites: "Favorites",
    cart: "Cart",
    detail: "Details",
    addCart: "Add To Cart",
    removeFavorite: "Unfavorite",
    addFavorite: "Favorite",
    sourceDrafts: "Draft Uploads",
    emptyDrafts: "No drafts ready to publish yet",
    parts: "Part Pricing",
    tabletop: "Tabletop",
    legs: "Legs",
    modules: "Triangle Modules",
    finish: "Finish & Assembly",
    total: "Total",
    room: "Room",
    palette: "Palette",
    close: "Close"
  };
}

function GalleryDetailModal({
  item,
  locale,
  isFavorite,
  onClose,
  onToggleFavorite,
  onAddToCart
}) {
  const copy = getCopy(locale);
  const estimate = getGalleryEstimate(item.config);
  const familyMeta = getColorFamilyMeta(item.colorFamily);

  return (
    <div className="quote-lightbox" role="dialog">
      <div
        className="gallery-modal"
        style={{
          "--family-tint": familyMeta.tint,
          "--family-glow": familyMeta.glow
        }}
      >
        <button className="quote-lightbox__close" onClick={onClose} type="button">
          ×
        </button>
        <div className="gallery-modal__visual">
          <img
            alt={locale === "zh" ? item.titleZh : item.titleEn}
            className="gallery-modal__image"
            src={item.imageUrl}
          />
        </div>
        <div className="gallery-modal__content">
          <p className="panel__label">{item.country} / {item.city}</p>
          <h2 className="panel__title">{locale === "zh" ? item.titleZh : item.titleEn}</h2>
          <p className="panel__lead">{locale === "zh" ? item.sceneZh : item.sceneEn}</p>

          <div className="gallery-modal__facts">
            <div className="panel__overview-item">
              <p className="panel__label">{copy.palette}</p>
              <strong>{locale === "zh" ? item.paletteLabelZh : item.paletteLabelEn}</strong>
            </div>
            <div className="panel__overview-item">
              <p className="panel__label">{copy.room}</p>
              <strong>{item.roomLabel}</strong>
            </div>
            <div className="panel__overview-item">
              <p className="panel__label">{copy.total}</p>
              <strong>{formatMoney(estimate.total, locale)}</strong>
            </div>
          </div>

          <section className="market-section">
            <div className="panel__section-head">
              <div>
                <p className="panel__label">{copy.parts}</p>
                <h3 className="panel__mini-title">
                  {getLocalizedOptionLabel(locale, "material", item.material)}
                </h3>
              </div>
            </div>
            <div className="market-breakdown">
              <div><span>{copy.tabletop}</span><strong>{formatMoney(estimate.tabletop, locale)}</strong></div>
              <div><span>{copy.legs}</span><strong>{formatMoney(estimate.legs, locale)}</strong></div>
              <div><span>{copy.modules}</span><strong>{formatMoney(estimate.modules, locale)}</strong></div>
              <div><span>{copy.finish}</span><strong>{formatMoney(estimate.finish, locale)}</strong></div>
            </div>
          </section>

          <div className="panel__actions panel__actions--wrap">
            <button className="ghost-button" onClick={() => onToggleFavorite(item.id)} type="button">
              {isFavorite ? copy.removeFavorite : copy.addFavorite}
            </button>
            <button className="primary-button" onClick={() => onAddToCart(item)} type="button">
              {copy.addCart}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GalleryPage({
  visible,
  locale,
  galleryItems,
  favorites,
  cart,
  drafts,
  onBack,
  onHome,
  onOpenProfile,
  onToggleFavorite,
  onAddToCart,
  onUploadCurrentDesign,
  onUploadDraft
}) {
  const copy = getCopy(locale);
  const [filter, setFilter] = useState("all");
  const [activeItemId, setActiveItemId] = useState("");

  const filteredItems = useMemo(
    () => galleryItems.filter((item) => (filter === "all" ? true : item.colorFamily === filter)),
    [filter, galleryItems]
  );

  const activeItem =
    filteredItems.find((item) => item.id === activeItemId) ||
    galleryItems.find((item) => item.id === activeItemId) ||
    null;

  if (!visible) {
    return null;
  }

  return (
    <section className="market-page">
      <div className="market-nav">
        <button className="ghost-button" onClick={onBack} type="button">{copy.back}</button>
        <button className="ghost-button" onClick={onOpenProfile} type="button">{copy.profile}</button>
        <button className="ghost-button" onClick={onHome} type="button">{copy.home}</button>
      </div>

      <div className="market-page__body">
        <section className="market-hero">
          <div>
            <p className="panel__label">{copy.eyebrow}</p>
            <h1 className="panel__title">{copy.title}</h1>
            <p className="panel__lead">{copy.note}</p>
          </div>
          <div className="market-hero__stats">
            <div className="panel__overview-item">
              <p className="panel__label">{copy.favorites}</p>
              <strong>{favorites.length}</strong>
            </div>
            <div className="panel__overview-item">
              <p className="panel__label">{copy.cart}</p>
              <strong>{cart.length}</strong>
            </div>
            <div className="panel__overview-item">
              <p className="panel__label">{copy.sourceDrafts}</p>
              <strong>{drafts.length}</strong>
            </div>
          </div>
        </section>

        <section className="market-strip">
          <div className="panel__actions panel__actions--wrap">
            <button className="primary-button" onClick={onUploadCurrentDesign} type="button">
              {copy.generateSeries}
            </button>
            {COLOR_FAMILIES.map((family) => (
              <button
                key={family.value}
                className={`segmented__button ${filter === family.value ? "is-active" : ""}`}
                onClick={() => setFilter(family.value)}
                type="button"
              >
                {getColorFamilyLabel(locale, family.value)}
              </button>
            ))}
          </div>
        </section>

        <section className="market-section">
          <div className="panel__section-head">
            <div>
              <p className="panel__label">{copy.sourceDrafts}</p>
              <h2 className="panel__mini-title">{copy.publishDraft}</h2>
            </div>
          </div>
          {drafts.length ? (
            <div className="market-draft-grid">
              {drafts.slice(0, 6).map((draft) => (
                <article className="draft-card draft-card--inline" key={draft.id}>
                  <span className="draft-card__label">{draft.label}</span>
                  <strong className="draft-card__title">{draft.label}</strong>
                  <div className="panel__actions">
                    <button className="ghost-button" onClick={() => onUploadDraft(draft)} type="button">
                      {copy.publishDraft}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="panel__note">{copy.emptyDrafts}</p>
          )}
        </section>

        <section className="market-gallery-grid">
          {filteredItems.map((item) => {
            const estimate = getGalleryEstimate(item.config);
            const favorite = favorites.includes(item.id);
            const familyMeta = getColorFamilyMeta(item.colorFamily);

            return (
              <article
                className="market-card"
                key={item.id}
                style={{
                  "--family-tint": familyMeta.tint,
                  "--family-glow": familyMeta.glow
                }}
              >
                <button className="market-card__visual" onClick={() => setActiveItemId(item.id)} type="button">
                  <img
                    alt={locale === "zh" ? item.titleZh : item.titleEn}
                    className="market-card__image"
                    src={item.imageUrl}
                  />
                </button>
                <div className="market-card__content">
                  <div className="panel__split panel__split--tight">
                    <div>
                      <p className="panel__label">{item.country} / {item.city}</p>
                      <h3 className="market-card__title">{locale === "zh" ? item.titleZh : item.titleEn}</h3>
                    </div>
                    <span className="status-chip">{getColorFamilyLabel(locale, item.colorFamily)}</span>
                  </div>
                  <div className="market-card__palette">
                    <span className="market-card__swatch" />
                    <span>{locale === "zh" ? item.paletteLabelZh : item.paletteLabelEn}</span>
                  </div>
                  <p className="panel__note">{locale === "zh" ? item.sceneZh : item.sceneEn}</p>
                  <div className="market-card__meta">
                    <span>{item.roomLabel}</span>
                    <strong>{formatMoney(estimate.total, locale)}</strong>
                  </div>
                  <div className="panel__actions panel__actions--wrap">
                    <button className="ghost-button" onClick={() => onToggleFavorite(item.id)} type="button">
                      {favorite ? copy.removeFavorite : copy.addFavorite}
                    </button>
                    <button className="ghost-button" onClick={() => setActiveItemId(item.id)} type="button">
                      {copy.detail}
                    </button>
                    <button className="primary-button" onClick={() => onAddToCart(item)} type="button">
                      {copy.addCart}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>

      {activeItem ? (
        <GalleryDetailModal
          isFavorite={favorites.includes(activeItem.id)}
          item={activeItem}
          locale={locale}
          onAddToCart={onAddToCart}
          onClose={() => setActiveItemId("")}
          onToggleFavorite={onToggleFavorite}
        />
      ) : null}
    </section>
  );
}
