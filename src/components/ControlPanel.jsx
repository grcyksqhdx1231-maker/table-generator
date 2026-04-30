import {
  MATERIALS,
  MAX_TABLETOP_RISE,
  MIN_OVERALL_HEIGHT,
  MIN_TABLETOP_RISE,
  SCENARIOS
} from "../lib/catalog";
import { getLocalizedOptionLabel, localizeOptions } from "../lib/i18n";

const MATERIAL_SWATCH_VISUALS = {
  light_wood: {
    base: "#e7d7bf",
    accent: "#ba8c58",
    detail: "#8f643d",
    glow: "rgba(220, 188, 148, 0.48)",
    finishZh: "浅木纹理 / 哑光",
    finishEn: "Light grain / matte"
  },
  dark_walnut: {
    base: "#6f4d36",
    accent: "#9d6b46",
    detail: "#40291d",
    glow: "rgba(121, 84, 56, 0.34)",
    finishZh: "胡桃木纹 / 深色",
    finishEn: "Walnut grain / deep tone"
  },
  rough_stone: {
    base: "#c4beb5",
    accent: "#9a9289",
    detail: "#726b63",
    glow: "rgba(196, 190, 181, 0.32)",
    finishZh: "矿物颗粒 / 石感",
    finishEn: "Mineral grain / stone"
  },
  metal: {
    base: "#b8bcc2",
    accent: "#8a9099",
    detail: "#5d646d",
    glow: "rgba(152, 160, 172, 0.34)",
    finishZh: "拉丝反光 / 金属",
    finishEn: "Brushed reflect / metal"
  }
};

