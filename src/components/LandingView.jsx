import { t } from "../lib/i18n";

const LANDING_HERO_IMAGE = "/quote-assets/cinematic-hero-office-people.jpg";

function getLandingHighlights(locale) {
  if (locale === "zh") {
    return [
      {
        label: "结构基底",
        value: "精准映射",
        detail: "保留给定框架的比例、支撑与桌面关系"
      },
      {
        label: "手绘修改",
        value: "实时联动",
        detail: "左侧笔触会同步推动右侧桌面与桌腿更新"
      },
      {
        label: "报价场景",
        value: "一键输出",
        detail: "直接进入场景图、材料与报价展示页面"
      }
    ];
  }

  return [
    {
      label: "Base Geometry",
      value: "Faithful Mapping",
      detail: "Keep the given framework proportions, supports, and tabletop logic intact"
    },
    {
      label: "Sketch Editing",
      value: "Live Sync",
      detail: "Drawing updates the tabletop and leg placement in real time"
    },
    {
      label: "Quote Output",
      value: "Scene Ready",
      detail: "Move straight into scenes, materials, and pricing presentation"
    }
  ];
}

function getLandingSupport(locale) {
  if (locale === "zh") {
    return {
      tagline: "参数化桌面配置器",
      note: "由给定 Rhino 框架进入网页配置、绘制、渲染与报价流程。"
    };
  }

  return {
    tagline: "Parametric Table Configurator",
    note: "Move from the supplied Rhino framework into web-based drawing, rendering, and quoting."
  };
}

export default function LandingView({ visible, onEnter, locale, onLocaleChange }) {
  const highlights = getLandingHighlights(locale);
  const support = getLandingSupport(locale);

  return (
    <section className={`landing ${visible ? "is-visible" : "is-hidden"}`}>
      <img alt="" className="landing__media" src={LANDING_HERO_IMAGE} />
      <div className="landing__shade" />

      <div className="landing__frame">
        <header className="landing__topbar">
          <div className="landing__brand">
            <p className="landing__eyebrow">{support.tagline}</p>
            <strong className="landing__mark">TRI-MESH STUDIO</strong>
          </div>

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
        </header>

        <div className="landing__inner">
          <div className="landing__content">
            <p className="landing__eyebrow">{t(locale, "landing.eyebrow")}</p>
            <h1 className="landing__title">{t(locale, "landing.title")}</h1>
            <p className="landing__copy">{support.note}</p>

            <div className="landing__actions">
              <button className="landing__button" onClick={onEnter} type="button">
                {t(locale, "landing.button")}
              </button>
              <p className="landing__subcopy">{t(locale, "landing.copy")}</p>
            </div>
          </div>

          <div className="landing__highlights">
            {highlights.map((item) => (
              <article className="landing__card" key={item.label}>
                <p className="panel__label">{item.label}</p>
                <strong>{item.value}</strong>
                <span>{item.detail}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
