/**
 * Browser-side fetch helpers for API routes (credentials include session cookie).
 */

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(`API error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 20_000, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      ...init,
      credentials: "include",
      signal: controller.signal,
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { error: "Invalid JSON response" };
    }

    if (!response.ok) {
      throw new ApiError(response.status, data);
    }

    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export function apiPost<T>(
  path: string,
  body: unknown,
  timeoutMs = 20_000
): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeoutMs,
  });
}

export function apiGet<T>(path: string, timeoutMs = 20_000): Promise<T> {
  return apiFetch<T>(path, { method: "GET", timeoutMs });
}
