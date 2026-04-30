export const SCENARIOS = [
  { value: "daylight", label: "Daylight" },
  { value: "late_night", label: "Late Night" },
  { value: "void", label: "Void" }
];

export const SHAPES = [
  { value: "rectangle", label: "Rectangle" },
  { value: "round", label: "Round" },
  { value: "oval", label: "Oval" }
];

export const SILHOUETTE_MODES = [
  { value: "shape", label: "Shape Outline" },
  { value: "sketch", label: "Sketch Outline" }
];

export const PATTERN_MODES = [
  { value: "metal", label: "Metal Triangles" },
  { value: "uploaded", label: "Uploaded Motif" }
];

export const LEG_SHAPES = [
  { value: "round", label: "Round" },
  { value: "square", label: "Square" },
  { value: "blade", label: "Blade" }
];

export const MATERIALS = [
  { value: "light_wood", label: "Light Wood" },
  { value: "dark_walnut", label: "Dark Walnut" },
  { value: "rough_stone", label: "Rough Stone" },
  { value: "metal", label: "Metal" }
];

export const DEFAULT_CONFIG = {
  scenario: "daylight",
  shape: "rectangle",
  silhouetteMode: "shape",
  width: 1.4,
  depth: 0.65,
  height: 0.76,
  material: "metal",
  patternMode: "metal",
  moduleSize: 0.112,
  moduleGap: 0.006,
  moduleThicknessScale: 1,
  patternPresence: 1.15,
  patternContrast: 1.4,
  patternBrightness: 1.18,
  patternRelief: 0.58,
  finishColor: "",
  legShape: "blade",
  legLength: 0.73,
  legWidth: 0.04,
  legDepth: 0.076,
  frameInset: 0.019,
  frameThickness: 0.025,
  legSpread: 0,
  legTopDepth: 0.076,
  legBottomDepth: 0.004,
  legBellyDepth: 0,
  legToeWidth: 0.004,
  legToeSharpness: 0.6,
  legCount: 4,
  lightAngle: 38
};

export const MIN_OVERALL_HEIGHT = 0.47;
export const MIN_TABLETOP_RISE = 0.05;
export const MAX_TABLETOP_RISE = 0.09;

export const SCENARIO_PRESETS = {
  daylight: {
    background: "#f4f1eb",
    fog: "#f0ebe2",
    ground: "#ece4d7",
    keyColor: "#fff4da",
    fillColor: "#f3e3cf",
    rimColor: "#efe8df",
    keyIntensity: 2.4,
    fillIntensity: 1.35,
    hemiIntensity: 1.15,
    vignette:
      "linear-gradient(180deg, rgba(244,241,235,0.05) 0%, rgba(244,241,235,0.44) 100%)"
  },
  late_night: {
    background: "#1c1815",
    fog: "#231d19",
    ground: "#2b241f",
    keyColor: "#ffbf82",
    fillColor: "#8e7762",
    rimColor: "#f5d6a8",
    keyIntensity: 1.4,
    fillIntensity: 0.8,
    hemiIntensity: 0.45,
    vignette:
      "linear-gradient(180deg, rgba(20,16,14,0.16) 0%, rgba(17,14,12,0.6) 100%)"
  },
  void: {
    background: "#ded9d2",
    fog: "#e7e1d8",
    ground: "#d1cac1",
    keyColor: "#f2ede4",
    fillColor: "#d7cfc5",
    rimColor: "#b9afa4",
    keyIntensity: 1.75,
    fillIntensity: 1.1,
    hemiIntensity: 0.7,
    vignette:
      "linear-gradient(180deg, rgba(231,225,216,0.02) 0%, rgba(208,202,193,0.48) 100%)"
  }
};

export const MATERIAL_PRESETS = {
  light_wood: {
    topColor: "#d3ae85",
    legColor: "#946742",
    roughness: 0.83,
    metalness: 0.04,
    clearcoat: 0.06,
    reflectivity: 0.3,
    legRadius: 0.046
  },
  dark_walnut: {
    topColor: "#624433",
    legColor: "#342017",
    roughness: 0.76,
    metalness: 0.03,
    clearcoat: 0.08,
    reflectivity: 0.28,
    legRadius: 0.048
  },
  rough_stone: {
    topColor: "#c8c0b7",
    legColor: "#58514a",
    roughness: 0.95,
    metalness: 0.01,
    clearcoat: 0.03,
    reflectivity: 0.18,
    legRadius: 0.04
  },
  metal: {
    topColor: "#8a8884",
    legColor: "#5f605d",
    roughness: 0.24,
    metalness: 0.9,
    clearcoat: 0.22,
    reflectivity: 0.58,
    legRadius: 0.04
  }
};

