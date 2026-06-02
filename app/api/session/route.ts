/**
 * app/api/session/route.ts
 *
 * POST /api/session
 *
 * Bootstraps or validates a user session via an HTTP-only cookie.
 *
 * Logic:
 *   - No cookie / empty   → createSession(), set Set-Cookie, return { sessionId, isNew: true, historyCount: 0 }
 *   - Cookie present, session valid   → updateSessionActivity(), return { sessionId, isNew: false, historyCount }
 *   - Cookie present, session expired → createSession(), set Set-Cookie, return { sessionId, isNew: true, historyCount: 0 }
 *
 * Always sets a Set-Cookie header to slide the 24 h window.
 *
 * Requirements: 9.1, 9.3, 9.4
 */

import {
  createSession,
  getSession,
  updateSessionActivity,
  getSessionCookieHeader,
} from "../../../lib/session-memory";
import {
  handleUnexpectedError,
  generateRequestId,
} from "../../../lib/apiMiddleware";

// ---------------------------------------------------------------------------
// Cookie parser helper
// ---------------------------------------------------------------------------

/**
 * Parses the `Cookie` header string and returns the value for `sessionId`,
 * or null if the header is absent or the key is not present.
 *
 * Splits on `;`, trims each part, finds the `sessionId=` entry.
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

// ---------------------------------------------------------------------------
// Helper: build a JSON response with Set-Cookie in a single constructor call.
// Using new Response() directly because Response headers are immutable after
// construction in some runtimes (e.g., Vercel Edge / Node fetch polyfills).
// ---------------------------------------------------------------------------

function sessionResponse(
  data: { sessionId: string; isNew: boolean; historyCount: number },
  cookieHeader: string
): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader,
    },
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  const requestId = generateRequestId();

  try {
    const cookieHeader = request.headers.get("cookie");
    const existingSessionId = parseSessionIdFromCookieHeader(cookieHeader);

    // ── Case 1: No cookie present — create a brand new session ─────────────
    if (existingSessionId === null) {
      const session = await createSession();

      return sessionResponse(
        { sessionId: session.sessionId, isNew: true, historyCount: 0 },
        getSessionCookieHeader(session.sessionId)
      );
    }

    // ── Case 2: Cookie present — try to load the existing session ───────────
    const session = await getSession(existingSessionId);

    if (session === null) {
      // Session expired or not found in R2 — create a new one
      const newSession = await createSession();

      return sessionResponse(
        { sessionId: newSession.sessionId, isNew: true, historyCount: 0 },
        getSessionCookieHeader(newSession.sessionId)
      );
    }

    // ── Case 3: Valid existing session — slide the 24 h window ─────────────
    await updateSessionActivity(existingSessionId);

    return sessionResponse(
      {
        sessionId: session.sessionId,
        isNew: false,
        historyCount: session.entryCount,
      },
      getSessionCookieHeader(session.sessionId)
    );
  } catch (err) {
    return handleUnexpectedError(err, requestId);
  }
}
