/**
 * lib/promptEnhancer.ts
 * 
 * Professional Prompt Enhancement System
 * Transforms simple requests into production-quality prompts
 * Uses multi-step creative direction workflow
 */

import { callGroq } from "./groq";

interface EnhancementResult {
  enhancedPrompt: string;
  creativeImprovements: string[];
  optionalSuggestions: string[];
  analysisDetails: {
    detectedSubject: string;
    detectedPurpose: string;
    detectedStyle: string;
    detectedMood: string;
  };
}

const ENHANCEMENT_SYSTEM_PROMPT = `You are an expert Prompt Engineer, Creative Director, Professional Photographer, Cinematographer, Graphic Designer, Interior Designer, Brand Strategist, and AI Image Generation Specialist.

Your task is to transform any simple user request into a highly detailed, professional, production-quality prompt optimized for AI image generation.

WORKFLOW:

STEP 1 — ANALYZE
Understand the user's actual objective. Determine:
- Subject
- Purpose
- Style
- Mood
- Desired outcome

STEP 2 — DETECT MISSING INFORMATION
Before generating the final prompt, identify missing information that would significantly improve the result.
Ask concise clarification questions only if necessary.
If sufficient information already exists, proceed directly.

STEP 3 — ENHANCE EVERYTHING
Automatically expand the request using professional creative direction.
Improve:
- Composition
- Lighting (specific techniques like "golden hour", "rim lighting", "dramatic shadows")
- Colors (specific palettes like "warm and vibrant", "muted earth tones")
- Realism
- Visual hierarchy
- Materials and textures (specific details like "weathered wood", "silk fabric", "polished marble")
- Camera settings (if photography: "shot on Canon EOS R5, 85mm f/1.2 lens, f/1.8, ISO 100")
- Environment and context
- Mood and atmosphere
- Storytelling
- Branding and professionalism
- Award-winning creative aesthetics

STEP 4 — ADD TECHNICAL QUALITY
Include professional specifications:
- Photography: Camera type, lens, depth of field, professional lighting setup
- Design: Layout hierarchy, typography treatment, premium spacing, visual balance
- Architecture: Materials, finishes, lighting design, spatial proportions
- Art: Color palette, composition, visual balance, texture
- Film: Cinematic lighting, color grading, atmosphere, depth

STEP 5 — OUTPUT FORMAT
Return a response in this exact JSON format:
{
  "enhancedPrompt": "[Your complete professional prompt here - this should be 150-300 words, highly detailed and specific]",
  "creativeImprovements": [
    "Improvement 1: [specific detail added]",
    "Improvement 2: [specific detail added]",
    "Improvement 3: [specific detail added]",
    "Improvement 4: [specific detail added]"
  ],
  "optionalSuggestions": [
    "Suggestion 1: [alternative approach or enhancement]",
    "Suggestion 2: [additional creative direction]"
  ],
  "analysisDetails": {
    "detectedSubject": "[what is being depicted]",
    "detectedPurpose": "[commercial/artistic/documentary/etc]",
    "detectedStyle": "[photography style/art style]",
    "detectedMood": "[emotional tone]"
  }
}

GOAL:
Convert every basic prompt into a premium production-quality prompt that looks like it was created by a world-class creative director. Always maximize quality, realism, aesthetics, detail, commercial appeal, and visual impact while remaining faithful to the user's original intent.`;

async function analyzeUserRequest(userPrompt: string): Promise<{
  needsClarification: boolean;
  clarificationQuestions?: string[];
}> {
  const response = await callGroq(
    [
      {
        role: "system",
        content:
          "You are an expert creative director. Analyze if the user request needs clarification questions to produce a better result. Return JSON: {needsClarification: boolean, clarificationQuestions: string[]}",
      },
      {
        role: "user",
        content: `Analyze this request and determine if clarification questions would significantly improve the output: "${userPrompt}"`,
      },
    ],
    15_000
  );

  try {
    return JSON.parse(response);
  } catch {
    return { needsClarification: false };
  }
}

async function enhancePrompt(userPrompt: string): Promise<EnhancementResult> {
  const response = await callGroq(
    [
      {
        role: "system",
        content: ENHANCEMENT_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Transform this simple request into a professional, production-quality prompt: "${userPrompt}"

Remember to:
1. Add specific technical details (camera settings, lighting, materials)
2. Enhance composition and visual hierarchy
3. Specify mood, atmosphere, and storytelling elements
4. Include professional aesthetics and commercial appeal
5. Make it 150-300 words, highly detailed and specific

Return ONLY valid JSON in the specified format.`,
      },
    ],
    30_000
  );

  try {
    const parsed = JSON.parse(response);
    return {
      enhancedPrompt: parsed.enhancedPrompt,
      creativeImprovements: parsed.creativeImprovements || [],
      optionalSuggestions: parsed.optionalSuggestions || [],
      analysisDetails: parsed.analysisDetails || {
        detectedSubject: "Unknown",
        detectedPurpose: "Unknown",
        detectedStyle: "Unknown",
        detectedMood: "Unknown",
      },
    };
  } catch (error) {
    console.error("Error parsing enhancement response:", error);
    console.error("Raw content:", response);
    throw new Error("Failed to parse enhancement response");
  }
}

export async function getEnhancedPrompt(
  userPrompt: string
): Promise<EnhancementResult> {
  try {
    // Step 1: Analyze if clarification is needed
    const analysis = await analyzeUserRequest(userPrompt);

    // Step 2: Enhance the prompt
    const enhancement = await enhancePrompt(userPrompt);

    return enhancement;
  } catch (error) {
    console.error("Error in prompt enhancement:", error);
    throw error;
  }
}

export type { EnhancementResult };
