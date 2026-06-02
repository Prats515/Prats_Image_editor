"use client";

import styles from "../editor.module.css";

interface ErrorBannerProps {
  message: string;
  compact?: boolean;
}

export function ErrorBanner({ message, compact = false }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      className={compact ? styles.errorBannerCompact : styles.errorBanner}
      role="alert"
    >
      {message}
    </div>
  );
}