const scenarioValues = new Set(SCENARIOS.map((item) => item.value));
const shapeValues = new Set(SHAPES.map((item) => item.value));
const silhouetteValues = new Set(SILHOUETTE_MODES.map((item) => item.value));
const patternValues = new Set(PATTERN_MODES.map((item) => item.value));
const legShapeValues = new Set(LEG_SHAPES.map((item) => item.value));
const materialValues = new Set(MATERIALS.map((item) => item.value));

function normalizeHexColor(value) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : "";
}

export function clampDimension(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.width;
  }

  return Math.max(0.65, Math.min(2.4, Number(numeric.toFixed(2))));
}

export function clampHeight(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.height;
  }

  return Math.max(MIN_OVERALL_HEIGHT, Math.min(1.12, Number(numeric.toFixed(2))));
}

export function clampLegLength(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.legLength;
  }

  return Math.max(0.42, Math.min(1.02, Number(numeric.toFixed(2))));
}

export function clampLegCount(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.legCount;
  }

  return Math.max(3, Math.min(8, Math.round(numeric)));
}

export function clampLegSpan(value, fallback = DEFAULT_CONFIG.legWidth) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return fallback;
  }

  return Math.max(0.04, Math.min(0.28, Number(numeric.toFixed(3))));
}

export function clampModuleSize(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.moduleSize;
  }

  return Math.max(0.04, Math.min(0.28, Number(numeric.toFixed(3))));
}

export function clampModuleGap(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.moduleGap;
  }

  return Math.max(0, Math.min(0.04, Number(numeric.toFixed(3))));
}

export function clampModuleThicknessScale(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.moduleThicknessScale;
  }

  return Math.max(0.18, Math.min(1.2, Number(numeric.toFixed(2))));
}

export function clampPatternPresence(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.patternPresence;
  }

  return Math.max(0.35, Math.min(2.2, Number(numeric.toFixed(2))));
}

export function clampPatternContrast(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.patternContrast;
  }

  return Math.max(0.7, Math.min(2.8, Number(numeric.toFixed(2))));
}

export function clampPatternBrightness(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.patternBrightness;
  }

  return Math.max(0.65, Math.min(2.4, Number(numeric.toFixed(2))));
}

export function clampPatternRelief(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.patternRelief;
  }

  return Math.max(0, Math.min(1.25, Number(numeric.toFixed(2))));
}

export function clampLightAngle(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.lightAngle;
  }

  return Math.max(-75, Math.min(75, Number(numeric.toFixed(0))));
}

function clampTeacherMetric(value, fallback, min, max, digits = 3) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Number(numeric.toFixed(digits))));
}

export function clampFrameInset(value) {
  return clampTeacherMetric(value, DEFAULT_CONFIG.frameInset, 0.008, 0.08);
}

export function clampFrameThickness(value) {
  return clampTeacherMetric(value, DEFAULT_CONFIG.frameThickness, 0.012, 0.08);
}

export function clampLegSpread(value) {
  return clampTeacherMetric(value, DEFAULT_CONFIG.legSpread, -0.04, 0.08);
}

export function clampLegTopDepth(value) {
  return clampTeacherMetric(value, DEFAULT_CONFIG.legTopDepth, 0.03, 0.18);
}

export function clampLegBottomDepth(value) {
  return clampTeacherMetric(value, DEFAULT_CONFIG.legBottomDepth, 0.002, 0.08);
}

export function clampLegBellyDepth(value) {
  return clampTeacherMetric(value, DEFAULT_CONFIG.legBellyDepth, 0, 0.08);
}

export function clampLegToeWidth(value) {
  return clampTeacherMetric(value, DEFAULT_CONFIG.legToeWidth, 0.002, 0.04);
}

export function clampLegToeSharpness(value) {
  return clampTeacherMetric(value, DEFAULT_CONFIG.legToeSharpness, 0, 1, 2);
}

