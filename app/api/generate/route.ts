/**
 * POST /api/generate
 *
 * Generates an image from an approved prompt via Cloudflare Workers AI (FLUX),
 * computes StyleDNA, stores assets in R2, and returns a signed image URL.
 *
 * Requirements: 6.1–6.8, 7.1, 7.7, 9.2, 10.1, 10.2
 */

import { z } from "zod";
import { generateImage, CloudflareAiError } from "../../../lib/cloudflareAi";
import { computeStyleDNA } from "../../../lib/styleDna";
import { writeHistoryEntry } from "../../../lib/historyWrite";
import { getSession, updateSessionActivity, getSessionCookieHeader } from "../../../lib/session";
import { parseSessionIdFromCookieHeader } from "../../../lib/sessionCookie";
import {
  checkPayloadSize,
  handleUnexpectedError,
  jsonResponse,
  generateRequestId,
} from "../../../lib/apiMiddleware";
import { validateEnhancedPromptFieldLength } from "../../../lib/validators";

const GenerateRequestSchema = z.object({
  finalPrompt: z.string().min(1),
  mode: z.enum(["fast", "quality"]),
  casualPrompt: z.string().optional(),
});

function jsonWithSessionCookie(
  data: unknown,
  sessionId: string,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": getSessionCookieHeader(sessionId),
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const requestId = generateRequestId();

  try {
    const sizeError = checkPayloadSize(request);
    if (sizeError !== null) {
      return sizeError;
    }

    const sessionId = parseSessionIdFromCookieHeader(
      request.headers.get("cookie")
    );
    if (sessionId === null) {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "sessionId",
          reason: "A valid session cookie is required",
        },
        401
      );
    }

    const session = await getSession(sessionId);
    if (session === null) {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "sessionId",
          reason: "Session not found or expired",
        },
        401
      );
    }

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

    const parseResult = GenerateRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return jsonResponse(
        { error: "Validation failed", details: fieldErrors },
        400
      );
    }

    const { finalPrompt, mode, casualPrompt } = parseResult.data;

    if (!validateEnhancedPromptFieldLength(finalPrompt)) {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "finalPrompt",
          reason: `finalPrompt must not exceed 4000 characters (received ${finalPrompt.length})`,
        },
        400
      );
    }

    let imagePng: Buffer;
    try {
      imagePng = await generateImage(finalPrompt, mode);
    } catch (err) {
      if (err instanceof CloudflareAiError) {
        return jsonResponse(
          {
            error: "generation_failed",
            message:
              err.type === "timeout"
                ? "Image generation timed out. Please try again."
                : "Image generation failed. Please try again.",
            retryable: true,
          },
          err.type === "timeout" ? 504 : 502
        );
      }
      throw err;
    }

    const styleDNA = await computeStyleDNA(finalPrompt);

    const { historyEntryId, imageUrl } = await writeHistoryEntry({
      sessionId,
      finalPrompt,
      casualPrompt: casualPrompt ?? finalPrompt,
      mode,
      imagePng,
      styleDNA,
      isInpainted: false,
      parentEntryId: null,
    });

    await updateSessionActivity(sessionId);

    return jsonWithSessionCookie(
      { historyEntryId, imageUrl, styleDNA },
      sessionId
    );
  } catch (err) {
    return handleUnexpectedError(err, requestId);
  }
}
