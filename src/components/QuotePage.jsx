import { useEffect, useMemo, useRef, useState } from "react";
import TableViewport from "./TableViewport";
import { requestQuoteSceneGeneration } from "../lib/api";
import { getLocalizedOptionLabel } from "../lib/i18n";

const HERO_IMAGE_URL = "/quote-assets/cinematic-hero-office-people.jpg";

function formatMoney(value, locale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    currency: "CNY",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

function formatMeters(value) {
  return `${Number(value).toFixed(2)} m`;
}

function buildQuote(config) {
  const area = Math.max(0.36, config.width * config.depth);
  const moduleArea = Math.max(0.006, config.moduleSize * config.moduleSize * 0.43);
  const moduleCount = Math.round(area / moduleArea);
  const connectorCount = Math.round(moduleCount * 1.62 + config.legCount * 18);
  const printHours = Math.round(moduleCount * 0.18 + config.legCount * 5.5);
  const materialKg = Number((area * 2.4 + config.legCount * 0.42).toFixed(1));
  const estimate = Math.round(1800 + moduleCount * 9.6 + connectorCount * 3.2 + printHours * 38);

  return {
    connectorCount,
    estimate,
    materialKg,
    moduleCount,
    printHours
  };
}

function buildSceneCards(config, locale) {
  return [
    {
      key: "office",
      className: "quote-scene-card--office",
      defaultImageUrl: "/quote-assets/default-scenes/office-people.jpg",
      scene: locale === "zh" ? "\u529e\u516c\u573a\u666f" : "Office",
      room:
        locale === "zh"
          ? "\u623f\u95f4\u5c3a\u5bf8 6.20 x 4.80 x 3.10 m"
          : "Room 6.20 x 4.80 x 3.10 m",
      title: locale === "zh" ? "\u9759\u8c27\u529e\u516c" : "Quiet Office",
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
      scene: locale === "zh" ? "\u9910\u5385\u573a\u666f" : "Dining",
      room:
        locale === "zh"
          ? "\u623f\u95f4\u5c3a\u5bf8 5.60 x 4.40 x 2.90 m"
          : "Room 5.60 x 4.40 x 2.90 m",
      title: locale === "zh" ? "\u6696\u5149\u9910\u5385" : "Warm Dining",
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
      scene: locale === "zh" ? "\u5367\u5ba4\u573a\u666f" : "Bedroom",
      room:
        locale === "zh"
          ? "\u623f\u95f4\u5c3a\u5bf8 4.20 x 3.80 x 2.75 m"
          : "Room 4.20 x 3.80 x 2.75 m",
      title: locale === "zh" ? "\u67d4\u548c\u5367\u5ba4" : "Soft Bedroom",
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
      scene: locale === "zh" ? "\u5c55\u5385\u573a\u666f" : "Gallery",
      room:
        locale === "zh"
          ? "\u623f\u95f4\u5c3a\u5bf8 7.20 x 5.60 x 3.40 m"
          : "Room 7.20 x 5.60 x 3.40 m",
      title: locale === "zh" ? "\u591c\u666f\u5c55\u5385" : "Night Gallery",
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
      back: "\u8fd4\u56de\u4e3b\u754c\u9762",
      close: "\u5173\u95ed",
      drafts: "\u8349\u7a3f\u5e93",
      home: "\u5f00\u59cb\u754c\u9762",
      eyebrow: "\u573a\u666f\u5316\u62a5\u4ef7",
      title: "Tri-Mesh Table",
      heroScene: "\u4e3b\u5c55\u793a\u573a\u666f",
      heroRoom: "\u623f\u95f4\u5c3a\u5bf8 6.80 x 5.40 x 3.20 m",
      priceTitle: "\u9884\u4f30\u62a5\u4ef7",
      specTitle: "\u5f53\u524d\u914d\u7f6e",
      productionTitle: "\u751f\u4ea7\u62c6\u89e3",
      generateButton: "\u751f\u6210 AI \u573a\u666f\u56fe",
      generatingButton: "\u6b63\u5728\u751f\u6210\u573a\u666f\u56fe...",
      pendingBadge: "\u7b49\u5f85\u751f\u6210",
      generatingBadge: "\u751f\u6210\u4e2d",
      readyBadge: "AI \u573a\u666f\u5df2\u5c31\u7eea",
      previewBadge: "\u573a\u666f\u9884\u89c8",
      failedBadge: "\u751f\u6210\u5931\u8d25",
      openLarge: "\u67e5\u770b\u5927\u56fe"
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
    productionTitle: "Production Breakdown",
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
  const quote = useMemo(() => buildQuote(config), [config]);
  const scenes = useMemo(() => buildSceneCards(config, locale), [config, locale]);
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
            { error: locale === "zh" ? "\u53c2\u8003\u56fe\u6293\u53d6\u5931\u8d25" : "Reference capture failed" }
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
            <div className="quote-hero__chips">
              <span className="status-chip is-ready">
                {formatMeters(config.width)} x {formatMeters(config.depth)} x {formatMeters(config.height)}
              </span>
              <span className="status-chip">
                {getLocalizedOptionLabel(locale, "shape", config.shape)}
              </span>
              <span className="status-chip">
                {getLocalizedOptionLabel(locale, "material", config.material)}
              </span>
            </div>
          </div>
          <div className="quote-stage__meta quote-stage__meta--hero">
            <strong>{copy.heroScene}</strong>
            <span>{copy.heroRoom}</span>
          </div>
        </section>

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
            <strong>{formatMoney(quote.estimate, locale)}</strong>
          </article>

          <article className="quote-card">
            <p className="panel__label">{copy.specTitle}</p>
            <dl className="quote-list">
              <div>
                <dt>{locale === "zh" ? "\u684c\u9762\u5f62\u72b6" : "Tabletop Shape"}</dt>
                <dd>{getLocalizedOptionLabel(locale, "shape", config.shape)}</dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "\u684c\u817f\u6570\u91cf" : "Leg Count"}</dt>
                <dd>{config.legCount}</dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "\u684c\u817f\u5f62\u72b6" : "Leg Shape"}</dt>
                <dd>{getLocalizedOptionLabel(locale, "legShape", config.legShape)}</dd>
              </div>
              <div>
                <dt>{locale === "zh" ? "\u706f\u5149\u89d2\u5ea6" : "Light Angle"}</dt>
                <dd>{config.lightAngle ?? 38} deg</dd>
              </div>
            </dl>
          </article>

          <article className="quote-card quote-card--wide">
            <p className="panel__label">{copy.productionTitle}</p>
            <div className="quote-stats">
              <div>
                <strong>{quote.moduleCount}</strong>
                <span>{locale === "zh" ? "\u4e09\u89d2\u6a21\u5757" : "Modules"}</span>
              </div>
              <div>
                <strong>{quote.connectorCount}</strong>
                <span>{locale === "zh" ? "\u8fde\u63a5\u4ef6" : "Connectors"}</span>
              </div>
              <div>
                <strong>{quote.materialKg} kg</strong>
                <span>{locale === "zh" ? "\u9884\u8ba1\u6750\u6599" : "Material"}</span>
              </div>
              <div>
                <strong>{quote.printHours} h</strong>
                <span>{locale === "zh" ? "\u5236\u9020\u65f6\u957f" : "Print Time"}</span>
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

