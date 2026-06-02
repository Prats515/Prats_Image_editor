"use client";

import { useEditor } from "../EditorContext";
import styles from "../editor.module.css";

export function RegenerateButton() {
  const { regenerateEnhanced, isRegenerating } = useEditor();

  return (
    <button
      type="button"
      className={`${styles.btn} ${styles.btnSecondary}`}
      disabled={isRegenerating}
      onClick={() => void regenerateEnhanced()}
    >
      {isRegenerating ? "Regenerating…" : "Regenerate"}
    </button>
  );
}
