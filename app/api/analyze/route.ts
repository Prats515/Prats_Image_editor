/**
 * app/api/analyze/route.ts
 *
 * POST /api/analyze
 *
 * Accepts a Casual_Prompt and optional Reference_Input files, calls the Groq
 * API (Llama 3.3 70B) to extract a structured IntentRecord, and returns:
 *   { intentRecord: IntentRecord; hasAmbiguities: boolean }
 *
 * Error responses:
 *   413 — payload > 15 MB
 *   400 — validation failure (prompt length, file count, file size/MIME)
 *   422 — primarySubject could not be determined
 *   500 — unhandled exception
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.5
 */

import { z } from "zod";
import { callGroq, GroqError, type GroqMessage } from "../../../lib/groq";
import type { IntentRecord } from "../../../lib/types";
import {
  validatePromptLength,
  validateReferenceFile,
  validateReferenceFileCount,
} from "../../../lib/validators";
import {
  checkPayloadSize,
  handleUnexpectedError,
  jsonResponse,
  generateRequestId,
} from "../../../lib/apiMiddleware";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROQ_TIMEOUT_MS = 15_000;
const MAX_REFERENCE_FILES = 5;

// ---------------------------------------------------------------------------
// Zod schema for IntentRecord validation
// ---------------------------------------------------------------------------

const IntentRecordSchema = z.object({
  primarySubject: z.string().nullable(),
  setting: z.string().nullable(),
  artisticStyle: z.string().nullable(),
  moodOrTone: z.string().nullable(),
  colorPaletteCues: z.string().nullable(),
  rawPrompt: z.string(),
  referenceFileCount: z.number(),
});

// ---------------------------------------------------------------------------
// Request body shape
// ---------------------------------------------------------------------------

interface ReferenceFileInput {
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

interface AnalyzeRequestBody {
  prompt: string;
  referenceFiles?: ReferenceFileInput[];
  isInpainting?: boolean;
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(isInpainting: boolean): string {
  const scopeNote = isInpainting
    ? `\n\nIMPORTANT: This is an INPAINTING request. Analyze ONLY the masked region the user wants to change. Ignore aspects of the image outside the masked area.`
    : "";

  return `You are an intent analysis assistant for an AI image editor. Your task is to analyze a user's casual image description and extract structured attributes.${scopeNote}

You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

The JSON object must exactly match this schema:
{
  "primarySubject": string | null,
  "setting": string | null,
  "artisticStyle": string | null,
  "moodOrTone": string | null,
  "colorPaletteCues": string | null,
  "rawPrompt": string,
  "referenceFileCount": number
}

Rules:
- "primarySubject": The main subject or object in the image. Set to null if it cannot be determined.
- "setting": The environment, background, or location. Set to null if not mentioned or determinable.
- "artisticStyle": Any artistic style reference (e.g. "oil painting", "photorealistic", "anime"). Set to null if not mentioned.
- "moodOrTone": The emotional tone or mood (e.g. "melancholic", "vibrant", "mysterious"). Set to null if not mentioned.
- "colorPaletteCues": Any color hints or palette references (e.g. "warm golden tones", "muted blues"). Set to null if not mentioned.
- "rawPrompt": Copy the user's original prompt exactly as provided.
- "referenceFileCount": The number of reference files provided (integer).

Use null (not the string "null") when an attribute cannot be determined. Do NOT omit any key.`;
}

function buildUserMessage(
  prompt: string,
  referenceFiles: ReferenceFileInput[]
): string {
  let message = `Analyze this image description:\n\n"${prompt}"`;

  if (referenceFiles.length > 0) {
    message += `\n\nReference files provided (${referenceFiles.length}):`;
    for (const file of referenceFiles) {
      // Strip dataUrl — only include name and mimeType for Groq
      message += `\n- ${file.name} (${file.mimeType})`;
    }
    message += `\n\nNote: When reference files are provided, use them to augment the attribute extraction. Reference file information takes precedence over the casual prompt for the same attribute.`;
  }

  message += `\n\nRespond with only the JSON object.`;
  return message;
}

function buildRetryUserMessage(
  prompt: string,
  referenceFiles: ReferenceFileInput[]
): string {
  return (
    buildUserMessage(prompt, referenceFiles) +
    "\n\nIMPORTANT: Your previous response was not valid JSON. Respond ONLY with valid JSON. No markdown, no code blocks, no explanations."
  );
}

// ---------------------------------------------------------------------------
// Groq call with parse + retry
// ---------------------------------------------------------------------------

async function analyzeWithGroq(
  prompt: string,
  referenceFiles: ReferenceFileInput[],
  isInpainting: boolean
): Promise<IntentRecord> {
  const systemPrompt = buildSystemPrompt(isInpainting);
  const userMessage = buildUserMessage(prompt, referenceFiles);

  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  // First attempt
  let rawResponse = await callGroq(messages, GROQ_TIMEOUT_MS);
  let parsed = tryParseIntentRecord(rawResponse, referenceFiles.length);

  if (parsed !== null) {
    return parsed;
  }

  // Retry once with explicit JSON instruction
  const retryMessages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildRetryUserMessage(prompt, referenceFiles) },
  ];

  rawResponse = await callGroq(retryMessages, GROQ_TIMEOUT_MS);
  parsed = tryParseIntentRecord(rawResponse, referenceFiles.length);

  if (parsed !== null) {
    return parsed;
  }

