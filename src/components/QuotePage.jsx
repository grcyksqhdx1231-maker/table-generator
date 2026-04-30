import { useEffect, useMemo, useRef, useState } from "react";
import TableViewport from "./TableViewport";
import { requestQuoteSceneGeneration } from "../lib/api";
import { getLocalizedOptionLabel } from "../lib/i18n";

const HERO_IMAGE_URL = "/quote-assets/cinematic-hero-office-people.jpg";

const MATERIAL_QUOTE_MODELS = {
  light_wood: {
    nameZh: "白蜡木 / 浅色实木",
    nameEn: "Ash / Light Solid Wood",
    benchmarkZh: "市场参考 ¥1,200–¥2,500 /㎡",
    benchmarkEn: "Market ¥1,200–¥2,500 /sqm",
    retailBand: [4200, 8800],
    tabletopRate: [1500, 2700],
    frameRate: [320, 560],
    legSetRate: [950, 1600],
    finishRate: [700, 1200],
    setupRate: [1300, 2000],
    weightBase: 33
  },
  dark_walnut: {
    nameZh: "北美黑胡桃",
    nameEn: "North American Walnut",
    benchmarkZh: "市场参考 ¥6,000–¥15,000 /㎡",
    benchmarkEn: "Market ¥6,000–¥15,000 /sqm",
    retailBand: [7800, 18000],
    tabletopRate: [5200, 9800],
    frameRate: [420, 760],
    legSetRate: [1200, 2100],
    finishRate: [950, 1700],
    setupRate: [1800, 2900],
    weightBase: 36
  },
  rough_stone: {
    nameZh: "岩板 / 石材",
    nameEn: "Sintered Stone / Stone",
    benchmarkZh: "市场参考 ¥800–¥3,200 /㎡",
    benchmarkEn: "Market ¥800–¥3,200 /sqm",
    retailBand: [4800, 12000],
    tabletopRate: [1900, 4300],
    frameRate: [360, 640],
    legSetRate: [1100, 1900],
    finishRate: [900, 1500],
    setupRate: [1600, 2500],
    weightBase: 58
  },
  metal: {
    nameZh: "金属家具",
    nameEn: "Metal Furniture",
    benchmarkZh: "市场参考 ¥4,500–¥16,000 /件",
    benchmarkEn: "Market ¥4,500–¥16,000 /piece",
    retailBand: [4500, 16000],
    tabletopRate: [2300, 5200],
    frameRate: [480, 900],
    legSetRate: [1700, 3300],
    finishRate: [1000, 1900],
    setupRate: [1800, 3000],
    weightBase: 48
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundToHundred(value) {
  return Math.round(value / 100) * 100;
}

function formatMoney(value, locale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    currency: "CNY",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function formatMoneyRange(min, max, locale) {
  return `${formatMoney(min, locale)} - ${formatMoney(max, locale)}`;
}

function formatMeters(value) {
  return `${Number(value).toFixed(2)} m`;
}

function getFootprintPerimeter(config) {
  const width = Math.max(0.65, Number(config.width) || 1.4);
  const depth = Math.max(0.65, Number(config.depth) || 0.65);

  if (config.shape === "round") {
    const radius = (width + depth) / 4;
    return Math.PI * 2 * radius;
  }

  if (config.shape === "oval") {
    const radiusX = width / 2;
    const radiusZ = depth / 2;
    return (
      Math.PI *
      (3 * (radiusX + radiusZ) - Math.sqrt((3 * radiusX + radiusZ) * (radiusX + 3 * radiusZ)))
    );
  }

  return 2 * (width + depth);
}

function getComplexityProfile(config, locale) {
  const densityScore = 1 - clamp((config.moduleSize - 0.04) / 0.24, 0, 1);
  const densityPremium = densityScore * 0.14;
  const silhouettePremium = config.silhouetteMode === "sketch" ? 0.14 : 0;
  const legSpreadPremium = (Math.abs(config.legSpread || 0) / 0.08) * 0.05;
  const legVolumePremium =
    (clamp(config.legBellyDepth || 0, 0, 0.08) / 0.08) * 0.04 +
    (clamp((config.legTopDepth || 0.076) - (config.legBottomDepth || 0.004), 0, 0.18) /
      0.18) *
      0.03;
  const toePremium =
    (clamp(config.legToeSharpness || 0, 0, 1) * 0.03) +
    ((clamp(config.frameThickness || 0.025, 0.012, 0.08) - 0.025) / 0.055) * 0.02;
  const items = [
    {
      label: locale === "zh" ? "高密度模块" : "Dense module field",
      value: densityPremium
    },
    {
      label: locale === "zh" ? "手绘轮廓" : "Sketch silhouette",
      value: silhouettePremium
    },
    {
      label: locale === "zh" ? "桌腿外展" : "Leg spread",
      value: legSpreadPremium
    },
    {
      label: locale === "zh" ? "桌腿体量" : "Leg volume",
      value: legVolumePremium
    },
    {
      label: locale === "zh" ? "脚尖与边框" : "Toe and frame detail",
      value: Math.max(0, toePremium)
    }
  ];
  const multiplier = 1 + items.reduce((sum, item) => sum + item.value, 0);
  const topDrivers = items
    .filter((item) => item.value > 0.015)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      text: `${item.label} +${Math.round(item.value * 100)}%`
    }));

  return {
    multiplier,
    topDrivers
  };
}

