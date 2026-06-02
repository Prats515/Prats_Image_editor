/**
 * Shared API middleware utilities for all Next.js App Router API routes.
 * Compatible with the Web Response API (not NextResponse).
 * Satisfies Requirements 10.2, 10.3, 10.4, 10.5, 10.6.
 */

const MAX_PAYLOAD_BYTES = 15_728_640; // 15 MB

/**
 * Checks the Content-Length header against the 15 MB payload limit.
 * Returns a 413 Response if the limit is exceeded, otherwise null.
 *
 * Property 27: Payload Size Guard Returns 413
 */
export function checkPayloadSize(request: Request): Response | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const bytes = parseInt(contentLength, 10);
    if (!isNaN(bytes) && bytes > MAX_PAYLOAD_BYTES) {
      return jsonResponse(
        { error: "Payload too large", maxBytes: MAX_PAYLOAD_BYTES },
        413
      );
    }
  }
  return null;
}

/**
 * Handles unexpected/unhandled errors.
 * Logs sanitized info server-side; returns a generic 500 with no internals.
 * NEVER includes stack traces, file paths, or env variable values in the response.
 *
 * Satisfies Requirement 10.4.
 */
export function handleUnexpectedError(
  error: unknown,
  requestId: string
): Response {
  const isError = error instanceof Error;
  const errorType = isError ? error.constructor.name : "UnknownError";
  const message = isError ? error.message : String(error);

  // Server-side only logging — sanitized, no stack trace
  console.error({
    requestId,
    errorType,
    timestamp: new Date().toISOString(),
    message,
  });

  return jsonResponse(
    { error: "An unexpected error occurred", requestId },
    500
  );
}

/**
 * Creates a Response with Content-Type: application/json.
 * Property 26: All API Responses Are Valid JSON.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Races a promise against a timeout.
 * On timeout, throws an Error with a descriptive message.
 *
 * Satisfies Requirement 10.6 (timeout guard for outbound calls).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  requestId: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(
        new Error(`Request timed out after ${timeoutMs}ms`)
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

/**
 * Generates a short unique request ID using the Web Crypto API.
 * Compatible with both Node.js and Edge runtimes.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
