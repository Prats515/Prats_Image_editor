"use client";

import { useEditor } from "../EditorContext";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import styles from "../editor.module.css";

export function ImageViewer() {
  const {
    currentImageUrl,
    step,
    startNewEdit,
    error,
    approveAndGenerate,
  } = useEditor();

  if (step === "GENERATING") {
    return (
      <section className={styles.panel}>
        <LoadingSpinner label="Generating your image… This may take up to a minute." />
      </section>
    );
  }

  if (!currentImageUrl) return null;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Your image</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentImageUrl}
        alt="Generated result"
        className={styles.generatedImage}
      />
      {error && step === "DONE" && (
        <p className={styles.errorBannerCompact}>{error}</p>
      )}
      <div className={styles.btnRow}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={startNewEdit}
        >
          New edit
        </button>
        {error && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => void approveAndGenerate()}
          >
            Try again
          </button>
        )}
      </div>
    </section>
  );
}
