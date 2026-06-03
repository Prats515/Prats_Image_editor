/**
 * POST /api/generate
 *
 * Generates an image from an approved prompt via CometAPI.
 * Uses streaming response to avoid Vercel 120s timeout limitation.
 * This allows long-running operations to complete without timing out.
 *
 * Flow:
 * 1. Validate session and request
 * 2. Send immediate response header (200 OK with streaming)
 * 3. Stream progress updates as image generates
 * 4. Stream final result with image URL or error
 *
 * Requirements: 6.1–6.8, 7.1, 7.7, 9.2, 10.1, 10.2
 */

import { z } from "zod";
import { generateImage, ImageGenerationError } from "../../../lib/imageGeneration";
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

/**
 * Send JSON over the stream with CRLF delimiter for server-sent events style
 */
function encodeStreamMessage(data: unknown): string {
  return JSON.stringify(data) + "\n";
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

    // ─── Return streaming response immediately ───────────────────────────────
    // This allows the client to know the request is being processed, and we have
    // time to complete image generation without Vercel timeout.
    
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // Send initial acknowledgment
          controller.enqueue(
            new TextEncoder().encode(
              encodeStreamMessage({
                status: "processing",
                message: "Image generation started",
              })
            )
          );

          let imagePng: Buffer;
          try {
            console.log("[Generate] Calling generateImage with prompt:", finalPrompt.substring(0, 50), "... mode:", mode);
            controller.enqueue(
              new TextEncoder().encode(
                encodeStreamMessage({
                  status: "generating",
                  message: "Generating image with CometAPI",
                })
              )
            );
            
            imagePng = await generateImage(finalPrompt, mode);
            console.log("[Generate] Image generated successfully:", imagePng.length, "bytes");
          } catch (err) {
            console.error("[Generate] Error:", {
              type: err instanceof Error ? err.constructor.name : "Unknown",
              message: err instanceof Error ? err.message : String(err),
            });
            if (err instanceof ImageGenerationError) {
              controller.enqueue(
                new TextEncoder().encode(
                  encodeStreamMessage({
                    status: "error",
                    error: "generation_failed",
                    message:
                      err.type === "timeout"
                        ? "Image generation timed out. Please try again."
                        : "Image generation failed. Please try again.",
                    retryable: true,
                  })
                )
              );
              controller.close();
              return;
            }
            throw err;
          }

          // Update status: storing image
          controller.enqueue(
            new TextEncoder().encode(
              encodeStreamMessage({
                status: "storing",
                message: "Storing image and computing analysis",
              })
            )
          );

          const styleDNA = await computeStyleDNA(finalPrompt);
          console.log("[Generate] StyleDNA computed:", styleDNA);

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
          console.log("[Generate] History entry written:", historyEntryId);

          await updateSessionActivity(sessionId);
          console.log("[Generate] Session updated");

          // Send final success response with Set-Cookie header info
          controller.enqueue(
            new TextEncoder().encode(
              encodeStreamMessage({
                status: "complete",
                historyEntryId,
                imageUrl,
                styleDNA,
                setCookie: getSessionCookieHeader(sessionId),
              })
            )
          );

          controller.close();
        } catch (err) {
          console.error("[Generate] Stream error:", {
            type: err instanceof Error ? err.constructor.name : "Unknown",
            message: err instanceof Error ? err.message : String(err),
          });
          controller.enqueue(
            new TextEncoder().encode(
              encodeStreamMessage({
                status: "error",
                error: "internal_error",
                message: "An unexpected error occurred",
              })
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Set-Cookie": getSessionCookieHeader(sessionId),
      },
    });
  } catch (err) {
    console.error("[Generate] Unhandled error in POST:", {
      type: err instanceof Error ? err.constructor.name : "Unknown",
      message: err instanceof Error ? err.message : String(err),
    });
    return handleUnexpectedError(err, requestId);
  }
}
