import {
  LEG_SHAPES,
  MATERIALS,
  SCENARIOS,
  SHAPES,
  SILHOUETTE_MODES
} from "../lib/catalog";
import { getLocalizedOptionLabel, localizeOptions, t } from "../lib/i18n";

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

export default function ControlPanel({
  config,
  draftsCount,
  onConfigChange,
  onGoHome,
  onGoQuote,
  onOpenDrafts,
  onSaveDraft,
  onTabletopTintChange,
  onLegTintChange,
  tabletopTint = "#d9381e",
  legTint = "#1a1a1a",
  sketchHasContent,
  locale,
  onLocaleChange
}) {
  const localizedScenarios = localizeOptions(locale, "scenario", SCENARIOS);
  const localizedShapes = localizeOptions(locale, "shape", SHAPES);
  const localizedSilhouettes = localizeOptions(locale, "silhouette", SILHOUETTE_MODES);
  const localizedLegShapes = localizeOptions(locale, "legShape", LEG_SHAPES);
  const localizedMaterials = localizeOptions(locale, "material", MATERIALS);
  const teacherModelName = "mesh table 20210718 框架系列.gh";

  return (
    <div className="panel panel--compact">
      <div className="panel__header">
        <div>
          <p className="panel__label">
            {locale === "zh" ? "老师模型复刻" : "Teacher Model Replica"}
          </p>
          <h2 className="panel__title">{t(locale, "control.headerTitle")}</h2>
        </div>
        <div className="panel__actions panel__actions--wrap">
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
      </div>

      <div className="panel__section panel__section--intro">
        <SectionHeader
          chip="GH"
          label={locale === "zh" ? "基础桌型" : "Base Model"}
          title={
            locale === "zh"
              ? "老师框架桌 → Three.js 复刻"
              : "Teacher Frame Table → Three.js Replica"
          }
        />
        <div className="model-source">
          <span className="model-source__dot" />
          <div>
            <strong>{teacherModelName}</strong>
            <p>
              {locale === "zh"
                ? "当前网页直接用 Three.js 复刻老师这张框架桌，桌面上的三角模块仍可继续手绘编辑。"
                : "The current web view recreates the teacher's frame table directly in Three.js, while keeping the editable triangular module layer on top."}
            </p>
          </div>
        </div>
        <a
          className="ghost-button model-source__link"
          href="/rhino/mesh-table-20210718-framework.gh"
          download
        >
          {locale === "zh" ? "下载源 GH" : "Download GH Source"}
        </a>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={getLocalizedOptionLabel(locale, "silhouette", config.silhouetteMode)}
          label={locale === "zh" ? "桌面形状" : "Tabletop Shape"}
          title={locale === "zh" ? "预设或手绘轮廓" : "Preset or drawn outline"}
        />
        <OptionGroup
          disabledValue={!sketchHasContent ? "sketch" : null}
          items={localizedSilhouettes}
          label={t(locale, "control.outlineSource")}
          onChange={(silhouetteMode) => onConfigChange({ silhouetteMode })}
          value={config.silhouetteMode}
        />
        <OptionGroup
          items={localizedShapes}
          label={t(locale, "control.fallbackShape")}
          onChange={(shape) => onConfigChange({ shape })}
          value={config.shape}
        />
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={`${config.width.toFixed(2)} × ${config.depth.toFixed(2)} × ${config.height.toFixed(2)} M`}
          label={t(locale, "control.dimensions")}
          title={t(locale, "control.dimensionsTitle")}
        />
        <div className="control-grid">
          <SliderGroup
            label={t(locale, "control.length")}
            max="2.40"
            min="0.65"
            onChange={(width) => onConfigChange({ width })}
            step="0.01"
            value={config.width}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label={t(locale, "control.width")}
            max="2.40"
            min="0.65"
            onChange={(depth) => onConfigChange({ depth })}
            step="0.01"
            value={config.depth}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label={t(locale, "control.overallHeight")}
            max="1.12"
            min="0.56"
            onChange={(height) => onConfigChange({ height })}
            step="0.01"
            value={config.height}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label={t(locale, "control.triangleSize")}
            max="0.28"
            min="0.04"
            onChange={(moduleSize) => onConfigChange({ moduleSize })}
            step="0.002"
            value={config.moduleSize}
            valueFormatter={(value) => `${value.toFixed(3)} M`}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={locale === "zh" ? "参数化模块" : "Parametric Modules"}
          label={locale === "zh" ? "模块系统" : "Module System"}
          title={locale === "zh" ? "大小 / 密度 / 厚度 / 缝隙" : "Size / Density / Thickness / Gap"}
        />
        <div className="control-grid">
          <SliderGroup
            label={t(locale, "control.triangleSize")}
            max="0.28"
            min="0.04"
            onChange={(moduleSize) => onConfigChange({ moduleSize })}
            step="0.002"
            value={config.moduleSize}
            valueFormatter={(value) => `${value.toFixed(3)} M`}
          />
          <SliderGroup
            label={locale === "zh" ? "模块密度" : "Module Density"}
            max="100"
            min="0"
            onChange={(density) =>
              onConfigChange({ moduleSize: densityToModuleSize(density) })
            }
            step="1"
            value={moduleSizeToDensity(config.moduleSize)}
            valueFormatter={(value) => `${Math.round(value)} %`}
          />
          <SliderGroup
            label={t(locale, "control.triangleThickness")}
            max="1.20"
            min="0.18"
            onChange={(moduleThicknessScale) => onConfigChange({ moduleThicknessScale })}
            step="0.01"
            value={config.moduleThicknessScale}
            valueFormatter={(value) => `${Math.round(value * 100)} %`}
          />
          <SliderGroup
            label={t(locale, "control.moduleGap")}
            max="0.04"
            min="0.00"
            onChange={(moduleGap) => onConfigChange({ moduleGap })}
            step="0.001"
            value={config.moduleGap}
            valueFormatter={(value) => `${value.toFixed(3)} M`}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={locale === "zh" ? `${config.legCount} 条腿` : `${config.legCount} Legs`}
          label={t(locale, "control.legSystem")}
          title={t(locale, "control.legSystemTitle")}
        />
        <OptionGroup
          items={localizedLegShapes}
          label={t(locale, "control.legShape")}
          onChange={(legShape) => onConfigChange({ legShape })}
          value={config.legShape}
        />
        <div className="control-grid">
          <SliderGroup
            label={t(locale, "control.legCount")}
            max="8"
            min="3"
            onChange={(legCount) => onConfigChange({ legCount })}
            step="1"
            value={config.legCount}
            valueFormatter={(value) => `${Math.round(value)} PCS`}
          />
          <SliderGroup
            label={t(locale, "control.legHeight")}
            max="1.02"
            min="0.42"
            onChange={(legLength) => onConfigChange({ legLength })}
            step="0.01"
            value={config.legLength}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label={t(locale, "control.legWidth")}
            max="0.28"
            min="0.04"
            onChange={(legWidth) => onConfigChange({ legWidth })}
            step="0.005"
            value={config.legWidth}
            valueFormatter={(value) => `${value.toFixed(3)} M`}
          />
          <SliderGroup
            label={t(locale, "control.legDepth")}
            max="0.28"
            min="0.04"
            onChange={(legDepth) => onConfigChange({ legDepth })}
            step="0.005"
            value={config.legDepth}
            valueFormatter={(value) => `${value.toFixed(3)} M`}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={getLocalizedOptionLabel(locale, "material", config.material)}
          label={locale === "zh" ? "色彩与材质" : "Color & Material"}
          title={locale === "zh" ? "桌面 / 桌腿分开控制" : "Separate top and legs"}
        />
        <OptionGroup
          items={localizedMaterials}
          label={t(locale, "control.baseMaterial")}
          onChange={(material) => onConfigChange({ material })}
          value={config.material}
        />
        <div className="control-grid">
          <ColorControl
            label={locale === "zh" ? "桌面色彩" : "Tabletop Color"}
            onChange={onTabletopTintChange}
            value={tabletopTint}
          />
          <ColorControl
            label={locale === "zh" ? "桌腿色彩" : "Leg Color"}
            onChange={onLegTintChange}
            value={legTint}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={`${config.lightAngle ?? 38}°`}
          label={locale === "zh" ? "灯光模式" : "Lighting"}
          title={locale === "zh" ? "环境与主光角度" : "Mode and key angle"}
        />
        <OptionGroup
          items={localizedScenarios}
          label={t(locale, "control.lightMode")}
          onChange={(scenario) => onConfigChange({ scenario })}
          value={config.scenario}
        />
        <SliderGroup
          label={locale === "zh" ? "灯光角度" : "Light Angle"}
          max="75"
          min="-75"
          onChange={(lightAngle) => onConfigChange({ lightAngle })}
          step="1"
          value={config.lightAngle ?? 38}
          valueFormatter={(value) => `${Math.round(value)}°`}
        />
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={locale === "zh" ? "保存 / 报价" : "Save / Quote"}
          label={t(locale, "control.currentSelection")}
          title={t(locale, "control.currentSelectionTitle")}
        />
        <div className="panel__actions panel__actions--wrap">
          <button className="ghost-button" onClick={onSaveDraft} type="button">
            {t(locale, "control.saveDraft")}
          </button>
          <button className="ghost-button" onClick={onOpenDrafts} type="button">
            {t(locale, "common.drafts")} [{draftsCount}]
          </button>
          <button className="primary-button" onClick={onGoQuote} type="button">
            {locale === "zh" ? "进入报价" : "Open Quote"}
          </button>
          <button className="ghost-button" onClick={onGoHome} type="button">
            {locale === "zh" ? "返回开始" : "Back Home"}
          </button>
        </div>
      </div>
    </div>
  );
}
