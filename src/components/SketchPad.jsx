import { useEffect, useRef, useState } from "react";

const BACKGROUND = "#f3efe8";
const INK_SWATCHES = [
  { label: "Light Wood", color: "#d6a678" },
  { label: "Dark Walnut", color: "#5f4030" },
  { label: "Stone", color: "#98928d" },
  { label: "Metal", color: "#8d9399" },
  { label: "Accent", color: "#d9381e" }
];

function drawStroke(context, stroke) {
  if (!stroke.points.length) {
    return;
  }

  context.strokeStyle = stroke.color;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    context.beginPath();
    context.fillStyle = stroke.color;
    context.arc(point.x, point.y, stroke.size * 0.35, 0, Math.PI * 2);
    context.fill();
    return;
  }

  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const current = stroke.points[index];
    const pressure = ((previous.pressure || 0.7) + (current.pressure || 0.7)) / 2;
    context.lineWidth = Math.max(1.2, stroke.size * pressure);
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(current.x, current.y);
    context.stroke();
  }
}

function drawTriangleGrid(context, width, height) {
  const side = 34;
  const triangleHeight = (side * Math.sqrt(3)) / 2;

  context.strokeStyle = "rgba(26, 26, 26, 0.055)";
  context.lineWidth = 1;

  for (let row = -2; row * triangleHeight < height + triangleHeight; row += 1) {
    const y = row * triangleHeight;
    const offset = row % 2 === 0 ? 0 : side / 2;

    for (let x = -side * 2; x < width + side * 2; x += side) {
      context.beginPath();
      context.moveTo(x + offset, y);
      context.lineTo(x + side / 2 + offset, y + triangleHeight);
      context.lineTo(x - side / 2 + offset, y + triangleHeight);
      context.closePath();
      context.stroke();
    }
  }
}

function cross(origin, a, b) {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

function convexHull(points) {
  const sorted = [...points]
    .map((point) => ({ x: point.x, y: point.y }))
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  if (sorted.length <= 2) {
    return sorted;
  }

  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function polygonArea(points) {
  if (points.length < 3) {
    return 0;
  }

  let sum = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }

  return Math.abs(sum) * 0.5;
}

function polygonPerimeter(points) {
  if (points.length < 2) {
    return 0;
  }

  let total = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    total += Math.hypot(next.x - current.x, next.y - current.y);
  }

  return total;
}

function computeElongation(points) {
  if (points.length < 2) {
    return 1;
  }

  const centroid = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y
    }),
    { x: 0, y: 0 }
  );

  centroid.x /= points.length;
  centroid.y /= points.length;

  let xx = 0;
  let yy = 0;
  let xy = 0;

  points.forEach((point) => {
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  });

  xx /= points.length;
  yy /= points.length;
  xy /= points.length;

  const trace = xx + yy;
  const discriminant = Math.sqrt(Math.max(0, (xx - yy) ** 2 + 4 * xy * xy));
  const lambda1 = Math.max(0.0001, (trace + discriminant) / 2);
  const lambda2 = Math.max(0.0001, (trace - discriminant) / 2);

  return Math.sqrt(lambda1 / lambda2);
}

function computeRadialVariance(points) {
  if (points.length < 3) {
    return 0;
  }

  const centroid = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y
    }),
    { x: 0, y: 0 }
  );

  centroid.x /= points.length;
  centroid.y /= points.length;

  const distances = points.map((point) =>
    Math.hypot(point.x - centroid.x, point.y - centroid.y)
  );
  const mean = distances.reduce((sum, distance) => sum + distance, 0) / distances.length;

  if (!mean) {
    return 0;
  }

  const variance =
    distances.reduce((sum, distance) => sum + (distance - mean) ** 2, 0) /
    distances.length;

  return Math.sqrt(variance) / mean;
}

