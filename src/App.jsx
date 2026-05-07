import { useEffect, useMemo, useRef, useState } from "react";
import BrandLogo from "./components/BrandLogo";
import ChatDock from "./components/ChatDock";
import ControlPanel from "./components/ControlPanel";
import DraftDrawer from "./components/DraftDrawer";
import GalleryPage from "./components/GalleryPage";
import Icon from "./components/Icon";
import LandingView from "./components/LandingView";
import PartEditorOverlay from "./components/PartEditorOverlay";
import ProfilePage from "./components/ProfilePage";
import QuotePage from "./components/QuotePage";
import SketchPad from "./components/SketchPad";
import TableViewport from "./components/TableViewport";
import { requestAiDesign } from "./lib/api";
import {
  DEFAULT_CONFIG,
  SCENARIO_PRESETS,
  normalizeConfig
} from "./lib/catalog";
import { getLocalizedDraftLabel, getLocalizedOptionLabel, t } from "./lib/i18n";
import {
  buildCartItemFromGalleryItem,
  createGalleryUploadFromSource,
  GALLERY_SEEDS
} from "./lib/marketplace";
import {
  loadCart,
  loadDrafts,
  loadFavorites,
  loadGalleryUploads,
  loadProfile,
  loadTradeInLeads,
  saveCart,
  saveDrafts,
  saveFavorites,
  saveGalleryUploads,
  saveProfile,
  saveTradeInLeads
} from "./lib/storage";
import { DEFAULT_PART_MATERIALS } from "./lib/ecoMaterials";

const EMPTY_SKETCH = {
  version: 0,
  hasContent: false,
  dataUrl: "",
  maskDataUrl: "",
  pointCount: 0,
  cornerCount: 0,
  aspectRatio: 1,
  coverage: 0,
  dominantColor: "#1a1a1a",
  strokeEnergy: 0,
  circularity: 0,
  rectangularity: 0,
  elongation: 1,
  radialVariance: 0,
  hullNormalized: []
};

const EMPTY_UNDERSTANDING = {
  summary: "",
  intent: "",
  constraints: "",
  sketchInfluence: "",
  nextQuestion: ""
};

const DEFAULT_LOCKS = {
  shape: false,
  dimensions: false,
  material: false,
  surface: false,
  legs: false
};

function getStudioCopy(locale) {
  if (locale === "zh") {
    return {
      eyebrow: "实时配置工作台",
      title: "参数化桌面配置",
      note: "左侧调参并手绘，右侧实时查看结构与部件。",
      sketch: "手绘轮廓",
      sketchDetail: "沿参考轮廓继续改形",
      render: "实时模型",
      renderDetail: "旋转、缩放并编辑部件"
    };
  }

  return {
    eyebrow: "Live Design Studio",
    title: "Parametric Table Configuration",
    note: "Adjust parameters and sketch on the left while editing the live model on the right.",
    sketch: "Sketch Outline",
    sketchDetail: "Draw over the reference silhouette",
    render: "Live Render",
    renderDetail: "Orbit, inspect, and edit parts"
  };
}

const CONFIG_KEYS = [
  "scenario",
  "shape",
  "silhouetteMode",
  "width",
  "depth",
  "height",
  "material",
  "patternMode",
  "finishColor",
  "moduleSize",
  "moduleGap",
  "moduleThicknessScale",
  "legShape",
  "legLength",
  "legWidth",
  "legDepth",
  "frameInset",
  "frameThickness",
  "legSpread",
  "legTopDepth",
  "legBottomDepth",
  "legBellyDepth",
  "legToeWidth",
  "legToeSharpness",
  "legCount",
  "lightAngle"
];

function pickConfigFields(source) {
  return Object.fromEntries(
    CONFIG_KEYS.filter((key) => source && source[key] !== undefined).map((key) => [
      key,
      source[key]
    ])
  );
}

function hasConfigDelta(nextConfig, currentConfig) {
  return CONFIG_KEYS.some((key) => nextConfig?.[key] !== currentConfig?.[key]);
}

function buildDesignContext(sketchSnapshot) {
  return {
    hasSketchOutline: Boolean(sketchSnapshot?.hasContent),
    sketchPointCount: sketchSnapshot?.pointCount || 0
  };
}

function buildSketchMetadata(snapshot) {
  if (!snapshot?.hasContent) {
    return null;
  }

  return {
    pointCount: snapshot.pointCount,
    cornerCount: snapshot.cornerCount,
    aspectRatio: Number(snapshot.aspectRatio.toFixed(2)),
    coverage: Number(snapshot.coverage.toFixed(3)),
    dominantColor: snapshot.dominantColor,
    circularity: Number((snapshot.circularity || 0).toFixed(3)),
    rectangularity: Number((snapshot.rectangularity || 0).toFixed(3)),
    elongation: Number((snapshot.elongation || 1).toFixed(3)),
    radialVariance: Number((snapshot.radialVariance || 0).toFixed(3))
  };
}

function buildSketchSilhouettePatch(snapshot, currentConfig) {
  const boundsWidthRatio = Math.max(
    0.12,
    Math.min(1, Number(snapshot?.boundsWidthRatio || 0.82))
  );
  const boundsHeightRatio = Math.max(
    0.12,
    Math.min(1, Number(snapshot?.boundsHeightRatio || 0.82))
  );
  const dominantSketchSpan = Math.max(boundsWidthRatio, boundsHeightRatio, 0.12);
  const dominantCurrentSpan = Math.max(currentConfig.width || 1.4, currentConfig.depth || 0.65);
  const coverageScale = Math.max(
    0.84,
    Math.min(1.18, 0.92 + (Number(snapshot?.coverage || 0.16) - 0.16) * 1.35)
  );
  const worldScale = (dominantCurrentSpan * coverageScale) / dominantSketchSpan;

  return {
    silhouetteMode: "sketch",
    shape: "rectangle",
    width: Number((boundsWidthRatio * worldScale).toFixed(2)),
    depth: Number((boundsHeightRatio * worldScale).toFixed(2))
  };
}

function createDraft(config, sketchSnapshot, locale) {
  return {
    id: crypto.randomUUID(),
    label: getLocalizedDraftLabel(config, locale),
    createdAt: new Date().toISOString(),
    config,
    sketchAsset: sketchSnapshot?.hasContent
      ? {
          hasContent: true,
          maskDataUrl: sketchSnapshot.maskDataUrl,
          hullNormalized: sketchSnapshot.hullNormalized || []
        }
      : null
  };
}

function resizeImageFile(file, maxEdge = 360) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);

        resolve({
          name: file.name,
          dataUrl: canvas.toDataURL("image/png", 0.92),
          width,
          height
        });
      };
      image.onerror = () => reject(new Error("The uploaded image could not be read."));
      image.src = String(reader.result || "");
    };

    reader.onerror = () => reject(new Error("The uploaded image could not be read."));
    reader.readAsDataURL(file);
  });
}

function applyLocksToPatch(currentConfig, patch, locks) {
  if (!patch) {
    return {};
  }

  const next = { ...patch };

  if (locks.shape) {
    next.shape = currentConfig.shape;
    next.silhouetteMode = currentConfig.silhouetteMode;
  }

  if (locks.dimensions) {
    next.width = currentConfig.width;
    next.depth = currentConfig.depth;
    next.height = currentConfig.height;
  }

  if (locks.material) {
    next.material = currentConfig.material;
  }

  if (locks.surface) {
    next.patternMode = currentConfig.patternMode;
    next.moduleSize = currentConfig.moduleSize;
    next.moduleGap = currentConfig.moduleGap;
    next.moduleThicknessScale = currentConfig.moduleThicknessScale;
    next.patternPresence = currentConfig.patternPresence;
    next.patternContrast = currentConfig.patternContrast;
    next.patternBrightness = currentConfig.patternBrightness;
    next.patternRelief = currentConfig.patternRelief;
  }

  if (locks.legs) {
    next.legShape = currentConfig.legShape;
    next.legLength = currentConfig.legLength;
    next.legWidth = currentConfig.legWidth;
    next.legDepth = currentConfig.legDepth;
    next.legCount = currentConfig.legCount;
  }

  return next;
}

