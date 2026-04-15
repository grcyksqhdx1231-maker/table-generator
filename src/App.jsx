import { useEffect, useRef, useState } from "react";
import ChatDock from "./components/ChatDock";
import ControlPanel from "./components/ControlPanel";
import DraftDrawer from "./components/DraftDrawer";
import LandingView from "./components/LandingView";
import SketchPad from "./components/SketchPad";
import TableViewport from "./components/TableViewport";
import { requestAiDesign, requestSketchDesign } from "./lib/api";
import {
  DEFAULT_CONFIG,
  SCENARIO_PRESETS,
  getDraftLabel,
  normalizeConfig
} from "./lib/catalog";
import { inferSketchConfig } from "./lib/sketch";
import { loadDrafts, saveDrafts } from "./lib/storage";

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

function buildDesignContext(patternAsset, sketchSnapshot) {
  return {
    hasUploadedPattern: Boolean(patternAsset?.dataUrl),
    uploadedPatternName: patternAsset?.name || "",
    hasSketchOutline: Boolean(sketchSnapshot?.hasContent),
    sketchPointCount: sketchSnapshot?.pointCount || 0
  };
}

function createDraft(config, patternAsset, sketchSnapshot) {
  return {
    id: crypto.randomUUID(),
    label: getDraftLabel(config),
    createdAt: new Date().toISOString(),
    config,
    patternAsset,
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

export default function App() {
  const [phase, setPhase] = useState("landing");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [drafts, setDrafts] = useState(() => loadDrafts());
  const [draftDrawerOpen, setDraftDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [patternAsset, setPatternAsset] = useState(null);
  const [serverState, setServerState] = useState({
    ready: false,
    providerLabel: "OpenAI",
    model: "not set",
    supportsVision: false
  });
  const [sketchSnapshot, setSketchSnapshot] = useState(EMPTY_SKETCH);
  const [sketchState, setSketchState] = useState({
    label: "Sketch Idle",
    detail:
      "Draw in the floating sketch window above the preview to drive the table in real time."
  });
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

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

  useEffect(() => {
    if (phase !== "configurator" || !sketchSnapshot.version || !sketchSnapshot.hasContent) {
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const current = configRef.current;
      const localResult = inferSketchConfig(sketchSnapshot, current);
      const nextConfig = normalizeConfig({
        ...current,
        scenario: localResult.scenario,
        shape: localResult.shape,
        silhouetteMode: "sketch",
        width: localResult.width,
        depth: localResult.depth,
        height: localResult.height,
        material: localResult.material,
        patternMode: current.patternMode,
        moduleSize: localResult.moduleSize,
        moduleGap: localResult.moduleGap,
        finishColor: sketchSnapshot.dominantColor,
        legShape: localResult.legShape,
        legLength: localResult.legLength,
        legWidth: localResult.legWidth,
        legDepth: localResult.legDepth,
        legCount: localResult.legCount
      });

      if (cancelled) {
        return;
      }

      setConfig(nextConfig);
      setAiNote(localResult.rationale);
      setSketchState({
        label: "Live Triangle Sync",
        detail: serverState.ready && serverState.supportsVision
          ? "The triangular tabletop is following your strokes immediately while the vision model prepares a cleaner mosaic refinement."
          : "The triangular tabletop is following your strokes immediately through the local live interpreter."
      });
    }, 90);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phase, serverState.ready, serverState.supportsVision, sketchSnapshot]);

  useEffect(() => {
    if (
      phase !== "configurator" ||
      !sketchSnapshot.version ||
      !sketchSnapshot.hasContent ||
      !serverState.ready ||
      !serverState.supportsVision
    ) {
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const current = configRef.current;

      setSketchState({
        label: "Vision Refinement",
        detail: `${serverState.providerLabel} is refining the sketch into a cleaner triangle-module table.`
      });

      try {
        const result = await requestSketchDesign(
          sketchSnapshot.dataUrl,
          current,
          {
            pointCount: sketchSnapshot.pointCount,
            cornerCount: sketchSnapshot.cornerCount,
            aspectRatio: Number(sketchSnapshot.aspectRatio.toFixed(2)),
            coverage: Number(sketchSnapshot.coverage.toFixed(3)),
            dominantColor: sketchSnapshot.dominantColor,
            circularity: Number((sketchSnapshot.circularity || 0).toFixed(3)),
            rectangularity: Number((sketchSnapshot.rectangularity || 0).toFixed(3)),
            elongation: Number((sketchSnapshot.elongation || 1).toFixed(3)),
            radialVariance: Number((sketchSnapshot.radialVariance || 0).toFixed(3))
          },
          buildDesignContext(patternAsset, sketchSnapshot)
        );

        if (cancelled) {
          return;
        }

        const nextConfig = normalizeConfig({
          ...current,
          scenario: result.scenario,
          shape: result.shape,
          silhouetteMode: result.silhouetteMode,
          width: result.width,
          depth: result.depth,
          height: result.height,
          material: result.material,
          patternMode: result.patternMode,
          moduleSize: result.moduleSize,
          moduleGap: result.moduleGap,
          finishColor: sketchSnapshot.dominantColor,
          legShape: result.legShape,
          legLength: result.legLength,
          legWidth: result.legWidth,
          legDepth: result.legDepth,
          legCount: result.legCount
        });

        setConfig(nextConfig);
        setAiNote(result.rationale);
        setSketchState({
          label: "Vision Refinement",
          detail: "The triangle mosaic was refined by the vision model without interrupting your live drawing."
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus(
          error instanceof Error ? error.message : "Sketch vision sync failed."
        );
      }
    }, 950);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    phase,
    patternAsset,
    serverState.ready,
    serverState.supportsVision,
    serverState.providerLabel,
    sketchSnapshot
  ]);

  function updateConfig(patch) {
    setConfig((current) =>
      normalizeConfig({
        ...current,
        ...patch,
        finishColor:
          Object.prototype.hasOwnProperty.call(patch, "material")
            ? ""
            : current.finishColor
      })
    );
  }

  function handleEnter() {
    setPhase("configurator");
    setStatus(
      "Landing dissolved. Upload a motif, sketch an outline, or tune the triangle module controls on the left."
    );
  }

  function handleSaveDraft() {
    const nextDraft = createDraft(config, patternAsset, sketchSnapshot);
    setDrafts((current) => [nextDraft, ...current].slice(0, 8));
    setStatus(`Draft saved as ${nextDraft.label}.`);
    setDraftDrawerOpen(true);
  }

  function handleSelectDraft(draft) {
    const nextConfig = normalizeConfig(draft.config);
    setConfig(nextConfig);
    setPatternAsset(draft.patternAsset ?? null);
    setSketchSnapshot((current) => ({
      ...EMPTY_SKETCH,
      version: current.version + 1,
      hasContent: Boolean(draft.sketchAsset?.hasContent),
      maskDataUrl: draft.sketchAsset?.maskDataUrl || "",
      hullNormalized: draft.sketchAsset?.hullNormalized || []
    }));
    setPhase("configurator");
    setAiNote("");
    setStatus(`Draft restored from ${draft.label}.`);
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
        label: "Sketch Idle",
        detail:
          "Draw in the floating sketch window above the preview to drive the table in real time."
      });
      setConfig((current) =>
        current.silhouetteMode === "sketch"
          ? normalizeConfig({ ...current, silhouetteMode: "shape" })
          : current
      );
      return;
    }

    setConfig((current) => normalizeConfig({ ...current, silhouetteMode: "sketch" }));
  }

  async function handlePatternUpload(file) {
    if (!file) {
      return;
    }

    setBusy(true);
    setStatus("Preparing the uploaded motif for the triangular module system...");

    try {
      const asset = await resizeImageFile(file);
      setPatternAsset(asset);
      setConfig((current) =>
        normalizeConfig({
          ...current,
          patternMode: "uploaded"
        })
      );
      setStatus(
        `${asset.name} is now driving the triangle modules. You should see color and relief changes across the tabletop.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "The uploaded image could not be processed."
      );
    } finally {
      setBusy(false);
    }
  }

  function handleClearPattern() {
    setPatternAsset(null);
    setConfig((current) => normalizeConfig({ ...current, patternMode: "metal" }));
    setStatus("Uploaded motif removed. The tabletop reverted to metal triangle plates.");
  }

  async function handlePromptSubmit(prompt) {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setStatus("Describe the table in natural language before applying AI.");
      return;
    }

    setBusy(true);
    setStatus("Interpreting the brief and updating the triangle module table...");

    try {
      const result = await requestAiDesign(
        trimmed,
        config,
        buildDesignContext(patternAsset, sketchSnapshot)
      );
      const nextConfig = normalizeConfig({
        ...config,
        scenario: result.scenario,
        shape: result.shape,
        silhouetteMode: result.silhouetteMode,
        width: result.width,
        depth: result.depth,
        height: result.height,
        material: result.material,
        patternMode: result.patternMode,
        moduleSize: result.moduleSize,
        moduleGap: result.moduleGap,
        finishColor: config.finishColor,
        legShape: result.legShape,
        legLength: result.legLength,
        legWidth: result.legWidth,
        legDepth: result.legDepth,
        legCount: result.legCount
      });

      setConfig(nextConfig);
      setAiNote(result.rationale);
      setStatus("AI proposal applied to the current triangle-module draft.");
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
      <div className={`app__workspace ${phase === "configurator" ? "is-active" : ""}`}>
        <aside className="workspace__rail">
          <section className="workspace__controls">
            <ControlPanel
              config={config}
              draftsCount={drafts.length}
              onClearPattern={handleClearPattern}
              onConfigChange={updateConfig}
              onOpenDrafts={() => setDraftDrawerOpen(true)}
              onPatternUpload={handlePatternUpload}
              onSaveDraft={handleSaveDraft}
              patternAsset={patternAsset}
              serverSupportsVision={serverState.supportsVision}
              sketchDetail={sketchState.detail}
              sketchHasContent={sketchSnapshot.hasContent}
              sketchLabel={sketchState.label}
            />
          </section>
        </aside>

        <section className="workspace__pane workspace__pane--preview">
          <div className="preview-stage">
            <TableViewport
              config={config}
              patternAsset={patternAsset}
              phase={phase}
              sketchMaskDataUrl={sketchSnapshot.hasContent ? sketchSnapshot.maskDataUrl : ""}
              sketchOutline={sketchSnapshot.hullNormalized || []}
            />
            <div
              className={`preview-stage__sketch ${
                phase === "configurator" ? "is-visible" : ""
              }`}
            >
              <SketchPad
                floating
                onSketchChange={handleSketchChange}
                syncDetail={sketchState.detail}
                syncLabel={sketchState.label}
              />
            </div>
          </div>
        </section>
      </div>

      <LandingView onEnter={handleEnter} visible={phase === "landing"} />

      <ChatDock
        aiNote={aiNote}
        isBusy={busy}
        onSubmitPrompt={handlePromptSubmit}
        serverModel={serverState.model}
        serverProviderLabel={serverState.providerLabel}
        serverReady={serverState.ready}
        status={status}
        visible={phase === "configurator"}
      />

      <DraftDrawer
        drafts={drafts}
        isOpen={draftDrawerOpen}
        onClose={() => setDraftDrawerOpen(false)}
        onSelectDraft={handleSelectDraft}
      />
    </main>
  );
}
