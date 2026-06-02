"use client";

import { useEditor } from "../EditorContext";
import styles from "../editor.module.css";

export function EditHistoryPanel() {
  const { editHistory, selectedHistoryId, restoreFromHistory } = useEditor();

  if (editHistory.length === 0) return null;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Edit history</h2>
      <div className={styles.historyStrip}>
        {editHistory.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`${styles.historyThumb} ${
              selectedHistoryId === entry.id ? styles.historyThumbSelected : ""
            }`}
            onClick={() => restoreFromHistory(entry)}
            title={new Date(entry.createdAt).toLocaleString()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.imageUrl} alt="" />
          </button>
        ))}
      </div>
    </section>
  );
}
