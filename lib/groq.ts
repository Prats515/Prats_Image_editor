/**
 * lib/groq.ts
 *
 * Server-side helper for calling the Groq Chat Completions API.
 * - Model: llama-3.3-70b-versatile
 * - Wraps fetch with AbortController timeout (default 30 s)
 * - Retries once after 2 s on any failure or timeout
 * - Throws GroqError with a typed `type` field on unrecoverable failure
 *
 * Requirements: 4.4, 10.6
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single message in the Groq chat completion request. */
export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Typed error thrown when a Groq call fails after all retries. */
export class GroqError extends Error {
  type: "timeout" | "api_error" | "content_policy" | "parse_error";
  statusCode?: number;

  constructor(
    message: string,
    type: "timeout" | "api_error" | "content_policy" | "parse_error",
    statusCode?: number
  ) {
    super(message);
    this.name = "GroqError";
    this.type = type;
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 2_000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true when the HTTP status + body indicate a content policy violation. */
function isContentPolicyStatus(status: number): boolean {
  return status === 400 || status === 422;
}

const CONTENT_POLICY_KEYWORDS = [
  "content_policy",
  "content policy",
  "violates",
  "inappropriate",
  "harmful",
  "unsafe",
  "moderation",
];

function looksLikeContentPolicyBody(body: string): boolean {
  const lower = body.toLowerCase();
  return CONTENT_POLICY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Perform a single fetch attempt to the Groq API.
 * Resolves with the raw `Response` or rejects on network / timeout errors.
 */
async function fetchGroq(
  messages: GroqMessage[],
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new GroqError("GROQ_API_KEY is not set", "api_error");
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
      }),
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timer);
  }
}

/** Sleep for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call the Groq Chat Completions API and return the assistant's reply text.
 *
 * @param messages   Conversation history / system + user messages.
 * @param timeoutMs  Per-attempt timeout in milliseconds (default 30 000).
 * @returns The string content of `choices[0].message.content`.
 * @throws {GroqError} On failure after one retry.
 */
export async function callGroq(
  messages: GroqMessage[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> {
  let lastError: GroqError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS);
    }

    try {
      let response: Response;

      try {
        response = await fetchGroq(messages, timeoutMs);
      } catch (err) {
        // Network error or AbortController timeout
        if (err instanceof GroqError) {
          lastError = err;
          continue;
        }
        const isAbort =
          err instanceof Error && err.name === "AbortError";
        lastError = new GroqError(
          isAbort ? "Request timed out" : `Network error: ${String(err)}`,
          "timeout"
        );
        continue;
      }

      // --- Content-policy check (400 / 422 with policy language) ---
      if (isContentPolicyStatus(response.status)) {
        const rawBody = await response.text();
        if (looksLikeContentPolicyBody(rawBody)) {
          // Content policy errors are not retried
          throw new GroqError(
            "Request blocked by content policy",
            "content_policy",
            response.status
          );
        }
        // Non-policy 400/422 → treat as api_error, allow retry
        lastError = new GroqError(
          `Groq API returned ${response.status}`,
          "api_error",
          response.status
        );
        continue;
      }

      // --- Other non-OK statuses ---
      if (!response.ok) {
        lastError = new GroqError(
          `Groq API returned ${response.status}`,
          "api_error",
          response.status
        );
        continue;
      }

      // --- Parse successful response ---
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        lastError = new GroqError(
          "Failed to parse Groq API response as JSON",
          "parse_error"
        );
        continue;
      }

      const content = extractContent(data);
      if (content === null) {
        lastError = new GroqError(
          "Unexpected response shape from Groq API",
          "parse_error"
        );
        continue;
      }

      return content;
    } catch (err) {
      // Re-throw GroqErrors that should not be retried (e.g. content_policy)
      if (err instanceof GroqError) {
        throw err;
      }
      // Wrap anything else
      lastError = new GroqError(String(err), "api_error");
    }
  }

  // Both attempts exhausted — throw the last recorded error
  throw (
    lastError ??
    new GroqError("Groq API call failed after retry", "api_error")
  );
}

// ---------------------------------------------------------------------------
// Response shape helper
// ---------------------------------------------------------------------------

interface GroqResponseShape {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function extractContent(data: unknown): string | null {
  const d = data as GroqResponseShape;
  const content = d?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : null;
}
