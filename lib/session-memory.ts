/**
 * lib/session-memory.ts
 * Temporary in-memory session store (dev fallback when R2 has issues)
 */

import { Session } from "./types";

const memoryStore = new Map<string, Session>();

export async function createSession(): Promise<Session> {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const session: Session = {
    sessionId,
    createdAt: now,
    lastActiveAt: now,
    entryCount: 0,
  };

  memoryStore.set(sessionId, session);
  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  return memoryStore.get(sessionId) || null;
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  const session = memoryStore.get(sessionId);
  if (session) {
    session.lastActiveAt = new Date().toISOString();
  }
}

export async function saveSession(session: Session): Promise<void> {
  memoryStore.set(session.sessionId, session);
}

export async function deleteSession(sessionId: string): Promise<void> {
  memoryStore.delete(sessionId);
}

export function getSessionCookieHeader(sessionId: string): string {
  const secure =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `sessionId=${sessionId}; HttpOnly${secure}; SameSite=Lax; Max-Age=86400; Path=/`;
}
