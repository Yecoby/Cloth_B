import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";
import Redis from "ioredis";

const points = Number(process.env.RATE_LIMIT_POINTS || 100);
const duration = Number(process.env.RATE_LIMIT_DURATION_SECONDS || 60);

let limiter: RateLimiterRedis | RateLimiterMemory | undefined;

/**
 * Lazily builds the limiter on first real use (a request), never at module
 * import time. This matters because Next.js imports server modules during
 * `next build` for static analysis/prerendering — if we connected to Redis
 * eagerly at the top of this file, the build would fail whenever Redis
 * isn't reachable (e.g. mid-build, before docker-compose's `redis` service
 * is resolvable on the network).
 */
function getLimiter(): RateLimiterRedis | RateLimiterMemory {
  if (limiter) return limiter;

  if (process.env.REDIS_URL) {
    const redisClient = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      lazyConnect: true, // don't open the socket until the first command
      retryStrategy: () => null, // don't hang retrying if Redis is briefly unavailable
    });
    redisClient.on("error", () => {
      // Swallow — rate-limiter-flexible surfaces failures via consume(),
      // and an unhandled 'error' event would otherwise crash the process.
    });
    limiter = new RateLimiterRedis({ storeClient: redisClient, keyPrefix: "rl", points, duration });
  } else {
    // Falls back to in-memory (single-instance only) — fine for local dev,
    // never for multi-instance production deployments.
    limiter = new RateLimiterMemory({ points, duration });
  }

  return limiter;
}

/**
 * Throws when the caller has exceeded the allotted request budget.
 * Use a scoped key per concern, e.g. `login:<ip>`, `booking:<userId>`.
 */
export async function assertWithinRateLimit(key: string, cost = 1) {
  try {
    await getLimiter().consume(key, cost);
  } catch (err: any) {
    // rate-limiter-flexible throws its own RateLimiterRes on limit-exceeded,
    // but a real Redis connection failure also lands here — don't let a
    // down Redis instance block every request; fail open in that case.
    if (err && typeof err === "object" && "msBeforeNext" in err) {
      const limitErr = new Error("Too many requests. Please slow down and try again shortly.");
      (limitErr as any).status = 429;
      throw limitErr;
    }
    // Unexpected error (e.g. connection issue) — fail open rather than 500ing every request.
  }
}

// Tighter limits for sensitive auth endpoints (brute-force protection)
export async function assertWithinAuthRateLimit(ip: string) {
  return assertWithinRateLimit(`auth:${ip}`, 1);
}
