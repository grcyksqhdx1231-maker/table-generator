import { useEffect, useState } from "react";
import { t } from "../lib/i18n";
import BrandLogo from "./BrandLogo";
import Icon from "./Icon";

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

function getBrandLandingCopy(locale) {
  if (locale === "zh") {
    return {
      tagline: "参数化家具定制工作室",
      eyebrow: "按空间生成一张桌子",
      title: "参数生成一张理想之桌",
      titleLines: ["参数生成一张理想之桌"],
      note: "从轮廓、材质、模块密度到真实场景报价，Table Generator 把定制桌子的关键判断压缩到同一个工作台。",
      button: "开始定制",
      subcopy: "手绘轮廓，实时看模，生成场景图与报价单。",
      workflow: ["描轮廓", "调参数", "看模型", "出报价"]
    };
  }

  return {
    tagline: "Parametric Furniture Atelier",
    eyebrow: "A table shaped around your room",
    title: "Mood first. Dimensions next.",
    titleLines: ["Mood first.", "Dimensions next."],
    note: "Table Generator turns outline, material, module density, room scenes, and pricing into one tactile custom table experience.",
    button: "Start Customizing",
    subcopy: "Sketch the outline, preview the model, generate scenes, and review a quote.",
    workflow: ["Sketch", "Tune", "Preview", "Quote"]
  };
}

function getBrandLandingHighlights(locale) {
  if (locale === "zh") {
    return [
      {
        label: "轮廓定制",
        value: "一笔改形",
        detail: "在基础结构上手绘桌面边界，实时看到比例与桌腿落位。"
      },
      {
        label: "模块表皮",
        value: "密度可控",
        detail: "三角模块的尺寸、缝隙、厚度与色彩都能形成不同触感。"
      },
      {
        label: "场景报价",
        value: "直接成单",
        detail: "把当前方案放进真实空间，同时拆分材料、加工与服务成本。"
      }
    ];
  }

  return [
    {
      label: "Custom Outline",
      value: "Draw To Shape",
      detail: "Sketch over the base structure and see scale plus leg placement update live."
    },
    {
      label: "Modular Surface",
      value: "Density Tuned",
      detail: "Adjust triangular module size, gap, thickness, and color for a distinct tactility."
    },
    {
      label: "Scene Quote",
      value: "Ready To Buy",
      detail: "Place the design in rooms and break down material, fabrication, and service cost."
    }
  ];
}

export default function LandingView({
  visible,
  onEnter,
  locale,
  onLocaleChange,
  serverReady = false,
  serverProviderLabel = "AI"
}) {
  const [glassPointer, setGlassPointer] = useState({ x: 18, y: 18 });
  const [glassTrail, setGlassTrail] = useState({ x: 18, y: 18 });
  const highlights = getBrandLandingHighlights(locale);
  const support = getBrandLandingCopy(locale);
  const networkLabel =
    locale === "zh"
      ? serverReady
        ? `${serverProviderLabel} 在线`
        : "AI 离线"
      : serverReady
        ? `${serverProviderLabel} Online`
        : "AI Offline";

  useEffect(() => {
    let frameId = 0;

    const animate = () => {
      setGlassTrail((current) => {
        const nextX = current.x + (glassPointer.x - current.x) * 0.1;
        const nextY = current.y + (glassPointer.y - current.y) * 0.1;

        if (Math.abs(nextX - glassPointer.x) < 0.05 && Math.abs(nextY - glassPointer.y) < 0.05) {
          return glassPointer;
        }

        return { x: nextX, y: nextY };
      });

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [glassPointer]);

  return (
    <section className={`landing ${visible ? "is-visible" : "is-hidden"}`}>
      <img alt="" className="landing__media" src={LANDING_HERO_IMAGE} />
      <div className="landing__shade" />

      <div
        className="landing__frame"
        onPointerLeave={() => setGlassPointer({ x: 18, y: 18 })}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setGlassPointer({
            x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100,
            y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100
          });
        }}
        style={{
          "--glass-x": `${glassTrail.x}%`,
          "--glass-y": `${glassTrail.y}%`,
          "--glass-focus-x": `${glassPointer.x}%`,
          "--glass-focus-y": `${glassPointer.y}%`
        }}
      >
        <header className="landing__topbar">
          <div className="landing__brand">
            <div className="landing__brand-row">
              <BrandLogo className="brand-lockup--landing" label="Table Generator" />
              <div>
                <p className="landing__eyebrow">{support.tagline}</p>
              </div>
            </div>
          </div>

          <div className="panel__actions">
            <span className={`network-chip ${serverReady ? "is-ready" : "is-offline"}`}>
              <span className="network-chip__dot" />
              {networkLabel}
            </span>
            <button
              className={`segmented__button ${locale === "zh" ? "is-active" : ""}`}
              onClick={() => onLocaleChange("zh")}
              type="button"
            >
              <Icon name="language" />
              {t(locale, "common.zh")}
            </button>
            <button
              className={`segmented__button ${locale === "en" ? "is-active" : ""}`}
              onClick={() => onLocaleChange("en")}
              type="button"
            >
              <Icon name="language" />
              {t(locale, "common.en")}
            </button>
          </div>
        </header>

        <div className="landing__inner">
          <div className="landing__content">
            <p className="landing__eyebrow">{support.eyebrow}</p>
            <h1 className={`landing__title ${locale === "zh" ? "landing__title--zh" : ""}`}>
              {(support.titleLines || [support.title]).map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p className="landing__copy">{support.note}</p>

            <div className="landing__actions">
              <button className="landing__button" onClick={onEnter} type="button">
                <Icon name="next" />
                {support.button}
              </button>
              <p className="landing__subcopy">{support.subcopy}</p>
            </div>

            <div className="landing__workflow" aria-label="Table Generator workflow">
              {support.workflow.map((step) => (
                <span key={step}>{step}</span>
              ))}
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
