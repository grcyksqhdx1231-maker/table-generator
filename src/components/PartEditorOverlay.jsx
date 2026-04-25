import { useEffect, useRef, useState } from "react";
import { ECO_MATERIALS } from "../lib/ecoMaterials";
import { t } from "../lib/i18n";

function summarizePoints(points, canvasWidth = 220, canvasHeight = 92) {
  if (!points.length) {
    return {
      hasSketch: false,
      coverage: 0,
      aspectRatio: 1
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return {
    hasSketch: true,
    coverage: Math.min(1, (width * height) / (canvasWidth * canvasHeight)),
    aspectRatio: width / height
  };
}

export default function PartEditorOverlay({
  selectedPart,
  partOverride,
  onClose,
  onOverrideChange,
  onApplyInstruction,
  locale
}) {
  const canvasRef = useRef(null);
  const pointsRef = useRef([]);
  const activeRef = useRef(false);
  const [instruction, setInstruction] = useState("");

  function clearCanvas(shouldResetInstruction = false) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    context.fillStyle = "#f4f1eb";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#d9381e";
    context.lineWidth = 2;
    pointsRef.current = [];
    activeRef.current = false;

    if (shouldResetInstruction) {
      setInstruction("");
    }
  }

  useEffect(() => {
    clearCanvas(true);
  }, [selectedPart?.id]);

  if (!selectedPart) {
    return null;
  }

  function drawPoint(point) {
    const context = canvasRef.current.getContext("2d");
    const previous = pointsRef.current[pointsRef.current.length - 2];

    if (!previous) {
      context.beginPath();
      context.arc(point.x, point.y, 1.4, 0, Math.PI * 2);
      context.fillStyle = "#d9381e";
      context.fill();
      return;
    }

    context.strokeStyle = "#d9381e";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function getPoint(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  return (
    <aside
      className="part-editor"
      style={{
        left: `${Math.min(78, Math.max(62, (selectedPart.anchor?.x || 0) / 12 + 18))}%`,
        top: `${Math.min(58, Math.max(6, (selectedPart.anchor?.y || 0) / 13))}%`
      }}
    >
      <div className="panel__split panel__split--tight">
        <div>
          <p className="panel__label">{t(locale, "part.selected")}</p>
          <h3 className="panel__mini-title">{selectedPart.label}</h3>
          <p className="panel__note">
            {t(locale, "part.detected")}: {selectedPart.label}
          </p>
        </div>
        <button className="ghost-button" onClick={onClose} type="button">
          {t(locale, "common.close")}
        </button>
      </div>

      <div className="part-editor__surface">
        <p className="panel__label">{t(locale, "part.sketchpad")}</p>
        <canvas
          className="part-editor__canvas"
          height="92"
          onPointerDown={(event) => {
            activeRef.current = true;
            const point = getPoint(event);
            pointsRef.current.push(point);
            drawPoint(point);
          }}
          onPointerMove={(event) => {
            if (!activeRef.current) {
              return;
            }
            const point = getPoint(event);
            pointsRef.current.push(point);
            drawPoint(point);
          }}
          onPointerUp={() => {
            activeRef.current = false;
          }}
          onPointerCancel={() => {
            activeRef.current = false;
          }}
          onPointerLeave={() => {
            activeRef.current = false;
          }}
          ref={canvasRef}
          width="220"
        />
      </div>

      <div className="part-editor__controls">
        <label className="chat-dock__field">
          <span className="panel__label">{t(locale, "part.ecoMaterial")}</span>
          <select
            className="chat-dock__select"
            onChange={(event) => onOverrideChange({ materialKey: event.target.value })}
            value={partOverride.materialKey}
          >
            {ECO_MATERIALS.map((material) => (
              <option key={material.value} value={material.value}>
                {material.label}
              </option>
            ))}
          </select>
        </label>

        <label className="chat-dock__field">
          <span className="panel__label">{t(locale, "part.tint")}</span>
          <input
            className="file-input"
            onChange={(event) => onOverrideChange({ tint: event.target.value })}
            type="color"
            value={partOverride.tint || "#d9381e"}
          />
        </label>
      </div>

      <label className="chat-dock__field">
        <span className="panel__label">{t(locale, "part.dialogue")}</span>
        <textarea
          className="prompt-input part-editor__input"
          onChange={(event) => setInstruction(event.target.value)}
          placeholder={t(locale, "part.placeholder")}
          rows="3"
          value={instruction}
        />
      </label>

      <div className="panel__actions">
        <button
          className="ghost-button"
          onClick={() => clearCanvas(false)}
          type="button"
        >
          {t(locale, "part.clear")}
        </button>
        <button
          className="primary-button"
          onClick={() =>
            onApplyInstruction(instruction, {
              ...summarizePoints(
                pointsRef.current,
                canvasRef.current?.width || 220,
                canvasRef.current?.height || 92
              ),
              pointCount: pointsRef.current.length
            })
          }
          type="button"
        >
          {t(locale, "part.apply")}
        </button>
      </div>
    </aside>
  );
}
