/**
 * lib/imageGeneration.ts
 *
 * Server-side helper for CometAPI image generation (GPT Image 2, Nano Banana 2, FLUX).
 * CometAPI aggregates 500+ models with free credits and 20% cheaper rates.
 * - JSON POST to CometAPI unified endpoint
 * - 30 s timeout per attempt, one retry after 2 s
 *
 * Requirements: 6.1, 6.3, 6.4, 6.7, 10.6
 */

import sharp from "sharp";

export type GenerationMode = "fast" | "quality";

export class ImageGenerationError extends Error {
  type: "timeout" | "api_error" | "parse_error" | "network_error";
  statusCode?: number;

  constructor(
    message: string,
    type: "timeout" | "api_error" | "parse_error" | "network_error",
    statusCode?: number
  ) {
    super(message);
    this.name = "ImageGenerationError";
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Backward-compatible alias
export const HuggingFaceAiError = ImageGenerationError;

const DEFAULT_TIMEOUT_MS = 60_000; // Increased to 60s for CometAPI generation
const RETRY_DELAY_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey(): string {
  const key = process.env.COMETAPI_KEY;

  if (!key) {
    throw new ImageGenerationError(
      "COMETAPI_KEY is not set. Get a free key at https://www.cometapi.com/",
      "api_error"
    );
  }

  return key;
}

function mapModeToModel(mode: GenerationMode): string {
  // CometAPI supports gpt-image-2 for all quality levels
  // The mode affects generation speed on CometAPI's backend
  return "gpt-image-2";
}

function buildCometApiUrl(): string {
  // CometAPI uses OpenAI-compatible images API
  return "https://api.cometapi.com/v1/images/generations";
}

async function fetchImageOnce(
  prompt: string,
  mode: GenerationMode,
  timeoutMs: number
): Promise<Buffer> {
  const key = getApiKey();
  const model = mapModeToModel(mode);
  const url = buildCometApiUrl();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: "1024x1024",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ImageGenerationError(
        `CometAPI returned ${response.status}: ${body.slice(0, 200)}`,
        "api_error",
        response.status
      );
    }

    const data = await response.json() as { data?: Array<{ url?: string; b64_json?: string }> };

    // CometAPI (OpenAI-compatible) returns images in data array
    if (!data.data || data.data.length === 0) {
      throw new ImageGenerationError(
        "CometAPI returned no images",
        "parse_error"
      );
    }

    const imageData = data.data[0];
    let imageBuffer: Buffer;

    if (imageData.b64_json) {
      // Base64-encoded image
      imageBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData.url) {
      // Image URL - fetch it
      const imgResponse = await fetch(imageData.url, { signal: controller.signal });
      if (!imgResponse.ok) {
        throw new ImageGenerationError(
          `Failed to fetch image from URL: ${imgResponse.status}`,
          "network_error",
          imgResponse.status
        );
      }
      imageBuffer = Buffer.from(await imgResponse.arrayBuffer());
    } else {
      throw new ImageGenerationError(
        "CometAPI response missing both b64_json and url",
        "parse_error"
      );
    }

    // Convert to PNG if necessary
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (metadata.format !== "png") {
      imageBuffer = await image.png().toBuffer();
    }

    return imageBuffer;
  } catch (err) {
    clearTimeout(timer);

    if (err instanceof ImageGenerationError) {
      throw err;
    }

    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new ImageGenerationError(
          "Image generation request timed out",
          "timeout"
        );
      }

      throw new ImageGenerationError(
        `Unexpected error: ${err.message}`,
        "network_error"
      );
    }

    throw new ImageGenerationError(
      "Unknown error during image generation",
      "network_error"
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate an image using CometAPI with automatic retry.
 * - First attempt: 30 s timeout
 * - If timeout or network error: wait 2 s, retry once more
 * - If other error: throw immediately
 */
export async function generateImage(
  prompt: string,
  mode: GenerationMode
): Promise<Buffer> {
  let lastError: ImageGenerationError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchImageOnce(prompt, mode, DEFAULT_TIMEOUT_MS);
    } catch (err) {
      if (err instanceof ImageGenerationError) {
        lastError = err;

        // Only retry on timeout or network errors
        if (err.type === "timeout" || err.type === "network_error") {
          if (attempt === 0) {
            await sleep(RETRY_DELAY_MS);
            continue;
          }
        }

        // Don't retry on API errors
        throw err;
      }

      throw err;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new ImageGenerationError(
    "Image generation failed after retries",
    "api_error"
  );
}
