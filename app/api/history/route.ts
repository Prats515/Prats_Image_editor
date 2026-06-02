/**
 * app/api/history/route.ts
 *
 * GET /api/history
 *
 * Returns the Edit_History for the current session, ordered oldest → newest.
 *
 * Logic:
 *   1. Parse `sessionId` from `cookie` header (manual string parsing — split
 *      on `;`, find `sessionId=` — same pattern as /api/session).
 *   2. If no sessionId cookie → return { entries: [] }.
 *   3. Call getSession(sessionId) — if null → return { entries: [] }.
 *   4. Call listObjects(`sessions/${sessionId}/history/`) → array of R2 keys.
 *   5. Filter to keys ending with `/metadata.json`.
 *   6. For each key: getObject(key) → parse JSON as HistoryEntry (note:
 *      `imageUrl` was NOT stored; it is regenerated below).
 *   7. For each entry: generateSignedUrl(entry.imageKey, 86400) → set as
 *      entry.imageUrl.
 *   8. Sort by `createdAt` ascending.
 *   9. Return { entries: HistoryEntry[] } using jsonResponse.
 *  10. On any R2 read failure: catch and return { entries: [] } (no retry).
 *  11. Outer try/catch → handleUnexpectedError for 500s.
 *
 * Requirements: 7.3, 7.4, 7.5, 9.3
 */

import { getSession } from "../../../lib/session";
import { listObjects, getObject, generateSignedUrl } from "../../../lib/r2";
import {
  handleUnexpectedError,
  jsonResponse,
  generateRequestId,
} from "../../../lib/apiMiddleware";
import type { HistoryEntry } from "../../../lib/types";

// ---------------------------------------------------------------------------
// Cookie parser helper — same manual pattern used in /api/session
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
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  const requestId = generateRequestId();

  try {
    // ── 1. Parse sessionId from cookie header ───────────────────────────────
    const cookieHeader = request.headers.get("cookie");
    const sessionId = parseSessionIdFromCookieHeader(cookieHeader);

    // ── 2. No sessionId cookie → empty history ──────────────────────────────
    if (sessionId === null) {
      return jsonResponse({ entries: [] });
    }

    // ── 3. Validate session exists in R2 ────────────────────────────────────
    let session;
    try {
      session = await getSession(sessionId);
    } catch {
      return jsonResponse({ entries: [] });
    }

    if (session === null) {
      return jsonResponse({ entries: [] });
    }

    // ── 4–10. List objects, read metadata, generate signed URLs ─────────────
    let entries: HistoryEntry[];

    try {
      // 4. List all keys under the session's history prefix
      const allKeys = await listObjects(`sessions/${sessionId}/history/`);

      // 5. Filter to metadata.json keys only
      const metadataKeys = allKeys.filter((key) => key.endsWith("/metadata.json"));

      // 6. Fetch and parse each metadata file
      const entryPromises = metadataKeys.map(async (key): Promise<HistoryEntry | null> => {
        try {
          const buffer = await getObject(key);
          if (buffer === null) {
            return null;
          }

          // Parse as HistoryEntry (imageUrl was not stored; will be regenerated)
          const entry = JSON.parse(buffer.toString("utf-8")) as HistoryEntry;

          // 7. Generate a fresh signed URL for the entry's image key (24 h expiry)
          const imageUrl = await generateSignedUrl(entry.imageKey, 86400);
          entry.imageUrl = imageUrl;

          return entry;
        } catch {
          // On any R2 read failure for an individual entry, skip it
          return null;
        }
      });

      const rawEntries = await Promise.all(entryPromises);

      // Filter out nulls (failed reads)
      const validEntries = rawEntries.filter(
        (e): e is HistoryEntry => e !== null
      );

      // 8. Sort by createdAt ascending (oldest → newest)
      validEntries.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      entries = validEntries;
    } catch {
      // 10. On any R2 operation failure, return empty entries (no retry)
      return jsonResponse({ entries: [] });
    }

    // ── 9. Return sorted entries ────────────────────────────────────────────
    return jsonResponse({ entries });
  } catch (err) {
    // ── 11. Outer catch-all → handleUnexpectedError returns 500 ─────────────
    return handleUnexpectedError(err, requestId);
  }
}
