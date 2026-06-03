/**
 * Pure validation functions for the Smart AI Image Editor.
 *
 * All functions are side-effect-free with no I/O — safe to call from both
 * client and server contexts. Each function references the requirement(s)
 * it enforces via JSDoc.
 */

import type { ReferenceFile } from "./types";

// ---------------------------------------------------------------------------
// Allowed MIME types for Reference_Input files
// ---------------------------------------------------------------------------
const ALLOWED_MIME_TYPES = new Set<ReferenceFile["mimeType"]>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

/** Maximum allowed size for a Reference_Input file (10 MB). */
const MAX_REFERENCE_FILE_BYTES = 10 * 1024 * 1024; // 10 485 760

// ---------------------------------------------------------------------------
// Prompt & field length validators
// ---------------------------------------------------------------------------

/**
 * Validates the length of a Casual_Prompt.
 * Returns `true` when 1 ≤ `s.length` ≤ 2000.
 *
 * **Satisfies: Requirement 1.1** — the Platform accepts prompts up to 2,000
 * characters and blocks further input at the limit.
 *
 * Property 1 in the test suite.
 */
export function validatePromptLength(s: string): boolean {
  return s.length >= 1 && s.length <= 2000;
}

/**
 * Validates the number of Reference_Input files in a single submission.
 * Returns `true` when 1 ≤ `files.length` ≤ 5.
 *
 * **Satisfies: Requirement 1.2** — accepts up to 5 files per submission.
 *
 * Property 2 in the test suite.
 */
export function validateReferenceFileCount(files: ReferenceFile[]): boolean {
  return files.length >= 1 && files.length <= 5;
}

/**
 * Validates an individual Reference_Input file.
 * Returns `true` when:
 *  - `file.sizeBytes` ≤ 10 485 760 (10 MB), AND
 *  - `file.mimeType` is one of: image/jpeg, image/png, image/webp,
 *    application/pdf, text/plain.
 *
 * **Satisfies: Requirement 1.4** (size limit) and **Requirement 1.5**
 * (unsupported format rejection).
 *
 * Property 3 in the test suite.
 */
export function validateReferenceFile(file: ReferenceFile): boolean {
  return (
    file.sizeBytes <= MAX_REFERENCE_FILE_BYTES &&
    ALLOWED_MIME_TYPES.has(file.mimeType)
  );
}

/**
 * Validates a free-text "Other" answer submitted for a clarifying question.
 * Returns `true` when the trimmed string length is 1–200 characters.
 *
 * **Satisfies: Requirement 3.5** — the "Other" text input accepts 1–200
 * characters and blocks submission when the field is empty.
 *
 * Property 9 in the test suite.
 */
export function validateOtherAnswer(s: string): boolean {
  const trimmed = s.trim();
  return trimmed.length >= 1 && trimmed.length <= 200;
}

/**
 * Validates the length of an Enhanced_Prompt field (the editable review
 * textarea and the `finalPrompt` sent to generation/inpainting routes).
 * Returns `true` when `s.length` ≤ 4000.
 *
 * **Satisfies: Requirement 5.6** — blocks input beyond 4,000 characters and
 * prevents submission of prompts exceeding 4,000 characters.
 *
 * Property 13 in the test suite.
 */
export function validateEnhancedPromptFieldLength(s: string): boolean {
  return s.length <= 4000;
}

// ---------------------------------------------------------------------------
// Inpainting validators
// ---------------------------------------------------------------------------

/**
 * Validates the brush size for the Inpainting_Tool.
 * Returns `true` when `n` is an integer in the range [5, 100].
 *
 * **Satisfies: Requirement 8.3** — the brush size range is 5–100 pixels.
 *
 * Property 20 in the test suite.
 */
export function validateBrushSize(n: number): boolean {
  return Number.isInteger(n) && n >= 5 && n <= 100;
}

/**
 * Validates that a mask data URL is a PNG-encoded Base64 data URL.
 * Returns `true` when `s` starts with `"data:image/png;base64,"`.
 *
 * **Satisfies: Requirement 8.5** — the Inpaint_Mask must be passed as a PNG
 * data URL to the inpainting API route.
 *
 * Property 22 in the test suite.
 */
export function validateMaskDataUrl(s: string): boolean {
  return s.startsWith("data:image/png;base64,");
}

/**
 * Validates the full inpainting request body received by `POST /api/inpaint`.
 * Returns `true` when ALL of the following are satisfied:
 *  - `sourceImageKey` is a non-empty string
 *  - `maskDataUrl` passes `validateMaskDataUrl`
 *  - `finalPrompt` is a non-empty string of ≤ 4,000 characters
 *  - `mode` is exactly `"fast"` or `"quality"`
 *
 * **Satisfies: Requirement 8.5** (inpaint fields) and **Requirement 10.2**
 * (API route input validation returning 400 on failure).
 *
 * Property 22 in the test suite.
 */
export function validateInpaintRequestBody(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;

  const b = body as Record<string, unknown>;

  const sourceImageKeyValid =
    typeof b.sourceImageKey === "string" && b.sourceImageKey.length > 0;

  const maskDataUrlValid =
    typeof b.maskDataUrl === "string" && validateMaskDataUrl(b.maskDataUrl);

  const finalPromptValid =
    typeof b.finalPrompt === "string" &&
    b.finalPrompt.length > 0 &&
    b.finalPrompt.length <= 4000;

  const modeValid = b.mode === "fast" || b.mode === "quality";

  return (
    sourceImageKeyValid && maskDataUrlValid && finalPromptValid && modeValid
  );
}

// ---------------------------------------------------------------------------
// Model mapping
// ---------------------------------------------------------------------------

/**
 * Maps a generation mode string to the corresponding Hugging Face FLUX model identifier.
 *
 * | mode      | model                            |
 * |-----------|----------------------------------|
 * | "fast"    | black-forest-labs/FLUX.1-schnell |
 * | "quality" | black-forest-labs/FLUX.1-dev     |
 *
 * **Satisfies: Requirement 6.3** (fast → FLUX.1-schnell) and
 * **Requirement 6.4** (quality → FLUX.1-dev).
 *
 * Property 14 in the test suite.
 */
export function mapModeToModel(mode: "fast" | "quality"): string {
  if (mode === "fast") {
    return "black-forest-labs/FLUX.1-schnell";
  }
  return "black-forest-labs/FLUX.1-dev";
}