function buildLockSummary(locks, locale = "en") {
  const active = Object.entries(locks)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  if (!active.length) {
    return locale === "zh" ? "No locks are active." : "No locks are active.";
  }

  return locale === "zh"
    ? `Locked: ${active.join(" / ")}`
    : `Locked: ${active.join(", ")}.`;
}

function buildLocalUnderstanding(sketchSnapshot, locks, locale = "en") {
  return {
    summary: sketchSnapshot?.hasContent
      ? "Sketch is attached as a local tabletop refinement reference."
      : "The current table is being guided by prompt and manual controls.",
    intent: sketchSnapshot?.hasContent
      ? "Modify the current base locally instead of regenerating the whole table."
      : "Establish the next overall direction.",
    constraints: buildLockSummary(locks, locale),
    sketchInfluence: sketchSnapshot?.hasContent
      ? "Sketch strokes influence local edges and module coverage."
      : "No sketch is attached right now.",
    nextQuestion: "Should the next pass focus on silhouette, module detail, or material?"
  };
}

function clampPartValue(value, min, max) {
  return Math.max(min, Math.min(max, Number(value.toFixed(3))));
}

function includesAny(text, fragments) {
  return fragments.some((fragment) => text.includes(fragment));
}

const CN = {
  round: "\u5706",
  roundShape: "\u5706\u5f62",
  oval: "\u692d\u5706",
  square: "\u65b9\u5f62",
  rectangle: "\u77e9\u5f62",
  trueSquare: "\u6b63\u65b9",
  resin: "\u6811\u8102",
  transparent: "\u900f\u660e",
  wood: "\u6728",
  woodGrain: "\u6728\u7eb9",
  cork: "\u8f6f\u6728",
  porous: "\u591a\u5b54",
  fiber: "\u7ea4\u7ef4",
  natural: "\u81ea\u7136",
  bone: "\u9aa8\u767d",
  oat: "\u71d5\u9ea6",
  warmWhite: "\u6696\u767d",
  red: "\u7ea2\u8272",
  brickRed: "\u7816\u7ea2",
  black: "\u9ed1\u8272",
  green: "\u7eff\u8272",
  brown: "\u68d5\u8272",
  pink: "\u7c89\u8272",
  small: "\u5c0f",
  large: "\u5927",
  family: "\u5bb6\u5ead",
  metal: "\u91d1\u5c5e",
  steel: "\u94a2",
  stone: "\u77f3",
  dense: "\u66f4\u5bc6",
  fine: "\u66f4\u7ec6",
  thick: "\u66f4\u539a",
  coarse: "\u66f4\u7c97",
  bladeLeg: "\u7247\u817f",
  squareLeg: "\u65b9\u817f",
  roundLeg: "\u5706\u817f"
};

function inferPartMaterialKey(text, fallbackMaterialKey) {
  if (includesAny(text, ["resin", "transparent", "translucent", "smoke", CN.resin, CN.transparent])) {
    return "rpetg_smoke";
  }
  if (includesAny(text, ["wood", "timber", "pine", "woodfill", CN.wood, CN.woodGrain])) {
    return "woodfill_pine";
  }
  if (includesAny(text, ["cork", "soft", "porous", CN.cork, CN.porous])) {
    return "corkfill_umber";
  }
  if (includesAny(text, ["hemp", "fiber", "natural", CN.fiber, CN.natural])) {
    return "hemp_bio_sage";
  }
  if (includesAny(text, ["bone", "oat", "ivory", "chalk", CN.bone, CN.oat])) {
    return "allpha_bone";
  }
  if (includesAny(text, ["recycled", "eggshell", "warm white", CN.warmWhite])) {
    return "rpla_eggshell";
  }
  return fallbackMaterialKey;
}

function inferTintFromText(text, fallbackTint) {
  if (includesAny(text, ["vermilion", "brick", "red", "terracotta", CN.red, CN.brickRed])) {
    return "#d9381e";
  }
  if (includesAny(text, ["charcoal", "black", CN.black])) {
    return "#1a1a1a";
  }
  if (includesAny(text, ["bone", "oat", "ivory", "white", CN.bone, CN.oat, CN.warmWhite])) {
    return "#efe6da";
  }
  if (includesAny(text, ["sage", "green", CN.green])) {
    return "#8c9475";
  }
  if (includesAny(text, ["walnut", "brown", CN.brown])) {
    return "#7c5a40";
  }
  if (includesAny(text, ["pink", "rose", CN.pink])) {
    return "#cf7aa3";
  }
  return fallbackTint;
}

function buildVariantConfig(baseConfig, patch, locks) {
  return normalizeConfig({
    ...baseConfig,
    ...applyLocksToPatch(baseConfig, patch, locks)
  });
}

function createVariantRecords(rawVariants, baseConfig, locks, locale = "en") {
  const fallbacks = [
    {
      id: "balanced",
      title: locale === "zh" ? "Balanced Direction" : "Balanced Direction",
      emphasis: "Closest to the current brief",
      summary: "A balanced reading of the current prompt and drawing.",
      rationale: "Keeps the current brief stable while preserving flexibility.",
      config: buildVariantConfig(baseConfig, {}, locks)
    },
    {
      id: "sculptural",
      title: locale === "zh" ? "Sculptural Direction" : "Sculptural Direction",
      emphasis: "Pushes presence and silhouette",
      summary: "A more characterful version with stronger outline and detail.",
      rationale: "Pushes the form into a more expressive direction.",
      config: buildVariantConfig(
        baseConfig,
        {
          width: Math.min(2.4, baseConfig.width + 0.08),
          depth: Math.min(2.4, baseConfig.depth + 0.04),
          moduleSize: Math.min(0.28, baseConfig.moduleSize + 0.01),
          moduleThicknessScale: Math.min(1.2, (baseConfig.moduleThicknessScale || 1) + 0.08)
        },
        locks
      )
    },
    {
      id: "everyday",
      title: locale === "zh" ? "Everyday Direction" : "Everyday Direction",
      emphasis: "Leans practical and calm",
      summary: "A cleaner, easier-to-place version with lighter surface detailing.",
      rationale: "Reduces visual weight for an everyday-ready interpretation.",
      config: buildVariantConfig(
        baseConfig,
        {
          width: Math.max(0.65, baseConfig.width - 0.06),
          depth: Math.max(0.65, baseConfig.depth - 0.04),
          moduleSize: Math.max(0.04, baseConfig.moduleSize - 0.015),
          moduleGap: Math.max(0, baseConfig.moduleGap - 0.002),
          moduleThicknessScale: Math.max(0.18, (baseConfig.moduleThicknessScale || 1) - 0.12)
        },
        locks
      )
    }
  ];

  return fallbacks.map((fallback, index) => {
    const raw = rawVariants?.[index];
    if (!raw) {
      return fallback;
    }
    return {
      id: String(raw.id || fallback.id),
      title: String(raw.title || fallback.title),
      emphasis: String(raw.emphasis || fallback.emphasis),
      summary: String(raw.summary || fallback.summary),
      rationale: String(raw.rationale || fallback.rationale),
      config: buildVariantConfig(baseConfig, pickConfigFields(raw), locks)
    };
  });
}

