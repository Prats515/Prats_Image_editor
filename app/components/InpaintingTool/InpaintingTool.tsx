"use client";

import { useState } from "react";
import { useEditor } from "../EditorContext";
import { MaskCanvas } from "./MaskCanvas";
import { BrushSizeSlider } from "./BrushSizeSlider";
import { CharCounter } from "../shared/CharCounter";
import styles from "../editor.module.css";

const MAX_PROMPT = 2000;

export function InpaintingTool() {
  const {
    inpaintSourceEntry,
    inpaintMaskDataUrl,
    inpaintMaskCoverage,
    inpaintBrushSize,
    casualPrompt,
    setCasualPrompt,
    setInpaintMask,
    setInpaintBrushSize,
    clearInpaintMask,
    cancelInpaint,
    submitInpaintPrompt,
    step,
  } = useEditor();

  const [clearToken, setClearToken] = useState(0);
  const [showSmallMaskDialog, setShowSmallMaskDialog] = useState(false);

  if (!inpaintSourceEntry) return null;

  const canContinue =
    casualPrompt.trim().length > 0 &&
    inpaintMaskDataUrl.length > 0 &&
    step !== "ANALYZING";

  const handleContinue = () => {
    if (inpaintMaskCoverage < 0.01) {
      setShowSmallMaskDialog(true);
      return;
    }
    void submitInpaintPrompt();
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Edit a specific area</h2>
      <p className={styles.inpaintHint}>
        Paint over the region you want to change, then describe only that area.
      </p>

      <MaskCanvas
        imageUrl={inpaintSourceEntry.imageUrl}
        brushSize={inpaintBrushSize}
        clearToken={clearToken}
        onMaskChange={(url, coverage) => setInpaintMask(url, coverage)}
      />

      <BrushSizeSlider
        value={inpaintBrushSize}
        onChange={setInpaintBrushSize}
      />

      <div className={styles.btnRow}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => {
            setClearToken((t) => t + 1);
            clearInpaintMask();
          }}
        >
          Clear mask
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={cancelInpaint}
        >
          Cancel
        </button>
      </div>

      <div className={styles.fieldRow}>
        <label htmlFor="inpaint-prompt">What should change in the painted area?</label>
        <CharCounter current={casualPrompt.length} max={MAX_PROMPT} />
      </div>
      <textarea
        id="inpaint-prompt"
        className={styles.textarea}
        rows={3}
        maxLength={MAX_PROMPT}
        value={casualPrompt}
        onChange={(e) => setCasualPrompt(e.target.value)}
      />

      <div className={styles.btnRow}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={!canContinue}
          onClick={handleContinue}
        >
          {step === "ANALYZING" ? "Analyzing…" : "Continue"}
        </button>
      </div>

      {showSmallMaskDialog && (
        <div className={styles.dialogBackdrop} role="dialog" aria-modal="true">
          <div className={styles.dialog}>
            <p>
              The painted area is very small (less than 1% of the image). Continue
              anyway?
            </p>
            <div className={styles.btnRow}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => {
                  setShowSmallMaskDialog(false);
                  void submitInpaintPrompt();
                }}
              >
                Continue
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setShowSmallMaskDialog(false)}
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
