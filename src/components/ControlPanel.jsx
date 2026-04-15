import {
  LEG_SHAPES,
  MATERIALS,
  PATTERN_MODES,
  SCENARIOS,
  SHAPES,
  SILHOUETTE_MODES,
  getOptionLabel
} from "../lib/catalog";

function OptionGroup({ label, items, value, onChange, disabledValue = null }) {
  return (
    <div className="control-row">
      <p className="panel__label">{label}</p>
      <div className="segmented">
        {items.map((item) => (
          <button
            key={item.value}
            className={`segmented__button ${
              value === item.value ? "is-active" : ""
            }`}
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
  valueFormatter,
  disabled = false
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
        disabled={disabled}
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

export default function ControlPanel({
  config,
  draftsCount,
  onConfigChange,
  onOpenDrafts,
  onSaveDraft,
  onPatternUpload,
  onClearPattern,
  patternAsset,
  serverSupportsVision,
  sketchLabel,
  sketchDetail,
  sketchHasContent
}) {
  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <p className="panel__label">Furniture Configurator</p>
          <h2 className="panel__title">Build the table from triangular modules.</h2>
        </div>
        <button className="ghost-button" onClick={onOpenDrafts} type="button">
          Drafts [{draftsCount}]
        </button>
      </div>

      <div className="panel__section panel__section--intro">
        <SectionHeader
          chip={sketchLabel}
          label="Triangle System"
          title="Upload a motif, sketch an outline, then tessellate the tabletop."
        />
        <p className="panel__note">{sketchDetail}</p>
        <p className="panel__lead panel__lead--small">
          Mouse: drag to rotate. Wheel: zoom. Every tabletop is now assembled from
          equilateral triangle modules.{" "}
          {serverSupportsVision
            ? "Vision-assisted sketch reading is active."
            : "Sketch sync is currently running through the local interpreter."}
        </p>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={patternAsset ? "Uploaded Motif Ready" : "Default Metal"}
          label="Module Motif"
          title="Map an image onto the triangle lattice or fall back to metal tiles."
        />
        <OptionGroup
          items={PATTERN_MODES}
          label="Pattern Source"
          onChange={(patternMode) => onConfigChange({ patternMode })}
          value={config.patternMode}
          disabledValue={!patternAsset ? "uploaded" : null}
        />
        <label className="file-field">
          <span className="panel__label">Upload Motif Image</span>
          <input
            accept="image/*"
            className="file-input"
            onChange={(event) => {
              const file = event.target.files?.[0];
              onPatternUpload(file);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
        <div className="control-grid">
          <SliderGroup
            label="Pattern Presence"
            max="2.20"
            min="0.35"
            onChange={(patternPresence) => onConfigChange({ patternPresence })}
            step="0.01"
            value={config.patternPresence}
            valueFormatter={(value) => `${value.toFixed(2)} X`}
            disabled={!patternAsset || config.patternMode !== "uploaded"}
          />
          <SliderGroup
            label="Contrast Boost"
            max="2.80"
            min="0.70"
            onChange={(patternContrast) => onConfigChange({ patternContrast })}
            step="0.01"
            value={config.patternContrast}
            valueFormatter={(value) => `${value.toFixed(2)} X`}
            disabled={!patternAsset || config.patternMode !== "uploaded"}
          />
          <SliderGroup
            label="Brightness Lift"
            max="2.40"
            min="0.65"
            onChange={(patternBrightness) => onConfigChange({ patternBrightness })}
            step="0.01"
            value={config.patternBrightness}
            valueFormatter={(value) => `${value.toFixed(2)} X`}
            disabled={!patternAsset || config.patternMode !== "uploaded"}
          />
          <SliderGroup
            label="Relief Height"
            max="1.25"
            min="0.00"
            onChange={(patternRelief) => onConfigChange({ patternRelief })}
            step="0.01"
            value={config.patternRelief}
            valueFormatter={(value) => `${value.toFixed(2)} X`}
            disabled={!patternAsset || config.patternMode !== "uploaded"}
          />
        </div>
        <div className="panel__asset">
          <div
            className="panel__asset-preview"
            style={
              patternAsset
                ? { backgroundImage: `url(${patternAsset.dataUrl})` }
                : undefined
            }
          />
          <div className="panel__asset-meta">
            <strong>{patternAsset?.name || "No uploaded motif yet"}</strong>
            <p className="panel__note">
              {patternAsset
                ? "The uploaded image is sampled across the triangle modules. If it still feels dark, raise Brightness Lift first, then Pattern Presence and Contrast Boost."
                : "Without an upload, the tabletop uses brushed metal triangle plates."}
            </p>
          </div>
        </div>
        {patternAsset ? (
          <button className="ghost-button" onClick={onClearPattern} type="button">
            Remove Motif
          </button>
        ) : null}
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={config.silhouetteMode === "sketch" ? "Sketch Driven" : "Preset Shape"}
          label="Outline Logic"
          title="Choose whether the triangle field follows a preset silhouette or your hand-drawn contour."
        />
        <OptionGroup
          items={SILHOUETTE_MODES}
          label="Outline Source"
          onChange={(silhouetteMode) => onConfigChange({ silhouetteMode })}
          value={config.silhouetteMode}
          disabledValue={!sketchHasContent ? "sketch" : null}
        />
        <OptionGroup
          items={SHAPES}
          label="Fallback Shape"
          onChange={(shape) => onConfigChange({ shape })}
          value={config.shape}
        />
        <div className="control-grid">
          <SliderGroup
            label="Triangle Size"
            max="0.28"
            min="0.04"
            onChange={(moduleSize) => onConfigChange({ moduleSize })}
            step="0.002"
            value={config.moduleSize}
            valueFormatter={(value) => `${value.toFixed(3)} M`}
          />
          <SliderGroup
            label="Triangle Thickness"
            max="1.20"
            min="0.18"
            onChange={(moduleThicknessScale) =>
              onConfigChange({ moduleThicknessScale })
            }
            step="0.01"
            value={config.moduleThicknessScale}
            valueFormatter={(value) => `${Math.round(value * 100)} %`}
          />
          <SliderGroup
            label="Module Gap"
            max="0.04"
            min="0.00"
            onChange={(moduleGap) => onConfigChange({ moduleGap })}
            step="0.001"
            value={config.moduleGap}
            valueFormatter={(value) => `${value.toFixed(3)} M`}
          />
        </div>
        <p className="panel__note">
          {sketchHasContent
            ? "A sketch outline is available. Switch to Sketch Outline to let the triangle mosaic follow your drawing. For tighter silhouette matching, lower Triangle Size and Triangle Thickness."
            : "Draw in the floating sketch window to unlock sketch-driven outlines."}
        </p>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={getOptionLabel(SCENARIOS, config.scenario)}
          label="Scene & Surface"
          title="Light mode, base material, and finish tone."
        />
        <OptionGroup
          items={SCENARIOS}
          label="Light Mode"
          onChange={(scenario) => onConfigChange({ scenario })}
          value={config.scenario}
        />
        <OptionGroup
          items={MATERIALS}
          label="Base Material"
          onChange={(material) => onConfigChange({ material })}
          value={config.material}
        />
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={`${config.width.toFixed(2)} x ${config.depth.toFixed(2)} x ${config.height.toFixed(2)} M`}
          label="Table Dimensions"
          title="Length, width, and overall height."
        />

        <div className="control-grid">
          <SliderGroup
            label="Length"
            max="2.40"
            min="0.65"
            onChange={(width) => onConfigChange({ width })}
            step="0.01"
            value={config.width}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label="Width"
            max="2.40"
            min="0.65"
            onChange={(depth) => onConfigChange({ depth })}
            step="0.01"
            value={config.depth}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label="Overall Height"
            max="1.12"
            min="0.56"
            onChange={(height) => onConfigChange({ height })}
            step="0.01"
            value={config.height}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label="Leg Length"
            max="1.02"
            min="0.42"
            onChange={(legLength) => onConfigChange({ legLength })}
            step="0.01"
            value={config.legLength}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={`${config.legCount} Legs`}
          label="Leg System"
          title="Shape, width, depth, height, and count."
        />
        <OptionGroup
          items={LEG_SHAPES}
          label="Leg Shape"
          onChange={(legShape) => onConfigChange({ legShape })}
          value={config.legShape}
        />
        <div className="control-grid">
          <SliderGroup
            label="Leg Height"
            max="1.02"
            min="0.42"
            onChange={(legLength) => onConfigChange({ legLength })}
            step="0.01"
            value={config.legLength}
            valueFormatter={(value) => `${value.toFixed(2)} M`}
          />
          <SliderGroup
            label="Leg Width"
            max="0.28"
            min="0.04"
            onChange={(legWidth) => onConfigChange({ legWidth })}
            step="0.005"
            value={config.legWidth}
            valueFormatter={(value) => `${value.toFixed(3)} M`}
          />
          <SliderGroup
            label="Leg Depth"
            max="0.28"
            min="0.04"
            onChange={(legDepth) => onConfigChange({ legDepth })}
            step="0.005"
            value={config.legDepth}
            valueFormatter={(value) => `${value.toFixed(3)} M`}
          />
          <SliderGroup
            label="Leg Count"
            max="8"
            min="3"
            onChange={(legCount) => onConfigChange({ legCount })}
            step="1"
            value={config.legCount}
            valueFormatter={(value) => `${Math.round(value)} PCS`}
          />
        </div>
      </div>

      <div className="panel__section">
        <SectionHeader
          chip={config.patternMode === "uploaded" && patternAsset ? "Image-Driven Mosaic" : "Metal Mosaic"}
          label="Current Selection"
          title={`${getOptionLabel(SHAPES, config.shape)} outline with ${getOptionLabel(
            LEG_SHAPES,
            config.legShape
          )} supports.`}
        />
        <p className="panel__lead panel__lead--small">
          Outline: {getOptionLabel(SILHOUETTE_MODES, config.silhouetteMode)}. Modules:{" "}
          {config.moduleSize.toFixed(3)} M size / {Math.round(
            config.moduleThicknessScale * 100
          )}% thickness / {config.moduleGap.toFixed(3)} M gap. Table:{" "}
          {config.width.toFixed(2)} x {config.depth.toFixed(2)} x {config.height.toFixed(2)} M.
          {" "}Uploaded motif: presence {config.patternPresence.toFixed(2)} / contrast{" "}
          {config.patternContrast.toFixed(2)} / brightness {config.patternBrightness.toFixed(2)} /
          relief {config.patternRelief.toFixed(2)}.
        </p>
        <div className="panel__actions">
          <button className="ghost-button" onClick={onSaveDraft} type="button">
            Save To Draft
          </button>
        </div>
      </div>
    </div>
  );
}
