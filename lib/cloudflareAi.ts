/**
 * lib/cloudflareAi.ts
 *
 * Server-side helper for Cloudflare Workers AI image generation (FLUX).
 * - JSON POST to the Workers AI REST API
 * - 30 s timeout per attempt, one retry after 2 s
 *
 * Requirements: 6.1, 6.3, 6.4, 6.7, 10.6
 */

import { mapModeToModel } from "./validators";
import sharp from "sharp";

export type GenerationMode = "fast" | "quality";

export class CloudflareAiError extends Error {
  type: "timeout" | "api_error" | "parse_error";
  statusCode?: number;

  constructor(
    message: string,
    type: "timeout" | "api_error" | "parse_error",
    statusCode?: number
  ) {
    super(message);
    this.name = "CloudflareAiError";
    this.type = type;
    this.statusCode = statusCode;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiConfig(): { accountId: string; apiToken: string } {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new CloudflareAiError(
      "CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not set",
      "api_error"
    );
  }

  return { accountId, apiToken };
}

function buildRunUrl(accountId: string, model: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
}

function stepsForMode(mode: GenerationMode): number {
  return mode === "fast" ? 4 : 8;
}

interface CfImageResult {
  image?: string;
}

interface CfApiResponse {
  success?: boolean;
  result?: CfImageResult;
  errors?: Array<{ message?: string }>;
}

function extractImageBase64(data: unknown): string | null {
  const d = data as CfApiResponse;
  if (typeof d?.result?.image === "string") {
    return d.result.image;
  }
  if (typeof (data as CfImageResult)?.image === "string") {
    return (data as CfImageResult).image!;
  }
  return null;
}

async function fetchImageOnce(
  prompt: string,
  mode: GenerationMode,
  timeoutMs: number
): Promise<Buffer> {
  const { accountId, apiToken } = getApiConfig();
  const model = mapModeToModel(mode);
  const url = buildRunUrl(accountId, model);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        steps: stepsForMode(mode),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new CloudflareAiError(
        `Workers AI returned ${response.status}: ${body.slice(0, 200)}`,
        "api_error",
        response.status
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new CloudflareAiError(
          "Failed to parse Workers AI response as JSON",
          "parse_error"
        );
      }

      const api = data as CfApiResponse;
      if (api.success === false) {
        const msg =
          api.errors?.[0]?.message ?? "Workers AI request failed";
        throw new CloudflareAiError(msg, "api_error");
      }

      const b64 = extractImageBase64(data);
      if (!b64) {
        throw new CloudflareAiError(
          "Workers AI response did not include an image",
          "parse_error"
        );
      }

      return decodeAndNormalizeToPng(b64);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new CloudflareAiError(
        "Workers AI returned an empty image body",
        "parse_error"
      );
    }

    return sharp(Buffer.from(arrayBuffer)).png().toBuffer();
  } catch (err) {
    if (err instanceof CloudflareAiError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new CloudflareAiError("Workers AI request timed out", "timeout");
    }
    throw new CloudflareAiError(String(err), "api_error");
  } finally {
    clearTimeout(timer);
  }
}

async function decodeAndNormalizeToPng(base64: string): Promise<Buffer> {
  const raw = Buffer.from(base64, "base64");
  return sharp(raw).png().toBuffer();
}

/**
 * Generate an image from a text prompt using FLUX on Workers AI.
 * Returns a PNG buffer. Retries once after 2 s on failure.
 */
const INPAINT_MODEL = "@cf/runwayml/stable-diffusion-v1-5-inpainting";

function stepsForInpaint(mode: GenerationMode): number {
  return mode === "fast" ? 10 : 20;
}

async function fetchInpaintOnce(
  prompt: string,
  sourcePng: Buffer,
  maskPng: Buffer,
  mode: GenerationMode,
  timeoutMs: number
): Promise<Buffer> {
  const { accountId, apiToken } = getApiConfig();
  const url = buildRunUrl(accountId, INPAINT_MODEL);

  const meta = await sharp(sourcePng).metadata();
  const width = meta.width ?? 512;
  const height = meta.height ?? 512;

  const imageBuffer = await sharp(sourcePng)
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();

  const maskBuffer = await sharp(maskPng)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .extractChannel("alpha")
    .threshold(128)
    .png()
    .toBuffer();

  const body = JSON.stringify({
    prompt,
    image_b64: imageBuffer.toString("base64"),
    mask_b64: maskBuffer.toString("base64"),
    num_steps: stepsForInpaint(mode),
    strength: 0.85,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new CloudflareAiError(
        `Inpainting returned ${response.status}: ${text.slice(0, 200)}`,
        "api_error",
        response.status
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const data = (await response.json()) as CfApiResponse;
      const b64 = extractImageBase64(data);
      if (!b64) {
        throw new CloudflareAiError(
          "Inpainting response did not include an image",
          "parse_error"
        );
      }
      return decodeAndNormalizeToPng(b64);
    }

    const arrayBuffer = await response.arrayBuffer();
    return sharp(Buffer.from(arrayBuffer)).png().toBuffer();
  } catch (err) {
    if (err instanceof CloudflareAiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new CloudflareAiError("Inpainting request timed out", "timeout");
    }
    throw new CloudflareAiError(String(err), "api_error");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Inpaint a region of an existing image using a mask (white = edit region).
 */
export async function inpaintImage(
  prompt: string,
  sourcePng: Buffer,
  maskPng: Buffer,
  mode: GenerationMode,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Buffer> {
  let lastError: CloudflareAiError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS);
    }
    try {
      return await fetchInpaintOnce(
        prompt,
        sourcePng,
        maskPng,
        mode,
        timeoutMs
      );
    } catch (err) {
      if (err instanceof CloudflareAiError) {
        lastError = err;
        continue;
      }
      lastError = new CloudflareAiError(String(err), "api_error");
    }
  }

  throw (
    lastError ??
    new CloudflareAiError("Inpainting failed after retry", "api_error")
  );
}

export async function generateImage(
  prompt: string,
  mode: GenerationMode,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Buffer> {
  let lastError: CloudflareAiError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS);
    }

    try {
      return await fetchImageOnce(prompt, mode, timeoutMs);
    } catch (err) {
      if (err instanceof CloudflareAiError) {
        lastError = err;
        continue;
      }
      lastError = new CloudflareAiError(String(err), "api_error");
    }
  }

  throw (
    lastError ??
    new CloudflareAiError("Image generation failed after retry", "api_error")
  );
}
