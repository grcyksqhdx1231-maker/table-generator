import { DEFAULT_CONFIG } from "./catalog";

const SERIES_ORDER = ["red", "brown", "blue", "purple", "beige", "gray", "black"];

export const COLOR_FAMILIES = [
  { value: "all", labelZh: "\u5168\u90e8", labelEn: "All" },
  { value: "red", labelZh: "\u7ea2\u8272\u7cfb", labelEn: "Red" },
  { value: "brown", labelZh: "\u68d5\u8272\u7cfb", labelEn: "Brown" },
  { value: "blue", labelZh: "\u84dd\u8272\u7cfb", labelEn: "Blue" },
  { value: "purple", labelZh: "\u7d2b\u8272\u7cfb", labelEn: "Purple" },
  { value: "beige", labelZh: "\u7c73\u8272\u7cfb", labelEn: "Beige" },
  { value: "gray", labelZh: "\u7070\u8272\u7cfb", labelEn: "Gray" },
  { value: "black", labelZh: "\u9ed1\u8272\u7cfb", labelEn: "Black" }
];

const COLOR_FAMILY_META = {
  red: {
    labelZh: "\u7ea2\u8272\u7cfb",
    labelEn: "Red",
    seriesTitleZh: "\u7eef\u7ea2",
    seriesTitleEn: "Crimson",
    paletteLabelZh: "\u7816\u7ea2 / \u94dc\u68d5 / \u70ad\u9ed1",
    paletteLabelEn: "Brick red / copper / charcoal",
    tint: "#a23e2f",
    glow: "rgba(162, 62, 47, 0.34)",
    defaultMaterial: "metal",
    country: "Italy",
    city: "Milan"
  },
  brown: {
    labelZh: "\u68d5\u8272\u7cfb",
    labelEn: "Brown",
    seriesTitleZh: "\u80e1\u6843\u68d5",
    seriesTitleEn: "Walnut",
    paletteLabelZh: "\u80e1\u6843\u6728 / \u53ef\u53ef / \u6696\u68d5",
    paletteLabelEn: "Walnut / cocoa / warm brown",
    tint: "#7b5a41",
    glow: "rgba(123, 90, 65, 0.3)",
    defaultMaterial: "dark_walnut",
    country: "Japan",
    city: "Kyoto"
  },
  blue: {
    labelZh: "\u84dd\u8272\u7cfb",
    labelEn: "Blue",
    seriesTitleZh: "\u971e\u84dd\u7070",
    seriesTitleEn: "Blue Ash",
    paletteLabelZh: "\u96fe\u84dd / \u7070\u6728 / \u94f6\u7070",
    paletteLabelEn: "Mist blue / ash wood / silver grey",
    tint: "#657d98",
    glow: "rgba(101, 125, 152, 0.3)",
    defaultMaterial: "light_wood",
    country: "Denmark",
    city: "Copenhagen"
  },
  purple: {
    labelZh: "\u7d2b\u8272\u7cfb",
    labelEn: "Purple",
    seriesTitleZh: "\u5929\u9e45\u7ed2\u7d2b",
    seriesTitleEn: "Velvet Plum",
    paletteLabelZh: "\u674e\u5b50\u7d2b / \u70df\u7070 / \u77f3\u7070",
    paletteLabelEn: "Plum / smoke grey / stone",
    tint: "#74608b",
    glow: "rgba(116, 96, 139, 0.32)",
    defaultMaterial: "rough_stone",
    country: "France",
    city: "Paris"
  },
  beige: {
    labelZh: "\u7c73\u8272\u7cfb",
    labelEn: "Beige",
    seriesTitleZh: "\u71d5\u9ea6\u6c99\u8272",
    seriesTitleEn: "Oat Sand",
    paletteLabelZh: "\u71d5\u9ea6\u7c73 / \u6c99\u8272 / \u9aa8\u767d",
    paletteLabelEn: "Oat / sand / bone",
    tint: "#c8b49a",
    glow: "rgba(200, 180, 154, 0.28)",
    defaultMaterial: "light_wood",
    country: "United States",
    city: "Los Angeles"
  },
  gray: {
    labelZh: "\u7070\u8272\u7cfb",
    labelEn: "Gray",
    seriesTitleZh: "\u77f3\u96fe\u7070",
    seriesTitleEn: "Stone Grey",
    paletteLabelZh: "\u77f3\u7070 / \u96fe\u94f6 / \u6df1\u7070",
    paletteLabelEn: "Stone grey / silver mist / graphite",
    tint: "#8a9097",
    glow: "rgba(138, 144, 151, 0.28)",
    defaultMaterial: "rough_stone",
    country: "Germany",
    city: "Berlin"
  },
  black: {
    labelZh: "\u9ed1\u8272\u7cfb",
    labelEn: "Black",
    seriesTitleZh: "\u66dc\u77f3\u9ed1",
    seriesTitleEn: "Obsidian",
    paletteLabelZh: "\u66dc\u77f3\u9ed1 / \u67aa\u7070 / \u70df\u94f6",
    paletteLabelEn: "Obsidian / gunmetal / smoked silver",
    tint: "#2b2d31",
    glow: "rgba(43, 45, 49, 0.34)",
    defaultMaterial: "metal",
    country: "South Korea",
    city: "Seoul"
  }
};

