/**
 * app/api/enhance/route.ts
 *
 * POST /api/enhance
 *
 * Accepts a simple prompt and returns a professional, enhanced prompt with:
 * - Enhanced prompt (150-300 words, highly detailed)
 * - Creative improvements list
 * - Optional suggestions
 * - Analysis details (subject, purpose, style, mood)
 *
 * Uses professional prompt engineering workflow acting as a creative director.
 *
 * Error responses:
 *   413 — payload > 15 MB
 *   400 — Zod validation failure
 *   451 — content policy violation from Groq
 *   503 — enhancement failed after retry
 *   500 — unhandled exception
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.8, 10.1, 10.2
 */

import { z } from "zod";
import { getEnhancedPrompt, type EnhancementResult } from "../../../lib/promptEnhancer";
import { GroqError } from "../../../lib/groq";
import {
  checkPayloadSize,
  handleUnexpectedError,
  jsonResponse,
  generateRequestId,
} from "../../../lib/apiMiddleware";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROQ_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const EnhanceRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
});

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

    const { prompt } = parseResult.data;

    // ── 4. Call professional enhancement system ─────────────────────────────
    let enhancement: EnhancementResult;
    try {
      console.log("[Enhance] Calling professional enhancement system for:", prompt.substring(0, 50), "...");
      enhancement = await getEnhancedPrompt(prompt);
      console.log("[Enhance] Enhancement complete");
    } catch (err) {
      console.error("[Enhance] Error:", {
        type: err instanceof Error ? err.constructor.name : "Unknown",
        message: err instanceof Error ? err.message : String(err),
      });
      if (err instanceof GroqError && err.type === "content_policy") {
        return jsonResponse({ error: "Content policy violation" }, 451);
      }
      // Other errors → retryable
      return jsonResponse({ error: "enhance_failed", retryable: true }, 503);
    }

    // ── 5. Return structured enhancement result ─────────────────────────────
    return jsonResponse({
      enhancedPrompt: enhancement.enhancedPrompt,
      creativeImprovements: enhancement.creativeImprovements,
      optionalSuggestions: enhancement.optionalSuggestions,
      analysisDetails: enhancement.analysisDetails,
    });
  } catch (err) {
    // ── 6. Catch-all — handleUnexpectedError returns 500 with no internals ──
    return handleUnexpectedError(err, requestId);
  }
}
