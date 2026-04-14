import { useEffect, useState } from "react";
import ControlPanel from "./components/ControlPanel";
import DraftDrawer from "./components/DraftDrawer";
import LandingView from "./components/LandingView";
import TableViewport from "./components/TableViewport";
import { requestAiDesign } from "./lib/api";
import {
  DEFAULT_CONFIG,
  SCENARIO_PRESETS,
  getDraftLabel,
  normalizeConfig
} from "./lib/catalog";
import { loadDrafts, saveDrafts } from "./lib/storage";

function createDraft(config) {
  return {
    id: crypto.randomUUID(),
    label: getDraftLabel(config),
    createdAt: new Date().toISOString(),
    config
  };
}

export default function App() {
  const [phase, setPhase] = useState("landing");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [drafts, setDrafts] = useState(() => loadDrafts());
  const [draftDrawerOpen, setDraftDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [serverState, setServerState] = useState({
    ready: false,
    providerLabel: "OpenAI",
    model: "not set"
  });

  useEffect(() => {
    saveDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    let active = true;

    fetch("/api/health")
      .then((response) => response.json())
      .then((payload) => {
        if (active) {
          setServerState({
            ready: Boolean(payload.modelReady),
            providerLabel: payload.providerLabel || "AI",
            model: payload.model || "not set"
          });
        }
      })
      .catch(() => {
        if (active) {
          setServerState({
            ready: false,
            providerLabel: "AI",
            model: "offline"
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function updateConfig(patch) {
    setConfig((current) => normalizeConfig({ ...current, ...patch }));
  }

  function handleEnter() {
    setPhase("configurator");
    setStatus("Landing dissolved. Manual controls are now live.");
  }

  function handleSaveDraft() {
    const nextDraft = createDraft(config);
    setDrafts((current) => [nextDraft, ...current].slice(0, 8));
    setStatus(`Draft saved as ${nextDraft.label}.`);
    setDraftDrawerOpen(true);
  }

  function handleSelectDraft(draft) {
    setConfig(normalizeConfig(draft.config));
    setPhase("configurator");
    setAiNote("");
    setStatus(`Draft restored from ${draft.label}.`);
    setDraftDrawerOpen(false);
  }

  async function handlePromptSubmit(prompt) {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setStatus("Describe the table in natural language before applying AI.");
      return;
    }

    setBusy(true);
    setStatus("Interpreting the brief and updating the table...");

    try {
      const result = await requestAiDesign(trimmed, config);
      const nextConfig = normalizeConfig({
        ...config,
        scenario: result.scenario,
        shape: result.shape,
        size: result.size,
        material: result.material
      });

      setConfig(nextConfig);
      setAiNote(result.rationale);
      setStatus("AI proposal applied to the current draft.");
      if (phase !== "configurator") {
        setPhase("configurator");
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "AI request failed unexpectedly."
      );
    } finally {
      setBusy(false);
    }
  }

  const sceneTheme =
    SCENARIO_PRESETS[config.scenario] ?? SCENARIO_PRESETS.daylight;

  return (
    <main
      className={`app phase-${phase}`}
      style={{
        "--scene-background": sceneTheme.background,
        "--panel-line": config.scenario === "late_night" ? "#40342d" : "#d9d0c4"
      }}
    >
      <div className="app__viewport">
        <TableViewport config={config} phase={phase} />
      </div>

      <LandingView onEnter={handleEnter} visible={phase === "landing"} />

      <section
        className={`app__panel ${phase === "configurator" ? "is-visible" : ""}`}
      >
        <ControlPanel
          aiNote={aiNote}
          config={config}
          draftsCount={drafts.length}
          isBusy={busy}
          onConfigChange={updateConfig}
          onOpenDrafts={() => setDraftDrawerOpen(true)}
          onSaveDraft={handleSaveDraft}
          onSubmitPrompt={handlePromptSubmit}
          serverModel={serverState.model}
          serverProviderLabel={serverState.providerLabel}
          serverReady={serverState.ready}
          status={status}
        />
      </section>

      <DraftDrawer
        drafts={drafts}
        isOpen={draftDrawerOpen}
        onClose={() => setDraftDrawerOpen(false)}
        onSelectDraft={handleSelectDraft}
      />
    </main>
  );
}