const FAMILY_IMAGE_POOLS = {
  red: [
    "/generated-scenes/gallery-red.jpg",
    "/generated-scenes/gallery-red.jpg",
    "/generated-scenes/gallery-red.jpg"
  ],
  brown: [
    "/generated-scenes/gallery-brown.jpg",
    "/generated-scenes/gallery-brown.jpg",
    "/generated-scenes/gallery-brown.jpg"
  ],
  blue: [
    "/generated-scenes/gallery-blue.jpg",
    "/generated-scenes/gallery-blue.jpg",
    "/generated-scenes/gallery-blue.jpg"
  ],
  purple: [
    "/generated-scenes/gallery-purple.png",
    "/generated-scenes/gallery-purple.png",
    "/generated-scenes/gallery-purple.png"
  ],
  beige: [
    "/generated-scenes/gallery-beige.jpg",
    "/generated-scenes/gallery-beige.jpg",
    "/generated-scenes/gallery-beige.jpg"
  ],
  gray: [
    "/generated-scenes/gallery-gray.png",
    "/generated-scenes/gallery-gray.png",
    "/generated-scenes/gallery-gray.png"
  ],
  black: [
    "/generated-scenes/gallery-black.png",
    "/generated-scenes/gallery-black.png",
    "/generated-scenes/gallery-black.png"
  ]
};

const SCENE_VARIANTS = [
  {
    key: "studio",
    titleZhSuffix: "\u5de5\u4f5c\u684c",
    titleEnSuffix: "Studio Table",
    sceneZh: "\u521b\u610f\u5de5\u4f5c\u5ba4",
    sceneEn: "Creative Studio",
    roomLabel: "5.80 x 4.60 x 3.00 m",
    patch: {
      scenario: "daylight",
      width: 1.78,
      depth: 0.78,
      moduleSize: 0.11,
      moduleThicknessScale: 0.84
    }
  },
  {
    key: "residence",
    titleZhSuffix: "\u79c1\u5b85\u684c",
    titleEnSuffix: "Residence Table",
    sceneZh: "\u79c1\u5b85\u8d77\u5c45",
    sceneEn: "Private Residence",
    roomLabel: "5.20 x 4.10 x 2.95 m",
    patch: {
      scenario: "daylight",
      width: 1.62,
      depth: 0.84,
      moduleSize: 0.1,
      moduleThicknessScale: 0.78
    }
  },
  {
    key: "salon",
    titleZhSuffix: "\u9910\u53d9\u684c",
    titleEnSuffix: "Salon Table",
    sceneZh: "\u9910\u53d9\u6c99\u9f99",
    sceneEn: "Dining Salon",
    roomLabel: "6.40 x 4.80 x 3.10 m",
    patch: {
      scenario: "late_night",
      width: 1.96,
      depth: 0.88,
      moduleSize: 0.12,
      moduleThicknessScale: 0.9
    }
  }
];

const FAMILY_CONFIG_PATCHES = {
  red: {
    material: "metal",
    patternMode: "metal",
    finishColor: "#a23e2f",
    shape: "oval",
    legShape: "blade",
    moduleGap: 0.01
  },
  brown: {
    material: "dark_walnut",
    patternMode: "metal",
    finishColor: "#7b5a41",
    shape: "rectangle",
    legShape: "square",
    moduleGap: 0.008
  },
  blue: {
    material: "light_wood",
    patternMode: "metal",
    finishColor: "#657d98",
    shape: "rectangle",
    legShape: "round",
    moduleGap: 0.008
  },
  purple: {
    material: "rough_stone",
    patternMode: "metal",
    finishColor: "#74608b",
    shape: "oval",
    legShape: "blade",
    moduleGap: 0.012
  },
  beige: {
    material: "light_wood",
    patternMode: "metal",
    finishColor: "#c8b49a",
    shape: "round",
    legShape: "round",
    moduleGap: 0.006
  },
  gray: {
    material: "rough_stone",
    patternMode: "metal",
    finishColor: "#8a9097",
    shape: "rectangle",
    legShape: "square",
    moduleGap: 0.01
  },
  black: {
    material: "metal",
    patternMode: "metal",
    finishColor: "#2b2d31",
    shape: "rectangle",
    legShape: "blade",
    moduleGap: 0.012
  }
};

