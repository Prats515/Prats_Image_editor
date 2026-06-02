"use client";

import { useEditor } from "../EditorContext";
import styles from "../editor.module.css";

export function ModeSelector() {
  const { generationMode, setGenerationMode } = useEditor();

  return (
    <div className={styles.modeSelector} role="radiogroup" aria-label="Generation mode">
      <label className={styles.modeOption}>
        <input
          type="radio"
          name="generation-mode"
          value="fast"
          checked={generationMode === "fast"}
          onChange={() => setGenerationMode("fast")}
        />
        <span>
          <strong>Fast</strong>
          <small>Generates in seconds, good for quick previews</small>
        </span>
      </label>
      <label className={styles.modeOption}>
        <input
          type="radio"
          name="generation-mode"
          value="quality"
          checked={generationMode === "quality"}
          onChange={() => setGenerationMode("quality")}
        />
        <span>
          <strong>Quality</strong>
          <small>Takes longer, optimized for detail and accuracy</small>
        </span>
      </label>
    </div>
  );
}