function buildQuote(config, locale) {
  const materialModel = MATERIAL_QUOTE_MODELS[config.material] || MATERIAL_QUOTE_MODELS.metal;
  const area = Math.max(0.36, config.width * config.depth);
  const perimeter = getFootprintPerimeter(config);
  const moduleArea = Math.max(0.006, config.moduleSize * config.moduleSize * 0.43);
  const moduleCount = Math.round(area / moduleArea);
  const connectorCount = Math.round(moduleCount * 1.62 + config.legCount * 18);
  const complexity = getComplexityProfile(config, locale);
  const sizeBandFactor = clamp(0.92 + (area - 0.8) * 0.48, 0.86, 1.45);
  const sizePremium = 1 + clamp((area - 0.9) * 0.18, 0, 0.18);

  const tabletopLow = area * materialModel.tabletopRate[0];
  const tabletopHigh = area * materialModel.tabletopRate[1];
  const frameLegLow =
    perimeter * materialModel.frameRate[0] +
    config.legCount * materialModel.legSetRate[0];
  const frameLegHigh =
    perimeter * materialModel.frameRate[1] +
    config.legCount * materialModel.legSetRate[1];
  const moduleLow = moduleCount * 3.8;
  const moduleHigh = moduleCount * 7.2;
  const finishLow = materialModel.finishRate[0] + connectorCount * 1.2;
  const finishHigh = materialModel.finishRate[1] + connectorCount * 2.1;
  const setupLow = materialModel.setupRate[0];
  const setupHigh = materialModel.setupRate[1];

  const subtotalLow =
    (tabletopLow + frameLegLow + moduleLow + finishLow + setupLow) *
    complexity.multiplier *
    sizePremium;
  const subtotalHigh =
    (tabletopHigh + frameLegHigh + moduleHigh + finishHigh + setupHigh) *
    (complexity.multiplier + 0.08) *
    (sizePremium + 0.04);

  const retailLow = materialModel.retailBand[0] * sizeBandFactor;
  const retailHigh = materialModel.retailBand[1] * sizeBandFactor;

  let estimateLow = roundToHundred(Math.max(retailLow, subtotalLow));
  let estimateHigh = roundToHundred(Math.min(Math.max(subtotalHigh, estimateLow * 1.12), retailHigh));

  if (estimateHigh < estimateLow + 600) {
    estimateHigh = estimateLow + 600;
  }

  const estimateMid = roundToHundred((estimateLow + estimateHigh) / 2);
  const fabricationHours = Math.round(
    moduleCount * 0.11 +
      config.legCount * 7 +
      perimeter * 4.8 +
      (config.silhouetteMode === "sketch" ? 8 : 0)
  );
  const leadTimeDays = {
    min: Math.max(12, Math.round(fabricationHours / 7.5)),
    max: Math.max(16, Math.round(fabricationHours / 5.4))
  };
  const materialKg = Number(
    (
      area * materialModel.weightBase +
      perimeter * 3.2 +
      config.legCount * 2.4 +
      moduleCount * 0.035
    ).toFixed(1)
  );

  return {
    benchmark:
      locale === "zh" ? materialModel.benchmarkZh : materialModel.benchmarkEn,
    complexityDrivers: complexity.topDrivers,
    complexityMultiplier: complexity.multiplier,
    connectorCount,
    costBreakdown: [
      {
        key: "tabletop",
        label: locale === "zh" ? "桌面材料" : "Tabletop",
        low: roundToHundred(tabletopLow * complexity.multiplier),
        high: roundToHundred(tabletopHigh * (complexity.multiplier + 0.03))
      },
      {
        key: "frame-legs",
        label: locale === "zh" ? "桌架与桌腿" : "Frame & Legs",
        low: roundToHundred(frameLegLow * sizePremium),
        high: roundToHundred(frameLegHigh * (sizePremium + 0.04))
      },
      {
        key: "modules",
        label: locale === "zh" ? "参数化模块" : "Module System",
        low: roundToHundred(moduleLow * complexity.multiplier),
        high: roundToHundred(moduleHigh * (complexity.multiplier + 0.05))
      },
      {
        key: "finish",
        label: locale === "zh" ? "打样与收口" : "Finish & Assembly",
        low: roundToHundred(finishLow + setupLow),
        high: roundToHundred(finishHigh + setupHigh)
      }
    ],
    estimateHigh,
    estimateLow,
    estimateMid,
    fabricationHours,
    leadTimeDays,
    materialKg,
    materialLabel:
      locale === "zh" ? materialModel.nameZh : materialModel.nameEn,
    moduleCount,
    recommendedBand: formatMoneyRange(
      roundToHundred(retailLow),
      roundToHundred(retailHigh),
      locale
    )
  };
}

