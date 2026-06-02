/**
 * Parse sessionId from the Cookie header (shared by API routes).
 */

export function parseSessionIdFromCookieHeader(
  cookieHeader: string | null
): string | null {
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