function getDefaultPartOverride(partKind) {
  if (partKind === "tabletop") {
    return {
      materialKey: DEFAULT_PART_MATERIALS.tabletop,
      tint: "#d8cbb8",
      moduleSizeScale: 1,
      thicknessScale: 1
    };
  }

  if (partKind === "modules") {
    return {
      materialKey: DEFAULT_PART_MATERIALS.tabletop,
      tint: "#6e675f",
      moduleSizeScale: 1,
      thicknessScale: 1
    };
  }

  if (partKind === "frame") {
    return {
      materialKey: DEFAULT_PART_MATERIALS.tabletop,
      tint: "#c8b49a",
      widthScale: 1,
      depthScale: 1
    };
  }

  if (partKind === "legs") {
    return {
      materialKey: DEFAULT_PART_MATERIALS.legs,
      tint: "#5f6267",
      widthScale: 1,
      depthScale: 1,
      lengthScale: 1
    };
  }

  return {
    materialKey: DEFAULT_PART_MATERIALS.legs,
    tint: "#5f6267",
    widthScale: 1,
    depthScale: 1,
    lengthScale: 1
  };
}

function normalizeHexColor(value) {
  const raw = String(value || "").trim().replace("#", "");

  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(raw)) {
    return "";
  }

  const hex = raw.length === 3
    ? raw
        .split("")
        .map((fragment) => `${fragment}${fragment}`)
        .join("")
    : raw;

  return `#${hex.toLowerCase()}`;
}

function inferColorFamilyFromTint(tint, material = "metal") {
  const normalized = normalizeHexColor(tint);

  if (!normalized) {
    if (material === "dark_walnut") {
      return "brown";
    }

    if (material === "light_wood") {
      return "beige";
    }

    if (material === "rough_stone") {
      return "gray";
    }

    return "black";
  }

  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta < 0.08) {
    if (lightness < 0.22) {
      return "black";
    }

    if (lightness < 0.62) {
      return "gray";
    }

    return "beige";
  }

  let hue = 0;

  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue = Math.round(hue * 60);

  if (hue < 0) {
    hue += 360;
  }

  if (hue < 20 || hue >= 345) {
    return "red";
  }

  if (hue < 50) {
    return "brown";
  }

  if (hue < 170) {
    return "beige";
  }

  if (hue < 255) {
    return "blue";
  }

  if (hue < 320) {
    return "purple";
  }

  return "red";
}

function buildLocalDirectionResult(prompt, currentConfig, sketchSnapshot, locks, locale = "en") {
  const promptText = String(prompt || "").toLowerCase();
  const baseFromSketch = sketchSnapshot?.hasContent
    ? {
        ...currentConfig,
        moduleSize: Math.max(0.04, currentConfig.moduleSize - 0.008),
        moduleGap: Math.max(0, currentConfig.moduleGap - 0.001)
      }
    : currentConfig;
  const next = {
    ...currentConfig,
    ...applyLocksToPatch(currentConfig, baseFromSketch, locks)
  };

  if (!locks.shape) {
    if (includesAny(promptText, ["round", "circle", CN.round, CN.roundShape])) {
      next.shape = "round";
      next.silhouetteMode = "shape";
    } else if (includesAny(promptText, ["oval", "ellipse", CN.oval])) {
      next.shape = "oval";
      next.silhouetteMode = "shape";
    } else if (includesAny(promptText, ["rectangle", "rect", "square", CN.square, CN.rectangle, CN.trueSquare])) {
      next.shape = "rectangle";
      next.silhouetteMode = "shape";
    }
  }

  if (!locks.dimensions) {
    if (includesAny(promptText, ["small", "compact", "coffee", "two", "2", CN.small])) {
      next.width = Math.max(0.72, currentConfig.width - 0.18);
      next.depth = Math.max(0.68, currentConfig.depth - 0.12);
    }
    if (includesAny(promptText, ["large", "family", "six", "6", "big", CN.large, CN.family])) {
      next.width = Math.min(2.2, currentConfig.width + 0.22);
      next.depth = Math.min(1.2, currentConfig.depth + 0.16);
    }
  }

  if (!locks.material) {
    if (includesAny(promptText, ["metal", "steel", CN.metal, CN.steel])) {
      next.material = "metal";
    } else if (includesAny(promptText, ["walnut", "dark wood"])) {
      next.material = "dark_walnut";
    } else if (includesAny(promptText, ["stone", "rock", CN.stone])) {
      next.material = "rough_stone";
    } else if (includesAny(promptText, ["wood", "oak", CN.wood])) {
      next.material = "light_wood";
    }
  }

  if (!locks.surface) {
    if (includesAny(promptText, ["fine", "dense", CN.dense, CN.fine])) {
      next.moduleSize = Math.max(0.04, currentConfig.moduleSize - 0.02);
      next.moduleThicknessScale = Math.max(0.18, (currentConfig.moduleThicknessScale || 1) - 0.15);
    }
    if (includesAny(promptText, ["bold", "chunky", "thick", CN.thick, CN.coarse])) {
      next.moduleSize = Math.min(0.28, currentConfig.moduleSize + 0.02);
      next.moduleThicknessScale = Math.min(1.2, (currentConfig.moduleThicknessScale || 1) + 0.15);
    }
  }

  if (!locks.legs) {
    if (includesAny(promptText, ["blade", CN.bladeLeg])) {
      next.legShape = "blade";
    } else if (includesAny(promptText, ["square leg", CN.squareLeg])) {
      next.legShape = "square";
    } else if (includesAny(promptText, ["round leg", CN.roundLeg])) {
      next.legShape = "round";
    }
  }

  const normalized = normalizeConfig(next);

  return {
    ...normalized,
    rationale: "A local fallback interpreter combined the prompt, locks, and sketch.",
    understanding: {
      summary: sketchSnapshot?.hasContent
        ? "The system fused your prompt with the current local sketch."
        : "The system used your prompt and current settings.",
      intent: prompt ? `Current brief: ${prompt.trim().slice(0, 96)}` : "Current brief is mostly driven by the visual draft.",
      constraints: buildLockSummary(locks, locale),
      sketchInfluence: sketchSnapshot?.hasContent
        ? "The sketch influences local edge treatment and module density."
        : "No sketch was attached, so prompt and manual controls are leading.",
      nextQuestion: "Should the next pass change silhouette, material, or part details?"
    },
    variants: []
  };
}
function buildScopedLocalEditResult(
  currentConfig,
  editIntent,
  sketchSnapshot,
  locks,
  locale = "en"
) {
  const instruction = String(editIntent?.instruction || "").trim();
  const text = instruction.toLowerCase();
  const scope = String(editIntent?.scope || "overall");
  const next = { ...currentConfig };

  if (!locks.shape && scope !== "legs") {
    if (includesAny(text, ["round", "circle", CN.round, CN.roundShape])) {
      next.shape = "round";
      next.silhouetteMode = "shape";
    } else if (includesAny(text, ["oval", "ellipse", CN.oval])) {
      next.shape = "oval";
      next.silhouetteMode = "shape";
    } else if (includesAny(text, ["rectangle", "rect", "square", CN.square, CN.rectangle, CN.trueSquare])) {
      next.shape = "rectangle";
      next.silhouetteMode = "shape";

      if (includesAny(text, ["square", CN.square, CN.trueSquare])) {
        const side = Number((((currentConfig.width || 1) + (currentConfig.depth || 1)) / 2).toFixed(2));
        next.width = side;
        next.depth = side;
      }
    }
  }

    if (!locks.dimensions && scope === "overall") {
      if (includesAny(text, ["larger", "bigger", "wider", "broad", CN.large, "放大", "更大"])) {
        next.width = currentConfig.width + 0.12;
        next.depth = currentConfig.depth + 0.08;
      }

      if (includesAny(text, ["smaller", "compact", "narrower", CN.small, "缩小", "更小"])) {
        next.width = currentConfig.width - 0.12;
        next.depth = currentConfig.depth - 0.08;
      }

      if (includesAny(text, ["higher", "taller", "raise", "抬高", "更高"])) {
        next.height = currentConfig.height + 0.05;
        next.legLength = currentConfig.legLength + 0.04;
      }

      if (includesAny(text, ["lower", "shorter", "降低", "更低"])) {
        next.height = currentConfig.height - 0.05;
        next.legLength = currentConfig.legLength - 0.04;
      }
  }

  if (!locks.surface && scope !== "legs") {
    if (includesAny(text, ["thin", "slim", "lighter", CN.fine])) {
      next.moduleThicknessScale = (currentConfig.moduleThicknessScale || 1) - 0.12;
    }

    if (includesAny(text, ["thick", "heavier", "bold", CN.thick])) {
      next.moduleThicknessScale = (currentConfig.moduleThicknessScale || 1) + 0.12;
    }

    if (includesAny(text, ["dense", "fine", "tighter", CN.dense, CN.fine])) {
      next.moduleSize = currentConfig.moduleSize - 0.012;
      next.moduleGap = currentConfig.moduleGap - 0.002;
    }

    if (includesAny(text, ["coarse", "larger modules", "loose", CN.coarse])) {
      next.moduleSize = currentConfig.moduleSize + 0.012;
      next.moduleGap = currentConfig.moduleGap + 0.002;
    }
  }

    if (!locks.legs || scope === "legs") {
      if (includesAny(text, ["blade", CN.bladeLeg])) {
        next.legShape = "blade";
      } else if (includesAny(text, ["square leg", "square", CN.squareLeg])) {
        next.legShape = "square";
      } else if (includesAny(text, ["round leg", "cylindrical", CN.roundLeg])) {
        next.legShape = "round";
      }

      if (includesAny(text, ["more legs", "add leg", "加腿", "更多桌腿"])) {
        next.legCount = currentConfig.legCount + 1;
      }

      if (includesAny(text, ["fewer legs", "less legs", "减腿", "更少桌腿"])) {
        next.legCount = currentConfig.legCount - 1;
      }

      if (includesAny(text, ["taller legs", "longer legs", "桌腿更高", "桌腿更长"])) {
        next.legLength = currentConfig.legLength + 0.05;
      }

      if (includesAny(text, ["shorter legs", "lower legs", "桌腿更短", "桌腿更低"])) {
        next.legLength = currentConfig.legLength - 0.05;
      }

      if (includesAny(text, ["thicker legs", "wider legs", "桌腿更粗", "桌腿更宽"])) {
        next.legWidth = currentConfig.legWidth + 0.015;
        next.legDepth = currentConfig.legDepth + 0.015;
      }

      if (includesAny(text, ["slimmer legs", "narrow legs", "桌腿更细", "桌腿更窄"])) {
        next.legWidth = currentConfig.legWidth - 0.015;
        next.legDepth = currentConfig.legDepth - 0.015;
      }
  }

  const normalized = normalizeConfig(next);

  return {
    ...normalized,
    rationale: "Local edits now use a deterministic web parser first.",
    understanding: {
      summary: `Applied deterministic changes for \"${instruction || "the current local edit"}\".`,
      intent: `Scope: ${scope}`,
      constraints: buildLockSummary(locks, locale),
      sketchInfluence: sketchSnapshot?.hasContent
        ? "The sketch now acts as a local tabletop refinement reference instead of auto-regenerating the whole table."
        : "This edit was driven mainly by the text instruction.",
      nextQuestion: "If you want another edge changed, sketch it on the left and add one more precise instruction."
    },
    variants: []
  };
}