function buildSceneCards(config, locale) {
  return [
    {
      key: "office",
      className: "quote-scene-card--office",
      defaultImageUrl: "/quote-assets/default-scenes/office-people.jpg",
      scene: locale === "zh" ? "办公场景" : "Office",
      room:
        locale === "zh"
          ? "房间尺寸 6.20 x 4.80 x 3.10 m"
          : "Room 6.20 x 4.80 x 3.10 m",
      title: locale === "zh" ? "静谧办公" : "Quiet Office",
      config: {
        ...config,
        scenario: "daylight",
        lightAngle: -18
      }
    },
    {
      key: "dining",
      className: "quote-scene-card--dining",
      defaultImageUrl: "/quote-assets/default-scenes/dining-people.jpg",
      scene: locale === "zh" ? "餐厅场景" : "Dining",
      room:
        locale === "zh"
          ? "房间尺寸 5.60 x 4.40 x 2.90 m"
          : "Room 5.60 x 4.40 x 2.90 m",
      title: locale === "zh" ? "暖光餐厅" : "Warm Dining",
      config: {
        ...config,
        scenario: "daylight",
        lightAngle: 36,
        width: Math.min(2.4, config.width + 0.08)
      }
    },
    {
      key: "bedroom",
      className: "quote-scene-card--bedroom",
      defaultImageUrl: "/quote-assets/default-scenes/bedroom-people.jpg",
      scene: locale === "zh" ? "卧室场景" : "Bedroom",
      room:
        locale === "zh"
          ? "房间尺寸 4.20 x 3.80 x 2.75 m"
          : "Room 4.20 x 3.80 x 2.75 m",
      title: locale === "zh" ? "柔和卧室" : "Soft Bedroom",
      config: {
        ...config,
        scenario: "void",
        lightAngle: 20
      }
    },
    {
      key: "gallery",
      className: "quote-scene-card--gallery",
      defaultImageUrl: "/quote-assets/default-scenes/gallery-people.jpg",
      scene: locale === "zh" ? "展厅场景" : "Gallery",
      room:
        locale === "zh"
          ? "房间尺寸 7.20 x 5.60 x 3.40 m"
          : "Room 7.20 x 5.60 x 3.40 m",
      title: locale === "zh" ? "夜景展厅" : "Night Gallery",
      config: {
        ...config,
        scenario: "late_night",
        lightAngle: 42
      }
    }
  ];
}

