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

const ALLOWED_HOST_SUFFIXES = [
  "localhost",
  "127.0.0.1",
  ".lovable.app",
  ".lovableproject.com",
  ".lovable.dev",
];

function hostMatches(a: string, b: string) {
  const stripPort = (h: string) => h.replace(/:\d+$/, "").toLowerCase();
  return stripPort(a) === stripPort(b);
}

function isAllowedHost(host: string) {
  const h = host.replace(/:\d+$/, "").toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((s) =>
    s.startsWith(".") ? h.endsWith(s) || h === s.slice(1) : h === s,
  );
}

function checkOrigin() {
  const req = getRequest();
  const host = getRequestHeader("host") ?? "";
  const origin = getRequestHeader("origin") ?? "";
  const referer = getRequestHeader("referer") ?? "";
  const source = origin || referer;
  if (!source) return;
  try {
    const sourceHost = new URL(source).host;
    const reqHost = host || new URL(req.url).host;
    if (hostMatches(sourceHost, reqHost)) return;
    if (isAllowedHost(sourceHost)) return;
    throw new Error("Request blocked.");
  } catch (e) {
    if (e instanceof Error && e.message === "Request blocked.") throw e;
    throw new Error("Request blocked.");
  }
}


export function guardAiRequest() {
  checkOrigin();
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  checkRateLimit(ip);
}
