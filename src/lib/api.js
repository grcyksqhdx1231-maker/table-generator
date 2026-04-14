export async function requestAiDesign(prompt, currentConfig) {
  const response = await fetch("/api/design", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      currentConfig
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "AI design request failed.");
  }

  return payload;
}
