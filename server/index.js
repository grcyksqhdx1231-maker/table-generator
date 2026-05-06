import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const bridgeDir = path.join(rootDir, "bridge");
const ghRequestPath = path.join(bridgeDir, "gh-request.json");
const ghResponsePath = path.join(bridgeDir, "gh-response.json");

const app = express();
const port = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "20mb" }));

async function ensureBridgeDir() {
  await fs.mkdir(bridgeDir, { recursive: true });
}

function metersToMillimeters(value, fallback) {
  const numeric = Number(value);
  return Math.round((Number.isFinite(numeric) ? numeric : fallback) * 1000);
}

function buildGhPayload(config = {}) {
  const moduleEdge = metersToMillimeters(config.moduleSize, 0.16);
  const thicknessScale = Number(config.moduleThicknessScale);

  return {
    table: {
      width: metersToMillimeters(config.width, 0.7),
      depth: metersToMillimeters(config.depth, 0.5),
      height: metersToMillimeters(config.height, 0.72),
      leg_count: Math.max(3, Math.min(8, Math.round(Number(config.legCount) || 3))),
      corner_radius: Math.round(Math.max(40, moduleEdge * 0.7))
    },
    module: {
      edge: Math.max(60, Math.min(260, moduleEdge)),
      thickness: Math.max(
        4,
        Math.min(28, Math.round(8 * (Number.isFinite(thicknessScale) ? thicknessScale : 1)))
      ),
      collar_depth: Math.max(45, Math.min(220, Math.round(moduleEdge * 0.55)))
    },
    structure: {
      core_radius: Math.max(40, Math.min(180, Math.round(moduleEdge * 0.5))),
      core_type: "star_rib",
      joint_strategy: "hybrid_hidden",
      support_spread: 0.78
    },
    material: {
      name: "rpetg",
      finish: "matte_warm_light"
    }
  };
}

async function readJsonFile(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text);
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitForGhResponse(requestId, timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const payload = await readJsonFile(ghResponsePath);

      if (payload?.requestId === requestId) {
        return payload;
      }
    } catch {
      // Grasshopper has not written a response yet.
    }

    await delay(500);
  }

  return null;
}

const VALID_SCENARIOS = new Set(["daylight", "late_night", "void"]);
const VALID_SHAPES = new Set(["rectangle", "round", "oval"]);
const VALID_SILHOUETTE_MODES = new Set(["shape", "sketch"]);
const VALID_PATTERN_MODES = new Set(["metal"]);
const VALID_LEG_SHAPES = new Set(["round", "square", "blade"]);
const VALID_MATERIALS = new Set([
  "light_wood",
  "dark_walnut",
  "rough_stone",
  "metal"
]);
const VALID_LOCK_KEYS = new Set([
  "shape",
  "dimensions",
  "material",
  "surface",
  "legs"
]);

const CONFIG_PROPERTIES = {
  scenario: {
    type: "string",
    enum: [...VALID_SCENARIOS]
  },
  shape: {
    type: "string",
    enum: [...VALID_SHAPES]
  },
  silhouetteMode: {
    type: "string",
    enum: [...VALID_SILHOUETTE_MODES]
  },
  width: {
    type: "number",
    minimum: 0.65,
    maximum: 2.4
  },
  depth: {
    type: "number",
    minimum: 0.65,
    maximum: 2.4
  },
  height: {
    type: "number",
    minimum: 0.56,
    maximum: 1.12
  },
  material: {
    type: "string",
    enum: [...VALID_MATERIALS]
  },
  patternMode: {
    type: "string",
    enum: [...VALID_PATTERN_MODES]
  },
  moduleSize: {
    type: "number",
    minimum: 0.04,
    maximum: 0.28
  },
  moduleGap: {
    type: "number",
    minimum: 0,
    maximum: 0.04
  },
  moduleThicknessScale: {
    type: "number",
    minimum: 0.18,
    maximum: 1.2
  },
  legShape: {
    type: "string",
    enum: [...VALID_LEG_SHAPES]
  },
  legLength: {
    type: "number",
    minimum: 0.42,
    maximum: 1.02
  },
  legWidth: {
    type: "number",
    minimum: 0.04,
    maximum: 0.28
  },
  legDepth: {
    type: "number",
    minimum: 0.04,
    maximum: 0.28
  },
  legCount: {
    type: "integer",
    minimum: 3,
    maximum: 8
  },
  rationale: {
    type: "string",
    maxLength: 180
  }
};

const UNDERSTANDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      maxLength: 220
    },
    intent: {
      type: "string",
      maxLength: 120
    },
    constraints: {
      type: "string",
      maxLength: 160
    },
    sketchInfluence: {
      type: "string",
      maxLength: 140
    },
    nextQuestion: {
      type: "string",
      maxLength: 120
    }
  },
  required: ["summary", "intent", "constraints", "sketchInfluence", "nextQuestion"]
};

