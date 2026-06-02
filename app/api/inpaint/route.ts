/**
 * POST /api/inpaint
 *
 * Inpaints a masked region of an existing image via Workers AI SD inpainting.
 *
 * Requirements: 8.5, 8.9, 10.1, 10.2
 */

import { z } from "zod";
import { generateImage, ImageGenerationError } from "../../../lib/imageGeneration";
import { computeStyleDNA } from "../../../lib/styleDna";
import { writeHistoryEntry } from "../../../lib/historyWrite";
import { getObject } from "../../../lib/r2";
import {
  getSession,
  updateSessionActivity,
  getSessionCookieHeader,
} from "../../../lib/session";
import { parseSessionIdFromCookieHeader } from "../../../lib/sessionCookie";
import {
  checkPayloadSize,
  handleUnexpectedError,
  jsonResponse,
  generateRequestId,
} from "../../../lib/apiMiddleware";
import {
  validateEnhancedPromptFieldLength,
  validateInpaintRequestBody,
  validateMaskDataUrl,
} from "../../../lib/validators";

const InpaintRequestSchema = z.object({
  sourceImageKey: z.string().min(1),
  maskDataUrl: z.string().min(1),
  finalPrompt: z.string().min(1),
  mode: z.enum(["fast", "quality"]),
  casualPrompt: z.string().optional(),
});

function parseDataUrlBuffer(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new Error("Invalid data URL");
  }
  return Buffer.from(dataUrl.slice(comma + 1), "base64");
}

function parentEntryIdFromKey(sourceImageKey: string): string | null {
  const match = sourceImageKey.match(/\/history\/([^/]+)\/image\.png$/);
  return match?.[1] ?? null;
}

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

    if (!validateInpaintRequestBody(rawBody)) {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "body",
          reason:
            "sourceImageKey, valid maskDataUrl, finalPrompt, and mode are required",
        },
        400
      );
    }

    const parseResult = InpaintRequestSchema.safeParse(rawBody);
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

    const { sourceImageKey, maskDataUrl, finalPrompt, mode, casualPrompt } =
      parseResult.data;

    if (!validateMaskDataUrl(maskDataUrl)) {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "maskDataUrl",
          reason: "maskDataUrl must be a PNG data URL",
        },
        400
      );
    }

    if (!validateEnhancedPromptFieldLength(finalPrompt)) {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "finalPrompt",
          reason: `finalPrompt must not exceed 4000 characters`,
        },
        400
      );
    }

    if (!sourceImageKey.startsWith(`sessions/${sessionId}/`)) {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "sourceImageKey",
          reason: "sourceImageKey does not belong to this session",
        },
        400
      );
    }

    const sourceBuffer = await getObject(sourceImageKey);
    if (sourceBuffer === null) {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "sourceImageKey",
          reason: "Source image not found",
        },
        404
      );
    }

    let maskBuffer: Buffer;
    try {
      maskBuffer = parseDataUrlBuffer(maskDataUrl);
    } catch {
      return jsonResponse(
        {
          error: "Validation failed",
          field: "maskDataUrl",
          reason: "Could not decode mask data URL",
        },
        400
      );
    }

    let imagePng: Buffer;
    try {
      imagePng = await inpaintImage(
        finalPrompt,
        sourceBuffer,
        maskBuffer,
        mode
      );
    } catch (err) {
      if (err instanceof HuggingFaceAiError) {
        return jsonResponse(
          {
            error: "inpaint_failed",
            message:
              err.type === "timeout"
                ? "Inpainting timed out. Please try again."
                : "Inpainting failed. Please try again.",
            retryable: true,
          },
          err.type === "timeout" ? 504 : 502
        );
      }
      throw err;
    }

    const styleDNA = await computeStyleDNA(finalPrompt);
    const parentEntryId = parentEntryIdFromKey(sourceImageKey);

    const { historyEntryId, imageUrl } = await writeHistoryEntry({
      sessionId,
      finalPrompt,
      casualPrompt: casualPrompt ?? finalPrompt,
      mode,
      imagePng,
      styleDNA,
      isInpainted: true,
      parentEntryId,
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