function summarizeStrokes(strokes, width, height) {
  const allPoints = [];
  const colorWeights = new Map();
  let pathLength = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let cornerCount = 0;

  strokes.forEach((stroke) => {
    for (let index = 0; index < stroke.points.length; index += 1) {
      const point = stroke.points[index];
      allPoints.push(point);
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);

      if (index > 0) {
        const previous = stroke.points[index - 1];
        const segmentLength = Math.hypot(point.x - previous.x, point.y - previous.y);
        pathLength += segmentLength;
        colorWeights.set(
          stroke.color,
          (colorWeights.get(stroke.color) || 0) + segmentLength
        );
      }

      if (index > 1) {
        const a = stroke.points[index - 2];
        const b = stroke.points[index - 1];
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const bcx = point.x - b.x;
        const bcy = point.y - b.y;
        const abLength = Math.hypot(abx, aby);
        const bcLength = Math.hypot(bcx, bcy);

        if (abLength > 5 && bcLength > 5) {
          const dot = (abx * bcx + aby * bcy) / (abLength * bcLength);
          const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
          if (angle > 1.02) {
            cornerCount += 1;
          }
        }
      }
    }
  });

  if (!allPoints.length) {
    return {
      hasContent: false,
      strokeCount: 0,
      pointCount: 0,
      coverage: 0,
      aspectRatio: 1,
      dominantColor: "#1a1a1a",
      cornerCount: 0,
      strokeEnergy: 0,
      circularity: 0,
      rectangularity: 0,
      elongation: 1,
      radialVariance: 0,
      boundsWidthRatio: 0,
      boundsHeightRatio: 0
    };
  }

  const sampleStep = Math.max(1, Math.floor(allPoints.length / 260));
  const sampledPoints = allPoints.filter((_, index) => index % sampleStep === 0);
  const bboxWidth = Math.max(1, maxX - minX);
  const bboxHeight = Math.max(1, maxY - minY);
  const dominantColor = [...colorWeights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    || "#1a1a1a";
  const hull = convexHull(sampledPoints);
  const hullArea = polygonArea(hull);
  const hullPerimeter = polygonPerimeter(hull);
  const bboxArea = Math.max(1, bboxWidth * bboxHeight);
  const circularity =
    hullPerimeter > 0 ? (4 * Math.PI * hullArea) / (hullPerimeter * hullPerimeter) : 0;
  const coverage = Math.min(1, hullArea / Math.max(1, width * height));
  const strokeEnergy = Math.min(
    1,
    pathLength / Math.max(1, Math.hypot(width, height) * 4)
  );

  return {
    hasContent: true,
    strokeCount: strokes.length,
    pointCount: allPoints.length,
    coverage,
    aspectRatio: bboxWidth / bboxHeight,
    dominantColor,
    cornerCount,
    strokeEnergy,
    circularity,
    rectangularity: Math.min(1, hullArea / bboxArea),
    elongation: computeElongation(sampledPoints),
    radialVariance: computeRadialVariance(hull),
    hullNormalized: hull.map((point) => ({
      x: point.x / Math.max(1, width),
      y: point.y / Math.max(1, height)
    })),
    boundsWidthRatio: Math.min(1, bboxWidth / Math.max(1, width)),
    boundsHeightRatio: Math.min(1, bboxHeight / Math.max(1, height)),
    hullPointCount: hull.length,
    bounds: {
      x: minX,
      y: minY,
      width: bboxWidth,
      height: bboxHeight
    }
  };
}

function createMaskDataUrl(strokes, width, height) {
  if (!strokes.length || !width || !height) {
    return "";
  }

  const maskCanvas = document.createElement("canvas");
  const context = maskCanvas.getContext("2d");
  maskCanvas.width = width;
  maskCanvas.height = height;

  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);

  strokes.forEach((stroke) => {
    const shiftedStroke = {
      ...stroke,
      color: "#ffffff",
      points: stroke.points.map((point) => ({ ...point }))
    };

    drawStroke(context, shiftedStroke);
  });

  return maskCanvas.toDataURL("image/png", 0.92);
}

