/**
 * app/api/enhance/route.ts
 *
 * POST /api/enhance
 *
 * Accepts an IntentRecord, ClarificationAnswer[], and optional StyleDNA /
 * inpainting context, calls Groq to produce a single Enhanced_Prompt string
 * (50–500 chars), and returns:
 *   { enhancedPrompt: string }
 *
 * Error responses:
 *   413 — payload > 15 MB
 *   400 — Zod validation failure (field details included)
 *   451 — content policy violation from Groq
 *   503 — enhanced prompt outside 50–500 char bounds after one retry, or
 *          Groq non-content-policy error after one retry (retryable, answers preserved)
 *   500 — unhandled exception
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.8, 10.1, 10.2
 */

import { z } from "zod";
import { callGroq, GroqError, type GroqMessage } from "../../../lib/groq";
import {
  checkPayloadSize,
  handleUnexpectedError,
  jsonResponse,
  generateRequestId,
} from "../../../lib/apiMiddleware";
import { buildStyleDnaSystemPrompt } from "../../../lib/styleDna";
import type { IntentRecord, ClarificationAnswer, StyleDNA } from "../../../lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROQ_TIMEOUT_MS = 15_000;
const MIN_PROMPT_LENGTH = 50;
const MAX_PROMPT_LENGTH = 500;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const IntentRecordSchema = z.object({
  primarySubject: z.string().nullable(),
  setting: z.string().nullable(),
  artisticStyle: z.string().nullable(),
  moodOrTone: z.string().nullable(),
  colorPaletteCues: z.string().nullable(),
  rawPrompt: z.string(),
  referenceFileCount: z.number().int().nonnegative(),
});

const ClarificationAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOption: z.string().min(1),
  isOther: z.boolean(),
});

const StyleDNASchema = z.object({
  dominantColors: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
    .min(3)
    .max(8),
  artisticStyleLabel: z.string().min(1),
  lightingDescriptor: z.string().min(1),
  textureDescriptor: z.string().min(1),
});

const EnhanceRequestSchema = z.object({
  intentRecord: IntentRecordSchema,
  clarificationAnswers: z.array(ClarificationAnswerSchema),
  styleDNA: StyleDNASchema.optional(),
  isInpainting: z.boolean().optional(),
  maskCoverage: z.number().min(0).max(1).optional(),
});

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

const BASE_SYSTEM_PROMPT =
  "You are a professional AI image prompt engineer. " +
  "Rewrite the user's intent into a single detailed image generation prompt " +
  "between 50 and 500 characters. " +
  "Cover: subject, style, composition, lighting, color palette, and mood. " +
  "Return ONLY the prompt text, no explanation, no quotes.";

function buildSystemPrompt(
  styleDNA: StyleDNA | undefined,
  isInpainting: boolean
): string {
  let systemPrompt = BASE_SYSTEM_PROMPT;

  if (styleDNA !== undefined) {
    systemPrompt += " " + buildStyleDnaSystemPrompt(styleDNA);
  }

  if (isInpainting) {
    systemPrompt +=
      " Only modify the masked region. " +
      "Preserve all image content outside the mask unchanged.";
  }

  return systemPrompt;
}

// ---------------------------------------------------------------------------
// User message builder
// ---------------------------------------------------------------------------

function buildUserMessage(
  intentRecord: IntentRecord,
  clarificationAnswers: ClarificationAnswer[]
): string {
  const lines: string[] = [];

  lines.push(`Original prompt: "${intentRecord.rawPrompt}"`);

  if (intentRecord.primarySubject !== null) {
    lines.push(`Primary subject: ${intentRecord.primarySubject}`);
  }
  if (intentRecord.setting !== null) {
    lines.push(`Setting: ${intentRecord.setting}`);
  }
  if (intentRecord.artisticStyle !== null) {
    lines.push(`Artistic style: ${intentRecord.artisticStyle}`);
  }
  if (intentRecord.moodOrTone !== null) {
    lines.push(`Mood/tone: ${intentRecord.moodOrTone}`);
  }
  if (intentRecord.colorPaletteCues !== null) {
    lines.push(`Color palette: ${intentRecord.colorPaletteCues}`);
  }

  if (clarificationAnswers.length > 0) {
    lines.push("");
    lines.push("User clarifications:");
    for (const answer of clarificationAnswers) {
      lines.push(`- ${answer.selectedOption}`);
    }
  }

  lines.push("");
  lines.push(
    "Rewrite the above into a single detailed image generation prompt (50–500 characters). " +
      "Return ONLY the prompt text."
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helper: validate prompt length (50–500 chars)
// ---------------------------------------------------------------------------

function isValidEnhancedPrompt(text: string): boolean {
  return text.length >= MIN_PROMPT_LENGTH && text.length <= MAX_PROMPT_LENGTH;
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
    let rawBody: unknown;
    try {
      rawBody = await request.json();
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

    // ── 3. Validate body with Zod ───────────────────────────────────────────
    const parseResult = EnhanceRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return jsonResponse(
        {
          error: "Validation failed",
          details: fieldErrors,
        },
        400
      );
    }

    const {
      intentRecord,
      clarificationAnswers,
      styleDNA,
      isInpainting = false,
      // maskCoverage is accepted but not used in prompt building
    } = parseResult.data;

    // ── 4. Build prompts ────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(styleDNA, isInpainting);
    const userMessage = buildUserMessage(intentRecord, clarificationAnswers);

    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    // ── 5. Call Groq with 15 s timeout ──────────────────────────────────────
    // callGroq already retries once internally (in groq.ts). We call it
    // here; if it throws a content_policy GroqError we return 451 immediately.
    // Any other GroqError after groq.ts's built-in retry → 503.
    let groqResult: string;

    try {
      groqResult = await callGroq(messages, GROQ_TIMEOUT_MS);
    } catch (err) {
      if (err instanceof GroqError && err.type === "content_policy") {
        return jsonResponse({ error: "Content policy violation" }, 451);
      }
      // Other Groq errors (timeout, api_error, parse_error) after retry
      return jsonResponse({ error: "enhance_failed", retryable: true }, 503);
    }

    // ── 6. Validate response length (50–500 chars); retry once if invalid ───
    const trimmedResult = groqResult.trim();

    if (!isValidEnhancedPrompt(trimmedResult)) {
      // Retry once with an explicit length nudge
      const retryMessages: GroqMessage[] = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            userMessage +
            "\n\nIMPORTANT: Your response must be between 50 and 500 characters. " +
            "Return ONLY the prompt text, nothing else.",
        },
      ];

      let retryResult: string;
      try {
        retryResult = await callGroq(retryMessages, GROQ_TIMEOUT_MS);
      } catch (retryErr) {
        if (
          retryErr instanceof GroqError &&
          retryErr.type === "content_policy"
        ) {
          return jsonResponse({ error: "Content policy violation" }, 451);
        }
        return jsonResponse({ error: "enhance_failed", retryable: true }, 503);
      }

      const trimmedRetry = retryResult.trim();
      if (!isValidEnhancedPrompt(trimmedRetry)) {
        return jsonResponse({ error: "enhance_failed", retryable: true }, 503);
      }

      return jsonResponse({ enhancedPrompt: trimmedRetry });
    }

    // ── 7. Return success ───────────────────────────────────────────────────
    return jsonResponse({ enhancedPrompt: trimmedResult });
  } catch (err) {
    // ── 8. Catch-all — handleUnexpectedError returns 500 with no internals ──
    return handleUnexpectedError(err, requestId);
  }
}