const VARIANT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      maxLength: 36
    },
    title: {
      type: "string",
      maxLength: 40
    },
    emphasis: {
      type: "string",
      maxLength: 72
    },
    summary: {
      type: "string",
      maxLength: 160
    },
    ...CONFIG_PROPERTIES
  },
  required: [
    "id",
    "title",
    "emphasis",
    "summary",
    "scenario",
    "shape",
    "silhouetteMode",
    "width",
    "depth",
    "height",
    "material",
    "patternMode",
    "moduleSize",
    "moduleGap",
    "moduleThicknessScale",
    "legShape",
    "legLength",
    "legWidth",
    "legDepth",
    "legCount",
    "rationale"
  ]
};

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...CONFIG_PROPERTIES,
    understanding: UNDERSTANDING_SCHEMA,
    variants: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: VARIANT_SCHEMA
    }
  },
  required: [
    "scenario",
    "shape",
    "silhouetteMode",
    "width",
    "depth",
    "height",
    "material",
    "patternMode",
    "moduleSize",
    "moduleGap",
    "moduleThicknessScale",
    "legShape",
    "legLength",
    "legWidth",
    "legDepth",
    "legCount",
    "rationale",
    "understanding",
    "variants"
  ]
};

const PROVIDER_PRESETS = {
  openai: {
    key: "openai",
    label: "OpenAI",
    apiKeyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    baseUrlEnv: "OPENAI_BASE_URL",
    defaultModel: "gpt-5-mini",
    defaultBaseUrl: "",
    mode: "responses_schema",
    supportsVision: true
  },
  gemini: {
    key: "gemini",
    label: "Gemini",
    apiKeyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    imageModelEnv: "GEMINI_IMAGE_MODEL",
    defaultModel: "gemini-2.5-flash",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultOpenAIBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultImageModel: "gemini-2.5-flash-image-preview",
    mode: "gemini_native",
    supportsVision: true,
    supportsImageGeneration: true
  },
  deepseek: {
    key: "deepseek",
    label: "DeepSeek",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    baseUrlEnv: "DEEPSEEK_BASE_URL",
    defaultModel: "deepseek-chat",
    defaultBaseUrl: "https://api.deepseek.com",
    mode: "chat_json",
    supportsVision: false
  },
  doubao: {
    key: "doubao",
    label: "Doubao / Ark",
    apiKeyEnv: "DOUBAO_API_KEY",
    modelEnv: "DOUBAO_MODEL",
    baseUrlEnv: "DOUBAO_BASE_URL",
    defaultModel: "",
    defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    mode: "chat_json",
    supportsVision: false
  }
};

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function stripTrailingSlash(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveRootPath(targetPath, fallbackRelativePath) {
  const resolved = String(targetPath || "").trim() || fallbackRelativePath;
  return path.isAbsolute(resolved) ? resolved : path.resolve(rootDir, resolved);
}

function getQuoteSceneOutputDir() {
  return resolveRootPath(readEnv("QUOTE_SCENE_OUTPUT_DIR"), "public/generated-scenes");
}

function getQuoteScenePublicBase() {
  const outputDir = getQuoteSceneOutputDir();
  const publicDir = path.join(rootDir, "public");
  const relativePath = path.relative(publicDir, outputDir).replace(/\\/g, "/");

  if (relativePath && !relativePath.startsWith("..")) {
    return `/${relativePath}`;
  }

  return "/generated-scenes";
}

async function ensureQuoteSceneOutputDir() {
  await fs.mkdir(getQuoteSceneOutputDir(), { recursive: true });
}

app.use(getQuoteScenePublicBase(), express.static(getQuoteSceneOutputDir()));

function clampDimension(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 1.2;
  }

  return Math.max(0.65, Math.min(2.4, Number(numeric.toFixed(2))));
}

function clampHeight(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 0.76;
  }

  return Math.max(0.56, Math.min(1.12, Number(numeric.toFixed(2))));
}

function clampLegLength(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 0.68;
  }

  return Math.max(0.42, Math.min(1.02, Number(numeric.toFixed(2))));
}

function clampLegSpan(value, fallback = 0.09) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return fallback;
  }

  return Math.max(0.04, Math.min(0.28, Number(numeric.toFixed(3))));
}

function clampLegCount(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 4;
  }

  return Math.max(3, Math.min(8, Math.round(numeric)));
}

function clampModuleSize(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 0.16;
  }

  return Math.max(0.04, Math.min(0.28, Number(numeric.toFixed(3))));
}

function clampModuleGap(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 0.012;
  }

  return Math.max(0, Math.min(0.04, Number(numeric.toFixed(3))));
}

function clampModuleThicknessScale(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 1;
  }

  return Math.max(0.18, Math.min(1.2, Number(numeric.toFixed(2))));
}

