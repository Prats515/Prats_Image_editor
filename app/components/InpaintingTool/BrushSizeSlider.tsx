"use client";

import { validateBrushSize } from "../../../lib/validators";
import styles from "../editor.module.css";

interface BrushSizeSliderProps {
  value: number;
  onChange: (n: number) => void;
}

export function BrushSizeSlider({ value, onChange }: BrushSizeSliderProps) {
  return (
    <label className={styles.brushSlider}>
      Brush size: {value}px
      <input
        type="range"
        min={5}
        max={100}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (validateBrushSize(n)) onChange(n);
        }}
      />
    </label>
  );
}
