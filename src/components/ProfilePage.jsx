import { useEffect, useMemo, useState } from "react";
import BrandLogo from "./BrandLogo";
import EmptyState from "./EmptyState";
import Icon from "./Icon";
import { getLocalizedOptionLabel } from "../lib/i18n";
import { evaluateTradeIn } from "../lib/marketplace";

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
      back: "返回主界面",
      home: "返回开始",
      gallery: "Gallery",
      eyebrow: "个人主页",
      title: "账户 / 收藏 / 购物车 / 以旧换新",
      note: "这里保留收藏、购物车和换新记录；联系方式与地址只在真实下单确认时填写，不写入本地缓存。",
      save: "保存资料",
      account: "公开资料",
      safetyTitle: "隐私说明",
      safetyNote: "本页不保存密码、电话或常住地址，避免把敏感信息长期留在浏览器里。",
      favorites: "收藏夹",
      cart: "购物车",
      tradein: "以旧换新",
      name: "姓名",
      accountField: "展示账号",
      emptyFavorites: "还没有收藏任何桌子",
      emptyCart: "购物车还是空的",
      qty: "数量",
      remove: "移除",
      addCart: "加入购物车",
      subtotal: "小计",
      condition: "当前成色",
      yearsOwned: "已使用年数",
      originalPrice: "原购买价格",
      series: "现有系列名称",
      notes: "补充说明",
      evaluate: "评估换新权益",
      target: "推荐可抵系列",
      discount: "可参考折扣",
      credit: "预计抵扣",
      latest: "最近评估",
      excellent: "近新",
      good: "良好",
      fair: "正常使用",
      repair: "需修复"
    };
  }

  return {
    back: "Back To Studio",
    home: "Home",
    gallery: "Gallery",
    eyebrow: "Profile",
    title: "Account / Favorites / Cart / Trade-In",
    note: "Favorites, cart, and trade-in records stay here; contact and address details are only collected at real checkout.",
    save: "Save Profile",
    account: "Public Profile",
    safetyTitle: "Privacy Note",
    safetyNote: "This page does not store passwords, phone numbers, or home addresses in browser storage.",
    favorites: "Favorites",
    cart: "Cart",
    tradein: "Trade-In",
    name: "Name",
    accountField: "Display Account",
    emptyFavorites: "No favorite tables yet",
    emptyCart: "Cart is empty",
    qty: "Qty",
    remove: "Remove",
    addCart: "Add To Cart",
    subtotal: "Subtotal",
    condition: "Condition",
    yearsOwned: "Years Owned",
    originalPrice: "Original Price",
    series: "Current Series",
    notes: "Notes",
    evaluate: "Evaluate Trade-In",
    target: "Recommended Series",
    discount: "Indicative Discount",
    credit: "Estimated Credit",
    latest: "Latest Evaluation",
    excellent: "Excellent",
    good: "Good",
    fair: "Used",
    repair: "Needs Repair"
  };
}