const MATERIAL_RATES = {
  light_wood: { tabletop: 2200, legs: 1300, modules: 980, finish: 760 },
  dark_walnut: { tabletop: 3600, legs: 1800, modules: 1200, finish: 980 },
  rough_stone: { tabletop: 3100, legs: 1600, modules: 1280, finish: 920 },
  metal: { tabletop: 2800, legs: 2200, modules: 1450, finish: 1100 }
};

function createConfig(overrides = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...overrides
  };
}

function clampDimension(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : fallback;
}

function stringHash(input) {
  return Array.from(String(input || "")).reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    7
  );
}

function getImagePool(familyValue) {
  return FAMILY_IMAGE_POOLS[familyValue] || FAMILY_IMAGE_POOLS.gray;
}

function pickFamilyImage(familyValue, seed, preferredIndex = null) {
  const pool = getImagePool(familyValue);

  if (preferredIndex !== null && pool[preferredIndex]) {
    return pool[preferredIndex];
  }

  const index = stringHash(seed) % pool.length;
  return pool[index];
}

function buildSeed(familyValue, sceneIndex) {
  const meta = COLOR_FAMILY_META[familyValue] || COLOR_FAMILY_META.gray;
  const scene = SCENE_VARIANTS[sceneIndex] || SCENE_VARIANTS[0];
  const patch = FAMILY_CONFIG_PATCHES[familyValue] || FAMILY_CONFIG_PATCHES.gray;
  const imageUrl = pickFamilyImage(familyValue, familyValue + "-" + scene.key, sceneIndex);

  return {
    id: "gallery-seed-" + familyValue + "-" + scene.key,
    colorFamily: familyValue,
    country: meta.country,
    city: meta.city,
    titleZh: meta.seriesTitleZh + scene.titleZhSuffix,
    titleEn: meta.seriesTitleEn + " " + scene.titleEnSuffix,
    sceneZh: scene.sceneZh,
    sceneEn: scene.sceneEn,
    roomLabel: scene.roomLabel,
    imageUrl,
    material: patch.material,
    paletteLabelZh: meta.paletteLabelZh,
    paletteLabelEn: meta.paletteLabelEn,
    familyTint: meta.tint,
    familyGlow: meta.glow,
    config: createConfig({
      ...scene.patch,
      ...patch,
      width: clampDimension(scene.patch.width, DEFAULT_CONFIG.width),
      depth: clampDimension(scene.patch.depth, DEFAULT_CONFIG.depth)
    })
  };
}

export const GALLERY_SEEDS = SERIES_ORDER.flatMap((familyValue) =>
  SCENE_VARIANTS.map((scene, sceneIndex) => buildSeed(familyValue, sceneIndex))
);

export function getColorFamilyMeta(value) {
  return COLOR_FAMILY_META[value] || COLOR_FAMILY_META.gray;
}

export function getColorFamilyLabel(locale, value) {
  const option = COLOR_FAMILIES.find((item) => item.value === value) || COLOR_FAMILIES[0];
  return locale === "zh" ? option.labelZh : option.labelEn;
}

export function getGalleryEstimate(config) {
  const rates = MATERIAL_RATES[config.material] || MATERIAL_RATES.metal;
  const area = Math.max(0.45, Number(config.width || 1.4) * Number(config.depth || 0.65));
  const densityFactor = Math.max(0.92, Math.min(1.34, 1.22 - Number(config.moduleSize || 0.112)));
  const tabletop = Math.round(area * rates.tabletop);
  const legs = Math.round((config.legCount || 4) * rates.legs * 0.38);
  const modules = Math.round(area * rates.modules * densityFactor);
  const finish = Math.round(rates.finish + area * 320);
  const total = tabletop + legs + modules + finish;

  return {
    tabletop,
    legs,
    modules,
    finish,
    total
  };
}

