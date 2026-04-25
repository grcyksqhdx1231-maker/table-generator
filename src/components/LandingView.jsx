import { t } from "../lib/i18n";

export default function LandingView({ visible, onEnter, locale, onLocaleChange }) {
  return (
    <section className={`landing ${visible ? "is-visible" : "is-hidden"}`}>
      <div className="landing__inner">
        <div className="panel__actions">
          <button
            className={`segmented__button ${locale === "zh" ? "is-active" : ""}`}
            onClick={() => onLocaleChange("zh")}
            type="button"
          >
            {t(locale, "common.zh")}
          </button>
          <button
            className={`segmented__button ${locale === "en" ? "is-active" : ""}`}
            onClick={() => onLocaleChange("en")}
            type="button"
          >
            {t(locale, "common.en")}
          </button>
        </div>
        <p className="landing__eyebrow">{t(locale, "landing.eyebrow")}</p>
        <h1 className="landing__title">{t(locale, "landing.title")}</h1>
        <p className="landing__copy">{t(locale, "landing.copy")}</p>
        <button className="landing__button" onClick={onEnter} type="button">
          {t(locale, "landing.button")}
        </button>
      </div>
    </section>
  );
}