  throw new GroqError(
    "Groq response could not be parsed as IntentRecord after retry",
    "parse_error"
  );
}

/**
 * Attempts to parse a raw string as JSON, then validates with the Zod schema.
 * Returns null on any parse or validation failure.
 */
function tryParseIntentRecord(
  raw: string,
  referenceFileCount: number
): IntentRecord | null {
  try {
    // Strip potential markdown code fences if the model wraps in ```json ... ```
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const json = JSON.parse(cleaned);
    const result = IntentRecordSchema.safeParse(json);

    if (!result.success) {
      return null;
    }

    const data = result.data;

    // Ensure referenceFileCount matches what we sent (override model's value)
    return {
      primarySubject: data.primarySubject,
      setting: data.setting,
      artisticStyle: data.artisticStyle,
      moodOrTone: data.moodOrTone,
      colorPaletteCues: data.colorPaletteCues,
      rawPrompt: data.rawPrompt,
      referenceFileCount,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  const requestId = generateRequestId();

  try {
    // ── 1. Payload size guard ───────────────────────────────────────────────
    const sizeError = checkPayloadSize(request);
    if (sizeError !== null) {
      return sizeError;
    }

    // ── 2. Parse JSON body ──────────────────────────────────────────────────
    let body: AnalyzeRequestBody;
    try {
      body = (await request.json()) as AnalyzeRequestBody;
    } catch {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "body",
          reason: "Request body must be valid JSON",
        },
        400
      );
    }

    // ── 3. Validate prompt ──────────────────────────────────────────────────
    if (typeof body.prompt !== "string") {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "prompt",
          reason: "prompt must be a string",
        },
        400
      );
    }

    if (!validatePromptLength(body.prompt)) {
      const len = body.prompt.length;
      const reason =
        len === 0
          ? "prompt must be at least 1 character"
          : `prompt must not exceed 2000 characters (received ${len})`;

      return jsonResponse(
        { error: "Validation failed", field: "prompt", reason },
        400
      );
    }

    // ── 4. Validate referenceFiles ──────────────────────────────────────────
    const referenceFiles: ReferenceFileInput[] = [];

    if (body.referenceFiles !== undefined) {
      if (!Array.isArray(body.referenceFiles)) {
        return jsonResponse(
          {
            error: "Validation failed",
            field: "referenceFiles",
            reason: "referenceFiles must be an array",
          },
          400
        );
      }

      // Count check (max 5)
      if (body.referenceFiles.length > MAX_REFERENCE_FILES) {
        return jsonResponse(
          {
            error: "Validation failed",
            field: "referenceFiles",
            reason: `A maximum of ${MAX_REFERENCE_FILES} reference files are allowed (received ${body.referenceFiles.length})`,
          },
          400
        );
      }

      // Per-file validation
      for (let i = 0; i < body.referenceFiles.length; i++) {
        const file = body.referenceFiles[i];

        // Basic shape check
        if (
          typeof file !== "object" ||
          file === null ||
          typeof file.name !== "string" ||
          typeof file.mimeType !== "string" ||
          typeof file.sizeBytes !== "number" ||
          typeof file.dataUrl !== "string"
        ) {
          return jsonResponse(
            {
              error: "Validation failed",
              field: `referenceFiles[${i}]`,
              reason: "Each reference file must have name, mimeType, sizeBytes, and dataUrl",
            },
            400
          );
        }

        // Delegate to validator (size + MIME type)
        const isValid = validateReferenceFile({
          name: file.name,
          mimeType: file.mimeType as Parameters<typeof validateReferenceFile>[0]["mimeType"],
          sizeBytes: file.sizeBytes,
          dataUrl: file.dataUrl,
        });

        if (!isValid) {
          const MAX_FILE_BYTES = 10 * 1024 * 1024;
          const ALLOWED_MIMES = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
            "text/plain",
          ];

          let reason: string;
          if (file.sizeBytes > MAX_FILE_BYTES) {
            reason = `File exceeds the 10 MB limit (size: ${file.sizeBytes} bytes)`;
          } else if (!ALLOWED_MIMES.includes(file.mimeType)) {
            reason = `Unsupported file type "${file.mimeType}". Allowed types: ${ALLOWED_MIMES.join(", ")}`;
          } else {
            reason = "File failed validation";
          }

          return jsonResponse(
            {
              error: "Validation failed",
              field: `referenceFiles[${i}]`,
              reason,
            },
            400
          );
        }

        referenceFiles.push(file);
      }
    }

    // ── 5. Call Groq ────────────────────────────────────────────────────────
    const intentRecord = await analyzeWithGroq(
      body.prompt,
      referenceFiles,
      body.isInpainting === true
    );

    // ── 6. Primary subject guard ────────────────────────────────────────────
    if (intentRecord.primarySubject === null) {
      return jsonResponse({ error: "no_primary_subject" }, 422);
    }

    // ── 7. Compute hasAmbiguities ───────────────────────────────────────────
    const hasAmbiguities =
      intentRecord.setting === null ||
      intentRecord.artisticStyle === null ||
      intentRecord.moodOrTone === null ||
      intentRecord.colorPaletteCues === null;

    // ── 8. Success response ─────────────────────────────────────────────────
    return jsonResponse({ intentRecord, hasAmbiguities });
  } catch (err) {
    return handleUnexpectedError(err, requestId);
  }
}