export default function SketchPad({
  onSketchChange,
  syncLabel,
  syncDetail,
  floating = false,
  locale = "en",
  transparentSurface = false
}) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const activeStrokeRef = useRef(null);
  const canvasMetricsRef = useRef({ width: 1, height: 1, dpr: 1 });
  const snapshotTimerRef = useRef(null);
  const [brushColor, setBrushColor] = useState(INK_SWATCHES[0].color);
  const [brushSize, setBrushSize] = useState(12);

  function drawAll() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const { width, height, dpr } = canvasMetricsRef.current;
    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = transparentSurface ? "rgba(243, 239, 232, 0.48)" : BACKGROUND;
    context.fillRect(0, 0, width, height);
    drawTriangleGrid(context, width, height);

    strokesRef.current.forEach((stroke) => {
      drawStroke(context, stroke);
    });
  }

  function emitSnapshot() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const { width, height } = canvasMetricsRef.current;
    const summary = summarizeStrokes(strokesRef.current, width, height);

    onSketchChange({
      ...summary,
      dataUrl: summary.hasContent ? canvas.toDataURL("image/png", 0.92) : "",
      maskDataUrl: summary.hasContent
        ? createMaskDataUrl(strokesRef.current, width, height)
        : "",
      updatedAt: Date.now()
    });
  }

  function queueSnapshot(delay = 150) {
    window.clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = window.setTimeout(() => {
      emitSnapshot();
    }, delay);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.max(1, Math.floor(entry.contentRect.width));
      const height = Math.max(1, Math.floor(entry.contentRect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvasMetricsRef.current = { width, height, dpr };
      drawAll();
      emitSnapshot();
    });

    resizeObserver.observe(canvas);
    return () => {
      window.clearTimeout(snapshotTimerRef.current);
      resizeObserver.disconnect();
    };
  }, []);

  function getPoint(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure:
        event.pointerType === "pen" ? Math.max(0.25, event.pressure || 0.7) : 0.72
    };
  }

  function handlePointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    const stroke = {
      color: brushColor,
      size: brushSize,
      points: [getPoint(event)]
    };

    activeStrokeRef.current = {
      pointerId: event.pointerId,
      stroke
    };
    strokesRef.current = [...strokesRef.current, stroke];
    event.currentTarget.setPointerCapture(event.pointerId);
    drawAll();
    queueSnapshot();
  }

  function handlePointerMove(event) {
    const active = activeStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) {
      return;
    }

    active.stroke.points.push(getPoint(event));
    drawAll();
    queueSnapshot(120);
  }

  function handlePointerUp(event) {
    const active = activeStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) {
      return;
    }

    activeStrokeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    drawAll();
    queueSnapshot(60);
  }

  function clearCanvas() {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    drawAll();
    emitSnapshot();
  }

  return (
    <section
      className={`sketchpad ${floating ? "sketchpad--floating" : ""} ${
        transparentSurface ? "sketchpad--transparent" : ""
      }`}
    >
      <div className="sketchpad__header">
        <div>
          <p className="panel__label">
            {locale === "zh"
              ? floating
                ? "实时草图窗口"
                : "手绘调整区"
              : floating
                ? "Live Sketch Window"
                : "Sketch Surface"}
          </p>
          <h2 className="sketchpad__title">
            {locale === "zh"
              ? floating
                ? "在这里重塑桌子。"
                : "沿着半透明模型画出新轮廓。"
              : floating
                ? "Draw here to reshape the table."
                : "Draw over the translucent table."}
          </h2>
        </div>
        <button className="ghost-button" onClick={clearCanvas} type="button">
          {locale === "zh" ? "清空画板" : "Clear Sheet"}
        </button>
      </div>

      <p className="sketchpad__lead">
        {locale === "zh"
          ? "画笔不是替代老师的模型，而是在老师模型的模块化复刻上做局部推拉、收边和比例修正。"
          : "The pen edits a modular replica of the teacher model, so sketching reshapes edges, proportion, and module density."}
      </p>

      <div className="sketchpad__surface">
        <canvas
          className="sketchpad__canvas"
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          ref={canvasRef}
        />
      </div>

      <div className="sketchpad__toolbar">
        <div className="sketchpad__swatches">
          {INK_SWATCHES.map((swatch) => (
            <button
              key={swatch.label}
              aria-label={swatch.label}
              className={`swatch ${brushColor === swatch.color ? "is-active" : ""}`}
              onClick={() => setBrushColor(swatch.color)}
              style={{ "--swatch-color": swatch.color }}
              type="button"
            />
          ))}
        </div>
        <label className="sketchpad__size">
          <span className="panel__label">{locale === "zh" ? "画笔" : "Brush"}</span>
          <input
            className="slider"
            max="26"
            min="4"
            onChange={(event) => setBrushSize(Number(event.target.value))}
            step="1"
            type="range"
            value={brushSize}
          />
        </label>
      </div>

      <div className="sketchpad__footer">
        <span className="status-chip is-ready">{syncLabel}</span>
        <p className="panel__note">{syncDetail}</p>
      </div>
    </section>
  );
}
