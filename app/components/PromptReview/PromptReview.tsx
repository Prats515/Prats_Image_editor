"use client";

import { useEditor } from "../EditorContext";
import { CharCounter } from "../shared/CharCounter";
import { ModeSelector } from "./ModeSelector";
import { RegenerateButton } from "./RegenerateButton";
import styles from "../editor.module.css";

const MAX_ENHANCED = 4000;

export function PromptReview() {
  const {
    casualPrompt,
    enhancedPrompt,
    setEnhancedPrompt,
    approveAndGenerate,
    isRegenerating,
    step,
  } = useEditor();

  const canApprove =
    enhancedPrompt.trim().length > 0 &&
    enhancedPrompt.length <= MAX_ENHANCED &&
    !isRegenerating &&
    step !== "GENERATING";

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Review enhanced prompt</h2>

      <div className={styles.fieldRow}>
        <label htmlFor="original-prompt">Your original description</label>
      </div>
      <textarea
        id="original-prompt"
        className={`${styles.textarea} ${styles.textareaReadonly}`}
        rows={3}
        readOnly
        value={casualPrompt}
      />

      <div className={styles.fieldRow}>
        <label htmlFor="enhanced-prompt">Enhanced prompt (editable)</label>
        <CharCounter current={enhancedPrompt.length} max={MAX_ENHANCED} />
      </div>
      <textarea
        id="enhanced-prompt"
        className={styles.textarea}
        rows={6}
        maxLength={MAX_ENHANCED}
        value={enhancedPrompt}
        onChange={(e) => setEnhancedPrompt(e.target.value)}
        disabled={isRegenerating || step === "GENERATING"}
      />

      <ModeSelector />

      <div className={styles.btnRow}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={!canApprove}
          onClick={() => void approveAndGenerate()}
        >
          {step === "GENERATING" ? "Generating…" : "Approve & Generate"}
        </button>
        <RegenerateButton />
      </div>
    </section>
  );
}