export function normalizeConfig(config) {
  const width = clampDimension(config?.width ?? DEFAULT_CONFIG.width);
  const depth = clampDimension(config?.depth ?? DEFAULT_CONFIG.depth);
  let height = clampHeight(config?.height ?? DEFAULT_CONFIG.height);
  let legLength = clampLegLength(config?.legLength ?? DEFAULT_CONFIG.legLength);
  const legWidth = clampLegSpan(
    config?.legWidth ?? DEFAULT_CONFIG.legWidth,
    DEFAULT_CONFIG.legWidth
  );
  const legDepth = clampLegSpan(
    config?.legDepth ?? DEFAULT_CONFIG.legDepth,
    DEFAULT_CONFIG.legDepth
  );
  const moduleSize = clampModuleSize(
    config?.moduleSize ?? DEFAULT_CONFIG.moduleSize
  );
  const moduleGap = clampModuleGap(config?.moduleGap ?? DEFAULT_CONFIG.moduleGap);
  const moduleThicknessScale = clampModuleThicknessScale(
    config?.moduleThicknessScale ?? DEFAULT_CONFIG.moduleThicknessScale
  );
  const patternPresence = clampPatternPresence(
    config?.patternPresence ?? DEFAULT_CONFIG.patternPresence
  );
  const patternContrast = clampPatternContrast(
    config?.patternContrast ?? DEFAULT_CONFIG.patternContrast
  );
  const patternBrightness = clampPatternBrightness(
    config?.patternBrightness ?? DEFAULT_CONFIG.patternBrightness
  );
  const patternRelief = clampPatternRelief(
    config?.patternRelief ?? DEFAULT_CONFIG.patternRelief
  );
  const lightAngle = clampLightAngle(config?.lightAngle ?? DEFAULT_CONFIG.lightAngle);
  const frameInset = clampFrameInset(config?.frameInset ?? DEFAULT_CONFIG.frameInset);
  const frameThickness = clampFrameThickness(
    config?.frameThickness ?? DEFAULT_CONFIG.frameThickness
  );
  const legSpread = clampLegSpread(config?.legSpread ?? DEFAULT_CONFIG.legSpread);
  const legTopDepth = clampLegTopDepth(config?.legTopDepth ?? config?.legDepth);
  const legBottomDepth = clampLegBottomDepth(
    config?.legBottomDepth ?? DEFAULT_CONFIG.legBottomDepth
  );
  const legBellyDepth = clampLegBellyDepth(
    config?.legBellyDepth ?? DEFAULT_CONFIG.legBellyDepth
  );
  const legToeWidth = clampLegToeWidth(config?.legToeWidth ?? DEFAULT_CONFIG.legToeWidth);
  const legToeSharpness = clampLegToeSharpness(
    config?.legToeSharpness ?? DEFAULT_CONFIG.legToeSharpness
  );

  if (legLength > height - MIN_TABLETOP_RISE) {
    legLength = Math.max(0.42, Number((height - MIN_TABLETOP_RISE).toFixed(2)));
  }

  if (height < legLength + MIN_TABLETOP_RISE) {
    height = clampHeight(legLength + MIN_TABLETOP_RISE);
  }

  if (height > legLength + MAX_TABLETOP_RISE) {
    height = clampHeight(legLength + MAX_TABLETOP_RISE);
  }

  return {
    scenario: scenarioValues.has(config?.scenario)
      ? config.scenario
      : DEFAULT_CONFIG.scenario,
    shape: shapeValues.has(config?.shape) ? config.shape : DEFAULT_CONFIG.shape,
    silhouetteMode: silhouetteValues.has(config?.silhouetteMode)
      ? config.silhouetteMode
      : DEFAULT_CONFIG.silhouetteMode,
    width,
    depth,
    height,
    material: materialValues.has(config?.material)
      ? config.material
      : DEFAULT_CONFIG.material,
    patternMode: patternValues.has(config?.patternMode)
      ? config.patternMode
      : DEFAULT_CONFIG.patternMode,
    moduleSize,
    moduleGap,
    moduleThicknessScale,
    patternPresence,
    patternContrast,
    patternBrightness,
    patternRelief,
    lightAngle,
    finishColor: normalizeHexColor(config?.finishColor),
    legShape: legShapeValues.has(config?.legShape)
      ? config.legShape
      : DEFAULT_CONFIG.legShape,
    legLength,
    legWidth,
    legDepth,
    frameInset,
    frameThickness,
    legSpread,
    legTopDepth,
    legBottomDepth: Math.min(legTopDepth, legBottomDepth),
    legBellyDepth,
    legToeWidth: Math.min(legWidth, legToeWidth),
    legToeSharpness,
    legCount: clampLegCount(config?.legCount ?? DEFAULT_CONFIG.legCount)
  };
}

