"use client";

import { useEditor } from "./EditorContext";
import { PromptInput } from "./PromptInput/PromptInput";
import { ClarificationPanel } from "./ClarificationPanel/ClarificationPanel";
import { PromptReview } from "./PromptReview/PromptReview";
import { ImageViewer } from "./ImageViewer/ImageViewer";
import { EditHistoryPanel } from "./EditHistory/EditHistoryPanel";
import { ErrorBanner } from "./shared/ErrorBanner";
import { LoadingSpinner } from "./shared/LoadingSpinner";
import styles from "./editor.module.css";

export function EditorShell() {
  const { step, error, sessionReady, sessionFatal, reloadSession } = useEditor();

  if (sessionFatal) {
    return (
      <div className={styles.fatalError}>
        <h1>Smart AI Image Editor</h1>
        <p>Could not start your session. Check your connection and try again.</p>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => reloadSession()}
        >
          Reload
        </button>
      </div>
    );
  }

  if (!sessionReady) {
    return <LoadingSpinner label="Starting session…" />;
  }

  const showPromptInput =
    step === "IDLE" || step === "ANALYZING" || step === "DONE";
  const showClarify = step === "CLARIFYING";
  const showReview = step === "REVIEWING" || step === "GENERATING";
  const showViewer = step === "GENERATING" || step === "DONE";

  return (
    <div className={styles.editorPage}>
      <header className={styles.header}>
        <h1>Smart AI Image Editor</h1>
        <p>Describe your image in plain language — we handle the rest.</p>
      </header>

      <ErrorBanner message={error} />

      <EditHistoryPanel />

      {showPromptInput && (step === "IDLE" || step === "ANALYZING") && (
        <PromptInput />
      )}
      {step === "ANALYZING" && (
        <LoadingSpinner label="Understanding your intent…" />
      )}

      {showClarify && step === "CLARIFYING" && <ClarificationPanel />}
      {step === "ENHANCING" && (
        <LoadingSpinner label="Enhancing your prompt…" />
      )}

      {showReview && (step === "REVIEWING" || step === "GENERATING") && (
        <PromptReview />
      )}
      {showViewer && <ImageViewer />}

      {step === "DONE" && <PromptInput />}
    </div>
  );
}