function getCopy(locale) {
  if (locale === "zh") {
    return {
      back: "返回主界面",
      close: "关闭",
      drafts: "草稿库",
      home: "开始界面",
      eyebrow: "场景化报价",
      title: "Tri-Mesh Table",
      heroScene: "主展示场景",
      heroRoom: "房间尺寸 6.80 x 5.40 x 3.20 m",
      priceTitle: "预估报价",
      specTitle: "当前配置",
      marketTitle: "材料与报价依据",
      costTitle: "成本拆解",
      metricsTitle: "制造指标",
      midpoint: "中位建议价",
      recommendedBand: "适配市场带",
      generateButton: "生成 AI 场景图",
      generatingButton: "正在生成场景图...",
      pendingBadge: "等待生成",
      generatingBadge: "生成中",
      readyBadge: "AI 场景已就绪",
      previewBadge: "场景预览",
      failedBadge: "生成失败",
      openLarge: "查看大图"
    };
  }

  return {
    back: "Back To Studio",
    close: "Close",
    drafts: "Drafts",
    home: "Home",
    eyebrow: "Spatial Quote",
    title: "Tri-Mesh Table",
    heroScene: "Hero Scene",
    heroRoom: "Room 6.80 x 5.40 x 3.20 m",
    priceTitle: "Estimated Quote",
    specTitle: "Current Specs",
    marketTitle: "Material Basis",
    costTitle: "Cost Breakdown",
    metricsTitle: "Fabrication Metrics",
    midpoint: "Midpoint",
    recommendedBand: "Market Band",
    generateButton: "Generate AI Scene Images",
    generatingButton: "Generating Scenes...",
    pendingBadge: "Awaiting AI render",
    generatingBadge: "Rendering",
    readyBadge: "AI scene ready",
    previewBadge: "Scene preview",
    failedBadge: "Render failed",
    openLarge: "View Large"
  };
}

function getSceneBadge(sceneState, isGenerating, copy, hasDefaultImage = false) {
  if (sceneState?.imageUrl) {
    return {
      kind: "ready",
      label: copy.readyBadge
    };
  }

  if (hasDefaultImage) {
    return {
      kind: "ready",
      label: copy.previewBadge
    };
  }

  if (sceneState?.error) {
    return {
      kind: "error",
      label: copy.failedBadge
    };
  }

  if (isGenerating) {
    return {
      kind: "loading",
      label: copy.generatingBadge
    };
  }

  return {
    kind: "idle",
    label: copy.pendingBadge
  };
}

function getQuoteHeroCopy(locale) {
  if (locale === "zh") {
    return {
      note: "将当前桌型放进更真实的空间语境，方便展示比例、材质与使用氛围。",
      primaryAction: "生成场景图",
      secondaryAction: "返回继续调整",
      sceneSection: "场景提案",
      sceneLead: "用统一版式比较不同空间中的落地效果。",
      leadTime: "交付周期"
    };
  }

  return {
    note: "Place the current table into richer interior settings to review scale, finish, and atmosphere.",
    primaryAction: "Generate Scenes",
    secondaryAction: "Return To Studio",
    sceneSection: "Scene Proposals",
    sceneLead: "Review the same table across consistent presentation frames.",
    leadTime: "Lead Time"
  };
}

function getQuoteHeroHighlights(quote, copy, locale) {
  return [
    {
      label: copy.priceTitle,
      value: formatMoneyRange(quote.estimateLow, quote.estimateHigh, locale)
    },
    {
      label: copy.marketTitle,
      value: quote.materialLabel
    },
    {
      label: copy.leadTime,
      value: `${quote.leadTimeDays.min}-${quote.leadTimeDays.max} ${locale === "zh" ? "天" : "days"}`
    }
  ];
}