export default function App() {
  const galleryCaptureRef = useRef(null);
  const [locale, setLocale] = useState("zh");
  const [phase, setPhase] = useState("landing");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [drafts, setDrafts] = useState(() => loadDrafts());
  const [profile, setProfile] = useState(() => loadProfile());
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [cart, setCart] = useState(() => loadCart());
  const [galleryUploads, setGalleryUploads] = useState(() => loadGalleryUploads());
  const [tradeInLeads, setTradeInLeads] = useState(() => loadTradeInLeads());
  const [draftDrawerOpen, setDraftDrawerOpen] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [serverState, setServerState] = useState({
    ready: false,
    providerLabel: "OpenAI",
    model: "not set",
    supportsVision: false
  });
  const [sketchSnapshot, setSketchSnapshot] = useState(EMPTY_SKETCH);
  const [sketchState, setSketchState] = useState({
    label: t("zh", "status.sketchIdle"),
    detail: ""
  });
  const [designLocks, setDesignLocks] = useState(DEFAULT_LOCKS);
  const [assistantUnderstanding, setAssistantUnderstanding] =
    useState(EMPTY_UNDERSTANDING);
  const [designVariants, setDesignVariants] = useState([]);
  const [activeVariantId, setActiveVariantId] = useState("");
  const [selectedPart, setSelectedPart] = useState(null);
  const [partOverrides, setPartOverrides] = useState({});
  const [materialTarget, setMaterialTarget] = useState("tabletop");
  const [sketchFill, setSketchFill] = useState({
    mode: "none",
    colorA: "#d9381e",
    colorB: "#f2c5b7"
  });
  const configRef = useRef(config);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document
        .querySelectorAll(".market-page, .quote-page, .panel")
        .forEach((element) => {
          element.scrollTop = 0;
        });
      window.dispatchEvent(new Event("resize"));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [phase]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    saveDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  useEffect(() => {
    saveGalleryUploads(galleryUploads);
  }, [galleryUploads]);

  useEffect(() => {
    saveTradeInLeads(tradeInLeads);
  }, [tradeInLeads]);

  useEffect(() => {
    let active = true;

    fetch("/api/health")
      .then((response) => response.json())
      .then((payload) => {
        if (active) {
          setServerState({
            ready: Boolean(payload.modelReady),
            providerLabel: payload.providerLabel || "AI",
            model: payload.model || "not set",
            supportsVision: Boolean(payload.supportsVision)
          });
        }
      })
      .catch(() => {
        if (active) {
          setServerState({
            ready: false,
            providerLabel: "AI",
            model: "offline",
            supportsVision: false
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function updateConfig(patch) {
    setConfig((current) =>
      normalizeConfig({
        ...current,
        ...patch,
        patternMode: "metal",
        finishColor: Object.prototype.hasOwnProperty.call(patch, "material") ? "" : current.finishColor
      })
    );
  }

  function applyAssistantResult(result, options = {}) {
    const current = configRef.current;
    const patch = applyLocksToPatch(current, pickConfigFields(result), designLocks);
    const nextConfig = normalizeConfig({
      ...current,
      ...patch,
      patternMode: "metal",
      finishColor: options.finishColor ?? current.finishColor
    });
    setConfig(nextConfig);
    setAiNote(result.rationale || "");
    setAssistantUnderstanding(
      result.understanding || buildLocalUnderstanding(sketchSnapshot, designLocks, locale)
    );

    const variants = createVariantRecords(result.variants, nextConfig, designLocks, locale);
    setDesignVariants(variants);
    setActiveVariantId(variants[0]?.id || "");
  }

  useEffect(() => {
    if (phase !== "configurator" || !sketchSnapshot.version || !sketchSnapshot.hasContent) {
      return undefined;
    }

    setSketchState({
      label:
        locale === "zh" ? "草图正在同步桌面轮廓" : "Sketch is driving the tabletop outline",
      detail:
        locale === "zh"
          ? "右侧模型会根据画板轮廓实时变形，桌腿会跟随新桌面边界重新落位。"
          : "The right model follows the sketch silhouette and repositions legs to the new tabletop."
    });
    setAssistantUnderstanding((current) =>
      current.summary ? current : buildLocalUnderstanding(sketchSnapshot, designLocks, locale)
    );

    return undefined;
  }, [
    designLocks,
    locale,
    phase,
    sketchSnapshot
  ]);
  function handleEnter() {
    setPhase("configurator");
    setStatus(t(locale, "status.start"));
  }

  function handleGoHome() {
    setDraftDrawerOpen(false);
    setPhase("landing");
    setStatus("");
  }

  function openPhase(nextPhase) {
    if (phase === "configurator" && (nextPhase === "gallery" || nextPhase === "quote")) {
      setPhase("profile");
      window.setTimeout(() => setPhase(nextPhase), 80);
      return;
    }

    setPhase(nextPhase);
  }

  function handleGoQuote() {
    setDraftDrawerOpen(false);
    openPhase("quote");
    setStatus("Quote page opened.");
  }

  function handleGoGallery() {
    setDraftDrawerOpen(false);
    openPhase("gallery");
    setStatus(locale === "zh" ? "\u5df2\u6253\u5f00 Gallery\u3002" : "Gallery opened.");
  }

  function handleGoProfile() {
    setDraftDrawerOpen(false);
    setPhase("profile");
    setStatus(locale === "zh" ? "\u5df2\u6253\u5f00\u4e2a\u4eba\u4e3b\u9875\u3002" : "Profile opened.");
  }

  function handleSaveProfile(nextProfile) {
    setProfile(nextProfile);
    setStatus(locale === "zh" ? "\u4e2a\u4eba\u8d44\u6599\u5df2\u4fdd\u5b58\u3002" : "Profile saved.");
  }

  function handleToggleFavorite(itemId) {
    const alreadyFavorite = favorites.includes(itemId);

    setFavorites((current) =>
      alreadyFavorite
        ? current.filter((id) => id !== itemId)
        : [itemId, ...current]
    );

    setStatus(
      locale === "zh"
        ? alreadyFavorite
          ? "\u5df2\u53d6\u6d88\u6536\u85cf\u3002"
          : "\u5df2\u52a0\u5165\u6536\u85cf\u3002"
        : alreadyFavorite
          ? "Removed from favorites."
          : "Added to favorites."
    );
  }

  function handleAddToCart(item) {
    const nextItem = buildCartItemFromGalleryItem(item);

    setCart((current) => {
      const existing = current.find((entry) => entry.galleryItemId === item.id);

      if (existing) {
        return current.filter((entry) => entry.galleryItemId !== item.id);
      }

      return [nextItem, ...current];
    });

    const alreadyInCart = cart.some((entry) => entry.galleryItemId === item.id);
    setStatus(
      locale === "zh"
        ? alreadyInCart
          ? "已移出购物车。"
          : "已加入购物车。"
        : alreadyInCart
          ? "Removed from cart."
          : "Added to cart."
    );
  }

  function handleRemoveCartItem(cartItemId) {
    setCart((current) => current.filter((item) => item.id !== cartItemId));
  }

  function handleUpdateCartQty(cartItemId, nextQty) {
    const quantity = Math.max(0, Number(nextQty || 0));

    setCart((current) => {
      if (quantity <= 0) {
        return current.filter((item) => item.id !== cartItemId);
      }

      return current.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              qty: quantity
            }
          : item
      );
    });
  }

  function handleUploadCurrentDesignToGallery() {
    const currentConfig = configRef.current;
    const imageUrl =
      galleryCaptureRef.current?.captureImage?.("image/jpeg", 0.92) || "";
    const dominantTint =
      partOverrides.modules?.tint ||
      currentConfig.finishColor ||
      partOverrides.tabletop?.tint ||
      sketchFill.colorA ||
      "";
    const colorFamily = inferColorFamilyFromTint(dominantTint, currentConfig.material);
    const upload = createGalleryUploadFromSource({
      id: crypto.randomUUID(),
      config: currentConfig,
      imageUrl,
      label: getLocalizedDraftLabel(currentConfig, locale),
      material: currentConfig.material,
      colorFamily,
      sourceLabelZh: "\u6765\u81ea\u5f53\u524d\u914d\u7f6e",
      sourceLabelEn: "From current configuration"
    });

    setGalleryUploads((current) => [upload, ...current].slice(0, 84));
    setPhase("gallery");
    setStatus(
      locale === "zh"
        ? "\u5df2\u751f\u6210\u5f53\u524d\u65b9\u6848\u7684\u5b9e\u65f6 Gallery \u6548\u679c\u56fe\u3002"
        : "Generated a live Gallery preview from the current design."
    );
  }

  function handleUploadDraftToGallery(draft) {
    const upload = createGalleryUploadFromSource({
      id: crypto.randomUUID(),
      config: draft.config,
      label: draft.label,
      material: draft.config.material,
      colorFamily: inferColorFamilyFromTint(draft.config.finishColor, draft.config.material),
      sourceLabelZh: "\u6765\u81ea\u8349\u7a3f\u5e93",
      sourceLabelEn: "From saved drafts"
    });

    setGalleryUploads((current) => [upload, ...current].slice(0, 84));
    setDraftDrawerOpen(false);
    setPhase("gallery");
    setStatus(locale === "zh" ? "\u8349\u7a3f\u5df2\u4e0a\u4f20\u5230 Gallery\u3002" : "Draft uploaded to Gallery.");
  }

  function handleSubmitTradeIn(submission) {
    setTradeInLeads((current) => [
      {
        ...submission,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      },
      ...current
    ].slice(0, 12));
    setStatus(locale === "zh" ? "\u6362\u65b0\u8bc4\u4f30\u5df2\u751f\u6210\u3002" : "Trade-in evaluation created.");
  }

  function handleTabletopTintChange(tint) {
    setConfig((current) =>
      normalizeConfig({ ...current, finishColor: tint, patternMode: "metal" })
    );
    setPartOverrides((current) => ({
      ...current,
      tabletop: {
        ...(current.tabletop || getDefaultPartOverride("tabletop")),
        tint
      }
    }));
  }

  function handleLegTintChange(tint) {
    setPartOverrides((current) => {
      const next = { ...current };

      for (let index = 1; index <= 8; index += 1) {
        const partId = `leg-${index}`;
        next[partId] = {
          ...(current[partId] || getDefaultPartOverride("leg")),
          tint
        };
      }

      return next;
    });
  }

  function handleModuleTintChange(tint) {
    setPartOverrides((current) => ({
      ...current,
      modules: {
        ...(current.modules || getDefaultPartOverride("modules")),
        tint
      }
    }));
  }

  function handleFrameTintChange(tint) {
    setPartOverrides((current) => ({
      ...current,
      frame: {
        ...(current.frame || getDefaultPartOverride("frame")),
        tint
      }
    }));
  }

  function getMaterialTargetValue(target) {
    if (target === "modules") {
      return partOverrides.modules?.materialKey || config.material;
    }

    if (target === "frame") {
      return partOverrides.frame?.materialKey || config.material;
    }

    if (target === "legs") {
      return partOverrides.legs?.materialKey || partOverrides["leg-1"]?.materialKey || config.material;
    }

    return partOverrides.tabletop?.materialKey || config.material;
  }

  function handleMaterialTargetMaterialChange(materialKey) {
    if (materialTarget === "legs") {
      setPartOverrides((current) => ({
        ...current,
        legs: {
          ...(current.legs || getDefaultPartOverride("legs")),
          materialKey
        }
      }));
      return;
    }

    setPartOverrides((current) => ({
      ...current,
      [materialTarget]: {
        ...(current[materialTarget] || getDefaultPartOverride(materialTarget)),
        materialKey
      }
    }));

    if (materialTarget === "tabletop") {
      setConfig((current) => normalizeConfig({ ...current, material: materialKey }));
    }
  }

  function handleSaveDraft() {
    const nextDraft = createDraft(config, sketchSnapshot, locale);
    setDrafts((current) => [nextDraft, ...current].slice(0, 8));
    setStatus(t(locale, "status.draftSaved", { label: nextDraft.label }));
    setDraftDrawerOpen(true);
  }

  function handleSelectDraft(draft) {
    const nextConfig = normalizeConfig({ ...draft.config, patternMode: "metal" });
    setConfig(nextConfig);
    setSketchSnapshot((current) => ({
      ...EMPTY_SKETCH,
      version: current.version + 1,
      hasContent: Boolean(draft.sketchAsset?.hasContent),
      maskDataUrl: draft.sketchAsset?.maskDataUrl || "",
      hullNormalized: draft.sketchAsset?.hullNormalized || []
    }));
    setAssistantUnderstanding(EMPTY_UNDERSTANDING);
    setDesignVariants([]);
    setActiveVariantId("");
    setPhase("configurator");
    setAiNote("");
    setStatus(t(locale, "status.draftRestored", { label: draft.label }));
    setDraftDrawerOpen(false);
  }

  function handleSketchChange(snapshot) {
    setSketchSnapshot((current) => ({
      ...EMPTY_SKETCH,
      ...snapshot,
      version: current.version + 1
    }));

    if (!snapshot.hasContent) {
      setSketchState({
        label: t(locale, "status.sketchIdle"),
        detail: ""
      });
      setAssistantUnderstanding((current) =>
        current.summary ? current : EMPTY_UNDERSTANDING
      );
      setConfig((current) =>
        current.silhouetteMode === "sketch"
          ? normalizeConfig({ ...current, silhouetteMode: "shape" })
          : current
      );
      return;
    }

    setSketchState({
      label:
        locale === "zh"
          ? `已识别 ${snapshot.hullPointCount || 0} 个轮廓控制点`
          : `${snapshot.hullPointCount || 0} outline control points recognized`,
      detail:
        locale === "zh"
          ? `原始 ${snapshot.pointCount || 0} 个笔触点正在重建桌面边界，桌腿会跟随新边界重新落位。`
          : `${snapshot.pointCount || 0} raw stroke points are rebuilding the tabletop boundary; legs follow the new edge.`
    });
    setConfig((current) =>
      normalizeConfig({
        ...current,
        ...buildSketchSilhouettePatch(snapshot, current)
      })
    );
  }

  async function handleGenerateDirections(prompt) {
    const trimmed = prompt.trim();

    if (!trimmed && !sketchSnapshot.hasContent) {
      setStatus(t(locale, "status.needBrief"));
      return;
    }

    setBusy(true);
    setStatus(t(locale, "status.generating"));

    try {
      if (!serverState.ready) {
        const localResult = buildLocalDirectionResult(
          trimmed,
          configRef.current,
          sketchSnapshot,
          designLocks,
          locale
        );
        applyAssistantResult(localResult);
        setStatus(t(locale, "status.localDirections"));
        if (phase !== "configurator") {
          setPhase("configurator");
        }
        return;
      }

      const result = await requestAiDesign(
          trimmed ||
          "Use the current sketch and configuration to generate the next best three table directions.",
        configRef.current,
        {
          designContext: buildDesignContext(sketchSnapshot),
          sketchDataUrl: sketchSnapshot.hasContent ? sketchSnapshot.dataUrl : "",
          sketchMetadata: buildSketchMetadata(sketchSnapshot),
          locks: designLocks,
          requestMode: "directions"
        }
      );

      applyAssistantResult(result);
      setStatus(t(locale, "status.directionsReady"));
      if (phase !== "configurator") {
        setPhase("configurator");
      }
    } catch (error) {
      const localResult = buildLocalDirectionResult(
        trimmed,
        configRef.current,
        sketchSnapshot,
        designLocks,
        locale
      );
      applyAssistantResult(localResult);
      setStatus(t(locale, "status.localDirections"));
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyLocalEdit(prompt, editIntent) {
    const instruction = String(editIntent?.instruction || "").trim();

    if (!instruction) {
      setStatus(t(locale, "status.needLocalEdit"));
      return;
    }

    setBusy(true);
    setStatus(t(locale, "status.localApplying"));

    try {
      const scopedResult = buildScopedLocalEditResult(
        configRef.current,
        editIntent,
        sketchSnapshot,
        designLocks,
        locale
      );

      if (hasConfigDelta(scopedResult, configRef.current) || !serverState.ready) {
        applyAssistantResult(scopedResult);
        setStatus(t(locale, "status.localApplied"));
        return;
      }

      const localResult = buildLocalDirectionResult(
        instruction,
        configRef.current,
        sketchSnapshot,
        designLocks,
        locale
      );
      applyAssistantResult(localResult);
      setStatus(t(locale, "status.localApplied"));
    } finally {
      setBusy(false);
    }
  }

  function handleApplyVariant(variant) {
    setConfig(normalizeConfig({ ...variant.config, patternMode: "metal" }));
    setActiveVariantId(variant.id);
    setAiNote(variant.rationale || variant.summary);
    setStatus(`${variant.title} is now active.`);
  }

  function handleToggleLock(lockKey) {
    setDesignLocks((current) => {
      const next = {
        ...current,
        [lockKey]: !current[lockKey]
      };
      setStatus(buildLockSummary(next, locale));
      return next;
    });
  }

  function handleSelectPart(part) {
    if (!part) {
      setSelectedPart(null);
      return;
    }

    setSelectedPart(part);
    setPartOverrides((current) =>
      current[part.id]
        ? current
        : {
            ...current,
            [part.id]: getDefaultPartOverride(part.kind)
          }
    );
  }

  function handlePartOverrideChange(partId, patch) {
    setPartOverrides((current) => ({
      ...current,
      [partId]: {
        ...(current[partId] || getDefaultPartOverride(selectedPart?.kind || "leg")),
        ...patch
      }
    }));
  }

  function handleApplyPartInstruction(instruction, sketchSummary) {
    if (!selectedPart) {
      return;
    }

    const nextText = String(instruction || "").trim().toLowerCase();
    const tableShapePatch = {};
    const currentOverride =
      partOverrides[selectedPart.id] || getDefaultPartOverride(selectedPart.kind);
    const nextPatch = {
      materialKey: inferPartMaterialKey(nextText, currentOverride.materialKey),
      tint: inferTintFromText(nextText, currentOverride.tint || "#d9381e")
    };
    const hasSketch = Boolean(sketchSummary?.hasSketch);
    const coverage = Number(sketchSummary?.coverage || 0);
    const aspectRatio = Number(sketchSummary?.aspectRatio || 1);

    const tabletopRoundKeywords = ["round", "circle", "圆", "圆形", "圆桌"];
    const tabletopOvalKeywords = ["oval", "ellipse", "椭圆", "椭圆形"];
    const tabletopRectKeywords = ["rectangle", "rect", "矩形", "长方形", "方形", "方桌"];
    const tabletopSquareKeywords = ["square", "正方形"];
    const thinKeywords = ["thin", "thinner", "slim", "light", "薄", "更薄", "轻薄"];
    const thickKeywords = ["thick", "thicker", "bold", "heavy", "厚", "更厚", "加厚"];
    const denseKeywords = ["dense", "finer", "fine", "tight", "compact", "密", "更密", "密一点", "细密"];
    const coarseKeywords = ["coarse", "larger", "big", "open", "loose", "稀", "更稀", "疏", "更大模块"];
    const tallKeywords = ["tall", "taller", "long", "longer", "高", "更高", "长", "更长"];
    const shortKeywords = ["short", "shorter", "lower", "矮", "更矮", "低", "更低", "短", "更短"];
    const wideKeywords = ["thick", "thicker", "wide", "wider", "strong", "粗", "更粗", "宽", "更宽"];
    const slimKeywords = ["slim", "slimmer", "narrow", "narrower", "细", "更细", "窄", "更窄", "纤细"];

    if (!nextText && !hasSketch) {
      setStatus(t(locale, "status.partNeedInput"));
      return;
    }

    if (selectedPart.kind === "tabletop") {
      if (includesAny(nextText, tabletopRoundKeywords)) {
        tableShapePatch.shape = "round";
        tableShapePatch.silhouetteMode = "shape";
      } else if (includesAny(nextText, tabletopOvalKeywords)) {
        tableShapePatch.shape = "oval";
        tableShapePatch.silhouetteMode = "shape";
      } else if (
        includesAny(nextText, tabletopRectKeywords) ||
        includesAny(nextText, tabletopSquareKeywords)
      ) {
        tableShapePatch.shape = "rectangle";
        tableShapePatch.silhouetteMode = "shape";

        if (includesAny(nextText, tabletopSquareKeywords)) {
          const side = Number(
            (((configRef.current.width || 1) + (configRef.current.depth || 1)) / 2).toFixed(2)
          );
          tableShapePatch.width = side;
          tableShapePatch.depth = side;
        }
      }

      if (includesAny(nextText, thinKeywords)) {
        nextPatch.thicknessScale = clampPartValue(currentOverride.thicknessScale - 0.18, 0.4, 1.6);
      }
      if (includesAny(nextText, thickKeywords)) {
        nextPatch.thicknessScale = clampPartValue(currentOverride.thicknessScale + 0.18, 0.4, 1.6);
      }
      if (includesAny(nextText, denseKeywords)) {
        nextPatch.moduleSizeScale = clampPartValue(currentOverride.moduleSizeScale - 0.2, 0.55, 1.6);
      }
      if (includesAny(nextText, coarseKeywords)) {
        nextPatch.moduleSizeScale = clampPartValue(currentOverride.moduleSizeScale + 0.2, 0.55, 1.6);
      }

      if (hasSketch) {
        nextPatch.moduleSizeScale = clampPartValue(
          currentOverride.moduleSizeScale * (coverage > 0.2 ? 0.76 : 1.08),
          0.55,
          1.6
        );
        nextPatch.thicknessScale = clampPartValue(
          currentOverride.thicknessScale * (aspectRatio > 1.35 ? 0.9 : 1.14),
          0.4,
          1.6
        );
      }

      if (
        !("moduleSizeScale" in nextPatch) &&
        !("thicknessScale" in nextPatch) &&
        nextText &&
        !Object.keys(tableShapePatch).length
      ) {
        nextPatch.moduleSizeScale = clampPartValue(currentOverride.moduleSizeScale * 0.88, 0.55, 1.6);
      }
    } else {
      if (includesAny(nextText, tallKeywords)) {
        nextPatch.lengthScale = clampPartValue(currentOverride.lengthScale + 0.16, 0.55, 1.7);
      }
      if (includesAny(nextText, shortKeywords)) {
        nextPatch.lengthScale = clampPartValue(currentOverride.lengthScale - 0.16, 0.55, 1.7);
      }
      if (includesAny(nextText, wideKeywords)) {
        nextPatch.widthScale = clampPartValue(currentOverride.widthScale + 0.18, 0.45, 1.9);
        nextPatch.depthScale = clampPartValue(currentOverride.depthScale + 0.18, 0.45, 1.9);
      }
      if (includesAny(nextText, slimKeywords)) {
        nextPatch.widthScale = clampPartValue(currentOverride.widthScale - 0.16, 0.45, 1.9);
        nextPatch.depthScale = clampPartValue(currentOverride.depthScale - 0.16, 0.45, 1.9);
      }

      if (hasSketch) {
        nextPatch.lengthScale = clampPartValue(
          currentOverride.lengthScale * (aspectRatio < 0.9 ? 1.18 : 0.96),
          0.55,
          1.7
        );
        nextPatch.widthScale = clampPartValue(
          currentOverride.widthScale * (coverage > 0.18 ? 1.2 : 0.94),
          0.45,
          1.9
        );
        nextPatch.depthScale = clampPartValue(
          currentOverride.depthScale * (aspectRatio > 1.2 ? 0.92 : 1.12),
          0.45,
          1.9
        );
      }

      if (
        !("lengthScale" in nextPatch) &&
        !("widthScale" in nextPatch) &&
        !("depthScale" in nextPatch) &&
        nextText
      ) {
        nextPatch.lengthScale = clampPartValue(currentOverride.lengthScale * 1.08, 0.55, 1.7);
      }
    }

    if (Object.keys(tableShapePatch).length) {
      setConfig((current) =>
        normalizeConfig({
          ...current,
          ...tableShapePatch,
          patternMode: "metal"
        })
      );
    }

    handlePartOverrideChange(selectedPart.id, nextPatch);
    setStatus(t(locale, "status.partUpdated", { label: selectedPart.label }));
  }

  const galleryItems = useMemo(() => [
    ...galleryUploads,
    ...GALLERY_SEEDS
  ], [galleryUploads]);

  const sceneTheme =
    SCENARIO_PRESETS[config.scenario] ?? SCENARIO_PRESETS.daylight;
  const sketchMaskDataUrl = "";
  const sketchOutline = sketchSnapshot.hullNormalized || [];
  const tabletopTint =
    partOverrides.tabletop?.tint || getDefaultPartOverride("tabletop").tint;
  const frameTint = partOverrides.frame?.tint || getDefaultPartOverride("frame").tint;
  const moduleTint =
    partOverrides.modules?.tint || getDefaultPartOverride("modules").tint;
  const legTint =
    partOverrides.legs?.tint ||
    partOverrides["leg-1"]?.tint ||
    getDefaultPartOverride("leg").tint;
  const currentTargetMaterial = getMaterialTargetValue(materialTarget);
  const studioCopy = getStudioCopy(locale);
  const sizeLabel = `${config.width.toFixed(2)} x ${config.depth.toFixed(2)} x ${config.height.toFixed(2)} m`;

  return (
    <main
      className={`app phase-${phase}`}
      style={{
        "--scene-background": sceneTheme.background,
        "--panel-line": config.scenario === "late_night" ? "#40342d" : "#d9d0c4"
      }}
    >
      {phase === "configurator" ? (
        <div
          className={`app__workspace ${phase === "configurator" ? "is-active" : ""} ${
            controlsCollapsed ? "is-controls-collapsed" : ""
          }`}
        >
          <aside className="workspace__rail">
            <section className="workspace__controls">
              <ControlPanel
                config={config}
                draftsCount={drafts.length}
                legTint={legTint}
                locale={locale}
                onConfigChange={updateConfig}
                onGoGallery={handleGoGallery}
                onGoHome={handleGoHome}
                onGoProfile={handleGoProfile}
                onGoQuote={handleGoQuote}
                onFrameTintChange={handleFrameTintChange}
                onLegTintChange={handleLegTintChange}
                onLocaleChange={setLocale}
                onMaterialTargetChange={setMaterialTarget}
                onMaterialTargetMaterialChange={handleMaterialTargetMaterialChange}
                onModuleTintChange={handleModuleTintChange}
                onOpenDrafts={() => setDraftDrawerOpen(true)}
                onSaveDraft={handleSaveDraft}
                onTabletopTintChange={handleTabletopTintChange}
                currentTargetMaterial={currentTargetMaterial}
                frameTint={frameTint}
                materialTarget={materialTarget}
                sketchHasContent={sketchSnapshot.hasContent}
                moduleTint={moduleTint}
                tabletopTint={tabletopTint}
              />
            </section>
          </aside>
          <button
            aria-expanded={!controlsCollapsed}
            className="controls-toggle workspace__rail-toggle"
            onClick={() => setControlsCollapsed((current) => !current)}
            type="button"
          >
            {controlsCollapsed ? ">>" : "<<"}
          </button>

          <section className="workspace__pane workspace__pane--preview">
            {phase === "configurator" ? (
              <div className="preview-shell">
                <header className="preview-shell__header">
                  <div className="preview-shell__copy">
                    <BrandLogo className="brand-lockup--workspace" label="Table Generator" compact />
                    <p className="panel__label">{studioCopy.eyebrow}</p>
                    <h1 className="panel__title">{studioCopy.title}</h1>
                    <p className="panel__lead">{studioCopy.note}</p>
                  </div>

                  <div className="preview-shell__chips">
                    <span className="status-chip is-ready">{sizeLabel}</span>
                    <span className="status-chip">
                      {getLocalizedOptionLabel(locale, "shape", config.shape)}
                    </span>
                    <span className="status-chip">
                      {getLocalizedOptionLabel(locale, "material", config.material)}
                    </span>
                    <span className={`network-chip ${serverState.ready ? "is-ready" : "is-offline"}`}>
                      <span className="network-chip__dot" />
                      {serverState.ready
                        ? locale === "zh"
                          ? `${serverState.providerLabel} 在线`
                          : `${serverState.providerLabel} Online`
                        : locale === "zh"
                          ? "AI 离线"
                          : "AI Offline"}
                    </span>
                  </div>
                </header>

                <div className="design-board">
                  <section className="design-board__sketch">
                    <div className="design-board__head">
                      <div>
                        <p className="panel__label">{studioCopy.sketch}</p>
                        <h2 className="panel__mini-title">{studioCopy.sketchDetail}</h2>
                      </div>
                    </div>
                    <div className="design-board__body">
                      <div className="sketch-board__underlay">
                        <TableViewport
                          config={config}
                          ghPreviewMesh={null}
                          interactive={false}
                          patternAsset={null}
                          phase="configurator"
                          partOverrides={partOverrides}
                          surfaceFill={sketchFill}
                          sketchMaskDataUrl={sketchMaskDataUrl}
                          sketchOutline={sketchOutline}
                        />
                      </div>
                      <div className="sketch-board__pad">
                        <SketchPad
                          fillStyle={sketchFill}
                          locale={locale}
                          onFillStyleChange={setSketchFill}
                          onSketchChange={handleSketchChange}
                          syncDetail={sketchState.detail}
                          syncLabel={sketchState.label}
                          transparentSurface
                        />
                      </div>
                    </div>
                  </section>

                  <section className="design-board__render">
                    <div className="design-board__head">
                      <div>
                        <p className="panel__label">{studioCopy.render}</p>
                        <h2 className="panel__mini-title">{studioCopy.renderDetail}</h2>
                      </div>
                    </div>

                    <div className="design-board__body">
                      <div className="render-stage">
                        <TableViewport
                          config={config}
                          ghPreviewMesh={null}
                          onSelectPart={handleSelectPart}
      patternAsset={null}
      phase="configurator"
      ref={galleryCaptureRef}
      partOverrides={partOverrides}
      selectedPartId={selectedPart?.id || ""}
      surfaceFill={sketchFill}
                          sketchMaskDataUrl=""
                          sketchOutline={sketchOutline}
                        />
                        <PartEditorOverlay
                          locale={locale}
                          onApplyInstruction={handleApplyPartInstruction}
                          onClose={() => setSelectedPart(null)}
                          onOverrideChange={(patch) =>
                            selectedPart ? handlePartOverrideChange(selectedPart.id, patch) : null
                          }
                          partOverride={
                            selectedPart
                              ? partOverrides[selectedPart.id] ||
                                getDefaultPartOverride(selectedPart.kind)
                              : getDefaultPartOverride("tabletop")
                          }
                          selectedPart={selectedPart}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="preview-stage">
                <TableViewport
                  config={config}
                  ghPreviewMesh={null}
                  interactive={false}
                  patternAsset={null}
                  phase={phase}
                  partOverrides={partOverrides}
                  surfaceFill={sketchFill}
                  sketchMaskDataUrl={sketchMaskDataUrl}
                  sketchOutline={sketchOutline}
                />
              </div>
            )}
          </section>
        </div>
      ) : null}

      <GalleryPage
        cart={cart}
        drafts={drafts}
        favorites={favorites}
        galleryItems={galleryItems}
        locale={locale}
        onAddToCart={handleAddToCart}
        onBack={() => setPhase("configurator")}
        onHome={handleGoHome}
        onOpenProfile={handleGoProfile}
        onToggleFavorite={handleToggleFavorite}
        onUploadCurrentDesign={handleUploadCurrentDesignToGallery}
        onUploadDraft={handleUploadDraftToGallery}
        visible={phase === "gallery"}
      />

      <ProfilePage
        cart={cart}
        favorites={favorites}
        galleryItems={galleryItems}
        locale={locale}
        onAddToCart={handleAddToCart}
        onBack={() => setPhase("configurator")}
        onHome={handleGoHome}
        onOpenGallery={handleGoGallery}
        onRemoveCartItem={handleRemoveCartItem}
        onSaveProfile={handleSaveProfile}
        onSubmitTradeIn={handleSubmitTradeIn}
        onToggleFavorite={handleToggleFavorite}
        onUpdateCartQty={handleUpdateCartQty}
        profile={profile}
        tradeInLeads={tradeInLeads}
        visible={phase === "profile"}
      />

      <QuotePage
        config={config}
        draftsCount={drafts.length}
        ghPreviewMesh={null}
        locale={locale}
        onBack={() => setPhase("configurator")}
        onHome={handleGoHome}
        onOpenDrafts={() => setDraftDrawerOpen(true)}
        partOverrides={partOverrides}
        patternAsset={null}
        surfaceFill={sketchFill}
        sketchMaskDataUrl={sketchMaskDataUrl}
        sketchOutline={sketchOutline}
        visible={phase === "quote"}
      />

      <LandingView
        locale={locale}
        onEnter={handleEnter}
        onLocaleChange={setLocale}
        serverProviderLabel={serverState.providerLabel}
        serverReady={serverState.ready}
        visible={phase === "landing"}
      />

      <ChatDock
        activeVariantId={activeVariantId}
        aiNote={aiNote}
        designLocks={designLocks}
        hasSketch={sketchSnapshot.hasContent}
        isBusy={busy}
        locale={locale}
        onApplyLocalEdit={handleApplyLocalEdit}
        onApplyVariant={handleApplyVariant}
        onGenerateDirections={handleGenerateDirections}
        onToggleLock={handleToggleLock}
        serverModel={serverState.model}
        serverProviderLabel={serverState.providerLabel}
        serverReady={serverState.ready}
        status={status}
        understanding={assistantUnderstanding}
        variants={designVariants}
        visible={phase === "configurator"}
      />

      <DraftDrawer
        drafts={drafts}
        isOpen={draftDrawerOpen}
        locale={locale}
        onClose={() => setDraftDrawerOpen(false)}
        onSelectDraft={handleSelectDraft}
        onUploadDraftToGallery={handleUploadDraftToGallery}
      />
    </main>
  );
}

