/**
 * lib/styleDna.ts
 *
 * Utilities for computing and injecting StyleDNA objects.
 *
 * - buildStyleDnaSystemPrompt: injects all four StyleDNA attributes into a
 *   system prompt string so the Prompt_Enhancer preserves visual style.
 * - computeStyleDNA: calls Groq (Llama 3.3 70B) to infer StyleDNA from the
 *   approved finalPrompt; falls back to fallbackStyleDNA on any failure.
 * - fallbackStyleDNA: extracts colour words from the prompt via regex and
 *   fills in sensible defaults for the remaining attributes.
 *
 * Requirements: 4.3, 7.1, 7.2
 */

import { z } from "zod";
import { callGroq } from "./groq";
import type { StyleDNA } from "./types";

// ---------------------------------------------------------------------------
// Zod schema for the Groq response
// ---------------------------------------------------------------------------

const StyleDNASchema = z.object({
  dominantColors: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
    .min(3)
    .max(8),
  artisticStyleLabel: z.string().min(1),
  lightingDescriptor: z.string().min(1),
  textureDescriptor: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Colour-word → approximate hex mapping used by fallbackStyleDNA
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<string, string> = {
  red: "#e74c3c",
  crimson: "#dc143c",
  scarlet: "#ff2400",
  orange: "#e67e22",
  amber: "#f39c12",
  yellow: "#f1c40f",
  gold: "#ffd700",
  green: "#27ae60",
  lime: "#a8e63d",
  teal: "#1abc9c",
  cyan: "#00bcd4",
  blue: "#4a90d9",
  navy: "#1a237e",
  indigo: "#3f51b5",
  violet: "#8e44ad",
  purple: "#9b59b6",
  magenta: "#e91e63",
  pink: "#f48fb1",
  rose: "#ff4081",
  white: "#f5f5f5",
  grey: "#9e9e9e",
  gray: "#9e9e9e",
  silver: "#c0c0c0",
  black: "#212121",
  brown: "#795548",
  beige: "#f5f0e1",
  ivory: "#fffff0",
};

const DEFAULT_COLORS: [string, string, string] = [
  "#4a90d9",
  "#2c3e50",
  "#e8e8e8",
];

// ---------------------------------------------------------------------------
// Public: buildStyleDnaSystemPrompt
// ---------------------------------------------------------------------------

/**
 * Returns a system-prompt string that injects ALL four StyleDNA attributes so
 * the LLM preserves the established visual style.
 *
 * Property 11: the returned string MUST contain the exact values of
 *   styleDNA.artisticStyleLabel, styleDNA.lightingDescriptor,
 *   styleDNA.textureDescriptor, and each hex code in styleDNA.dominantColors.
 */
export function buildStyleDnaSystemPrompt(styleDNA: StyleDNA): string {
  const colors = styleDNA.dominantColors.join(", ");
  return (
    `Preserve the following established visual style: ` +
    `artistic style: ${styleDNA.artisticStyleLabel}, ` +
    `lighting: ${styleDNA.lightingDescriptor}, ` +
    `texture: ${styleDNA.textureDescriptor}, ` +
    `dominant colors: ${colors}. ` +
    `Reference these attributes explicitly in the enhanced prompt.`
  );
}

// ---------------------------------------------------------------------------
// Public: computeStyleDNA
// ---------------------------------------------------------------------------

/**
 * Calls Groq with a structured extraction prompt to infer StyleDNA from the
 * approved image-generation prompt.  On any failure (network, parse, Zod)
 * it silently returns fallbackStyleDNA so generation is never blocked.
 */
export async function computeStyleDNA(finalPrompt: string): Promise<StyleDNA> {
  const systemPrompt =
    `You are a visual style extraction assistant. ` +
    `When given an image generation prompt, you return ONLY valid JSON with no ` +
    `markdown, no explanation, and no extra keys. The JSON must match this shape:\n` +
    `{\n` +
    `  "dominantColors": ["#rrggbb", ...],  // 3–8 hex codes that would dominate the image\n` +
    `  "artisticStyleLabel": "short label", // e.g. "impressionist oil painting"\n` +
    `  "lightingDescriptor": "short phrase", // e.g. "soft diffused afternoon light"\n` +
    `  "textureDescriptor": "short phrase"  // e.g. "smooth glossy render"\n` +
    `}`;

  const userMessage =
    `Extract the StyleDNA from this image generation prompt:\n\n"${finalPrompt}"`;

  try {
    const raw = await callGroq(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      15_000
    );

    // Strip any accidental markdown code fences
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return fallbackStyleDNA(finalPrompt);
    }

    const result = StyleDNASchema.safeParse(parsed);
    if (!result.success) {
      return fallbackStyleDNA(finalPrompt);
    }

    return result.data;
  } catch {
    return fallbackStyleDNA(finalPrompt);
  }
}

// ---------------------------------------------------------------------------
// Public: fallbackStyleDNA
// ---------------------------------------------------------------------------

/**
 * Extracts colour words from the prompt via regex, maps them to hex
 * approximations, and fills in safe defaults for the other attributes.
 * Always returns at least 3 dominant colours.
 */
export function fallbackStyleDNA(finalPrompt: string): StyleDNA {
  const lower = finalPrompt.toLowerCase();
  const words = lower.match(/\b[a-z]+\b/g) ?? [];

  const foundColors: string[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    if (COLOR_MAP[word] && !seen.has(word)) {
      seen.add(word);
      foundColors.push(COLOR_MAP[word]);
    }
  }

  // Pad with defaults if fewer than 3 colours found
  const dominantColors =
    foundColors.length >= 3
      ? foundColors.slice(0, 8)
      : [
          ...foundColors,
          ...DEFAULT_COLORS.slice(foundColors.length),
        ].slice(0, 8);

  return {
    dominantColors,
    artisticStyleLabel: "digital art",
    lightingDescriptor: "ambient lighting",
    textureDescriptor: "smooth",
  };
}