function getProviderConfig() {
  const providerKey =
    readEnv("AI_PROVIDER").toLowerCase() || (readEnv("GEMINI_API_KEY") ? "gemini" : "openai");
  const preset = PROVIDER_PRESETS[providerKey] ?? PROVIDER_PRESETS.openai;

  if (preset.key === "gemini") {
    const transport =
      readEnv("GEMINI_TRANSPORT").toLowerCase() ||
      (readEnv("GEMINI_OPENAI_BASE_URL") ? "openai_compat" : "native");
    const apiKey = readEnv("AI_API_KEY") || readEnv(preset.apiKeyEnv);
    const model = readEnv("AI_MODEL") || readEnv(preset.modelEnv) || preset.defaultModel;
    const nativeBaseURL = stripTrailingSlash(
      (transport === "native" ? readEnv("AI_BASE_URL") : "") ||
        readEnv("GEMINI_BASE_URL") ||
        preset.defaultBaseUrl
    );
    const openAIBaseURL = stripTrailingSlash(
      (transport === "openai_compat" ? readEnv("AI_BASE_URL") : "") ||
        readEnv("GEMINI_OPENAI_BASE_URL") ||
        preset.defaultOpenAIBaseUrl
    );
    const imageModel =
      readEnv(preset.imageModelEnv) || readEnv("GEMINI_IMAGE_MODEL") || preset.defaultImageModel;
    const imageBaseURL = stripTrailingSlash(
      readEnv("GEMINI_IMAGE_BASE_URL") || readEnv("GEMINI_BASE_URL") || nativeBaseURL
    );

    return {
      ...preset,
      apiKey,
      model,
      transport: transport === "openai_compat" ? "openai_compat" : "native",
      nativeBaseURL: nativeBaseURL || preset.defaultBaseUrl,
      baseURL:
        transport === "openai_compat"
          ? openAIBaseURL || preset.defaultOpenAIBaseUrl
          : undefined,
      imageModel,
      imageBaseURL: imageBaseURL || nativeBaseURL || preset.defaultBaseUrl,
      configured: Boolean(apiKey && model),
      missing: [
        !apiKey ? preset.apiKeyEnv : null,
        !model ? preset.modelEnv : null
      ].filter(Boolean)
    };
  }

  const apiKey = readEnv("AI_API_KEY") || readEnv(preset.apiKeyEnv);
  const model = readEnv("AI_MODEL") || readEnv(preset.modelEnv) || preset.defaultModel;
  const baseURL =
    readEnv("AI_BASE_URL") || readEnv(preset.baseUrlEnv) || preset.defaultBaseUrl;

  return {
    ...preset,
    apiKey,
    model,
    baseURL: baseURL || undefined,
    configured: Boolean(apiKey && model),
    missing: [
      !apiKey ? preset.apiKeyEnv : null,
      !model ? preset.modelEnv : null
    ].filter(Boolean)
  };
}

function getClient(provider) {
  if (!provider.configured || (provider.key === "gemini" && provider.transport === "native")) {
    return null;
  }

  return new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseURL
  });
}

function dataUrlToInlineData(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2]
  };
}

function getGeminiApiUrl(baseURL, model, apiKey) {
  const resolvedBaseUrl =
    stripTrailingSlash(baseURL) || PROVIDER_PRESETS.gemini.defaultBaseUrl;
  return `${resolvedBaseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function getGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (text) {
    return text;
  }

  const blockReason = payload?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini blocked the request: ${blockReason}.`);
  }

  throw new Error("Gemini returned no text content.");
}

