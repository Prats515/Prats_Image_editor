/**
 * Expired session cleanup for R2 (24 h inactivity).
 * Requirements: 7.6, 9.7
 */

import { listObjects, deleteObject, getObject } from "./r2";
import type { Session } from "./types";

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function deleteSessionPrefix(sessionId: string): Promise<void> {
  const prefix = `sessions/${sessionId}/`;
  const keys = await listObjects(prefix);
  await Promise.all(keys.map((key) => deleteObject(key)));
}

/**
 * Deletes all session data older than 24 hours based on lastActiveAt.
 * Returns the number of sessions removed.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const keys = await listObjects("sessions/");
  const sessionJsonKeys = keys.filter((k) => k.endsWith("/session.json"));

  let removed = 0;
  const now = Date.now();

  for (const key of sessionJsonKeys) {
    const match = key.match(/^sessions\/([^/]+)\/session\.json$/);
    if (!match) continue;

    const sessionId = match[1];
    const buffer = await getObject(key);
    if (buffer === null) continue;

    let session: Session;
    try {
      session = JSON.parse(buffer.toString("utf-8")) as Session;
    } catch {
      await deleteSessionPrefix(sessionId);
      removed++;
      continue;
    }

    const lastActive = new Date(session.lastActiveAt).getTime();
    if (now - lastActive > SESSION_MAX_AGE_MS) {
      await deleteSessionPrefix(sessionId);
      removed++;
    }
  }

  return removed;
}
