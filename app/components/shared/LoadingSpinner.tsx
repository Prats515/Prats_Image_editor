"use client";

import styles from "../editor.module.css";

interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = "Loading…" }: LoadingSpinnerProps) {
  return (
    <div className={styles.spinnerWrap} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden />
      <span>{label}</span>
    </div>
  );
}