export function createGalleryUploadFromSource({
  id,
  config,
  label,
  material,
  colorFamily = "gray",
  sourceLabelZh,
  sourceLabelEn
}) {
  const meta = getColorFamilyMeta(colorFamily);
  const nextConfig = createConfig({
    ...config,
    material: material || config.material || meta.defaultMaterial
  });

  return {
    id,
    colorFamily,
    country: "Custom Upload",
    city: "Web Studio",
    titleZh: label + " \u00b7 " + meta.seriesTitleZh,
    titleEn: label + " · " + meta.seriesTitleEn,
    sceneZh: sourceLabelZh || "\u6765\u81ea\u5f53\u524d\u914d\u7f6e",
    sceneEn: sourceLabelEn || "From current configuration",
    roomLabel: "Custom gallery study",
    imageUrl: pickFamilyImage(colorFamily, id + "-" + label),
    material: nextConfig.material,
    paletteLabelZh: meta.paletteLabelZh,
    paletteLabelEn: meta.paletteLabelEn,
    familyTint: meta.tint,
    familyGlow: meta.glow,
    config: nextConfig,
    uploaded: true,
    createdAt: new Date().toISOString()
  };
}

export function createGallerySeriesFromSource({
  baseId,
  config,
  label,
  sourceLabelZh,
  sourceLabelEn
}) {
  return SERIES_ORDER.map((familyValue) => {
    const meta = getColorFamilyMeta(familyValue);
    const patch = FAMILY_CONFIG_PATCHES[familyValue] || FAMILY_CONFIG_PATCHES.gray;
    const nextConfig = createConfig({
      ...config,
      ...patch,
      material: patch.material || meta.defaultMaterial
    });

    return {
      id: baseId + "-" + familyValue,
      colorFamily: familyValue,
      country: "Custom Series",
      city: "Web Studio",
      titleZh: label + " \u00b7 " + meta.seriesTitleZh,
      titleEn: label + " · " + meta.seriesTitleEn,
      sceneZh: sourceLabelZh || "\u5f53\u524d\u65b9\u6848\u7684\u8272\u7cfb\u6f14\u7ece",
      sceneEn: sourceLabelEn || "Color-series study from current design",
      roomLabel: "Series study / current proportions",
      imageUrl: pickFamilyImage(familyValue, baseId + "-" + familyValue + "-" + label),
      material: nextConfig.material,
      paletteLabelZh: meta.paletteLabelZh,
      paletteLabelEn: meta.paletteLabelEn,
      familyTint: meta.tint,
      familyGlow: meta.glow,
      config: createConfig({
        ...nextConfig
      }),
      uploaded: true,
      createdAt: new Date().toISOString(),
      generatedSeries: true
    };
  });
}

export function buildCartItemFromGalleryItem(item) {
  return {
    id: item.id + "-cart",
    galleryItemId: item.id,
    titleZh: item.titleZh,
    titleEn: item.titleEn,
    imageUrl: item.imageUrl,
    material: item.material,
    familyTint: item.familyTint,
    paletteLabelZh: item.paletteLabelZh,
    paletteLabelEn: item.paletteLabelEn,
    config: item.config,
    estimate: getGalleryEstimate(item.config),
    qty: 1
  };
}

export function evaluateTradeIn(submission, locale) {
  const yearsOwned = Math.max(0, Number(submission.yearsOwned || 0));
  const originalPrice = Math.max(2000, Number(submission.originalPrice || 0));
  const conditionScore =
    {
      excellent: 1,
      good: 0.82,
      fair: 0.62,
      repair: 0.4
    }[submission.condition] || 0.62;
  const ownershipFactor = Math.max(0.24, 1 - yearsOwned * 0.08);
  const brandFactor = String(submission.series || "").toLowerCase().includes("tri") ? 1 : 0.86;
  const tradeInValue = Math.round(originalPrice * conditionScore * ownershipFactor * brandFactor);

  let targetSeries = "Studio Core";
  if (tradeInValue >= 10000) {
    targetSeries = "Collector Series";
  } else if (tradeInValue >= 7000) {
    targetSeries = "Gallery Series";
  } else if (tradeInValue >= 4500) {
    targetSeries = "Residence Series";
  }

  const discountRate = Math.max(0.08, Math.min(0.28, tradeInValue / 50000));
  const inspectionNote =
    locale === "zh"
      ? "\u8fd9\u662f\u524d\u7aef\u6f14\u793a\u4f30\u503c\uff0c\u5b9e\u9645\u56de\u6536\u4ecd\u9700\u4eba\u5de5\u6838\u67e5\u684c\u9762\u3001\u684c\u817f\u548c\u8fde\u63a5\u72b6\u51b5\u3002"
      : "Frontend demo estimate only. Final trade-in value still needs manual inspection.";

  return {
    targetSeries,
    tradeInValue,
    discountRate,
    discountLabel: Math.round(discountRate * 100) + "%",
    inspectionNote
  };
}
