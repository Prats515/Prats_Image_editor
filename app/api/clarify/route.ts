/**
 * POST /api/clarify
 *
 * Receives an IntentRecord and returns 2–3 ClarifyingQuestion objects that
 * each target one distinct null/absent attribute (setting, artisticStyle,
 * moodOrTone, colorPaletteCues — NOT primarySubject).
 *
 * Requirements: 3.1, 3.4, 3.6, 10.1, 10.2
 */

import { z } from "zod";
import {
  checkPayloadSize,
  handleUnexpectedError,
  jsonResponse,
  generateRequestId,
  withTimeout,
} from "../../../lib/apiMiddleware";
import { callGroq } from "../../../lib/groq";
import type { ClarifyingQuestion } from "../../../lib/types";

// ---------------------------------------------------------------------------
// Zod schema — IntentRecord input validation
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

// ---------------------------------------------------------------------------
// Zod schema — ClarifyingQuestion[] response validation
// ---------------------------------------------------------------------------

const ClarifyingQuestionSchema = z.object({
  id: z.string().min(1),
  attribute: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(3).max(5),
});

const ClarifyingQuestionsArraySchema = z
  .array(ClarifyingQuestionSchema)
  .min(2)
  .max(3)
  .superRefine((questions, ctx) => {
    const attributes = questions.map((q) => q.attribute);
    const unique = new Set(attributes);
    if (unique.size !== attributes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All attribute values must be distinct across questions",
      });
    }
  });

// ---------------------------------------------------------------------------
// Clarifiable attributes (primarySubject is excluded per spec)
// ---------------------------------------------------------------------------

const CLARIFIABLE_ATTRIBUTES = [
  "setting",
  "artisticStyle",
  "moodOrTone",
  "colorPaletteCues",
] as const;

type ClarifiableAttribute = (typeof CLARIFIABLE_ATTRIBUTES)[number];

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(absentAttributes: ClarifiableAttribute[]): string {
  const attrList = absentAttributes
    .slice(0, 3)
    .map((a) => `  - ${a}`)
    .join("\n");

  return `You are a creative image assistant helping clarify a user's image generation request.

The user's intent record is missing values for the following attributes:
${attrList}

Your task: Return ONLY a valid JSON array of exactly ${Math.min(absentAttributes.length, 3) >= 2 ? "2 or 3" : "2 or 3"} clarifying question objects.

Rules:
1. Each question MUST target exactly ONE distinct attribute from the list above.
2. No two questions may share the same "attribute" value.
3. Generate at most 3 questions even if there are more absent attributes.
4. Generate at least 2 questions.
5. Each question object MUST follow this exact shape:
   {
     "id": "<uuid v4>",
     "attribute": "<attribute name from the list above>",
     "question": "<human-readable question for the user>",
     "options": ["<option1>", "<option2>", "<option3>"]  // 3–5 strings
   }
6. The "options" array MUST contain between 3 and 5 strings — no more, no less.
7. Do NOT include an "Other" option in the options array (the UI adds it automatically).
8. Respond with ONLY the raw JSON array. No markdown, no code fences, no explanation.

Example output format:
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "attribute": "setting",
    "question": "Where does this scene take place?",
    "options": ["Urban cityscape", "Lush forest", "Desert landscape", "Ocean shore"]
  }
]`;
}

// ---------------------------------------------------------------------------
// Strip markdown code fences if the LLM wraps output despite instructions
// ---------------------------------------------------------------------------

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  const requestId = generateRequestId();

  try {
    // 1. Payload size guard — 413 if > 15 MB
    const sizeError = checkPayloadSize(request);
    if (sizeError) return sizeError;

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON in request body", requestId },
        400
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("intentRecord" in body)
    ) {
      return jsonResponse(
        { error: "Missing required field: intentRecord", requestId },
        400
      );
    }

    const parseResult = IntentRecordSchema.safeParse(
      (body as Record<string, unknown>).intentRecord
    );

    if (!parseResult.success) {
      const fieldErrors = parseResult.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return jsonResponse(
        {
          error: "Invalid intentRecord",
          details: fieldErrors,
          requestId,
        },
        400
      );
    }

    const intentRecord = parseResult.data;

    // 3. Find null/absent clarifiable attributes (NOT primarySubject)
    const absentAttributes: ClarifiableAttribute[] =
      CLARIFIABLE_ATTRIBUTES.filter((attr) => intentRecord[attr] === null);

    // If fewer than 2 absent attributes, we can't generate 2+ questions —
    // return an empty questions array rather than failing.
    if (absentAttributes.length < 2) {
      return jsonResponse({ questions: [] as ClarifyingQuestion[] });
    }

    // 4. Build system prompt
    const systemPrompt = buildSystemPrompt(absentAttributes);

    const userMessage = `The image prompt is: "${intentRecord.rawPrompt}"

Please generate ${Math.min(absentAttributes.length, 3)} clarifying questions for the absent attributes listed in the system prompt.`;

    // 5. Call Groq with 30 s timeout
    const rawContent = await withTimeout(
      callGroq(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        30_000
      ),
      30_000,
      requestId
    );

    // 6. Parse and validate the Groq response
    const cleaned = stripCodeFences(rawContent);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return jsonResponse(
        {
          error: "Failed to parse LLM response as JSON",
          requestId,
        },
        502
      );
    }

    const questionsResult = ClarifyingQuestionsArraySchema.safeParse(parsed);

    if (!questionsResult.success) {
      const fieldErrors = questionsResult.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return jsonResponse(
        {
          error: "LLM response did not match expected ClarifyingQuestion schema",
          details: fieldErrors,
          requestId,
        },
        502
      );
    }

    const questions: ClarifyingQuestion[] = questionsResult.data;

    // 7. Return the validated questions
    return jsonResponse({ questions });
  } catch (error) {
    // 8. Catch-all — handleUnexpectedError returns a 500 with no internals
    return handleUnexpectedError(error, requestId);
  }
}