function getGeminiImagePart(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part?.inlineData?.data && part?.inlineData?.mimeType) {
      return part.inlineData;
    }
  }

  const blockReason = payload?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini blocked the image request: ${blockReason}.`);
  }

  throw new Error("Gemini returned no image payload.");
}

async function requestGeminiContent({
  apiKey,
  baseURL,
  model,
  systemPrompt = "",
  userText,
  inlineInputs = [],
  temperature = 0.45,
  responseMimeType = "",
  responseModalities = null
}) {
  const parts = [];

  if (userText) {
    parts.push({
      text: userText
    });
  }

  inlineInputs.filter(Boolean).forEach((input) => {
    if (!input?.mimeType || !input?.data) {
      return;
    }

    parts.push({
      inlineData: {
        mimeType: input.mimeType,
        data: input.data
      }
    });
  });

  const body = {
    contents: [
      {
        role: "user",
        parts
      }
    ],
    generationConfig: {
      temperature
    }
  };

  if (systemPrompt) {
    body.systemInstruction = {
      parts: [
        {
          text: systemPrompt
        }
      ]
    };
  }

  if (responseMimeType) {
    body.generationConfig.responseMimeType = responseMimeType;
  }

  if (Array.isArray(responseModalities) && responseModalities.length) {
    body.generationConfig.responseModalities = responseModalities;
  }

  const geminiResponse = await fetch(getGeminiApiUrl(baseURL, model, apiKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const rawText = await geminiResponse.text();
  let payload = null;

  try {
    payload = JSON.parse(rawText);
  } catch {
    payload = null;
  }

  if (!geminiResponse.ok) {
    const message =
      payload?.error?.message ||
      rawText ||
      `Gemini request failed with status ${geminiResponse.status}.`;
    throw new Error(message);
  }

  return payload;
}

function getSystemPrompt(mode, hasSketch = false) {
  const shared = [
    "You are a furniture configuration agent for a consumer-facing triangle-module table customizer.",
    "Always combine the user's written prompt, currentConfig, designContext, locks, optional sketchMetadata, and optional editIntent into one coherent answer.",
    hasSketch
      ? "When a sketch is attached, treat it as a top-view silhouette reference and fuse it with the text prompt instead of choosing only one source."
      : "If no sketch is attached, infer the design from text and currentConfig.",
    "The tabletop is always assembled from equilateral triangle modules.",
    "The main configuration should be the safest balanced direction.",
    "Also return an understanding object that briefly restates the user's intent, constraints, sketch influence, and the next best clarification question.",
    "Also return exactly three variants named like consumer-friendly directions, for example Balanced, Sculptural, and Everyday.",
    "Respect locks. If locks.shape is true, keep shape and silhouetteMode from currentConfig. If locks.dimensions is true, keep width, depth, height. If locks.material is true, keep material. If locks.surface is true, keep patternMode, moduleSize, moduleGap, and moduleThicknessScale. If locks.legs is true, keep legShape, legLength, legWidth, legDepth, and legCount.",
    "If editIntent is present, keep untouched areas stable and only push the requested local change as far as possible inside the available controls.",
    "Stay inside the allowed numeric ranges and keep rationale concise."
  ];

  if (mode === "responses_schema") {
    return shared.join(" ");
  }

  return [
    ...shared,
    "Return JSON only.",
    "Use this top-level shape exactly:",
    '{"scenario":"daylight|late_night|void","shape":"rectangle|round|oval","silhouetteMode":"shape|sketch","width":1.52,"depth":0.84,"height":0.76,"material":"light_wood|dark_walnut|rough_stone|metal","patternMode":"metal|uploaded","moduleSize":0.12,"moduleGap":0.01,"moduleThicknessScale":0.72,"legShape":"round|square|blade","legLength":0.68,"legWidth":0.09,"legDepth":0.09,"legCount":4,"rationale":"short explanation","understanding":{"summary":"...","intent":"...","constraints":"...","sketchInfluence":"...","nextQuestion":"..."},"variants":[{"id":"balanced","title":"Balanced Direction","emphasis":"...","summary":"...","scenario":"daylight","shape":"oval","silhouetteMode":"shape","width":1.5,"depth":0.82,"height":0.76,"material":"light_wood","patternMode":"metal","moduleSize":0.11,"moduleGap":0.008,"moduleThicknessScale":0.64,"legShape":"round","legLength":0.68,"legWidth":0.09,"legDepth":0.09,"legCount":4,"rationale":"..."},{"id":"sculptural","title":"Sculptural Direction","emphasis":"...","summary":"...","scenario":"late_night","shape":"oval","silhouetteMode":"shape","width":1.56,"depth":0.88,"height":0.78,"material":"dark_walnut","patternMode":"uploaded","moduleSize":0.13,"moduleGap":0.01,"moduleThicknessScale":0.78,"legShape":"blade","legLength":0.7,"legWidth":0.08,"legDepth":0.05,"legCount":4,"rationale":"..."},{"id":"everyday","title":"Everyday Direction","emphasis":"...","summary":"...","scenario":"daylight","shape":"rectangle","silhouetteMode":"shape","width":1.42,"depth":0.78,"height":0.75,"material":"light_wood","patternMode":"metal","moduleSize":0.09,"moduleGap":0.006,"moduleThicknessScale":0.52,"legShape":"square","legLength":0.67,"legWidth":0.085,"legDepth":0.085,"legCount":4,"rationale":"..."}]}'
  ].join(" ");
}

function getUserPayload(
  prompt,
  currentConfig,
  sketchMetadata,
  designContext,
  locks,
  editIntent,
  requestMode
) {
  return JSON.stringify({
    prompt,
    currentConfig,
    sketchMetadata,
    designContext,
    locks,
    editIntent,
    requestMode
  });
}

function parseJsonPayload(raw) {
  const text = String(raw || "").trim();

  if (!text) {
    throw new Error("The model returned an empty response.");
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text;
  return JSON.parse(candidate);
}

function validateLocks(locks) {
  if (!locks || typeof locks !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(locks)
      .filter(([key]) => VALID_LOCK_KEYS.has(key))
      .map(([key, value]) => [key, Boolean(value)])
  );
}

function validateConfigPayload(payload) {
  if (!VALID_SCENARIOS.has(payload?.scenario)) {
    throw new Error("The model returned an invalid scenario.");
  }

  if (!VALID_SHAPES.has(payload?.shape)) {
    throw new Error("The model returned an invalid shape.");
  }

  if (!VALID_SILHOUETTE_MODES.has(payload?.silhouetteMode)) {
    throw new Error("The model returned an invalid silhouette mode.");
  }

  if (!VALID_MATERIALS.has(payload?.material)) {
    throw new Error("The model returned an invalid material.");
  }

  if (!VALID_PATTERN_MODES.has(payload?.patternMode)) {
    throw new Error("The model returned an invalid pattern mode.");
  }

  if (!VALID_LEG_SHAPES.has(payload?.legShape)) {
    throw new Error("The model returned an invalid leg shape.");
  }

  const height = clampHeight(payload.height);
  let legLength = clampLegLength(payload.legLength);

  if (legLength > height - 0.05) {
    legLength = Math.max(0.42, Number((height - 0.05).toFixed(2)));
  }

  return {
    scenario: payload.scenario,
    shape: payload.shape,
    silhouetteMode: payload.silhouetteMode,
    width: clampDimension(payload.width),
    depth: clampDimension(payload.depth),
    height,
    material: payload.material,
    patternMode: payload.patternMode,
    moduleSize: clampModuleSize(payload.moduleSize),
    moduleGap: clampModuleGap(payload.moduleGap),
    moduleThicknessScale: clampModuleThicknessScale(payload.moduleThicknessScale),
    legShape: payload.legShape,
    legLength,
    legWidth: clampLegSpan(payload.legWidth, 0.09),
    legDepth: clampLegSpan(payload.legDepth, 0.09),
    legCount: clampLegCount(payload.legCount),
    rationale: String(payload.rationale || "").trim().slice(0, 180)
  };
}

function normalizeUnderstanding(understanding, designContext, hasSketch) {
  const fallbackSketchText = hasSketch
    ? "The sketch is shaping the silhouette and proportions."
    : "No sketch is attached, so this direction is text-led.";

  return {
    summary: String(understanding?.summary || "A balanced triangle-module table is being proposed.")
      .trim()
      .slice(0, 220),
    intent: String(understanding?.intent || "Refine the overall table character.")
      .trim()
      .slice(0, 120),
    constraints: String(
      understanding?.constraints ||
        (designContext?.hasUploadedPattern
          ? "Respect the uploaded motif and keep the table manufacturable."
          : "Keep the table manufacturable and coherent.")
    )
      .trim()
      .slice(0, 160),
    sketchInfluence: String(understanding?.sketchInfluence || fallbackSketchText)
      .trim()
      .slice(0, 140),
    nextQuestion: String(
      understanding?.nextQuestion || "Should the next pass prioritize silhouette, material, or proportions?"
    )
      .trim()
      .slice(0, 120)
  };
}

function enforceLocks(config, currentConfig, locks) {
  if (!currentConfig || !locks || typeof locks !== "object") {
    return config;
  }

  const next = { ...config };

  if (locks.shape) {
    next.shape = currentConfig.shape;
    next.silhouetteMode = currentConfig.silhouetteMode;
  }

  if (locks.dimensions) {
    next.width = clampDimension(currentConfig.width);
    next.depth = clampDimension(currentConfig.depth);
    next.height = clampHeight(currentConfig.height);
  }

  if (locks.material) {
    next.material = currentConfig.material;
  }

  if (locks.surface) {
    next.patternMode = currentConfig.patternMode;
    next.moduleSize = clampModuleSize(currentConfig.moduleSize);
    next.moduleGap = clampModuleGap(currentConfig.moduleGap);
    next.moduleThicknessScale = clampModuleThicknessScale(
      currentConfig.moduleThicknessScale
    );
  }

  if (locks.legs) {
    next.legShape = currentConfig.legShape;
    next.legLength = clampLegLength(currentConfig.legLength);
    next.legWidth = clampLegSpan(currentConfig.legWidth, 0.09);
    next.legDepth = clampLegSpan(currentConfig.legDepth, 0.09);
    next.legCount = clampLegCount(currentConfig.legCount);
  }

  if (next.legLength > next.height - 0.05) {
    next.legLength = Math.max(0.42, Number((next.height - 0.05).toFixed(2)));
  }

  return next;
}

function buildFallbackVariants(baseConfig) {
  const balanced = {
    id: "balanced",
    title: "Balanced Direction",
    emphasis: "Closest to your current intent",
    summary: "Keeps the brief grounded and easiest to refine from here.",
    ...baseConfig
  };

  const sculptural = {
    id: "sculptural",
    title: "Sculptural Direction",
    emphasis: "Pushes presence and silhouette",
    summary: "Adds more character through profile, atmosphere, and leg language.",
    ...enforceLocks(
      {
        ...baseConfig,
        scenario: baseConfig.material === "metal" ? "late_night" : baseConfig.scenario,
        shape:
          baseConfig.shape === "rectangle"
            ? "oval"
            : baseConfig.shape === "round"
              ? "oval"
              : baseConfig.shape,
        width: clampDimension(baseConfig.width + 0.08),
        depth: clampDimension(baseConfig.depth + 0.04),
        moduleSize: clampModuleSize(baseConfig.moduleSize + 0.01),
        moduleThicknessScale: clampModuleThicknessScale(
          baseConfig.moduleThicknessScale + 0.08
        ),
        legShape: baseConfig.material === "metal" ? "blade" : baseConfig.legShape,
        rationale: "Pushes the composition toward a more sculptural statement."
      },
      baseConfig,
      {}
    )
  };

  const everyday = {
    id: "everyday",
    title: "Everyday Direction",
    emphasis: "Leans practical and easy to live with",
    summary: "Makes the table easier to place, friendlier in daily use, and calmer in detail.",
    ...enforceLocks(
      {
        ...baseConfig,
        scenario: "daylight",
        shape: baseConfig.shape === "oval" ? "rectangle" : baseConfig.shape,
        width: clampDimension(Math.max(0.65, baseConfig.width - 0.06)),
        depth: clampDimension(Math.max(0.65, baseConfig.depth - 0.04)),
        moduleSize: clampModuleSize(Math.max(0.04, baseConfig.moduleSize - 0.015)),
        moduleGap: clampModuleGap(Math.max(0, baseConfig.moduleGap - 0.002)),
        moduleThicknessScale: clampModuleThicknessScale(
          Math.max(0.18, baseConfig.moduleThicknessScale - 0.12)
        ),
        legShape: baseConfig.legShape === "blade" ? "round" : baseConfig.legShape,
        rationale: "Reduces visual weight for a calmer, more everyday profile."
      },
      baseConfig,
      {}
    )
  };

  return [balanced, sculptural, everyday];
}

function validateVariant(variant, currentConfig, locks, fallback) {
  const config = enforceLocks(
    validateConfigPayload(variant),
    currentConfig,
    locks
  );

  return {
    id: String(variant?.id || fallback.id).trim().slice(0, 36) || fallback.id,
    title:
      String(variant?.title || fallback.title).trim().slice(0, 40) || fallback.title,
    emphasis:
      String(variant?.emphasis || fallback.emphasis).trim().slice(0, 72) ||
      fallback.emphasis,
    summary:
      String(variant?.summary || fallback.summary).trim().slice(0, 160) ||
      fallback.summary,
    ...config
  };
}

function validateAssistantPayload(payload, currentConfig, locks, designContext, hasSketch) {
  const baseConfig = enforceLocks(
    validateConfigPayload(payload),
    currentConfig,
    locks
  );
  const fallbackVariants = buildFallbackVariants(baseConfig);
  const rawVariants = Array.isArray(payload?.variants) ? payload.variants.slice(0, 3) : [];
  const variants = fallbackVariants.map((fallback, index) => {
    if (!rawVariants[index]) {
      return fallback;
    }

    try {
      return validateVariant(rawVariants[index], currentConfig, locks, fallback);
    } catch {
      return fallback;
    }
  });

  return {
    ...baseConfig,
    understanding: normalizeUnderstanding(payload?.understanding, designContext, hasSketch),
    variants
  };
}

async function requestStructuredResponse(
  client,
  provider,
  prompt,
  currentConfig,
  sketchDataUrl,
  sketchMetadata,
  designContext,
  locks,
  editIntent,
  requestMode
) {
  if (sketchDataUrl && !provider.supportsVision) {
    throw new Error(
      "The current provider does not support sketch vision in this demo. Switch to OpenAI for image-guided sync."
    );
  }

  if (provider.mode === "responses_schema") {
    const userContent = [
      {
        type: "input_text",
        text: getUserPayload(
          prompt,
          currentConfig,
          sketchMetadata,
          designContext,
          locks,
          editIntent,
          requestMode
        )
      }
    ];

    if (sketchDataUrl) {
      userContent.push({
        type: "input_image",
        image_url: sketchDataUrl,
        detail: "high"
      });
    }

    const aiResponse = await client.responses.create({
      model: provider.model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: getSystemPrompt(provider.mode, Boolean(sketchDataUrl))
            }
          ]
        },
        {
          role: "user",
          content: userContent
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "table_assistant_response",
          strict: true,
          schema: RESPONSE_SCHEMA
        }
      }
    });

    return validateAssistantPayload(
      parseJsonPayload(aiResponse.output_text),
      currentConfig,
      locks,
      designContext,
      Boolean(sketchDataUrl)
    );
  }

  const userPayload = getUserPayload(
    prompt,
    currentConfig,
    sketchMetadata,
    designContext,
    locks,
    editIntent,
    requestMode
  );

  const completion = await client.chat.completions.create({
    model: provider.model,
    messages: [
      {
        role: "system",
        content: getSystemPrompt(provider.mode, Boolean(sketchDataUrl))
      },
      {
        role: "user",
        content:
          sketchDataUrl && provider.supportsVision
            ? [
                {
                  type: "text",
                  text: userPayload
                },
                {
                  type: "image_url",
                  image_url: {
                    url: sketchDataUrl
                  }
                }
              ]
            : userPayload
      }
    ],
    response_format: {
      type: "json_object"
    },
    temperature: 0.45,
    max_tokens: 1400
  });

  return validateAssistantPayload(
    parseJsonPayload(completion.choices?.[0]?.message?.content),
    currentConfig,
    locks,
    designContext,
    Boolean(sketchDataUrl)
  );
}

async function requestGeminiStructuredResponse(
  provider,
  prompt,
  currentConfig,
  sketchDataUrl,
  sketchMetadata,
  designContext,
  locks,
  editIntent,
  requestMode
) {
  const payload = await requestGeminiContent({
    apiKey: provider.apiKey,
    baseURL: provider.nativeBaseURL,
    model: provider.model,
    systemPrompt: getSystemPrompt("chat_json", Boolean(sketchDataUrl)),
    userText: getUserPayload(
      prompt,
      currentConfig,
      sketchMetadata,
      designContext,
      locks,
      editIntent,
      requestMode
    ),
    inlineInputs: [dataUrlToInlineData(sketchDataUrl)].filter(Boolean),
    temperature: 0.45,
    responseMimeType: "application/json"
  });

  return validateAssistantPayload(
    parseJsonPayload(getGeminiText(payload)),
    currentConfig,
    locks,
    designContext,
    Boolean(sketchDataUrl)
  );
}

const QUOTE_SCENE_PRESETS = {
  office: {
    key: "office",
    title: "Design studio office",
    room: "6.20 x 4.80 x 3.10 m",
    prompt:
      "Place the table in a premium design studio office with walnut millwork, exposed concrete, muted blue-grey carpet, chrome and black leather seating, and soft luminous ceiling panels."
  },
  dining: {
    key: "dining",
    title: "Private dining room",
    room: "5.60 x 4.40 x 2.90 m",
    prompt:
      "Place the table in a refined private dining room with warm wood paneling, restrained artwork, soft amber side light, and a calm hospitality atmosphere."
  },
  bedroom: {
    key: "bedroom",
    title: "Bedroom studio corner",
    room: "4.20 x 3.80 x 2.75 m",
    prompt:
      "Place the table in a quiet bedroom studio corner with pale textured walls, soft daylight, linen and wool materials, and a premium residential atmosphere."
  },
  gallery: {
    key: "gallery",
    title: "Gallery presentation room",
    room: "7.20 x 5.60 x 3.40 m",
    prompt:
      "Place the table in a gallery-style presentation room with dark walnut cladding, exposed concrete, dramatic warm accent light, and a sculptural exhibition mood."
  }
};

function sanitizeSceneKey(value) {
  return String(value || "scene")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "scene";
}

function getScenePreset(sceneKey) {
  return QUOTE_SCENE_PRESETS[sanitizeSceneKey(sceneKey)] ?? QUOTE_SCENE_PRESETS.office;
}

function getSceneMimeExtension(mimeType) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "png";
}

function buildQuoteScenePrompt({
  sceneKey,
  sceneLabel,
  roomLabel,
  config,
  locale,
  hasSketchReference = false,
  styleReferenceCount = 0
}) {
  const scene = getScenePreset(sceneKey);
  const localizedLead =
    locale === "zh"
      ? "请生成一张高级真实的室内场景效果图。"
      : "Create one premium photoreal interior scene.";

  return [
    localizedLead,
    "Use the supplied table reference image as the exact product to place into the room.",
    "Preserve the tabletop outline, teacher-framework understructure, leg count, leg placement, modular triangle logic, proportions, and visible material colors.",
    "Do not redesign the product. Do not split the tabletop into two layers. Do not remove the structural connection between tabletop and legs.",
    "The table must sit on the floor naturally with believable contact shadows and grounded weight.",
    "Keep the table as the hero object, fully visible, centered or slightly off-center like high-end interior photography.",
    "Include one or two natural human figures in the room for scale and realism, such as a designer walking by, a seated client, or a person reading in the background.",
    "People must feel candid and editorial, not posed, and must not touch, block, distort, or redesign the table.",
    "No text, no watermark, no labels, no UI, no exploded view, no floating furniture.",
    `Scene type: ${sceneLabel || scene.title}.`,
    `Room size hint: ${roomLabel || scene.room}.`,
    `Interior direction: ${scene.prompt}`,
    "Overall style: warm editorial interior, walnut millwork, exposed concrete, restrained luxury, soft diffused lighting, premium material read, realistic lens response.",
    `Table summary: ${config.shape} top, ${config.width}m x ${config.depth}m x ${config.height}m, ${config.legCount} legs, ${config.legShape} leg profile, tabletop material ${config.material}, module size ${config.moduleSize}m, module gap ${config.moduleGap}m.`,
    hasSketchReference
      ? "An extra sketch reference is attached; treat it only as a local refinement hint while preserving the built table reference as primary."
      : "",
    styleReferenceCount
      ? `Additional style reference images are attached for mood only; use them for lighting and atmosphere, not for changing the table design.`
      : "",
    "Return one final photoreal image."
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateQuoteScene({
  provider,
  sceneKey,
  sceneLabel,
  roomLabel,
  locale,
  config,
  referenceImageDataUrl,
  sketchDataUrl,
  styleImageDataUrls = []
}) {
  if (provider.key !== "gemini") {
    throw new Error("Quote scene generation is currently wired for Gemini only.");
  }

  const referenceInline = dataUrlToInlineData(referenceImageDataUrl);

  if (!referenceInline) {
    throw new Error("A table reference image is required before generating AI scenes.");
  }

  const styleReferences = Array.isArray(styleImageDataUrls)
    ? styleImageDataUrls.map((item) => dataUrlToInlineData(item)).filter(Boolean).slice(0, 3)
    : [];
  const sketchReference = dataUrlToInlineData(sketchDataUrl);
  const responsePayload = await requestGeminiContent({
    apiKey: provider.apiKey,
    baseURL: provider.imageBaseURL,
    model: provider.imageModel,
    userText: buildQuoteScenePrompt({
      sceneKey,
      sceneLabel,
      roomLabel,
      config,
      locale,
      hasSketchReference: Boolean(sketchReference),
      styleReferenceCount: styleReferences.length
    }),
    inlineInputs: [referenceInline, sketchReference, ...styleReferences].filter(Boolean),
    temperature: 0.8,
    responseModalities: ["TEXT", "IMAGE"]
  });
  const imagePart = getGeminiImagePart(responsePayload);
  const fileExtension = getSceneMimeExtension(imagePart.mimeType);
  const timestamp = Date.now();
  const safeSceneKey = sanitizeSceneKey(sceneKey);
  const fileName = `${timestamp}-${safeSceneKey}.${fileExtension}`;
  const outputDir = getQuoteSceneOutputDir();

  await ensureQuoteSceneOutputDir();
  await fs.writeFile(
    path.join(outputDir, fileName),
    Buffer.from(imagePart.data, "base64")
  );

  return {
    ok: true,
    sceneKey: safeSceneKey,
    imageUrl: `${getQuoteScenePublicBase()}/${fileName}`,
    promptSummary: getScenePreset(sceneKey).title,
    model: provider.imageModel,
    provider: provider.label,
    createdAt: new Date(timestamp).toISOString()
  };
}

app.get("/api/health", (_request, response) => {
  const provider = getProviderConfig();

  response.json({
    ok: true,
    modelReady: provider.configured,
    provider: provider.key,
    providerLabel: provider.label,
    model: provider.model || "not set",
    imageModel: provider.imageModel || "not set",
    supportsVision: provider.supportsVision,
    supportsImageGeneration: Boolean(provider.supportsImageGeneration)
  });
});

app.get("/api/gh-bridge/status", async (_request, response) => {
  response.status(410).json({
    ok: false,
    disabled: true,
    error:
      "The Rhino / Grasshopper send-back bridge is disabled in this presentation build."
  });
});

app.post("/api/gh-bridge/generate", async (request, response) => {
  response.status(410).json({
    ok: false,
    disabled: true,
    error:
      "The Rhino / Grasshopper send-back bridge is disabled in this presentation build."
  });
});

app.post("/api/design", async (request, response) => {
  const provider = getProviderConfig();
  const client = getClient(provider);
  const prompt = String(request.body?.prompt || "").trim();
  const currentConfig = request.body?.currentConfig ?? null;
  const sketchDataUrl = String(request.body?.sketchDataUrl || "").trim();
  const sketchMetadata = request.body?.sketchMetadata ?? null;
  const designContext = request.body?.designContext ?? null;
  const locks = validateLocks(request.body?.locks);
  const requestMode = String(request.body?.requestMode || "directions").trim();
  const editIntent =
    request.body?.editIntent && typeof request.body.editIntent === "object"
      ? {
          scope: String(request.body.editIntent.scope || "").trim().slice(0, 60),
          instruction: String(request.body.editIntent.instruction || "")
            .trim()
            .slice(0, 240)
        }
      : null;

  if (!provider.configured) {
    return response.status(503).json({
      error: `The selected provider is not configured. Add ${provider.missing.join(" and ")} to your .env file.`
    });
  }

  if (!prompt && !sketchDataUrl && !editIntent?.instruction) {
    return response.status(400).json({
      error: "Please provide a design prompt, sketch, or local edit request."
    });
  }

  try {
    const payload =
      provider.key === "gemini" && provider.transport === "native"
        ? await requestGeminiStructuredResponse(
            provider,
            prompt,
            currentConfig,
            sketchDataUrl,
            sketchMetadata,
            designContext,
            locks,
            editIntent,
            requestMode
          )
        : await requestStructuredResponse(
            client,
            provider,
            prompt,
            currentConfig,
            sketchDataUrl,
            sketchMetadata,
            designContext,
            locks,
            editIntent,
            requestMode
          );

    return response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI design error.";

    return response.status(500).json({
      error: message
    });
  }
});

app.post("/api/quote-scenes/generate", async (request, response) => {
  const provider = getProviderConfig();
  const sceneKey = String(request.body?.sceneKey || "").trim();
  const sceneLabel = String(request.body?.sceneLabel || "").trim();
  const roomLabel = String(request.body?.roomLabel || "").trim();
  const locale = String(request.body?.locale || "zh").trim().toLowerCase();
  const config = request.body?.config ?? null;
  const referenceImageDataUrl = String(request.body?.referenceImageDataUrl || "").trim();
  const sketchDataUrl = String(request.body?.sketchDataUrl || "").trim();
  const styleImageDataUrls = Array.isArray(request.body?.styleImageDataUrls)
    ? request.body.styleImageDataUrls
    : [];

  if (!provider.configured) {
    return response.status(503).json({
      error: `Gemini is not configured yet. Add ${provider.missing.join(" and ")} to your .env file.`
    });
  }

  if (provider.key !== "gemini") {
    return response.status(400).json({
      error: "Quote scene generation is currently configured for Gemini. Set AI_PROVIDER=gemini or leave AI_PROVIDER empty when GEMINI_API_KEY is present."
    });
  }

  if (!referenceImageDataUrl) {
    return response.status(400).json({
      error: "Missing referenceImageDataUrl. Capture the current table view before requesting a scene render."
    });
  }

  if (!config || typeof config !== "object") {
    return response.status(400).json({
      error: "Missing table config for AI scene generation."
    });
  }

  try {
    const payload = await generateQuoteScene({
      provider,
      sceneKey,
      sceneLabel,
      roomLabel,
      locale,
      config,
      referenceImageDataUrl,
      sketchDataUrl,
      styleImageDataUrls
    });

    return response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI scene generation error.";

    return response.status(500).json({
      error: message
    });
  }
});

if (isProduction) {
  app.use(express.static(distDir));

  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  const provider = getProviderConfig();
  console.log(
    `Table Generator server listening on http://localhost:${port} using ${provider.label} / ${provider.model || "model not set"}`
  );
});
