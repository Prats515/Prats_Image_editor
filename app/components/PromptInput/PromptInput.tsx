"use client";

import { useRef, useState } from "react";
import { useEditor } from "../EditorContext";
import { CharCounter } from "../shared/CharCounter";
import { ErrorBanner } from "../shared/ErrorBanner";
import { FilePreview } from "./FilePreview";
import type { ReferenceFile } from "../../../lib/types";
import {
  validateReferenceFile,
  validateReferenceFileCount,
} from "../../../lib/validators";
import styles from "../editor.module.css";

const MAX_PROMPT = 2000;
const MAX_FILES = 5;
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
] as const;

export function PromptInput() {
  const {
    casualPrompt,
    referenceFiles,
    setCasualPrompt,
    setReferenceFiles,
    submitPrompt,
    clearAll,
    step,
  } = useEditor();

  const [fileError, setFileError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    casualPrompt.trim().length > 0 && step !== "ANALYZING";

  const readFile = (file: File): Promise<ReferenceFile> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          mimeType: file.type as ReferenceFile["mimeType"],
          sizeBytes: file.size,
          dataUrl: reader.result as string,
        });
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleFiles = async (list: FileList | null) => {
    if (!list) return;
    setFileError("");

    const next = [...referenceFiles];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        setFileError(`Maximum ${MAX_FILES} files allowed.`);
        break;
      }

      if (!ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])) {
        setFileError(
          `Unsupported format "${file.type}". Allowed: JPEG, PNG, WebP, PDF, TXT.`
        );
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        setFileError(
          `File "${file.name}" exceeds 10 MB (${file.size} bytes).`
        );
        continue;
      }

      const ref = await readFile(file);
      if (!validateReferenceFile(ref)) {
        setFileError(`File "${file.name}" failed validation.`);
        continue;
      }
      next.push(ref);
    }

    if (validateReferenceFileCount(next) || next.length === 0) {
      setReferenceFiles(next);
    }
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Describe your image</h2>

      <div className={styles.fieldRow}>
        <label htmlFor="casual-prompt">Your idea</label>
        <CharCounter current={casualPrompt.length} max={MAX_PROMPT} />
      </div>
      <textarea
        id="casual-prompt"
        className={styles.textarea}
        rows={5}
        maxLength={MAX_PROMPT}
        placeholder="e.g. A cozy cabin in the woods at sunset, watercolor style…"
        value={casualPrompt}
        onChange={(e) => setCasualPrompt(e.target.value)}
        disabled={step === "ANALYZING"}
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_MIMES.join(",")}
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        className={styles.dropZone}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        Add reference files (images, PDF, TXT) — up to {MAX_FILES}
      </div>

      <FilePreview
        files={referenceFiles}
        onRemove={(i) =>
          setReferenceFiles(referenceFiles.filter((_, idx) => idx !== i))
        }
      />
      <ErrorBanner message={fileError} compact />

      <div className={styles.btnRow}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={!canSubmit}
          onClick={() => void submitPrompt()}
        >
          {step === "ANALYZING" ? "Analyzing…" : "Continue"}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={clearAll}
        >
          Clear / Start Over
        </button>
      </div>
    </section>
  );
}
