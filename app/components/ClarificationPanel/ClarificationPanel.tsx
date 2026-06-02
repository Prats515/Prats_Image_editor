"use client";

import { useMemo, useState } from "react";
import { useEditor } from "../EditorContext";
import { QuestionCard } from "./QuestionCard";
import type { ClarificationAnswer } from "../../../lib/types";
import { validateOtherAnswer } from "../../../lib/validators";
import styles from "../editor.module.css";

export function ClarificationPanel() {
  const {
    clarifyingQuestions,
    clarificationAnswers,
    setClarificationAnswer,
    submitClarifications,
    step,
  } = useEditor();

  const [localOther, setLocalOther] = useState<Record<string, string>>({});

  const allAnswered = useMemo(() => {
    return clarifyingQuestions.every((q) => {
      const ans = clarificationAnswers.find((a) => a.questionId === q.id);
      if (!ans) return false;
      if (ans.isOther) {
        const text = localOther[q.id] ?? ans.selectedOption;
        return validateOtherAnswer(text);
      }
      return ans.selectedOption.length > 0;
    });
  }, [clarifyingQuestions, clarificationAnswers, localOther]);

  const handleSelect = (
    questionId: string,
    option: string,
    isOther: boolean
  ) => {
    const answer: ClarificationAnswer = {
      questionId,
      selectedOption: isOther ? (localOther[questionId] ?? "") : option,
      isOther,
    };
    setClarificationAnswer(questionId, answer);
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>A few quick questions</h2>
      {clarifyingQuestions.map((q) => {
        const ans = clarificationAnswers.find((a) => a.questionId === q.id);
        return (
          <QuestionCard
            key={q.id}
            question={q}
            selectedOption={ans?.isOther ? null : (ans?.selectedOption ?? null)}
            isOther={ans?.isOther ?? false}
            otherText={localOther[q.id] ?? (ans?.isOther ? ans.selectedOption : "")}
            onSelect={(opt, isOther) => handleSelect(q.id, opt, isOther)}
            onOtherText={(text) => {
              setLocalOther((prev) => ({ ...prev, [q.id]: text }));
              setClarificationAnswer(q.id, {
                questionId: q.id,
                selectedOption: text,
                isOther: true,
              });
            }}
          />
        );
      })}
      <div className={styles.btnRow}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={!allAnswered || step === "ENHANCING"}
          onClick={() => void submitClarifications()}
        >
          {step === "ENHANCING" ? "Enhancing…" : "Submit answers"}
        </button>
      </div>
    </section>
  );
}
