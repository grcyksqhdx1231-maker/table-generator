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

app.use(express.json({ limit: "1mb" }));

const VALID_SCENARIOS = new Set(["daylight", "late_night", "void"]);
const VALID_SHAPES = new Set(["rectangle", "round", "oval"]);
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
    size: {
      type: "number",
      minimum: 0.75,
      maximum: 2.4
    },
    material: {
      type: "string",
      enum: [...VALID_MATERIALS]
    },
    rationale: {
      type: "string",
      maxLength: 180
    }
  },
  required: ["scenario", "shape", "size", "material", "rationale"]
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
    mode: "responses_schema"
  },
  deepseek: {
    key: "deepseek",
    label: "DeepSeek",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    baseUrlEnv: "DEEPSEEK_BASE_URL",
    defaultModel: "deepseek-chat",
    defaultBaseUrl: "https://api.deepseek.com",
    mode: "chat_json"
  },
  doubao: {
    key: "doubao",
    label: "Doubao / Ark",
    apiKeyEnv: "DOUBAO_API_KEY",
    modelEnv: "DOUBAO_MODEL",
    baseUrlEnv: "DOUBAO_BASE_URL",
    defaultModel: "",
    defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    mode: "chat_json"
  }
};

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function clampSize(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 1.48;
  }

  return Math.max(0.75, Math.min(2.4, Number(numeric.toFixed(2))));
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

function getSystemPrompt(mode) {
  if (mode === "responses_schema") {
    return "You are a furniture configuration agent. Convert natural-language table requests into compact JSON for a tabletop demo. Stay within the provided schema, infer one best-fit configuration, and keep rationale concise.";
  }

  return [
    "You are a furniture configuration agent.",
    "Convert natural-language table requests into JSON for a tabletop demo.",
    "Return JSON only.",
    "Use this shape exactly:",
    '{"scenario":"daylight|late_night|void","shape":"rectangle|round|oval","size":1.48,"material":"light_wood|dark_walnut|rough_stone|metal","rationale":"short explanation"}'
  ].join(" ");
}

function getUserPayload(prompt, currentConfig) {
  return JSON.stringify({
    prompt,
    currentConfig
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

  if (!VALID_MATERIALS.has(payload?.material)) {
    throw new Error("The model returned an invalid material.");
  }

  return {
    scenario: payload.scenario,
    shape: payload.shape,
    size: clampSize(payload.size),
    material: payload.material,
    rationale: String(payload.rationale || "").trim().slice(0, 180)
  };
}

async function requestStructuredResponse(client, provider, prompt, currentConfig) {
  if (provider.mode === "responses_schema") {
    const aiResponse = await client.responses.create({
      model: provider.model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: getSystemPrompt(provider.mode)
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: getUserPayload(prompt, currentConfig)
            }
          ]
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
        content: getSystemPrompt(provider.mode)
      },
      {
        role: "user",
        content: getUserPayload(prompt, currentConfig)
      }
    ],
    response_format: {
      type: "json_object"
    },
    temperature: 0.4,
    max_tokens: 220
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
    model: provider.model || "not set"
  });
});

app.post("/api/design", async (request, response) => {
  const provider = getProviderConfig();
  const client = getClient(provider);
  const prompt = String(request.body?.prompt || "").trim();
  const currentConfig = request.body?.currentConfig ?? null;

  if (!client) {
    return response.status(503).json({
      error: `The selected provider is not configured. Add ${provider.missing.join(" and ")} to your .env file.`
    });
  }

  if (!prompt) {
    return response.status(400).json({
      error: "Please provide a design prompt."
    });
  }

  try {
    const payload = await requestStructuredResponse(
      client,
      provider,
      prompt,
      currentConfig
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