export function getOptionLabel(collection, value) {
  return collection.find((item) => item.value === value)?.label ?? value;
}

export function getDraftLabel(config) {
  const shape =
    config.silhouetteMode === "sketch"
      ? "Sketch Mosaic"
      : getOptionLabel(SHAPES, config.shape);
  const material = getOptionLabel(MATERIALS, config.material);
  return `${shape} / ${material}`;
}

export function getShapeProfile(rawConfig) {
  const config = normalizeConfig(rawConfig);
  const diameter = (config.width + config.depth) / 2;
  const width = config.shape === "round" ? diameter : config.width;
  const depth = config.shape === "round" ? diameter : config.depth;
  const thickness = Math.max(
    0.05,
    Math.min(0.16, Number((config.height - config.legLength).toFixed(3)))
  );

  if (config.shape === "round") {
    return {
      ...config,
      width,
      depth,
      radiusX: width / 2,
      radiusZ: depth / 2,
      exponent: 2,
      thickness,
      topY: config.legLength + thickness / 2,
      silhouetteMode: config.silhouetteMode,
      patternMode: config.patternMode,
      moduleSize: config.moduleSize,
      moduleGap: config.moduleGap,
      moduleThicknessScale: config.moduleThicknessScale,
      patternPresence: config.patternPresence,
      patternContrast: config.patternContrast,
      patternBrightness: config.patternBrightness,
      patternRelief: config.patternRelief,
      finishColor: config.finishColor,
      legWidth: config.legWidth,
      legDepth: config.legDepth,
      frameInset: config.frameInset,
      frameThickness: config.frameThickness,
      legSpread: config.legSpread,
      legTopDepth: config.legTopDepth,
      legBottomDepth: config.legBottomDepth,
      legBellyDepth: config.legBellyDepth,
      legToeWidth: config.legToeWidth,
      legToeSharpness: config.legToeSharpness
    };
  }

  if (config.shape === "oval") {
    return {
      ...config,
      width,
      depth,
      radiusX: width / 2,
      radiusZ: depth / 2,
      exponent: 2.4,
      thickness,
      topY: config.legLength + thickness / 2,
      silhouetteMode: config.silhouetteMode,
      patternMode: config.patternMode,
      moduleSize: config.moduleSize,
      moduleGap: config.moduleGap,
      moduleThicknessScale: config.moduleThicknessScale,
      patternPresence: config.patternPresence,
      patternContrast: config.patternContrast,
      patternBrightness: config.patternBrightness,
      patternRelief: config.patternRelief,
      finishColor: config.finishColor,
      legWidth: config.legWidth,
      legDepth: config.legDepth,
      frameInset: config.frameInset,
      frameThickness: config.frameThickness,
      legSpread: config.legSpread,
      legTopDepth: config.legTopDepth,
      legBottomDepth: config.legBottomDepth,
      legBellyDepth: config.legBellyDepth,
      legToeWidth: config.legToeWidth,
      legToeSharpness: config.legToeSharpness
    };
  }

  return {
    ...config,
    width,
    depth,
    radiusX: width / 2,
    radiusZ: depth / 2,
    exponent: 7.2,
    thickness,
    topY: config.legLength + thickness / 2,
    silhouetteMode: config.silhouetteMode,
    patternMode: config.patternMode,
    moduleSize: config.moduleSize,
    moduleGap: config.moduleGap,
    moduleThicknessScale: config.moduleThicknessScale,
    patternPresence: config.patternPresence,
    patternContrast: config.patternContrast,
    patternBrightness: config.patternBrightness,
    patternRelief: config.patternRelief,
    finishColor: config.finishColor,
    legWidth: config.legWidth,
    legDepth: config.legDepth,
    frameInset: config.frameInset,
    frameThickness: config.frameThickness,
    legSpread: config.legSpread,
    legTopDepth: config.legTopDepth,
    legBottomDepth: config.legBottomDepth,
    legBellyDepth: config.legBellyDepth,
    legToeWidth: config.legToeWidth,
    legToeSharpness: config.legToeSharpness
  };
}
