import {
  clampDimension,
  clampHeight,
  clampLegCount,
  clampLegLength,
  clampLegSpan,
  clampModuleGap,
  clampModuleSize
} from "./catalog";

const MATERIAL_BY_SWATCH = {
  "#d6a678": "light_wood",
  "#5f4030": "dark_walnut",
  "#98928d": "rough_stone",
  "#8d9399": "metal"
};

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function luminance({ r, g, b }) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function inferMaterialFromColor(hex, fallback) {
  const normalized = String(hex || "").toLowerCase();

  if (MATERIAL_BY_SWATCH[normalized]) {
    return MATERIAL_BY_SWATCH[normalized];
  }

  const rgb = hexToRgb(normalized);
  const lightness = luminance(rgb);
  const warmBias = rgb.r - rgb.b;
  const spread = Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b);

  if (spread < 22 && lightness > 150) {
    return "metal";
  }

  if (spread < 18) {
    return lightness > 118 ? "rough_stone" : "metal";
  }

  if (warmBias > 34 && lightness > 130) {
    return "light_wood";
  }

  if (warmBias > 20 && lightness <= 130) {
    return "dark_walnut";
  }

  return fallback;
}

export function inferSketchConfig(snapshot, currentConfig) {
  if (!snapshot?.hasContent || snapshot.pointCount < 6) {
    return {
      ...currentConfig,
      rationale: "Sketch is still too light to infer a reliable table update.",
      source: "sketch_local"
    };
  }

  const aspect = snapshot.aspectRatio || 1;
  const elongation = Math.max(1, snapshot.elongation || 1);
  const circularity = snapshot.circularity || 0;
  const rectangularity = snapshot.rectangularity || 0;
  const radialVariance = snapshot.radialVariance || 0;
  const cornerDensity =
    snapshot.cornerCount / Math.max(1, snapshot.hullPointCount || snapshot.pointCount);

  let shape = "round";

  if (
    rectangularity > 0.68 ||
    cornerDensity > 0.16 ||
    circularity < 0.7 ||
    radialVariance > 0.28
  ) {
    shape = "rectangle";
  } else if (elongation > 1.18 || aspect > 1.18 || aspect < 0.84) {
    shape = "oval";
  }

  const material = inferMaterialFromColor(
    snapshot.dominantColor,
    currentConfig.material
  );
  const dominantSpan = Math.max(
    snapshot.boundsWidthRatio || 0,
    snapshot.boundsHeightRatio || 0
  );
  const minorSpan = Math.min(
    snapshot.boundsWidthRatio || 0,
    snapshot.boundsHeightRatio || 0
  );

  let width = clampDimension(0.74 + dominantSpan * 2.05 + snapshot.strokeEnergy * 0.18);
  let depth = clampDimension(0.66 + minorSpan * 1.85 + snapshot.strokeEnergy * 0.12);

  if (shape === "round") {
    const diameter = clampDimension((width + depth) / 2);
    width = diameter;
    depth = diameter;
  } else {
    width = Math.max(width, depth);
    depth = Math.min(width, depth);
    if (shape === "oval" && width / depth < 1.16) {
      width = clampDimension(depth * 1.22);
    }
  }

  const heightBias =
    0.69 +
    snapshot.strokeEnergy * 0.18 +
    (material === "rough_stone" ? 0.05 : 0) +
    (shape === "rectangle" ? 0.02 : 0);
  const height = clampHeight(heightBias);
  const thickness =
    material === "rough_stone" ? 0.1 : material === "metal" ? 0.06 : 0.075;
  const legLength = clampLegLength(height - thickness);

  let legCount = shape === "round" && circularity > 0.82 ? 3 : 4;
  if (shape !== "round" && width > 1.85) {
    legCount = 6;
  }
  if (snapshot.strokeCount >= 6) {
    legCount = clampLegCount(Math.round(snapshot.strokeCount / 1.5));
  }

  let legShape = "round";
  if (material === "metal") {
    legShape = "blade";
  } else if (shape === "rectangle" && (cornerDensity > 0.18 || width > 1.7)) {
    legShape = "square";
  }

  const legWidth = clampLegSpan(
    0.07 +
      Math.min(0.11, width * 0.022) +
      (material === "rough_stone" ? 0.012 : 0) +
      (legShape === "square" ? 0.008 : 0)
  );
  const legDepth = clampLegSpan(
    legShape === "blade"
      ? Math.max(0.04, legWidth * 0.38)
      : legShape === "square"
        ? legWidth
        : legWidth * 0.92,
    legWidth
  );

  const scenario =
    luminance(hexToRgb(snapshot.dominantColor)) < 95
      ? "late_night"
      : currentConfig.scenario;

  return {
    scenario,
    shape,
    silhouetteMode: "sketch",
    width,
    depth,
    height,
    material,
    patternMode: currentConfig.patternMode,
    moduleSize: clampModuleSize(
      0.2 -
        Math.min(0.1, snapshot.coverage * 0.12) -
        Math.min(0.06, snapshot.cornerCount * 0.003)
    ),
    moduleGap: clampModuleGap(
      material === "metal" ? 0.012 : shape === "round" ? 0.008 : 0.01
    ),
    legShape,
    legLength,
    legWidth,
    legDepth,
    legCount,
    rationale:
      "Local sketch sync now combines convex-hull circularity, rectangularity, elongation, corner density, and color tone to infer a cleaner table interpretation.",
    source: "sketch_local"
  };
}
