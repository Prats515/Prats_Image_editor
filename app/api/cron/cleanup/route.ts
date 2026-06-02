/**
 * GET /api/cron/cleanup
 *
 * Deletes R2 data for sessions inactive longer than 24 hours.
 * Secured with Authorization: Bearer {CRON_SECRET}
 *
 * Requirements: 7.6, 9.7
 */

import { cleanupExpiredSessions } from "../../../../lib/sessionCleanup";
import {
  generateRequestId,
  handleUnexpectedError,
  jsonResponse,
} from "../../../../lib/apiMiddleware";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  return auth.slice(7) === secret;
}

export async function GET(request: Request): Promise<Response> {
  const requestId = generateRequestId();

  try {
    if (!isAuthorized(request)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const removed = await cleanupExpiredSessions();
    return jsonResponse({ ok: true, removedSessions: removed });
  } catch (err) {
    return handleUnexpectedError(err, requestId);
  }
}
