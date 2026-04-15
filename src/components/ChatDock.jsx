import { useState } from "react";

export default function ChatDock({
  visible,
  isBusy,
  aiNote,
  status,
  serverReady,
  serverProviderLabel,
  serverModel,
  onSubmitPrompt
}) {
  const [prompt, setPrompt] = useState(
    "Use my uploaded motif on a fine triangle mosaic and shape the table for two people having coffee."
  );

  return (
    <aside className={`chat-dock ${visible ? "is-visible" : ""}`}>
      <div className="chat-dock__inner">
        <div className="panel__split">
          <div>
            <p className="panel__label">AI Driven Design</p>
            <h2 className="chat-dock__title">Chat with the table.</h2>
          </div>
          <span className={`status-chip ${serverReady ? "is-ready" : ""}`}>
            {serverReady ? `${serverProviderLabel} / ${serverModel}` : "AI Not Ready"}
          </span>
        </div>

        <p className="panel__note">
          Describe mood, size, triangle density, whether to respect the sketch outline, or how to use the uploaded motif.
        </p>

        <textarea
          className="prompt-input chat-dock__input"
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the mood, size, and use case."
          rows="8"
          value={prompt}
        />

        <div className="panel__actions">
          <button
            className="primary-button"
            disabled={isBusy || !serverReady}
            onClick={() => onSubmitPrompt(prompt)}
            type="button"
          >
            {isBusy ? "Composing..." : "Apply AI Design"}
          </button>
        </div>

        {aiNote ? <p className="panel__note">{aiNote}</p> : null}
        {status ? <p className="panel__status">{status}</p> : null}
      </div>
    </aside>
  );
}
