// Tiny in-memory rate limiter for the demo. Not durable across serverless
// instances, but enough to prevent trivial abuse in a demo deployment.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (b.count >= max) return { ok: false, remaining: 0 };
  b.count += 1;
  return { ok: true, remaining: max - b.count };
}

export function clientKey(req: Request, prefix: string): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || "local";
  return `${prefix}:${ip}`;
}

/** Reject requests whose Origin isn't same-origin (for sensitive endpoints). */
export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches may omit it
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
