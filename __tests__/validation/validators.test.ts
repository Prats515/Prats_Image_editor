/**
 * Smoke tests for lib/validators.ts
 */
import { describe, expect, it } from "vitest";
import {
  mapModeToModel,
  validateBrushSize,
  validateEnhancedPromptFieldLength,
  validateMaskDataUrl,
  validatePromptLength,
} from "../../lib/validators";

describe("validators", () => {
  it("validatePromptLength accepts 1–2000 chars", () => {
    expect(validatePromptLength("")).toBe(false);
    expect(validatePromptLength("a")).toBe(true);
    expect(validatePromptLength("x".repeat(2000))).toBe(true);
    expect(validatePromptLength("x".repeat(2001))).toBe(false);
  });

  it("mapModeToModel returns FLUX model ids", () => {
    expect(mapModeToModel("fast")).toContain("flux-1-schnell");
    expect(mapModeToModel("quality")).toContain("flux-1-dev");
  });

  it("validateMaskDataUrl requires PNG data URL prefix", () => {
    expect(validateMaskDataUrl("data:image/png;base64,abc")).toBe(true);
    expect(validateMaskDataUrl("data:image/jpeg;base64,abc")).toBe(false);
  });

  it("validateBrushSize accepts 5–100 integers", () => {
    expect(validateBrushSize(4)).toBe(false);
    expect(validateBrushSize(5)).toBe(true);
    expect(validateBrushSize(100)).toBe(true);
    expect(validateBrushSize(101)).toBe(false);
  });

  it("validateEnhancedPromptFieldLength caps at 4000", () => {
    expect(validateEnhancedPromptFieldLength("x".repeat(4000))).toBe(true);
    expect(validateEnhancedPromptFieldLength("x".repeat(4001))).toBe(false);
  });
});
