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

export async function requestAiDesign(prompt, currentConfig, designContext = null) {
  return postDesignRequest({
    prompt,
    currentConfig,
    designContext
  });
}

export async function requestSketchDesign(
  sketchDataUrl,
  currentConfig,
  sketchMetadata,
  designContext = null
) {
  return postDesignRequest({
    prompt:
      "Interpret the attached tabletop sketch and convert it into one coherent table configuration.",
    currentConfig,
    sketchDataUrl,
    sketchMetadata,
    designContext
  });
}
