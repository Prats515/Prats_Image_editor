"use client";

import type { ReferenceFile } from "../../../lib/types";
import styles from "../editor.module.css";

interface FilePreviewProps {
  files: ReferenceFile[];
  onRemove: (index: number) => void;
}

export function FilePreview({ files, onRemove }: FilePreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className={styles.fileList}>
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className={styles.fileChip}>
          {file.mimeType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.dataUrl}
              alt={file.name}
              className={styles.fileThumb}
              width={80}
              height={80}
            />
          ) : (
            <span>
              {file.name} ({file.mimeType.split("/").pop()})
            </span>
          )}
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => onRemove(index)}
            aria-label={`Remove ${file.name}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