function SceneCard({
  card,
  generatedScene,
  isGenerating,
  ghPreviewMesh,
  partOverrides,
  patternAsset,
  sketchMaskDataUrl,
  sketchOutline,
  copy,
  onOpenImage
}) {
  const imageUrl = generatedScene?.imageUrl || card.defaultImageUrl || "";
  const badge = getSceneBadge(generatedScene, isGenerating, copy, Boolean(card.defaultImageUrl));

  return (
    <article className={`quote-scene-card ${card.className}`}>
      <div className="quote-scene-card__copy">
        <p className="panel__label">{card.scene}</p>
        <h3>{card.title}</h3>
      </div>

      <div className="quote-stage quote-stage--small">
        {imageUrl ? (
          <button
            aria-label={`${copy.openLarge}: ${card.scene}`}
            className="quote-stage__image-button"
            onClick={() => onOpenImage(card)}
            type="button"
          >
            <img
              alt={`${card.scene} render`}
              className="quote-stage__image"
              src={imageUrl}
            />
          </button>
        ) : (
          <TableViewport
            config={card.config}
            ghPreviewMesh={ghPreviewMesh}
            interactive={false}
            partOverrides={partOverrides}
            patternAsset={patternAsset}
            phase="configurator"
            sketchMaskDataUrl={sketchMaskDataUrl}
            sketchOutline={sketchOutline}
            transparentScene
            variantLabel={card.scene}
          />
        )}

        <div className="quote-stage__meta">
          <strong>{card.scene}</strong>
          <span>{card.room}</span>
          <em className={`quote-stage__status quote-stage__status--${badge.kind}`}>
            {badge.label}
          </em>
          {generatedScene?.error ? (
            <p className="quote-stage__error">{generatedScene.error}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function QuotePage({
  config,
  draftsCount,
  ghPreviewMesh,
  locale,
  onBack,
  onHome,
  onOpenDrafts,
  partOverrides,
  patternAsset,
  sketchMaskDataUrl,
  sketchOutline,
  visible
}) {
  const captureViewportRef = useRef(null);
  const [generatedScenes, setGeneratedScenes] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSceneKey, setActiveSceneKey] = useState("");

  const copy = useMemo(() => getCopy(locale), [locale]);
  const heroCopy = useMemo(() => getQuoteHeroCopy(locale), [locale]);
  const quote = useMemo(() => buildQuote(config, locale), [config, locale]);
  const scenes = useMemo(() => buildSceneCards(config, locale), [config, locale]);
  const heroHighlights = useMemo(
    () => getQuoteHeroHighlights(quote, { ...copy, ...heroCopy }, locale),
    [copy, heroCopy, locale, quote]
  );
  const activeScene = scenes.find((scene) => scene.key === activeSceneKey);
  const activeSceneImage = activeScene
    ? generatedScenes[activeScene.key]?.imageUrl || activeScene.defaultImageUrl || ""
    : "";

  useEffect(() => {
    setGeneratedScenes({});
    setActiveSceneKey("");
  }, [config, locale, partOverrides, patternAsset?.dataUrl, sketchMaskDataUrl]);

  useEffect(() => {
    if (!activeSceneImage) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setActiveSceneKey("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSceneImage]);

  if (!visible) {
    return null;
  }

  async function handleGenerateScenes() {
    if (isGenerating) {
      return;
    }

    const referenceImageDataUrl = captureViewportRef.current?.captureImage?.(
      "image/jpeg",
      0.92
    );

    if (!referenceImageDataUrl) {
      setGeneratedScenes(
        Object.fromEntries(
          scenes.map((scene) => [
            scene.key,
            { error: locale === "zh" ? "参考图抓取失败" : "Reference capture failed" }
          ])
        )
      );
      return;
    }

    setIsGenerating(true);

    const results = await Promise.allSettled(
      scenes.map((scene) =>
        requestQuoteSceneGeneration({
          locale,
          sceneKey: scene.key,
          sceneLabel: scene.scene,
          roomLabel: scene.room,
          config: scene.config,
          referenceImageDataUrl
        })
      )
    );

    const nextScenes = {};

    results.forEach((result, index) => {
      const scene = scenes[index];

      if (result.status === "fulfilled") {
        nextScenes[scene.key] = result.value;
        return;
      }

      nextScenes[scene.key] = {
        error: result.reason instanceof Error ? result.reason.message : "Scene generation failed"
      };
    });

    setGeneratedScenes(nextScenes);
    setIsGenerating(false);
  }

  return (
    <section className="quote-page quote-page--rich">
      <header className="quote-nav">
        <div>
          <p className="panel__label">{copy.eyebrow}</p>
          <strong className="quote-nav__brand">TRI-MESH</strong>
        </div>

        <div className="panel__actions panel__actions--wrap">
          <button className="ghost-button" onClick={onHome} type="button">
            {copy.home}
          </button>
          <button className="ghost-button" onClick={onOpenDrafts} type="button">
            {copy.drafts} [{draftsCount}]
          </button>
          <button
            className="ghost-button"
            disabled={isGenerating}
            onClick={handleGenerateScenes}
            type="button"
          >
            {isGenerating ? copy.generatingButton : copy.generateButton}
          </button>
          <button className="primary-button" onClick={onBack} type="button">
            {copy.back}
          </button>
        </div>
      </header>

      <div className="quote-capture-stage" aria-hidden="true">
        <TableViewport
          ref={captureViewportRef}
          config={{
            ...config,
            scenario: "daylight",
            lightAngle: 24
          }}
          ghPreviewMesh={ghPreviewMesh}
          interactive={false}
          partOverrides={partOverrides}
          patternAsset={patternAsset}
          phase="configurator"
          sketchMaskDataUrl={sketchMaskDataUrl}
          sketchOutline={sketchOutline}
          transparentScene={false}
          variantLabel={copy.heroScene}
        />
      </div>

      <div className="quote-page__body quote-page__body--rich">
        <section className="quote-hero quote-hero--cinematic">
          <img
            alt={copy.heroScene}
            className="quote-hero__image"
            src={HERO_IMAGE_URL}
          />
          <div className="quote-hero__shade" />
          <div className="quote-hero__overlay">
            <p className="panel__label">{copy.heroScene}</p>
            <h1>{copy.title}</h1>
            <p className="quote-hero__lead">{heroCopy.note}</p>
            <div className="quote-hero__chips">
              <span className="status-chip is-ready">
                {formatMeters(config.width)} x {formatMeters(config.depth)} x {formatMeters(config.height)}
              </span>
              <span className="status-chip">
                {getLocalizedOptionLabel(locale, "shape", config.shape)}
              </span>
              <span className="status-chip">
                {quote.materialLabel}
              </span>
            </div>
            <div className="quote-hero__actions">
              <button
                className="primary-button"
                disabled={isGenerating}
                onClick={handleGenerateScenes}
                type="button"
              >
                {isGenerating ? copy.generatingButton : heroCopy.primaryAction}
              </button>
              <button className="ghost-button quote-hero__ghost" onClick={onBack} type="button">
                {heroCopy.secondaryAction}
              </button>
            </div>
          </div>
          <div className="quote-stage__meta quote-stage__meta--hero">
            <strong>{copy.heroScene}</strong>
            <span>{copy.heroRoom}</span>
          </div>
        </section>

        <section className="quote-highlights">
          {heroHighlights.map((item) => (
            <article className="quote-highlight" key={item.label}>
              <p className="panel__label">{item.label}</p>
              <strong>{item.value}</strong>
            </article>
          ))}
        </section>

        <header className="quote-section-head">
          <div>
            <p className="panel__label">{heroCopy.sceneSection}</p>
            <h2 className="panel__mini-title">{heroCopy.sceneLead}</h2>
          </div>
          <button
            className="ghost-button"
            disabled={isGenerating}
            onClick={handleGenerateScenes}
            type="button"
          >
            {isGenerating ? copy.generatingButton : copy.generateButton}
          </button>
        </header>

        <section className="quote-scene-grid">
          {scenes.map((card) => (
            <SceneCard
              key={card.key}
              card={card}
              copy={copy}
              generatedScene={generatedScenes[card.key]}
              ghPreviewMesh={ghPreviewMesh}
              isGenerating={isGenerating}
              onOpenImage={(scene) => setActiveSceneKey(scene.key)}
              partOverrides={partOverrides}
              patternAsset={patternAsset}
              sketchMaskDataUrl={sketchMaskDataUrl}
              sketchOutline={sketchOutline}
            />
          ))}
        </section>

        <section className="quote-grid quote-grid--insight">
          <article className="quote-card quote-card--price quote-card--featured">
            <p className="panel__label">{copy.priceTitle}</p>
            <strong>{formatMoneyRange(quote.estimateLow, quote.estimateHigh, locale)}</strong>
            <p>{copy.midpoint}: {formatMoney(quote.estimateMid, locale)}</p>
            <p>{copy.recommendedBand}: {quote.recommendedBand}</p>
          </article>

          <article className="quote-card">
            <p className="panel__label">{copy.specTitle}</p>
            <dl className="quote-list">
              <div>
                <dt>{locale === "zh" ? "材质类型" : "Material"}</dt>
                <dd>{quote.materialLabel}</dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "桌面尺寸" : "Footprint"}</dt>
                <dd>{formatMeters(config.width)} x {formatMeters(config.depth)}</dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "轮廓模式" : "Outline"}</dt>
                <dd>
                  {config.silhouetteMode === "sketch"
                    ? locale === "zh"
                      ? "画板驱动"
                      : "Sketch Driven"
                    : getLocalizedOptionLabel(locale, "shape", config.shape)}
                </dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "桌腿系统" : "Leg System"}</dt>
                <dd>{config.legCount} {locale === "zh" ? "支" : "pcs"}</dd>
              </div>
            </dl>
          </article>

          <article className="quote-card">
            <p className="panel__label">{copy.marketTitle}</p>
            <dl className="quote-list">
              <div>
                <dt>{locale === "zh" ? "市场参考" : "Market Reference"}</dt>
                <dd>{quote.benchmark}</dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "复杂度系数" : "Complexity"}</dt>
                <dd>{quote.complexityMultiplier.toFixed(2)}x</dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "主要溢价项" : "Key Premiums"}</dt>
                <dd>
                  {quote.complexityDrivers.length
                    ? quote.complexityDrivers.map((item) => item.text).join(" / ")
                    : locale === "zh"
                      ? "基础难度"
                      : "Base build"}
                </dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "交付周期" : "Lead Time"}</dt>
                <dd>{quote.leadTimeDays.min}–{quote.leadTimeDays.max} {locale === "zh" ? "天" : "days"}</dd>
              </div>
            </dl>
          </article>

          <article className="quote-card quote-card--wide">
            <p className="panel__label">{copy.costTitle}</p>
            <div className="quote-stats">
              {quote.costBreakdown.map((item) => (
                <div key={item.key}>
                  <strong>{formatMoneyRange(item.low, item.high, locale)}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="quote-card quote-card--wide">
            <p className="panel__label">{copy.metricsTitle}</p>
            <div className="quote-stats">
              <div>
                <strong>{quote.moduleCount}</strong>
                <span>{locale === "zh" ? "三角模块" : "Modules"}</span>
              </div>
              <div>
                <strong>{quote.connectorCount}</strong>
                <span>{locale === "zh" ? "连接件" : "Connectors"}</span>
              </div>
              <div>
                <strong>{quote.materialKg} kg</strong>
                <span>{locale === "zh" ? "预计重量" : "Estimated Weight"}</span>
              </div>
              <div>
                <strong>{quote.fabricationHours} h</strong>
                <span>{locale === "zh" ? "制造工时" : "Fabrication Hours"}</span>
              </div>
            </div>
          </article>

          <article className="quote-card quote-card--cta quote-card--generate-only">
            <button
              className="primary-button"
              disabled={isGenerating}
              onClick={handleGenerateScenes}
              type="button"
            >
              {isGenerating ? copy.generatingButton : copy.generateButton}
            </button>
          </article>
        </section>
      </div>

      {activeSceneImage ? (
        <div
          className="quote-lightbox"
          onClick={() => setActiveSceneKey("")}
          role="presentation"
        >
          <div
            aria-label={activeScene?.scene}
            className="quote-lightbox__dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label={copy.close}
              className="quote-lightbox__close"
              onClick={() => setActiveSceneKey("")}
              type="button"
            >
              &times;
            </button>
            <img
              alt={`${activeScene?.scene || ""} render large`}
              className="quote-lightbox__image"
              src={activeSceneImage}
            />
            <div className="quote-lightbox__meta">
              <strong>{activeScene?.scene}</strong>
              <span>{activeScene?.room}</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
