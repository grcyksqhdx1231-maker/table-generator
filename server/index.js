import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const app = express();
const port = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "5mb" }));

const VALID_SCENARIOS = new Set(["daylight", "late_night", "void"]);
const VALID_SHAPES = new Set(["rectangle", "round", "oval"]);
const VALID_SILHOUETTE_MODES = new Set(["shape", "sketch"]);
const VALID_PATTERN_MODES = new Set(["metal", "uploaded"]);
const VALID_LEG_SHAPES = new Set(["round", "square", "blade"]);
const VALID_MATERIALS = new Set([
  "light_wood",
  "dark_walnut",
  "rough_stone",
  "metal"
]);

const PARAMETER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
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
      minimum: 0.08,
      maximum: 0.28
    },
    moduleGap: {
      type: "number",
      minimum: 0,
      maximum: 0.04
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
    "legShape",
    "legLength",
    "legWidth",
    "legDepth",
    "legCount",
    "rationale"
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

  return Math.max(0.08, Math.min(0.28, Number(numeric.toFixed(3))));
}

function clampModuleGap(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 0.012;
  }

  return Math.max(0, Math.min(0.04, Number(numeric.toFixed(3))));
}

function getProviderConfig() {
  const providerKey = readEnv("AI_PROVIDER").toLowerCase() || "openai";
  const preset = PROVIDER_PRESETS[providerKey] ?? PROVIDER_PRESETS.openai;
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
  if (!provider.configured) {
    return null;
  }

  return new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseURL
  });
}

function getSystemPrompt(mode, hasSketch = false) {
  if (mode === "responses_schema") {
    return [
      "You are a furniture configuration agent.",
      "Convert natural-language table requests into compact JSON for a triangle-module tabletop demo.",
      hasSketch
        ? "When a sketch is attached, treat it as a top-view concept drawing of a triangle-module table and infer the closest real tabletop silhouette, scale, and material."
        : "Infer one best-fit configuration from the user's brief.",
      "Assume the tabletop is always assembled from equilateral triangular modules.",
      "Always include tabletop width, depth, total height, silhouetteMode, patternMode, moduleSize, moduleGap, leg shape, leg height using the key legLength, legWidth, legDepth, and a leg count of at least 3.",
      "If designContext says an uploaded pattern exists, you may choose patternMode uploaded; otherwise prefer metal.",
      "Stay within the provided schema and keep rationale concise."
    ].join(" ");
  }

  return [
    "You are a furniture configuration agent.",
    "Convert natural-language table requests into JSON for a triangle-module tabletop demo.",
    hasSketch
      ? "If a sketch summary is provided, treat it as a top-view table concept and use it to infer silhouette, size, material, and triangular module behavior."
      : "Infer one best-fit configuration from the user's brief.",
    "Assume the tabletop is always assembled from equilateral triangular modules.",
    "Always include tabletop width, depth, total height, silhouetteMode, patternMode, moduleSize, moduleGap, leg shape, leg height using the key legLength, legWidth, legDepth, and a leg count of at least 3.",
    "If designContext says an uploaded pattern exists, you may choose patternMode uploaded; otherwise prefer metal.",
    "Return JSON only.",
    "Use this shape exactly:",
    '{"scenario":"daylight|late_night|void","shape":"rectangle|round|oval","silhouetteMode":"shape|sketch","width":1.52,"depth":0.84,"height":0.76,"material":"light_wood|dark_walnut|rough_stone|metal","patternMode":"metal|uploaded","moduleSize":0.16,"moduleGap":0.012,"legShape":"round|square|blade","legLength":0.68,"legWidth":0.09,"legDepth":0.09,"legCount":4,"rationale":"short explanation"}'
  ].join(" ");
}

function getUserPayload(prompt, currentConfig, sketchMetadata, designContext) {
  return JSON.stringify({
    prompt,
    currentConfig,
    sketchMetadata,
    designContext
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

function validatePayload(payload) {
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
    legShape: payload.legShape,
    legLength,
    legWidth: clampLegSpan(payload.legWidth, 0.09),
    legDepth: clampLegSpan(payload.legDepth, 0.09),
    legCount: clampLegCount(payload.legCount),
    rationale: String(payload.rationale || "").trim().slice(0, 180)
  };
}

async function requestStructuredResponse(
  client,
  provider,
  prompt,
  currentConfig,
  sketchDataUrl,
  sketchMetadata,
  designContext
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
        text: getUserPayload(prompt, currentConfig, sketchMetadata, designContext)
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
          name: "table_configuration",
          strict: true,
          schema: PARAMETER_SCHEMA
        }
      }
    });

    return validatePayload(parseJsonPayload(aiResponse.output_text));
  }

  const completion = await client.chat.completions.create({
    model: provider.model,
    messages: [
      {
        role: "system",
        content: getSystemPrompt(provider.mode, Boolean(sketchDataUrl))
      },
      {
        role: "user",
        content: getUserPayload(prompt, currentConfig, sketchMetadata, designContext)
      }
    ],
    response_format: {
      type: "json_object"
    },
    temperature: 0.4,
    max_tokens: 280
  });

  return validatePayload(
    parseJsonPayload(completion.choices?.[0]?.message?.content)
  );
}

app.get("/api/health", (_request, response) => {
  const provider = getProviderConfig();

  response.json({
    ok: true,
    modelReady: provider.configured,
    provider: provider.key,
    providerLabel: provider.label,
    model: provider.model || "not set",
    supportsVision: provider.supportsVision
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

  if (!client) {
    return response.status(503).json({
      error: `The selected provider is not configured. Add ${provider.missing.join(" and ")} to your .env file.`
    });
  }

  if (!prompt && !sketchDataUrl) {
    return response.status(400).json({
      error: "Please provide a design prompt or sketch."
    });
  }

  try {
    const payload = await requestStructuredResponse(
      client,
      provider,
      prompt,
      currentConfig,
      sketchDataUrl,
      sketchMetadata,
      designContext
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

if (isProduction) {
  app.use(express.static(distDir));

  app.get("*", (_request, response) => {
    response.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  const provider = getProviderConfig();
  console.log(
    `Table Generator server listening on http://localhost:${port} using ${provider.label} / ${provider.model || "model not set"}`
  );
});
