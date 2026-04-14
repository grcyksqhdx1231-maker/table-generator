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

export const MATERIALS = [
  { value: "light_wood", label: "Light Wood" },
  { value: "dark_walnut", label: "Dark Walnut" },
  { value: "rough_stone", label: "Rough Stone" },
  { value: "metal", label: "Metal" }
];

export const DEFAULT_CONFIG = {
  scenario: "daylight",
  shape: "rectangle",
  size: 1.48,
  material: "light_wood"
};

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
    thickness: 0.078,
    legRadius: 0.046
  },
  dark_walnut: {
    topColor: "#624433",
    legColor: "#342017",
    roughness: 0.76,
    metalness: 0.03,
    clearcoat: 0.08,
    reflectivity: 0.28,
    thickness: 0.082,
    legRadius: 0.048
  },
  rough_stone: {
    topColor: "#c8c0b7",
    legColor: "#58514a",
    roughness: 0.95,
    metalness: 0.01,
    clearcoat: 0.03,
    reflectivity: 0.18,
    thickness: 0.096,
    legRadius: 0.04
  },
  metal: {
    topColor: "#8a8884",
    legColor: "#5f605d",
    roughness: 0.24,
    metalness: 0.9,
    clearcoat: 0.22,
    reflectivity: 0.58,
    thickness: 0.07,
    legRadius: 0.04
  }
};

const scenarioValues = new Set(SCENARIOS.map((item) => item.value));
const shapeValues = new Set(SHAPES.map((item) => item.value));
const materialValues = new Set(MATERIALS.map((item) => item.value));

export function clampSize(size) {
  const numeric = Number(size);

  if (Number.isNaN(numeric)) {
    return DEFAULT_CONFIG.size;
  }

  return Math.max(0.75, Math.min(2.4, Number(numeric.toFixed(2))));
}

export function normalizeConfig(config) {
  return {
    scenario: scenarioValues.has(config?.scenario)
      ? config.scenario
      : DEFAULT_CONFIG.scenario,
    shape: shapeValues.has(config?.shape) ? config.shape : DEFAULT_CONFIG.shape,
    size: clampSize(config?.size ?? DEFAULT_CONFIG.size),
    material: materialValues.has(config?.material)
      ? config.material
      : DEFAULT_CONFIG.material
  };
}

export function getOptionLabel(collection, value) {
  return collection.find((item) => item.value === value)?.label ?? value;
}

export function getDraftLabel(config) {
  const shape = getOptionLabel(SHAPES, config.shape);
  const material = getOptionLabel(MATERIALS, config.material);
  return `${shape} / ${material}`;
}

export function getShapeProfile(config) {
  const size = clampSize(config.size);
  const material =
    MATERIAL_PRESETS[config.material] ?? MATERIAL_PRESETS.light_wood;

  if (config.shape === "round") {
    return {
      radiusX: size * 0.5,
      radiusZ: size * 0.5,
      exponent: 2,
      thickness: material.thickness,
      legRadius: material.legRadius,
      legSpreadX: size * 0.24,
      legSpreadZ: size * 0.24
    };
  }

  if (config.shape === "oval") {
    return {
      radiusX: size * 0.54,
      radiusZ: size * 0.33,
      exponent: 2.25,
      thickness: material.thickness,
      legRadius: material.legRadius,
      legSpreadX: size * 0.31,
      legSpreadZ: size * 0.16
    };
  }

  return {
    radiusX: size * 0.51,
    radiusZ: size * 0.31,
    exponent: 7,
    thickness: material.thickness,
    legRadius: material.legRadius,
    legSpreadX: size * 0.29,
    legSpreadZ: size * 0.17
  };
}
