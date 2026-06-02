"use client";

import { useState } from "react";
import type { ClarifyingQuestion } from "../../../lib/types";
import { validateOtherAnswer } from "../../../lib/validators";
import styles from "../editor.module.css";

interface QuestionCardProps {
  question: ClarifyingQuestion;
  selectedOption: string | null;
  isOther: boolean;
  otherText: string;
  onSelect: (option: string, isOther: boolean) => void;
  onOtherText: (text: string) => void;
}

export function QuestionCard({
  question,
  selectedOption,
  isOther,
  otherText,
  onSelect,
  onOtherText,
}: QuestionCardProps) {
  const [otherError, setOtherError] = useState("");

  return (
    <fieldset className={styles.questionCard}>
      <legend>{question.question}</legend>
      {question.options.map((opt) => (
        <label key={opt} className={styles.optionLabel}>
          <input
            type="radio"
            name={question.id}
            checked={!isOther && selectedOption === opt}
            onChange={() => onSelect(opt, false)}
          />
          {opt}
        </label>
      ))}
      <label className={styles.optionLabel}>
        <input
          type="radio"
          name={question.id}
          checked={isOther}
          onChange={() => onSelect("Other", true)}
        />
        Other
      </label>
      {isOther && (
        <>
          <input
            className={styles.input}
            type="text"
            maxLength={200}
            placeholder="Your answer (1–200 characters)"
            value={otherText}
            onChange={(e) => {
              const v = e.target.value;
              onOtherText(v);
              if (v.trim().length > 0 && !validateOtherAnswer(v)) {
                setOtherError("Answer must be 1–200 characters.");
              } else if (v.trim().length === 0) {
                setOtherError("Please enter your answer.");
              } else {
                setOtherError("");
              }
            }}
          />
          {otherError && (
            <p className={styles.errorBannerCompact} role="alert">
              {otherError}
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
