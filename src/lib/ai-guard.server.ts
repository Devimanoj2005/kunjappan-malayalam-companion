import { getRequest, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

// Simple in-memory token bucket per IP. Resets on cold start; good enough
// to cap obvious abuse without external infra.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  b.count += 1;
  if (b.count > MAX_PER_WINDOW) {
    throw new Error("Too many requests. Please try again in a minute.");
  }
}

function checkOrigin() {
  const req = getRequest();
  const host = getRequestHeader("host") ?? "";
  const origin = getRequestHeader("origin") ?? "";
  const referer = getRequestHeader("referer") ?? "";
  const source = origin || referer;
  if (!source) return; // some clients omit; rate limit still applies
  try {
    const sourceHost = new URL(source).host;
    const reqHost = host || new URL(req.url).host;
    if (sourceHost !== reqHost) {
      throw new Error("Request blocked.");
    }
  } catch {
    throw new Error("Request blocked.");
  }
}

export function guardAiRequest() {
  checkOrigin();
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  checkRateLimit(ip);
}
