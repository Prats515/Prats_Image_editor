"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiGet, apiPost } from "../../lib/apiClient";
import type {
  ClarificationAnswer,
  ClarifyingQuestion,
  HistoryEntry,
  IntentRecord,
  ReferenceFile,
  StyleDNA,
} from "../../lib/types";

export type EditorStep =
  | "IDLE"
  | "INPAINT_MASK"
  | "ANALYZING"
  | "CLARIFYING"
  | "ENHANCING"
  | "REVIEWING"
  | "GENERATING"
  | "DONE";

interface AnalyzeResponse {
  intentRecord: IntentRecord;
  hasAmbiguities: boolean;
}

interface ClarifyResponse {
  questions: ClarifyingQuestion[];
}

interface EnhanceResponse {
  enhancedPrompt: string;
  creativeImprovements?: string[];
  optionalSuggestions?: string[];
  analysisDetails?: {
    detectedSubject: string;
    detectedPurpose: string;
    detectedStyle: string;
    detectedMood: string;
  };
}

interface GenerateStreamMessage {
  status: "processing" | "generating" | "storing" | "complete" | "error";
  message?: string;
  error?: string;
  historyEntryId?: string;
  imageUrl?: string;
  styleDNA?: StyleDNA;
  setCookie?: string;
  retryable?: boolean;
}

interface GenerateResponse {
  historyEntryId: string;
  imageUrl: string;
  styleDNA: StyleDNA;
}

interface HistoryResponse {
  entries: HistoryEntry[];
}

interface SessionResponse {
  sessionId: string;
  isNew: boolean;
  historyCount: number;
}

