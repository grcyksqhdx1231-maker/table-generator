import { useState } from "react";
import {
  MATERIALS,
  SCENARIOS,
  SHAPES,
  getOptionLabel
} from "../lib/catalog";

function OptionGroup({ label, items, value, onChange }) {
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

function SliderGroup({ value, onChange }) {
  return (
    <div className="control-row">
      <div className="panel__split">
        <p className="panel__label">Length / Radius</p>
        <span className="panel__value">{value.toFixed(2)} M</span>
      </div>
      <input
        aria-label="Length or radius"
        className="slider"
        max="2.40"
        min="0.75"
        onChange={(event) => onChange(Number(event.target.value))}
        step="0.01"
        type="range"
        value={value}
      />
    </div>
  );
}

export default function ControlPanel({
  config,
  draftsCount,
  onConfigChange,
  onOpenDrafts,
  onSaveDraft,
  onSubmitPrompt,
  isBusy,
  aiNote,
  status,
  serverReady,
  serverProviderLabel,
  serverModel
}) {
  const [prompt, setPrompt] = useState(
    "A warm small round table for two people having coffee."
  );

  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <p className="panel__label">Furniture Configurator</p>
          <h2 className="panel__title">Edit form, light, and material.</h2>
        </div>
        <button className="ghost-button" onClick={onOpenDrafts} type="button">
          Drafts [{draftsCount}]
        </button>
      </div>

      <div className="panel__section">
        <p className="panel__lead">
          Build manually, then let the model reinterpret the same composition.
        </p>
      </div>

      <div className="panel__section">
        <OptionGroup
          items={SCENARIOS}
          label="Scenario"
          onChange={(scenario) => onConfigChange({ scenario })}
          value={config.scenario}
        />
        <OptionGroup
          items={SHAPES}
          label="Shape"
          onChange={(shape) => onConfigChange({ shape })}
          value={config.shape}
        />
        <SliderGroup
          onChange={(size) => onConfigChange({ size })}
          value={config.size}
        />
        <OptionGroup
          items={MATERIALS}
          label="Material"
          onChange={(material) => onConfigChange({ material })}
          value={config.material}
        />
      </div>

      <div className="panel__section">
        <div className="panel__split panel__split--tight">
          <p className="panel__label">Current Selection</p>
          <span className="panel__value">
            {getOptionLabel(SHAPES, config.shape)} /{" "}
            {getOptionLabel(MATERIALS, config.material)}
          </span>
        </div>
        <p className="panel__lead panel__lead--small">
          Scene: {getOptionLabel(SCENARIOS, config.scenario)}. Scale tuned to{" "}
          {config.size.toFixed(2)} meters.
        </p>
        <p className="panel__note">Mouse: drag to rotate. Wheel: zoom in or out.</p>
      </div>

      <div className="panel__section panel__section--ai">
        <div className="panel__split">
          <div>
            <p className="panel__label">AI Driven Design</p>
            <h3 className="panel__mini-title">Translate language into form.</h3>
          </div>
          <span className={`status-chip ${serverReady ? "is-ready" : ""}`}>
            {serverReady ? `${serverProviderLabel} / ${serverModel}` : "AI Not Ready"}
          </span>
        </div>
        <p className="panel__note">
          Switch provider or model through your local <code>.env</code> file.
        </p>
        <textarea
          className="prompt-input"
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the mood, size, and use case."
          rows="5"
          value={prompt}
        />
        <div className="panel__actions">
          <button
            className="primary-button"
            disabled={isBusy || !serverReady}
            onClick={() => onSubmitPrompt(prompt)}
            type="button"
          >
            {isBusy ? "Composing..." : "Apply AI Design"}
          </button>
          <button className="ghost-button" onClick={onSaveDraft} type="button">
            Save To Draft
          </button>
        </div>
        {aiNote ? <p className="panel__note">{aiNote}</p> : null}
        {status ? <p className="panel__status">{status}</p> : null}
      </div>
    </div>
  );
}