function ProfileField({ label, type = "text", value, onChange }) {
  return (
    <label className="account-field">
      <span className="panel__label">{label}</span>
      <input
        className="file-input"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

export default function ProfilePage({
  visible,
  locale,
  profile,
  favorites,
  cart,
  galleryItems,
  tradeInLeads,
  onBack,
  onHome,
  onOpenGallery,
  onSaveProfile,
  onToggleFavorite,
  onAddToCart,
  onRemoveCartItem,
  onUpdateCartQty,
  onSubmitTradeIn
}) {
  const copy = getCopy(locale);
  const [draftProfile, setDraftProfile] = useState(profile);
  const [tradeInForm, setTradeInForm] = useState({
    series: "",
    condition: "good",
    yearsOwned: "3",
    originalPrice: "12000",
    notes: ""
  });

  useEffect(() => {
    setDraftProfile(profile);
  }, [profile]);

  const favoriteItems = useMemo(
    () => galleryItems.filter((item) => favorites.includes(item.id)),
    [favorites, galleryItems]
  );
  const latestTradeIn = tradeInLeads[0] || null;
  const cartTotal = cart.reduce((sum, item) => sum + item.estimate.total * item.qty, 0);

  if (!visible) {
    return null;
  }

  return (
    <section className="market-page profile-page">
      <div className="market-nav">
        <div className="market-nav__brand">
          <BrandLogo className="brand-lockup--nav" label="Table Generator" compact />
          <span>{copy.eyebrow}</span>
        </div>
        <div className="market-nav__actions">
          <button className="ghost-button" onClick={onBack} type="button">
            <Icon name="back" />
            {copy.back}
          </button>
          <button className="ghost-button" onClick={onOpenGallery} type="button">
            <Icon name="gallery" />
            {copy.gallery}
          </button>
          <button className="ghost-button" onClick={onHome} type="button">
            <Icon name="home" />
            {copy.home}
          </button>
        </div>
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
              <strong>{favoriteItems.length}</strong>
            </div>
            <div className="panel__overview-item">
              <p className="panel__label">{copy.cart}</p>
              <strong>{cart.length}</strong>
            </div>
            <div className="panel__overview-item">
              <p className="panel__label">{copy.tradein}</p>
              <strong>{tradeInLeads.length}</strong>
            </div>
          </div>
        </section>

        <div className="profile-grid">
          <section className="market-section profile-section profile-section--account">
            <div className="panel__section-head">
              <div>
                <p className="panel__label">{copy.eyebrow}</p>
                <h2 className="panel__mini-title">{copy.account}</h2>
              </div>
            </div>
            <div className="account-grid">
              <ProfileField
                label={copy.name}
                onChange={(name) => setDraftProfile((current) => ({ ...current, name }))}
                value={draftProfile.name}
              />
              <ProfileField
                label={copy.accountField}
                onChange={(account) => setDraftProfile((current) => ({ ...current, account }))}
                value={draftProfile.account}
              />
              <div className="profile-safety-note">
                <p className="panel__label">{copy.safetyTitle}</p>
                <strong>{copy.safetyNote}</strong>
              </div>
            </div>
            <div className="panel__actions">
              <button className="primary-button" onClick={() => onSaveProfile(draftProfile)} type="button">
                <Icon name="save" />
                {copy.save}
              </button>
            </div>
          </section>

          <section className="market-section profile-section profile-section--favorites">
            <div className="panel__section-head">
              <div>
                <p className="panel__label">{copy.favorites}</p>
                <h2 className="panel__mini-title">{copy.favorites}</h2>
              </div>
            </div>
            {favoriteItems.length ? (
              <div className="favorite-grid">
                {favoriteItems.map((item) => (
                  <article className="market-card market-card--compact" key={item.id}>
                    <img
                      alt={locale === "zh" ? item.titleZh : item.titleEn}
                      className="market-card__image"
                      src={item.imageUrl}
                    />
                    <div className="market-card__content">
                      <h3 className="market-card__title">
                        {locale === "zh" ? item.titleZh : item.titleEn}
                      </h3>
                      <p className="panel__note">
                        {getLocalizedOptionLabel(locale, "material", item.material)}
                      </p>
                      <div className="panel__actions panel__actions--wrap">
                        <button className="ghost-button" onClick={() => onToggleFavorite(item.id)} type="button">
                          <Icon name="delete" />
                          {copy.remove}
                        </button>
                        <button className="primary-button" onClick={() => onAddToCart(item)} type="button">
                          <Icon name="cart" />
                          {copy.addCart}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                detail={copy.emptyFavorites}
                locale={locale}
                title={copy.favorites}
                variant="favorites"
              />
            )}
          </section>

          <section className="market-section profile-section profile-section--cart">
            <div className="panel__section-head">
              <div>
                <p className="panel__label">{copy.cart}</p>
                <h2 className="panel__mini-title">{copy.cart}</h2>
              </div>
              <span className="status-chip is-ready">{formatMoney(cartTotal, locale)}</span>
            </div>
            {cart.length ? (
              <div className="cart-list">
                {cart.map((item) => (
                  <article className="cart-item" key={item.id}>
                    <img
                      alt={locale === "zh" ? item.titleZh : item.titleEn}
                      className="cart-item__image"
                      src={item.imageUrl}
                    />
                    <div className="cart-item__content">
                      <h3 className="market-card__title">
                        {locale === "zh" ? item.titleZh : item.titleEn}
                      </h3>
                      <p className="panel__note">{formatMoney(item.estimate.total, locale)}</p>
                      <div className="cart-item__controls">
                        <span className="panel__label">{copy.qty}</span>
                        <button className="ghost-button" onClick={() => onUpdateCartQty(item.id, item.qty - 1)} type="button">
                          <Icon name="minus" />
                        </button>
                        <span className="status-chip">{item.qty}</span>
                        <button className="ghost-button" onClick={() => onUpdateCartQty(item.id, item.qty + 1)} type="button">
                          <Icon name="plus" />
                        </button>
                        <button className="ghost-button" onClick={() => onRemoveCartItem(item.id)} type="button">
                          <Icon name="delete" />
                          {copy.remove}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                detail={copy.emptyCart}
                locale={locale}
                title={copy.cart}
                variant="cart"
              />
            )}
          </section>

          <section className="market-section profile-section profile-section--tradein">
            <div className="panel__section-head">
              <div>
                <p className="panel__label">{copy.tradein}</p>
                <h2 className="panel__mini-title">{copy.tradein}</h2>
              </div>
            </div>
            <div className="account-grid">
              <ProfileField
                label={copy.series}
                onChange={(series) => setTradeInForm((current) => ({ ...current, series }))}
                value={tradeInForm.series}
              />
              <label className="account-field">
                <span className="panel__label">{copy.condition}</span>
                <select
                  className="chat-dock__select"
                  onChange={(event) =>
                    setTradeInForm((current) => ({ ...current, condition: event.target.value }))
                  }
                  value={tradeInForm.condition}
                >
                  <option value="excellent">{copy.excellent}</option>
                  <option value="good">{copy.good}</option>
                  <option value="fair">{copy.fair}</option>
                  <option value="repair">{copy.repair}</option>
                </select>
              </label>
              <ProfileField
                label={copy.yearsOwned}
                onChange={(yearsOwned) => setTradeInForm((current) => ({ ...current, yearsOwned }))}
                type="number"
                value={tradeInForm.yearsOwned}
              />
              <ProfileField
                label={copy.originalPrice}
                onChange={(originalPrice) => setTradeInForm((current) => ({ ...current, originalPrice }))}
                type="number"
                value={tradeInForm.originalPrice}
              />
              <label className="account-field account-field--wide">
                <span className="panel__label">{copy.notes}</span>
                <textarea
                  className="prompt-input market-textarea"
                  onChange={(event) => setTradeInForm((current) => ({ ...current, notes: event.target.value }))}
                  value={tradeInForm.notes}
                />
              </label>
            </div>
            <div className="panel__actions">
              <button
                className="primary-button"
                onClick={() =>
                  onSubmitTradeIn({
                    ...tradeInForm,
                    evaluation: evaluateTradeIn(tradeInForm, locale)
                  })
                }
                type="button"
              >
                <Icon name="quote" />
                {copy.evaluate}
              </button>
            </div>

            {latestTradeIn ? (
              <div className="tradein-result">
                <p className="panel__label">{copy.latest}</p>
                <div className="panel__overview">
                  <div className="panel__overview-item">
                    <p className="panel__label">{copy.target}</p>
                    <strong>{latestTradeIn.evaluation.targetSeries}</strong>
                  </div>
                  <div className="panel__overview-item">
                    <p className="panel__label">{copy.discount}</p>
                    <strong>{latestTradeIn.evaluation.discountLabel}</strong>
                  </div>
                  <div className="panel__overview-item">
                    <p className="panel__label">{copy.credit}</p>
                    <strong>{formatMoney(latestTradeIn.evaluation.tradeInValue, locale)}</strong>
                  </div>
                </div>
                <p className="panel__note">{latestTradeIn.evaluation.inspectionNote}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  );
}
