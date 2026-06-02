/**
 * Shared TypeScript interfaces for the Smart AI Image Editor.
 * All data models match the design document exactly.
 */

// ---------------------------------------------------------------------------
// IntentRecord
// Produced by /api/analyze. Contains the structured extraction of the Casual_Prompt.
// null is used (not undefined or field omission) so downstream consumers can
// distinguish "not determinable" from "not asked". Satisfies Requirement 2.2.
// ---------------------------------------------------------------------------
export interface IntentRecord {
  primarySubject: string | null; // null = "absent" sentinel
  setting: string | null;
  artisticStyle: string | null;
  moodOrTone: string | null;
  colorPaletteCues: string | null;
  rawPrompt: string; // original Casual_Prompt, preserved
  referenceFileCount: number;
}

// ---------------------------------------------------------------------------
// ClarifyingQuestion
// Produced by /api/clarify. Each question targets a single IntentRecord field.
// ---------------------------------------------------------------------------
export interface ClarifyingQuestion {
  id: string; // uuid, stable across re-renders
  attribute: string; // which IntentRecord field this resolves
  question: string; // human-readable question text
  options: string[]; // 3–5 derived options
  // "Other" option is always rendered by the UI; it is NOT included here
}

// ---------------------------------------------------------------------------
// ClarificationAnswer
// A user's response to one ClarifyingQuestion.
// ---------------------------------------------------------------------------
export interface ClarificationAnswer {
  questionId: string;
  selectedOption: string; // one of options[], or the free-text value
  isOther: boolean;
}

// ---------------------------------------------------------------------------
// StyleDNA
// Computed after every successful image generation by /api/generate and /api/inpaint.
// Serialised as JSON and stored in R2 alongside the image.
// ---------------------------------------------------------------------------
export interface StyleDNA {
  dominantColors: string[]; // 3–8 hex codes, e.g. ["#1a2b3c", ...]
  artisticStyleLabel: string; // e.g. "oil painting", "cyberpunk render"
  lightingDescriptor: string; // e.g. "golden hour backlit"
  textureDescriptor: string; // e.g. "rough canvas brushwork"
}

// ---------------------------------------------------------------------------
// HistoryEntry
// One item in the Edit_History timeline.
// ---------------------------------------------------------------------------
export interface HistoryEntry {
  id: string; // uuid
  sessionId: string;
  createdAt: string; // ISO 8601
  imageKey: string; // R2 object key
  imageUrl: string; // signed R2 URL (regenerated on read)
  thumbnailKey: string; // R2 key for 160×160 JPEG thumbnail
  casualPrompt: string;
  enhancedPrompt: string;
  styleDNA: StyleDNA;
  mode: "fast" | "quality";
  isInpainted: boolean;
  parentEntryId: string | null; // for inpainted images, points to source
}

// ---------------------------------------------------------------------------
// Session
// Stored in R2 at sessions/{sessionId}/session.json.
// ---------------------------------------------------------------------------
export interface Session {
  sessionId: string; // uuid v4
  createdAt: string; // ISO 8601
  lastActiveAt: string; // updated on every API request
  entryCount: number; // maintained to enforce 50-entry cap
}

// ---------------------------------------------------------------------------
// InpaintState
// Not persisted; lives in browser memory on the MaskCanvas component.
// Sent to /api/inpaint as part of the request body.
// ---------------------------------------------------------------------------
export interface InpaintState {
  sourceEntryId: string; // HistoryEntry being edited
  maskDataUrl: string; // data:image/png;base64,...
  brushSize: number; // 5–100 px
  maskCoverage: number; // 0–1 fraction, computed on every stroke
}

// ---------------------------------------------------------------------------
// ReferenceFile
// Attached alongside a Casual_Prompt; base64-encoded file data.
// dataUrl is stripped before the Groq call.
// ---------------------------------------------------------------------------
export interface ReferenceFile {
  name: string;
  mimeType:
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "application/pdf"
    | "text/plain";
  sizeBytes: number;
  dataUrl: string; // base64 data URL, stripped before Groq call
}
