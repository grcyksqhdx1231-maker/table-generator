import { useEffect, useRef, useState } from "react";

import Icon from "./Icon";

const BACKGROUND = "#f3efe8";
const INK_SWATCHES = [
  { labelEn: "Light Wood", labelZh: "浅木", color: "#d6a678" },
  { labelEn: "Dark Walnut", labelZh: "胡桃木", color: "#5f4030" },
  { labelEn: "Stone", labelZh: "石材", color: "#98928d" },
  { labelEn: "Metal", labelZh: "金属", color: "#8d9399" },
  { labelEn: "Accent", labelZh: "强调色", color: "#d9381e" }
];

function drawStroke(context, stroke, overrideColor = "") {
  if (!stroke.points.length) {
    return;
  }

  const strokeColor = overrideColor || stroke.color;
  context.strokeStyle = strokeColor;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    context.beginPath();
    context.fillStyle = strokeColor;
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

function createReferencePreviewDataUrl(summary, width, height) {
  if (!summary?.hasContent) {
    return "";
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, width, height);
  drawTriangleGrid(context, width, height);

  const outline = (summary.hullNormalized || []).map((point) => ({
    x: point.x * width,
    y: point.y * height
  }));

  if (outline.length >= 3) {
    context.save();
    context.beginPath();
    context.moveTo(outline[0].x, outline[0].y);
    for (let index = 1; index < outline.length; index += 1) {
      context.lineTo(outline[index].x, outline[index].y);
    }
    context.closePath();
    context.fillStyle = "rgba(217, 56, 30, 0.04)";
    context.fill();
    context.strokeStyle = "#2a1d18";
    context.lineWidth = Math.max(1.6, Math.min(width, height) * 0.006);
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();
    context.restore();
  }

  const anchorStep = Math.max(1, Math.floor(outline.length / 10));
  outline.forEach((point, index) => {
    if (index % anchorStep !== 0) {
      return;
    }

    context.beginPath();
    context.fillStyle = index === 0 ? "#d9381e" : "#2a1d18";
    context.arc(point.x, point.y, Math.max(1.4, Math.min(width, height) * 0.008), 0, Math.PI * 2);
    context.fill();
  });

  return canvas.toDataURL("image/png", 0.92);
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

function measurePathLength(points, closed = false) {
  if (points.length < 2) {
    return 0;
  }

  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
  }

  if (closed) {
    const first = points[0];
    const last = points[points.length - 1];
    total += Math.hypot(first.x - last.x, first.y - last.y);
  }

  return total;
}

function getBounds(points) {
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

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function isClosedStroke(points) {
  if (points.length < 6) {
    return false;
  }

  const { width, height } = getBounds(points);
  const span = Math.max(width, height, 1);
  const gap = Math.hypot(
    points[points.length - 1].x - points[0].x,
    points[points.length - 1].y - points[0].y
  );
  const length = measurePathLength(points);

  return length > span * 2.1 && gap <= Math.max(14, span * 0.18);
}

function simplifyStrokePath(points, minimumGap = 3.5) {
  if (points.length <= 2) {
    return points.map((point) => ({ x: point.x, y: point.y }));
  }

  const simplified = [{ x: points[0].x, y: points[0].y }];
  let lastKept = points[0];

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    if (Math.hypot(point.x - lastKept.x, point.y - lastKept.y) >= minimumGap) {
      simplified.push({ x: point.x, y: point.y });
      lastKept = point;
    }
  }

  const lastPoint = points[points.length - 1];
  if (Math.hypot(lastPoint.x - lastKept.x, lastPoint.y - lastKept.y) >= 1.5) {
    simplified.push({ x: lastPoint.x, y: lastPoint.y });
  } else {
    simplified[simplified.length - 1] = { x: lastPoint.x, y: lastPoint.y };
  }

  return simplified;
}

function resampleClosedPath(points, targetCount = 72) {
  if (points.length < 3) {
    return points.map((point) => ({ x: point.x, y: point.y }));
  }

  const segmentLengths = [];
  let perimeter = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const length = Math.hypot(next.x - current.x, next.y - current.y);
    segmentLengths.push(length);
    perimeter += length;
  }

  if (!perimeter) {
    return points.map((point) => ({ x: point.x, y: point.y }));
  }

  const sampled = [];
  let segmentIndex = 0;
  let segmentStart = points[0];
  let segmentEnd = points[1 % points.length];
  let distanceIntoSegment = 0;
  let traversed = 0;

  for (let sampleIndex = 0; sampleIndex < targetCount; sampleIndex += 1) {
    const targetDistance = (sampleIndex / targetCount) * perimeter;

    while (
      segmentIndex < segmentLengths.length - 1 &&
      traversed + segmentLengths[segmentIndex] < targetDistance
    ) {
      traversed += segmentLengths[segmentIndex];
      segmentIndex += 1;
      segmentStart = points[segmentIndex];
      segmentEnd = points[(segmentIndex + 1) % points.length];
      distanceIntoSegment = 0;
    }

    const segmentLength = Math.max(0.0001, segmentLengths[segmentIndex]);
    distanceIntoSegment = targetDistance - traversed;
    const t = Math.max(0, Math.min(1, distanceIntoSegment / segmentLength));

    sampled.push({
      x: segmentStart.x + (segmentEnd.x - segmentStart.x) * t,
      y: segmentStart.y + (segmentEnd.y - segmentStart.y) * t
    });
  }

  return sampled;
}

