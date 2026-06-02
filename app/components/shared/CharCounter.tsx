"use client";

import styles from "../editor.module.css";

interface CharCounterProps {
  current: number;
  max: number;
}

export function CharCounter({ current, max }: CharCounterProps) {
  const atLimit = current >= max;
  return (
    <span
      className={`${styles.charCounter} ${atLimit ? styles.charCounterLimit : ""}`}
      aria-live="polite"
    >
      {current} / {max}
    </span>
  );
}
