/**
 * app/api/history/route.ts
 *
 * GET /api/history
 *
 * Returns all HistoryEntry objects for the current session, with regenerated
 * signed URLs for the image keys.
 */

import { getSession } from "../../../lib/session-memory";
import { loadHistoryForSession } from "../../../lib/historyWrite-memory";
import {
  handleUnexpectedError,
  jsonResponse,
  generateRequestId,
} from "../../../lib/apiMiddleware";
import type { HistoryEntry } from "../../../lib/types";

/**
 * Parses the `Cookie` header string and returns the value for `sessionId`.
 */
function parseSessionIdFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey.trim();
    if (key === "sessionId") {
      const value = rest.join("=").trim();
      return value.length > 0 ? value : null;
    }
  }

  return null;
}

export async function GET(request: Request): Promise<Response> {
  const requestId = generateRequestId();

  try {
    // Parse sessionId from cookie
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionIdFromCookieHeader(cookieHeader);

    if (sessionId === null) {
      return jsonResponse({ entries: [] });
    }

    // Validate session exists
    const session = await getSession(sessionId);
    if (session === null) {
      return jsonResponse({ entries: [] });
    }

    // Load history from memory
    const entries = await loadHistoryForSession(sessionId);

    return jsonResponse({ entries });
  } catch (err) {
    return handleUnexpectedError(err, requestId);
  }
}