function smoothClosedPath(points, passes = 1) {
  let result = points.map((point) => ({ x: point.x, y: point.y }));

  for (let pass = 0; pass < passes; pass += 1) {
    if (result.length < 3) {
      return result;
    }

    result = result.map((point, index) => {
      const previous = result[(index - 1 + result.length) % result.length];
      const next = result[(index + 1) % result.length];

      return {
        x: point.x * 0.7 + (previous.x + next.x) * 0.15,
        y: point.y * 0.7 + (previous.y + next.y) * 0.15
      };
    });
  }

  return result;
}

function deriveStrokeOutline(strokes) {
  const candidates = strokes
    .map((stroke) => {
      const points = simplifyStrokePath(
        stroke.points || [],
        Math.max(2.8, Number(stroke.size || 10) * 0.32)
      );

      return {
        points,
        closed: isClosedStroke(points),
        length: measurePathLength(points)
      };
    })
    .filter((candidate) => candidate.points.length >= 6);

  const preferred = [...candidates]
    .filter((candidate) => candidate.closed)
    .sort((a, b) => b.length - a.length)[0];

  if (!preferred) {
    return [];
  }

  const targetCount = Math.max(36, Math.min(120, Math.round(preferred.length / 12)));
  return smoothClosedPath(resampleClosedPath(preferred.points, targetCount), 1);
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
  const strokeOutline = deriveStrokeOutline(strokes);
  const analysisOutline = strokeOutline.length >= 3 ? strokeOutline : hull;
  const hullArea = polygonArea(analysisOutline);
  const hullPerimeter = polygonPerimeter(analysisOutline);
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
    elongation: computeElongation(analysisOutline.length >= 3 ? analysisOutline : sampledPoints),
    radialVariance: computeRadialVariance(analysisOutline),
    hullNormalized: analysisOutline.map((point) => ({
      x: point.x / Math.max(1, width),
      y: point.y / Math.max(1, height)
    })),
    boundsWidthRatio: Math.min(1, bboxWidth / Math.max(1, width)),
    boundsHeightRatio: Math.min(1, bboxHeight / Math.max(1, height)),
    hullPointCount: analysisOutline.length,
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

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function createEmptyFeedback() {
  return {
    hasContent: false,
    pointCount: 0,
    hullPointCount: 0,
    coverage: 0,
    hullNormalized: []
  };
}

function clampUnit(value) {
  return Math.max(0.02, Math.min(0.98, Number(value) || 0));
}

function normalizeHullPoint(point) {
  return {
    x: clampUnit(point?.x),
    y: clampUnit(point?.y)
  };
}

function buildEditedOutlineSummary(baseFeedback, hullNormalized, width, height) {
  const hull = (hullNormalized || []).map(normalizeHullPoint);
  const pixelHull = hull.map((point) => ({
    x: point.x * Math.max(1, width),
    y: point.y * Math.max(1, height)
  }));
  const bounds = hull.length ? getBounds(pixelHull) : null;

  return {
    ...baseFeedback,
    hasContent: hull.length >= 3,
    coverage:
      hull.length >= 3
        ? Math.min(1, polygonArea(pixelHull) / Math.max(1, width * height))
        : 0,
    hullNormalized: hull,
    hullPointCount: hull.length,
    boundsWidthRatio: bounds ? Math.min(1, bounds.width / Math.max(1, width)) : 0,
    boundsHeightRatio: bounds ? Math.min(1, bounds.height / Math.max(1, height)) : 0,
    bounds: bounds
      ? {
          x: bounds.minX,
          y: bounds.minY,
          width: bounds.width,
          height: bounds.height
        }
      : null
  };
}

function getFeedbackCopy(locale, feedback) {
  if (!feedback?.hasContent) {
    return {
      title: locale === "zh" ? "等待闭合轮廓" : "Waiting for a closed outline",
      before: locale === "zh" ? "原始笔触" : "Raw strokes",
      after: locale === "zh" ? "识别轮廓" : "Recognized outline",
      coverage: locale === "zh" ? "画面覆盖" : "Coverage",
      detail:
        locale === "zh"
          ? "画一个尽量闭合的外轮廓，系统会把它转成桌面边界。"
          : "Draw a mostly closed outer contour and the system will convert it into a tabletop boundary."
    };
  }

  return {
    title:
      locale === "zh"
        ? `已识别 ${feedback.hullPointCount || 0} 个控制点`
        : `${feedback.hullPointCount || 0} control points recognized`,
    before: locale === "zh" ? "原始笔触" : "Raw strokes",
    after: locale === "zh" ? "识别轮廓" : "Recognized outline",
    coverage: locale === "zh" ? "画面覆盖" : "Coverage",
    detail:
      locale === "zh"
        ? `从 ${feedback.pointCount || 0} 个笔触点重建为 ${feedback.hullPointCount || 0} 个桌面控制点，可拖动锚点微调。`
        : `Rebuilt ${feedback.pointCount || 0} raw points into ${feedback.hullPointCount || 0} tabletop control points. Drag anchors to refine.`
  };
}

export default function SketchPad({
  fillStyle,
  onFillStyleChange,
  onSketchChange,
  syncLabel,
  syncDetail,
  floating = false,
  locale = "en",
  transparentSurface = false
}) {
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);
  const strokesRef = useRef([]);
  const activeStrokeRef = useRef(null);
  const draggedAnchorRef = useRef(null);
  const canvasMetricsRef = useRef({ width: 1, height: 1, dpr: 1 });
  const feedbackRef = useRef(createEmptyFeedback());
  const snapshotTimerRef = useRef(null);
  const [brushColor, setBrushColor] = useState(INK_SWATCHES[0].color);
  const [brushSize, setBrushSize] = useState(12);
  const [feedback, setFeedback] = useState(createEmptyFeedback);
  const gradientIdRef = useRef(
    `sketch-fill-gradient-${Math.random().toString(36).slice(2, 10)}`
  );
  feedbackRef.current = feedback;

  function drawAll() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const { width, height, dpr } = canvasMetricsRef.current;
    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = transparentSurface ? "rgba(247, 244, 238, 0.9)" : BACKGROUND;
    context.fillRect(0, 0, width, height);
    drawTriangleGrid(context, width, height);

    strokesRef.current.forEach((stroke) => {
      drawStroke(context, stroke, transparentSurface ? "#2a1d18" : "");
    });
  }

  function emitSnapshot() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const { width, height } = canvasMetricsRef.current;
    const summary = summarizeStrokes(strokesRef.current, width, height);
    feedbackRef.current = summary;
    setFeedback(summary);

    onSketchChange({
      ...summary,
      dataUrl: createReferencePreviewDataUrl(summary, width, height),
      maskDataUrl: summary.hasContent
        ? createMaskDataUrl(strokesRef.current, width, height)
        : "",
      updatedAt: Date.now()
    });
  }

  function emitEditedOutline(hullNormalized) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const { width, height } = canvasMetricsRef.current;
    const summary = buildEditedOutlineSummary(
      feedbackRef.current,
      hullNormalized,
      width,
      height
    );

    feedbackRef.current = summary;
    setFeedback(summary);
    onSketchChange({
      ...summary,
      dataUrl: createReferencePreviewDataUrl(summary, width, height),
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
    if (draggedAnchorRef.current) {
      return;
    }

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
    if (draggedAnchorRef.current) {
      return;
    }

    const active = activeStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) {
      return;
    }

    active.stroke.points.push(getPoint(event));
    drawAll();
    queueSnapshot(120);
  }

  function handlePointerUp(event) {
    if (draggedAnchorRef.current) {
      return;
    }

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
    draggedAnchorRef.current = null;
    const emptyFeedback = createEmptyFeedback();
    feedbackRef.current = emptyFeedback;
    setFeedback(emptyFeedback);
    drawAll();
    emitSnapshot();
  }

  function getNormalizedPointFromEvent(event) {
    const rect = recognitionRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0.5, y: 0.5 };
    }

    return {
      x: clampUnit((event.clientX - rect.left) / Math.max(1, rect.width)),
      y: clampUnit((event.clientY - rect.top) / Math.max(1, rect.height))
    };
  }

  function updateAnchor(anchorIndex, nextPoint) {
    const currentHull = feedbackRef.current.hullNormalized || [];
    if (!currentHull[anchorIndex]) {
      return;
    }

    const nextHull = currentHull.map((point, index) =>
      index === anchorIndex ? normalizeHullPoint(nextPoint) : point
    );
    emitEditedOutline(nextHull);
  }

  function handleAnchorPointerDown(event, anchorIndex) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    draggedAnchorRef.current = {
      anchorIndex,
      pointerId: event.pointerId
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleAnchorPointerMove(event) {
    const active = draggedAnchorRef.current;
    if (!active || active.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateAnchor(active.anchorIndex, getNormalizedPointFromEvent(event));
  }

  function handleAnchorPointerUp(event) {
    const active = draggedAnchorRef.current;
    if (!active || active.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    draggedAnchorRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleAnchorKeyDown(event, anchorIndex) {
    const keyOffsets = {
      ArrowUp: { x: 0, y: -0.012 },
      ArrowDown: { x: 0, y: 0.012 },
      ArrowLeft: { x: -0.012, y: 0 },
      ArrowRight: { x: 0.012, y: 0 }
    };
    const offset = keyOffsets[event.key];

    if (!offset) {
      return;
    }

    const currentPoint = feedbackRef.current.hullNormalized?.[anchorIndex];
    if (!currentPoint) {
      return;
    }

    event.preventDefault();
    updateAnchor(anchorIndex, {
      x: currentPoint.x + offset.x,
      y: currentPoint.y + offset.y
    });
  }

  const metrics = canvasMetricsRef.current;
  const feedbackCopy = getFeedbackCopy(locale, feedback);
  const outlinePoints = (feedback.hullNormalized || []).map((point) => ({
    x: point.x * metrics.width,
    y: point.y * metrics.height
  }));
  const outlinePath = outlinePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const controlStep = Math.max(1, Math.floor(outlinePoints.length / 12));
  const controlPoints = outlinePoints
    .map((point, index) => ({ ...point, anchorIndex: index }))
    .filter((_, index) => index % controlStep === 0);

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
                ? "在这里重塑桌面。"
                : "沿半透明参考继续描出新轮廓。"
              : floating
                ? "Draw here to reshape the table."
                : "Draw over the translucent reference."}
          </h2>
        </div>
        <button className="ghost-button" onClick={clearCanvas} type="button">
          <Icon name="delete" />
          {locale === "zh" ? "清空画板" : "Clear Sheet"}
        </button>
      </div>

      <p className="sketchpad__lead">
        {locale === "zh"
          ? "笔触会在当前桌面基础上做局部推拉、收边与比例修正。"
          : "Sketch strokes refine the current tabletop through local edge, proportion, and module adjustments."}
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
        {outlinePoints.length >= 3 ? (
          <svg
            aria-label={
              locale === "zh"
                ? "可拖动的桌面轮廓锚点"
                : "Draggable tabletop outline anchors"
            }
            className="sketchpad__recognition"
            ref={recognitionRef}
            role="group"
            viewBox={`0 0 ${metrics.width} ${metrics.height}`}
          >
            <defs>
              <linearGradient
                id={gradientIdRef.current}
                x1="0%"
                x2="100%"
                y1="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={fillStyle?.colorA || "#d9381e"} />
                <stop offset="100%" stopColor={fillStyle?.colorB || fillStyle?.colorA || "#f2c5b7"} />
              </linearGradient>
            </defs>
            <polygon
              className="sketchpad__recognized-fill"
              fill={
                fillStyle?.mode === "gradient"
                  ? `url(#${gradientIdRef.current})`
                  : fillStyle?.mode === "solid"
                    ? fillStyle?.colorA || "#d9381e"
                    : undefined
              }
              points={outlinePath}
            />
            <polyline className="sketchpad__recognized-line" points={`${outlinePath} ${outlinePoints[0].x},${outlinePoints[0].y}`} />
            {controlPoints.map((point, index) => (
              <circle
                aria-label={
                  locale === "zh"
                    ? `轮廓锚点 ${index + 1}`
                    : `Outline anchor ${index + 1}`
                }
                className="sketchpad__control-point"
                cx={point.x}
                cy={point.y}
                key={`${point.x}-${point.y}-${index}`}
                onKeyDown={(event) => handleAnchorKeyDown(event, point.anchorIndex)}
                onPointerCancel={handleAnchorPointerUp}
                onPointerDown={(event) => handleAnchorPointerDown(event, point.anchorIndex)}
                onPointerMove={handleAnchorPointerMove}
                onPointerUp={handleAnchorPointerUp}
                r="4.2"
                role="button"
                tabIndex="0"
              />
            ))}
          </svg>
        ) : null}
        <div className={`sketchpad__feedback ${feedback.hasContent ? "is-ready" : ""}`}>
          <strong>{feedbackCopy.title}</strong>
          <span>{feedbackCopy.detail}</span>
        </div>
      </div>

      <div className="sketchpad__analysis">
        <div>
          <span>{feedbackCopy.before}</span>
          <strong>{feedback.pointCount || 0}</strong>
        </div>
        <div>
          <span>{feedbackCopy.after}</span>
          <strong>{feedback.hullPointCount || 0}</strong>
        </div>
        <div>
          <span>{feedbackCopy.coverage}</span>
          <strong>{formatPercent(feedback.coverage)}</strong>
        </div>
      </div>

      <div className="sketchpad__toolbar">
        <div className="sketchpad__swatches">
          {INK_SWATCHES.map((swatch) => (
            <button
              key={swatch.color}
              aria-label={locale === "zh" ? swatch.labelZh : swatch.labelEn}
              className={`swatch ${brushColor === swatch.color ? "is-active" : ""}`}
              onClick={() => setBrushColor(swatch.color)}
              style={{ "--swatch-color": swatch.color }}
              type="button"
            />
          ))}
        </div>
        <button className="ghost-button sketchpad__clear-button" onClick={clearCanvas} type="button">
          <Icon name="delete" />
          {locale === "zh" ? "清空画板" : "Clear Sheet"}
        </button>
        <div className="sketchpad__fill-controls">
          <div className="segmented">
            <button
              className={`segmented__button ${fillStyle?.mode === "none" ? "is-active" : ""}`}
              onClick={() => onFillStyleChange?.({ ...fillStyle, mode: "none" })}
              type="button"
            >
              {locale === "zh" ? "关闭" : "Off"}
            </button>
            <button
              className={`segmented__button ${fillStyle?.mode === "solid" ? "is-active" : ""}`}
              onClick={() => onFillStyleChange?.({ ...fillStyle, mode: "solid" })}
              type="button"
            >
              {locale === "zh" ? "纯色" : "Solid"}
            </button>
            <button
              className={`segmented__button ${fillStyle?.mode === "gradient" ? "is-active" : ""}`}
              onClick={() => onFillStyleChange?.({ ...fillStyle, mode: "gradient" })}
              type="button"
            >
              {locale === "zh" ? "渐变" : "Gradient"}
            </button>
          </div>
          <label className="sketchpad__fill-swatch">
            <span className="panel__label">{locale === "zh" ? "颜色 A" : "Color A"}</span>
            <input
              className="color-input"
              disabled={fillStyle?.mode === "none"}
              onChange={(event) =>
                onFillStyleChange?.({ ...fillStyle, colorA: event.target.value })
              }
              type="color"
              value={fillStyle?.colorA || "#d9381e"}
            />
          </label>
          <label className="sketchpad__fill-swatch">
            <span className="panel__label">{locale === "zh" ? "颜色 B" : "Color B"}</span>
            <input
              className="color-input"
              disabled={fillStyle?.mode !== "gradient"}
              onChange={(event) =>
                onFillStyleChange?.({ ...fillStyle, colorB: event.target.value })
              }
              type="color"
              value={fillStyle?.colorB || "#f2c5b7"}
            />
          </label>
        </div>
        <label className="sketchpad__size">
          <span className="panel__label">{locale === "zh" ? "画笔" : "Brush"}</span>
          <input
            className="slider"
            max="26"
            min="4"
            onChange={(event) => setBrushSize(Number(event.target.value))}
            step="1"
            style={{ "--slider-value": `${((brushSize - 4) / 22) * 100}%` }}
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