function OptionGroup({ label, items, value, onChange, disabledValue = null }) {
  return (
    <div className="control-row">
      <p className="panel__label">{label}</p>
      <div className="segmented">
        {items.map((item) => (
          <button
            key={item.value}
            className={`segmented__button ${value === item.value ? "is-active" : ""}`}
            disabled={disabledValue === item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderGroup({
  label,
  value,
  onChange,
  min,
  max,
  step,
  valueFormatter
}) {
  return (
    <div className="control-row">
      <div className="panel__split">
        <p className="panel__label">{label}</p>
        <span className="panel__value">{valueFormatter(value)}</span>
      </div>
      <input
        aria-label={label}
        className="slider"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </div>
  );
}

function ColorControl({ label, value, onChange }) {
  return (
    <label className="control-row control-row--color">
      <div className="panel__split">
        <span className="panel__label">{label}</span>
        <span className="panel__value">{value}</span>
      </div>
      <input
        className="color-input"
        onChange={(event) => onChange(event.target.value)}
        type="color"
        value={value}
      />
    </label>
  );
}

function SectionHeader({ label, title, chip }) {
  return (
    <div className="panel__section-head">
      <div>
        <p className="panel__label">{label}</p>
        <h3 className="panel__mini-title">{title}</h3>
      </div>
      {chip ? <span className="status-chip">{chip}</span> : null}
    </div>
  );
}

function OverviewStat({ label, value }) {
  return (
    <div className="panel__overview-item">
      <p className="panel__label">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function MaterialSwatchGroup({ label, items, value, onChange, locale }) {
  return (
    <div className="control-row">
      <p className="panel__label">{label}</p>
      <div className="material-swatch-grid">
        {items.map((item) => {
          const visual = MATERIAL_SWATCH_VISUALS[item.value] ?? MATERIAL_SWATCH_VISUALS.light_wood;
          const finish = locale === "zh" ? visual.finishZh : visual.finishEn;

          return (
            <button
              key={item.value}
              className={`material-swatch ${value === item.value ? "is-active" : ""}`}
              onClick={() => onChange(item.value)}
              style={{
                "--swatch-base": visual.base,
                "--swatch-accent": visual.accent,
                "--swatch-detail": visual.detail,
                "--swatch-glow": visual.glow
              }}
              type="button"
            >
              <span aria-hidden="true" className={`material-swatch__preview material-swatch__preview--${item.value}`} />
              <span className="material-swatch__meta">
                <strong>{item.label}</strong>
                <span>{finish}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StickySummaryBar({
  locale,
  sizeLabel,
  outlineLabel,
  materialLabel,
  draftsCount,
  onSaveDraft,
  onGoQuote
}) {
  const copy =
    locale === "zh"
      ? {
          label: "粘性摘要",
          title: "当前配置",
          size: "尺寸",
          outline: "轮廓",
          material: "材质",
          drafts: `草稿 ${draftsCount}`,
          save: "保存草稿",
          quote: "进入报价"
        }
      : {
          label: "Sticky Summary",
          title: "Current Spec",
          size: "Size",
          outline: "Outline",
          material: "Material",
          drafts: `Drafts ${draftsCount}`,
          save: "Save Draft",
          quote: "Open Quote"
        };

  return (
    <div className="panel__sticky-summary">
      <div className="panel__sticky-copy">
        <div>
          <p className="panel__label">{copy.label}</p>
          <h3 className="panel__mini-title">{copy.title}</h3>
        </div>
        <span className="status-chip">{copy.drafts}</span>
      </div>

      <div className="panel__sticky-stats">
        <OverviewStat label={copy.size} value={sizeLabel} />
        <OverviewStat label={copy.outline} value={outlineLabel} />
        <OverviewStat label={copy.material} value={materialLabel} />
      </div>

      <div className="panel__sticky-actions">
        <button className="ghost-button" onClick={onSaveDraft} type="button">
          {copy.save}
        </button>
        <button className="primary-button" onClick={onGoQuote} type="button">
          {copy.quote}
        </button>
      </div>
    </div>
  );
}

function moduleSizeToDensity(moduleSize) {
  const min = 0.04;
  const max = 0.28;
  const normalized = (Number(moduleSize) - min) / (max - min);
  return Math.round((1 - Math.max(0, Math.min(1, normalized))) * 100);
}

function densityToModuleSize(density) {
  const min = 0.04;
  const max = 0.28;
  const normalized = 1 - Math.max(0, Math.min(100, Number(density))) / 100;
  return Number((min + normalized * (max - min)).toFixed(3));
}

function getCopy(locale) {
  if (locale === "zh") {
    return {
      heroEyebrow: "参数化桌面工作台",
      heroTitle: "桌面参数配置",
      heroLead: "按轮廓、结构、模块与材质四组逻辑快速调整。",
      size: "尺寸",
      outline: "轮廓",
      material: "材质",
      sourceLabel: "框架来源",
      sourceTitle: "给定 GH 框架",
      sourceNote: "当前网页基于指定 Rhino / GH 框架继续完成桌面改形与模块化控制。",
      currentDriver: "当前驱动",
      baseMode: "基础轮廓",
      sketchMode: "草图联动",
      dimensionsLabel: "整体比例",
      dimensionsTitle: "长度 / 进深 / 高度",
      frameLabel: "边框结构",
      frameTitle: "内缩 / 厚度",
      legsLabel: "桌腿系统",
      legsTitle: "高度 / 展开 / 深度 / 脚尖",
      modulesLabel: "参数化模块",
      modulesTitle: "大小 / 密度 / 厚度 / 缝隙",
      finishLabel: "材质与颜色",
      finishTitle: "桌面 / 模块 / 桌腿",
      lightingLabel: "灯光场景",
      lightingTitle: "环境 / 角度",
      actionsLabel: "辅助操作",
      actionsTitle: "草稿库 / Gallery / 个人主页 / 返回",
      length: "桌面长度",
      depth: "桌面进深",
      height: "整体高度",
      frameInset: "框架内缩",
      frameThickness: "框架厚度",
      legLength: "桌腿高度",
      legWidth: "腿宽",
      legSpread: "腿外展",
      legTopDepth: "上段深度",
      legBottomDepth: "下段深度",
      legBellyDepth: "腹部鼓出",
      legToeWidth: "脚尖宽度",
      legToeSharpness: "脚尖锐度",
      moduleSize: "模块尺寸",
      moduleDensity: "模块密度",
      moduleThickness: "模块厚度",
      moduleGap: "模块缝隙",
      baseMaterial: "基础材质",
      tabletopColor: "桌面颜色",
      moduleColor: "模块颜色",
      legColor: "桌腿颜色",
      sceneMode: "场景模式",
      lightAngle: "灯光角度",
      drafts: "草稿库",
      gallery: "Gallery",
      profile: "个人主页",
      backHome: "返回开始"
    };
  }

  return {
    heroEyebrow: "Parametric Table Studio",
    heroTitle: "Table Configuration",
    heroLead: "Tune outline, structure, modules, and finish through four clean groups.",
    size: "Size",
    outline: "Outline",
    material: "Material",
    sourceLabel: "Framework Source",
    sourceTitle: "Supplied GH Framework",
    sourceNote: "This web model continues from the supplied Rhino / GH framework while keeping the tabletop editable.",
    currentDriver: "Current Driver",
    baseMode: "Base Outline",
    sketchMode: "Sketch Sync",
    dimensionsLabel: "Overall Proportion",
    dimensionsTitle: "Length / Depth / Height",
    frameLabel: "Frame Structure",
    frameTitle: "Inset / Thickness",
    legsLabel: "Leg System",
    legsTitle: "Height / Spread / Depth / Toe",
    modulesLabel: "Parametric Modules",
    modulesTitle: "Size / Density / Thickness / Gap",
    finishLabel: "Material & Color",
    finishTitle: "Top / Modules / Legs",
    lightingLabel: "Lighting Scene",
    lightingTitle: "Environment / Angle",
    actionsLabel: "Utilities",
    actionsTitle: "Drafts / Gallery / Profile / Home",
    length: "Length",
    depth: "Depth",
    height: "Overall Height",
    frameInset: "Frame Inset",
    frameThickness: "Frame Thickness",
    legLength: "Leg Height",
    legWidth: "Leg Width",
    legSpread: "Leg Spread",
    legTopDepth: "Top Depth",
    legBottomDepth: "Bottom Depth",
    legBellyDepth: "Belly Depth",
    legToeWidth: "Toe Width",
    legToeSharpness: "Toe Sharpness",
    moduleSize: "Module Size",
    moduleDensity: "Module Density",
    moduleThickness: "Module Thickness",
    moduleGap: "Module Gap",
    baseMaterial: "Base Material",
    tabletopColor: "Tabletop Color",
    moduleColor: "Module Color",
    legColor: "Leg Color",
    sceneMode: "Scene Mode",
    lightAngle: "Light Angle",
    drafts: "Drafts",
    gallery: "Gallery",
    profile: "Profile",
    backHome: "Back Home"
  };
}

export default function ControlPanel({
  config,
  draftsCount,
  onConfigChange,
  onGoHome,
  onGoGallery,
  onGoProfile,
  onGoQuote,
  onOpenDrafts,
  onSaveDraft,
  onTabletopTintChange,
  onModuleTintChange,
  onLegTintChange,
  tabletopTint = "#d9381e",
  moduleTint = "#6e675f",
  legTint = "#1a1a1a",
  sketchHasContent,
  locale,
  onLocaleChange
}) {
  const copy = getCopy(locale);
  const heightMin = Math.max(
    MIN_OVERALL_HEIGHT,
    Number((config.legLength + MIN_TABLETOP_RISE).toFixed(2))
  );
  const heightMax = Math.min(1.12, Number((config.legLength + MAX_TABLETOP_RISE).toFixed(2)));
  const localizedScenarios = localizeOptions(locale, "scenario", SCENARIOS);
  const localizedMaterials = localizeOptions(locale, "material", MATERIALS);
  const silhouetteOptions = [
    { value: "shape", label: copy.baseMode },
    { value: "sketch", label: copy.sketchMode }
  ];
  const frameworkFileName = "mesh table 20210718 框架系列.gh";
  const sizeLabel = `${config.width.toFixed(2)} × ${config.depth.toFixed(2)} × ${config.height.toFixed(2)} M`;
  const outlineLabel = config.silhouetteMode === "sketch" ? copy.sketchMode : copy.baseMode;
  const materialLabel = getLocalizedOptionLabel(locale, "material", config.material);
  const meters = (value, digits = 3) => `${Number(value).toFixed(digits)} M`;
  const percent = (value) => `${Math.round(Number(value) * 100)} %`;

  return (
    <div className="panel panel--compact">
      <div className="panel__hero">
        <div className="panel__header">
          <div>
            <p className="panel__label">{copy.heroEyebrow}</p>
            <h2 className="panel__title">{copy.heroTitle}</h2>
            <p className="panel__lead panel__lead--small">{copy.heroLead}</p>
          </div>
          <div className="panel__actions panel__actions--wrap">
            <button
              className={`segmented__button ${locale === "zh" ? "is-active" : ""}`}
              onClick={() => onLocaleChange("zh")}
              type="button"
            >
              中文
            </button>
            <button
              className={`segmented__button ${locale === "en" ? "is-active" : ""}`}
              onClick={() => onLocaleChange("en")}
              type="button"
            >
              EN
            </button>
          </div>
        </div>

        <div className="panel__overview">
          <OverviewStat label={copy.size} value={sizeLabel} />
          <OverviewStat label={copy.outline} value={outlineLabel} />
          <OverviewStat label={copy.material} value={materialLabel} />
        </div>
      </div>

      <div className="panel__section panel__section--intro">
        <SectionHeader chip="GH" label={copy.sourceLabel} title={copy.sourceTitle} />
        <div className="model-source">
          <span className="model-source__dot" />
          <div>
            <strong>{frameworkFileName}</strong>
            <p>{copy.sourceNote}</p>
          </div>
        </div>
        <OptionGroup
          disabledValue={!sketchHasContent ? "sketch" : null}
          items={silhouetteOptions}
          label={copy.currentDriver}
          onChange={(silhouetteMode) => onConfigChange({ silhouetteMode })}
          value={config.silhouetteMode}
        />
      </div>

      <div className="panel__section">
        <SectionHeader chip={sizeLabel} label={copy.dimensionsLabel} title={copy.dimensionsTitle} />
        <div className="control-grid">
          <SliderGroup
            label={copy.length}
            max="2.40"
            min="0.65"
            onChange={(width) => onConfigChange({ width })}
            step="0.01"
            value={config.width}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label={copy.depth}
            max="2.40"
            min="0.65"
            onChange={(depth) => onConfigChange({ depth })}
            step="0.01"
            value={config.depth}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label={copy.height}
            max={heightMax.toFixed(2)}
            min={heightMin.toFixed(2)}
            onChange={(height) => onConfigChange({ height })}
            step="0.01"
            value={config.height}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={`${config.frameInset.toFixed(3)} / ${config.frameThickness.toFixed(3)} M`}
          label={copy.frameLabel}
          title={copy.frameTitle}
        />
        <div className="control-grid">
          <SliderGroup
            label={copy.frameInset}
            max="0.08"
            min="0.008"
            onChange={(frameInset) => onConfigChange({ frameInset })}
            step="0.001"
            value={config.frameInset}
            valueFormatter={(value) => meters(value)}
          />
          <SliderGroup
            label={copy.frameThickness}
            max="0.08"
            min="0.012"
            onChange={(frameThickness) => onConfigChange({ frameThickness })}
            step="0.001"
            value={config.frameThickness}
            valueFormatter={(value) => meters(value)}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={`${config.legTopDepth.toFixed(3)} / ${config.legBottomDepth.toFixed(3)} M`}
          label={copy.legsLabel}
          title={copy.legsTitle}
        />
        <div className="control-grid">
          <SliderGroup
            label={copy.legLength}
            max="1.02"
            min="0.42"
            onChange={(legLength) => onConfigChange({ legLength })}
            step="0.01"
            value={config.legLength}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label={copy.legWidth}
            max="0.18"
            min="0.03"
            onChange={(legWidth) => onConfigChange({ legWidth })}
            step="0.002"
            value={config.legWidth}
            valueFormatter={(value) => meters(value)}
          />
          <SliderGroup
            label={copy.legSpread}
            max="0.08"
            min="-0.04"
            onChange={(legSpread) => onConfigChange({ legSpread })}
            step="0.001"
            value={config.legSpread}
            valueFormatter={(value) => meters(value)}
          />
          <SliderGroup
            label={copy.legTopDepth}
            max="0.18"
            min="0.03"
            onChange={(legTopDepth) => onConfigChange({ legTopDepth })}
            step="0.002"
            value={config.legTopDepth}
            valueFormatter={(value) => meters(value)}
          />
          <SliderGroup
            label={copy.legBottomDepth}
            max="0.08"
            min="0.002"
            onChange={(legBottomDepth) => onConfigChange({ legBottomDepth })}
            step="0.001"
            value={config.legBottomDepth}
            valueFormatter={(value) => meters(value)}
          />
          <SliderGroup
            label={copy.legBellyDepth}
            max="0.08"
            min="0.00"
            onChange={(legBellyDepth) => onConfigChange({ legBellyDepth })}
            step="0.001"
            value={config.legBellyDepth}
            valueFormatter={(value) => meters(value)}
          />
          <SliderGroup
            label={copy.legToeWidth}
            max="0.04"
            min="0.002"
            onChange={(legToeWidth) => onConfigChange({ legToeWidth })}
            step="0.001"
            value={config.legToeWidth}
            valueFormatter={(value) => meters(value)}
          />
          <SliderGroup
            label={copy.legToeSharpness}
            max="1.00"
            min="0.00"
            onChange={(legToeSharpness) => onConfigChange({ legToeSharpness })}
            step="0.01"
            value={config.legToeSharpness}
            valueFormatter={(value) => percent(value)}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={locale === "zh" ? "参数化模块" : "Parametric Modules"}
          label={copy.modulesLabel}
          title={copy.modulesTitle}
        />
        <div className="control-grid">
          <SliderGroup
            label={copy.moduleSize}
            max="0.28"
            min="0.04"
            onChange={(moduleSize) => onConfigChange({ moduleSize })}
            step="0.002"
            value={config.moduleSize}
            valueFormatter={(value) => meters(value)}
          />
          <SliderGroup
            label={copy.moduleDensity}
            max="100"
            min="0"
            onChange={(density) => onConfigChange({ moduleSize: densityToModuleSize(density) })}
            step="1"
            value={moduleSizeToDensity(config.moduleSize)}
            valueFormatter={(value) => `${Math.round(value)} %`}
          />
          <SliderGroup
            label={copy.moduleThickness}
            max="1.20"
            min="0.18"
            onChange={(moduleThicknessScale) => onConfigChange({ moduleThicknessScale })}
            step="0.01"
            value={config.moduleThicknessScale}
            valueFormatter={(value) => percent(value)}
          />
          <SliderGroup
            label={copy.moduleGap}
            max="0.04"
            min="0.00"
            onChange={(moduleGap) => onConfigChange({ moduleGap })}
            step="0.001"
            value={config.moduleGap}
            valueFormatter={(value) => meters(value)}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader chip={materialLabel} label={copy.finishLabel} title={copy.finishTitle} />
        <MaterialSwatchGroup
          items={localizedMaterials}
          label={copy.baseMaterial}
          locale={locale}
          onChange={(material) => onConfigChange({ material })}
          value={config.material}
        />
        <div className="control-grid">
          <ColorControl
            label={copy.tabletopColor}
            onChange={onTabletopTintChange}
            value={tabletopTint}
          />
          <ColorControl
            label={copy.moduleColor}
            onChange={onModuleTintChange}
            value={moduleTint}
          />
          <ColorControl
            label={copy.legColor}
            onChange={onLegTintChange}
            value={legTint}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={`${config.lightAngle ?? 38}°`}
          label={copy.lightingLabel}
          title={copy.lightingTitle}
        />
        <OptionGroup
          items={localizedScenarios}
          label={copy.sceneMode}
          onChange={(scenario) => onConfigChange({ scenario })}
          value={config.scenario}
        />
        <SliderGroup
          label={copy.lightAngle}
          max="75"
          min="-75"
          onChange={(lightAngle) => onConfigChange({ lightAngle })}
          step="1"
          value={config.lightAngle ?? 38}
          valueFormatter={(value) => `${Math.round(value)}°`}
        />
      </div>

      <div className="panel__section">
        <SectionHeader label={copy.actionsLabel} title={copy.actionsTitle} />
        <div className="panel__actions panel__actions--wrap">
          <button className="ghost-button" onClick={onOpenDrafts} type="button">
            {copy.drafts} [{draftsCount}]
          </button>
          <button className="ghost-button" onClick={onGoGallery} type="button">
            {copy.gallery}
          </button>
          <button className="ghost-button" onClick={onGoProfile} type="button">
            {copy.profile}
          </button>
          <button className="ghost-button" onClick={onGoHome} type="button">
            {copy.backHome}
          </button>
        </div>
      </div>

      <StickySummaryBar
        draftsCount={draftsCount}
        locale={locale}
        materialLabel={materialLabel}
        onGoQuote={onGoQuote}
        onSaveDraft={onSaveDraft}
        outlineLabel={outlineLabel}
        sizeLabel={sizeLabel}
      />
    </div>
  );
}