function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const data = err.data as Record<string, unknown>;
    if (data?.error === "no_primary_subject") {
      return "Please describe the main subject of your image more clearly.";
    }
    if (typeof data?.reason === "string") return data.reason;
    if (typeof data?.message === "string") return data.message;
    if (
      (data?.error === "generation_failed" || data?.error === "inpaint_failed") &&
      typeof data?.message === "string"
    ) {
      return data.message;
    }
    if (data?.error === "Content policy violation") {
      return "Your request cannot be processed due to content restrictions.";
    }
    if (data?.error === "enhance_failed") {
      return "Prompt enhancement failed. Please try again.";
    }
    return `Request failed (${err.status})`;
  }
  if (err instanceof Error && err.name === "AbortError") {
    return "Request timed out. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

interface EditorContextValue {
  step: EditorStep;
  error: string;
  sessionReady: boolean;
  sessionFatal: boolean;
  casualPrompt: string;
  referenceFiles: ReferenceFile[];
  intentRecord: IntentRecord | null;
  clarifyingQuestions: ClarifyingQuestion[];
  clarificationAnswers: ClarificationAnswer[];
  enhancedPrompt: string;
  generationMode: "fast" | "quality";
  isRegenerating: boolean;
  editHistory: HistoryEntry[];
  currentImageUrl: string | null;
  currentStyleDNA: StyleDNA | null;
  selectedHistoryId: string | null;
  inpaintMode: boolean;
  inpaintSourceEntry: HistoryEntry | null;
  inpaintMaskDataUrl: string;
  inpaintMaskCoverage: number;
  inpaintBrushSize: number;
  setCasualPrompt: (s: string) => void;
  setReferenceFiles: (files: ReferenceFile[]) => void;
  setEnhancedPrompt: (s: string) => void;
  setGenerationMode: (mode: "fast" | "quality") => void;
  setClarificationAnswer: (questionId: string, answer: ClarificationAnswer) => void;
  clearAll: () => void;
  submitPrompt: () => Promise<void>;
  submitClarifications: () => Promise<void>;
  regenerateEnhanced: () => Promise<void>;
  approveAndGenerate: () => Promise<void>;
  startNewEdit: () => void;
  restoreFromHistory: (entry: HistoryEntry) => void;
  reloadSession: () => void;
  startInpaint: (entry: HistoryEntry) => void;
  cancelInpaint: () => void;
  setInpaintMask: (maskDataUrl: string, coverage: number) => void;
  setInpaintBrushSize: (n: number) => void;
  clearInpaintMask: () => void;
  submitInpaintPrompt: () => Promise<void>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditor must be used within EditorProvider");
  }
  return ctx;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<EditorStep>("IDLE");
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionFatal, setSessionFatal] = useState(false);
  const [casualPrompt, setCasualPrompt] = useState("");
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([]);
  const [intentRecord, setIntentRecord] = useState<IntentRecord | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<
    ClarifyingQuestion[]
  >([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<
    ClarificationAnswer[]
  >([]);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [generationMode, setGenerationMode] = useState<"fast" | "quality">(
    "fast"
  );
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editHistory, setEditHistory] = useState<HistoryEntry[]>([]);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentStyleDNA, setCurrentStyleDNA] = useState<StyleDNA | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );
  const [inpaintMode, setInpaintMode] = useState(false);
  const [inpaintSourceEntry, setInpaintSourceEntry] =
    useState<HistoryEntry | null>(null);
  const [inpaintMaskDataUrl, setInpaintMaskDataUrl] = useState("");
  const [inpaintMaskCoverage, setInpaintMaskCoverage] = useState(0);
  const [inpaintBrushSize, setInpaintBrushSize] = useState(24);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiGet<HistoryResponse>("/api/history");
      setEditHistory(data.entries);
    } catch {
      setEditHistory([]);
    }
  }, []);

  const bootstrapSession = useCallback(async () => {
    try {
      await apiPost<SessionResponse>("/api/session", {});
      await loadHistory();
      setSessionReady(true);
      setSessionFatal(false);
    } catch {
      setSessionFatal(true);
      setSessionReady(false);
    }
  }, [loadHistory]);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  const runEnhance = useCallback(
    async (record: IntentRecord, answers: ClarificationAnswer[]) => {
      setStep("ENHANCING");
      // Use the simple prompt for enhancement (the professional enhancer doesn't need intent record)
      const data = await apiPost<EnhanceResponse>(
        "/api/enhance",
        { prompt: casualPrompt },
        30_000
      );
      setEnhancedPrompt(data.enhancedPrompt);
      setStep("REVIEWING");
    },
    [casualPrompt]
  );

  const submitPrompt = useCallback(async () => {
    setError("");
    setStep("ANALYZING");
    try {
      const data = await apiPost<AnalyzeResponse>(
        "/api/analyze",
        { prompt: casualPrompt, referenceFiles },
        20_000
      );
      setIntentRecord(data.intentRecord);

      if (!data.hasAmbiguities) {
        setClarifyingQuestions([]);
        setClarificationAnswers([]);
        await runEnhance(data.intentRecord, []);
        return;
      }

      const clarify = await apiPost<ClarifyResponse>(
        "/api/clarify",
        { intentRecord: data.intentRecord },
        20_000
      );
      if (clarify.questions.length === 0) {
        await runEnhance(data.intentRecord, []);
        return;
      }
      setClarifyingQuestions(clarify.questions);
      setClarificationAnswers([]);
      setStep("CLARIFYING");
    } catch (err) {
      setError(apiErrorMessage(err));
      setStep("IDLE");
    }
  }, [casualPrompt, referenceFiles, runEnhance]);

  const setClarificationAnswer = useCallback(
    (questionId: string, answer: ClarificationAnswer) => {
      setClarificationAnswers((prev) => {
        const rest = prev.filter((a) => a.questionId !== questionId);
        return [...rest, answer];
      });
    },
    []
  );

  const submitClarifications = useCallback(async () => {
    if (!intentRecord) return;
    setError("");
    try {
      await runEnhance(intentRecord, clarificationAnswers);
    } catch (err) {
      setError(apiErrorMessage(err));
      setStep("CLARIFYING");
    }
  }, [intentRecord, clarificationAnswers, runEnhance]);

  const regenerateEnhanced = useCallback(async () => {
    if (!intentRecord) return;
    setError("");
    setIsRegenerating(true);
    setEnhancedPrompt("");
    try {
      await runEnhance(intentRecord, clarificationAnswers);
    } catch (err) {
      setError(apiErrorMessage(err));
      setStep("REVIEWING");
    } finally {
      setIsRegenerating(false);
    }
  }, [intentRecord, clarificationAnswers, runEnhance]);

  const approveAndGenerate = useCallback(async () => {
    setError("");
    setStep("GENERATING");
    try {
      let data: GenerateResponse;

      if (
        inpaintMode &&
        inpaintSourceEntry &&
        inpaintMaskDataUrl.length > 0
      ) {
        data = await apiPost<GenerateResponse>(
          "/api/inpaint",
          {
            sourceImageKey: inpaintSourceEntry.imageKey,
            maskDataUrl: inpaintMaskDataUrl,
            finalPrompt: enhancedPrompt.trim(),
            mode: generationMode,
            casualPrompt,
          },
          65_000
        );
        setInpaintMode(false);
        setInpaintSourceEntry(null);
        setInpaintMaskDataUrl("");
        setInpaintMaskCoverage(0);
      } else {
        // Stream-based image generation for /api/generate
        data = await new Promise((resolve, reject) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 180_000); // 3 minute timeout

          fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              finalPrompt: enhancedPrompt.trim(),
              mode: generationMode,
              casualPrompt,
            }),
            signal: controller.signal,
          })
            .then(async (response) => {
              clearTimeout(timeout);
              if (!response.ok) {
                try {
                  const error = await response.json();
                  reject(new ApiError(response.status, error));
                } catch {
                  reject(new ApiError(response.status, { error: "Request failed" }));
                }
                return;
              }

              const reader = response.body?.getReader();
              if (!reader) {
                reject(new ApiError(500, { error: "No response body" }));
                return;
              }

              const decoder = new TextDecoder();
              let buffer = "";

              const readChunk = async () => {
                try {
                  const { done, value } = await reader.read();
                  if (done) {
                    reject(new ApiError(500, { error: "Stream ended prematurely" }));
                    return;
                  }

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() || "";

                  for (const line of lines) {
                    if (!line) continue;
                    try {
                      const msg = JSON.parse(line) as GenerateStreamMessage;
                      if (msg.status === "complete") {
                        resolve({
                          historyEntryId: msg.historyEntryId!,
                          imageUrl: msg.imageUrl!,
                          styleDNA: msg.styleDNA!,
                        });
                        return;
                      } else if (msg.status === "error") {
                        reject(
                          new ApiError(500, {
                            error: msg.error,
                            message: msg.message,
                            retryable: msg.retryable,
                          })
                        );
                        return;
                      }
                      // Process other status messages (processing, generating, storing)
                    } catch {
                      // Ignore parse errors
                    }
                  }

                  readChunk();
                } catch (err) {
                  reject(err);
                }
              };

              readChunk();
            })
            .catch((err) => {
              clearTimeout(timeout);
              if (err instanceof ApiError) {
                reject(err);
              } else if (err instanceof TypeError || err.name === "AbortError") {
                reject(new ApiError(504, { error: "Request timed out" }));
              } else {
                reject(new ApiError(500, { error: String(err) }));
              }
            });
        });
      }

      setCurrentImageUrl(data.imageUrl);
      setCurrentStyleDNA(data.styleDNA);
      setSelectedHistoryId(data.historyEntryId);
      await loadHistory();
      setStep("DONE");
    } catch (err) {
      setError(apiErrorMessage(err));
      setStep("REVIEWING");
    }
  }, [
    enhancedPrompt,
    generationMode,
    casualPrompt,
    loadHistory,
    inpaintMode,
    inpaintSourceEntry,
    inpaintMaskDataUrl,
  ]);

  const startInpaint = useCallback((entry: HistoryEntry) => {
    setInpaintMode(true);
    setInpaintSourceEntry(entry);
    setInpaintMaskDataUrl("");
    setInpaintMaskCoverage(0);
    setInpaintBrushSize(24);
    setCasualPrompt("");
    setReferenceFiles([]);
    setIntentRecord(null);
    setClarifyingQuestions([]);
    setClarificationAnswers([]);
    setEnhancedPrompt("");
    setError("");
    setStep("INPAINT_MASK");
  }, []);

  const cancelInpaint = useCallback(() => {
    setInpaintMode(false);
    setInpaintSourceEntry(null);
    setInpaintMaskDataUrl("");
    setInpaintMaskCoverage(0);
    setStep(currentImageUrl ? "DONE" : "IDLE");
  }, [currentImageUrl]);

  const setInpaintMask = useCallback((maskDataUrl: string, coverage: number) => {
    setInpaintMaskDataUrl(maskDataUrl);
    setInpaintMaskCoverage(coverage);
  }, []);

  const clearInpaintMask = useCallback(() => {
    setInpaintMaskDataUrl("");
    setInpaintMaskCoverage(0);
  }, []);

  const submitInpaintPrompt = useCallback(async () => {
    setError("");
    setStep("ANALYZING");
    try {
      const data = await apiPost<AnalyzeResponse>(
        "/api/analyze",
        { prompt: casualPrompt, referenceFiles: [], isInpainting: true },
        20_000
      );
      setIntentRecord(data.intentRecord);

      if (!data.hasAmbiguities) {
        setClarifyingQuestions([]);
        setClarificationAnswers([]);
        await runEnhance(data.intentRecord, []);
        return;
      }

      const clarify = await apiPost<ClarifyResponse>(
        "/api/clarify",
        { intentRecord: data.intentRecord, isInpainting: true },
        20_000
      );
      if (clarify.questions.length === 0) {
        await runEnhance(data.intentRecord, []);
        return;
      }
      setClarifyingQuestions(clarify.questions);
      setClarificationAnswers([]);
      setStep("CLARIFYING");
    } catch (err) {
      setError(apiErrorMessage(err));
      setStep("INPAINT_MASK");
    }
  }, [casualPrompt, runEnhance]);

  const clearAll = useCallback(() => {
    setCasualPrompt("");
    setReferenceFiles([]);
    setIntentRecord(null);
    setClarifyingQuestions([]);
    setClarificationAnswers([]);
    setEnhancedPrompt("");
    setError("");
    setInpaintMode(false);
    setInpaintSourceEntry(null);
    setInpaintMaskDataUrl("");
    setInpaintMaskCoverage(0);
    setStep("IDLE");
    setSelectedHistoryId(null);
  }, []);

  const startNewEdit = useCallback(() => {
    clearAll();
    setCurrentImageUrl(null);
    setCurrentStyleDNA(null);
  }, [clearAll]);

  const restoreFromHistory = useCallback((entry: HistoryEntry) => {
    setCasualPrompt(entry.casualPrompt);
    setEnhancedPrompt(entry.enhancedPrompt);
    setCurrentStyleDNA(entry.styleDNA);
    setCurrentImageUrl(entry.imageUrl);
    setSelectedHistoryId(entry.id);
    setGenerationMode(entry.mode);
    setIntentRecord({
      primarySubject: entry.casualPrompt.slice(0, 80) || "subject",
      setting: null,
      artisticStyle: entry.styleDNA.artisticStyleLabel,
      moodOrTone: null,
      colorPaletteCues: entry.styleDNA.dominantColors.join(", "),
      rawPrompt: entry.casualPrompt,
      referenceFileCount: 0,
    });
    setClarificationAnswers([]);
    setClarifyingQuestions([]);
    setStep("IDLE");
    setError("");
  }, []);

  const value = useMemo<EditorContextValue>(
    () => ({
      step,
      error,
      sessionReady,
      sessionFatal,
      casualPrompt,
      referenceFiles,
      intentRecord,
      clarifyingQuestions,
      clarificationAnswers,
      enhancedPrompt,
      generationMode,
      isRegenerating,
      editHistory,
      currentImageUrl,
      currentStyleDNA,
      selectedHistoryId,
      inpaintMode,
      inpaintSourceEntry,
      inpaintMaskDataUrl,
      inpaintMaskCoverage,
      inpaintBrushSize,
      setCasualPrompt,
      setReferenceFiles,
      setEnhancedPrompt,
      setGenerationMode,
      setClarificationAnswer,
      clearAll,
      submitPrompt,
      submitClarifications,
      regenerateEnhanced,
      approveAndGenerate,
      startNewEdit,
      restoreFromHistory,
      reloadSession: bootstrapSession,
      startInpaint,
      cancelInpaint,
      setInpaintMask,
      setInpaintBrushSize,
      clearInpaintMask,
      submitInpaintPrompt,
    }),
    [
      step,
      error,
      sessionReady,
      sessionFatal,
      casualPrompt,
      referenceFiles,
      intentRecord,
      clarifyingQuestions,
      clarificationAnswers,
      enhancedPrompt,
      generationMode,
      isRegenerating,
      editHistory,
      currentImageUrl,
      currentStyleDNA,
      selectedHistoryId,
      inpaintMode,
      inpaintSourceEntry,
      inpaintMaskDataUrl,
      inpaintMaskCoverage,
      inpaintBrushSize,
      submitPrompt,
      submitClarifications,
      regenerateEnhanced,
      approveAndGenerate,
      clearAll,
      startNewEdit,
      restoreFromHistory,
      bootstrapSession,
      startInpaint,
      cancelInpaint,
      setInpaintMask,
      clearInpaintMask,
      submitInpaintPrompt,
    ]
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}
