async function postDesignRequest(body) {
  const response = await fetch("/api/design", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "AI design request failed.");
  }

  return payload;
}

function normalizeOptions(options) {
  if (!options || typeof options !== "object") {
    return {
      designContext: null,
      sketchDataUrl: "",
      sketchMetadata: null,
      locks: null,
      editIntent: null,
      requestMode: "directions"
    };
  }

  const looksLikeLegacyDesignContext =
    "hasUploadedPattern" in options ||
    "uploadedPatternName" in options ||
    "hasSketchOutline" in options;

  if (looksLikeLegacyDesignContext && !("designContext" in options)) {
    return {
      designContext: options,
      sketchDataUrl: "",
      sketchMetadata: null,
      locks: null,
      editIntent: null,
      requestMode: "directions"
    };
  }

  return {
    designContext: options.designContext ?? null,
    sketchDataUrl: options.sketchDataUrl ?? "",
    sketchMetadata: options.sketchMetadata ?? null,
    locks: options.locks ?? null,
    editIntent: options.editIntent ?? null,
    requestMode: options.requestMode ?? "directions"
  };
}

export async function requestAiDesign(prompt, currentConfig, options = null) {
  const normalized = normalizeOptions(options);

  return postDesignRequest({
    prompt,
    currentConfig,
    designContext: normalized.designContext,
    sketchDataUrl: normalized.sketchDataUrl,
    sketchMetadata: normalized.sketchMetadata,
    locks: normalized.locks,
    editIntent: normalized.editIntent,
    requestMode: normalized.requestMode
  });
}

export async function requestSketchDesign(
  sketchDataUrl,
  currentConfig,
  sketchMetadata,
  options = null
) {
  const normalized = normalizeOptions(options);

  return postDesignRequest({
    prompt:
      "Interpret the attached tabletop sketch and convert it into one coherent table configuration.",
    currentConfig,
    sketchDataUrl,
    sketchMetadata,
    designContext: normalized.designContext,
    locks: normalized.locks,
    editIntent: normalized.editIntent,
    requestMode: normalized.requestMode || "sketch_refine"
  });
}

export async function requestQuoteSceneGeneration({
  locale,
  sceneKey,
  sceneLabel,
  roomLabel,
  config,
  referenceImageDataUrl,
  sketchDataUrl = "",
  styleImageDataUrls = []
}) {
  const response = await fetch("/api/quote-scenes/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      locale,
      sceneKey,
      sceneLabel,
      roomLabel,
      config,
      referenceImageDataUrl,
      sketchDataUrl,
      styleImageDataUrls
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "AI quote scene request failed.");
  }

  return payload;
}
