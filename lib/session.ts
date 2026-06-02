/**
 * lib/session.ts
 * Server-side session management backed by Cloudflare R2.
 *
 * Sessions are stored at: sessions/{sessionId}/session.json
 * The session cookie is HTTP-only, Secure, SameSite=Strict, 24 h Max-Age.
 *
 * Do NOT import this module from client components.
 */

import { Session } from "./types";
import { putObject, getObject, deleteObject } from "./r2";

// ---------------------------------------------------------------------------
// R2 key helper
// ---------------------------------------------------------------------------

function sessionKey(sessionId: string): string {
  return `sessions/${sessionId}/session.json`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a brand-new session, persist it to R2, and return it.
 */
export async function createSession(): Promise<Session> {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const session: Session = {
    sessionId,
    createdAt: now,
    lastActiveAt: now,
    entryCount: 0,
  };

  await putObject(
    sessionKey(sessionId),
    JSON.stringify(session),
    "application/json"
  );

  return session;
}

/**
 * Retrieve an existing session from R2.
 * Returns null if the session does not exist.
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const buffer = await getObject(sessionKey(sessionId));

  if (buffer === null) {
    return null;
  }

  const session = JSON.parse(buffer.toString("utf-8")) as Session;
  return session;
}

/**
 * Slide the 24-hour window by updating `lastActiveAt` for the given session.
 * Does nothing if the session is not found.
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);

  if (session === null) {
    return;
  }

  await saveSession({
    ...session,
    lastActiveAt: new Date().toISOString(),
  });
}

/**
 * Persist an updated session record to R2.
 */
export async function saveSession(session: Session): Promise<void> {
  await putObject(
    sessionKey(session.sessionId),
    JSON.stringify(session),
    "application/json"
  );
}

/**
 * Delete the session record from R2.
 * Only removes `sessions/{sessionId}/session.json` — not the entire prefix.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await deleteObject(sessionKey(sessionId));
}

// ---------------------------------------------------------------------------
// Cookie helper
// ---------------------------------------------------------------------------

/**
 * Returns the value to use for a `Set-Cookie` response header that stores the
 * session ID as an HTTP-only, secure, same-site cookie with a 24-hour TTL.
 *
 * Usage:
 *   response.headers.set("Set-Cookie", getSessionCookieHeader(sessionId));
 */
export function getSessionCookieHeader(sessionId: string): string {
  return `sessionId=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`;
}
