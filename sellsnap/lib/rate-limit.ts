import { logger } from '@/lib/logger';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// In-memory fallback store — only used when Upstash Redis is not configured
// (local development). In production with multiple server instances, the
// per-instance Map would make the limit proportional to instance count, so a
// shared Redis store is preferred.
const store = new Map<string, RateLimitEntry>();

type RateLimitConfig = {
  /** How many requests are allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
};

const CONFIGS: Record<string, RateLimitConfig> = {
  login: { limit: 5, windowMs: 60_000 },
  signup: { limit: 3, windowMs: 60_000 },
  'order.create': { limit: 10, windowMs: 60_000 },
  // Status polling triggers Flutterwave verify lookups while an order is
  // pending. On shared IPs the webhook still settles orders if this trips.
  'order.status': { limit: 30, windowMs: 60_000 },
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

type RedisClient = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
  ttl: (key: string) => Promise<number>;
};

let redisClient: RedisClient | null | undefined;

async function getRedisClient(): Promise<RedisClient | null> {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  try {
    const { Redis } = await import('@upstash/redis');
    redisClient = Redis.fromEnv();
  } catch (error) {
    logger.error('rate-limit.redis-init-failed', { error });
    redisClient = null;
  }
  return redisClient;
}

/**
 * Checks whether a given key (usually IP + action) has exceeded its rate limit.
 * Uses Upstash Redis when configured (shared across instances), otherwise falls
 * back to in-memory state. Fails open on Redis errors so one hiccup never
 * blocks real checkout traffic.
 */
export async function checkRateLimit(
  action: string,
  identifier: string
): Promise<RateLimitResult> {
  const config = CONFIGS[action];
  if (!config) {
    logger.warn('rate-limit.unknown-action', { action });
    return { allowed: true };
  }

  // Never count against a shared "unknown" bucket: an attacker could exhaust a
  // single global bucket and lock out every request without an IP. Requests
  // without a resolvable IP simply skip the limit (real proxies always set one).
  if (!identifier || identifier === 'unknown') {
    return { allowed: true };
  }

  const key = `rate:${action}:${identifier}`;

  const client = await getRedisClient();
  if (client) {
    try {
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, Math.ceil(config.windowMs / 1000));
      }
      if (count > config.limit) {
        const ttl = await client.ttl(key);
        return { allowed: false, retryAfterMs: Math.max(1, ttl * 1000) };
      }
      return { allowed: true };
    } catch (error) {
      logger.error('rate-limit.redis-check-failed', { error, action });
      return { allowed: true };
    }
  }

  let entry = store.get(key);
  const now = Date.now();

  if (!entry || now > entry.resetAt) {
    // Fresh window
    entry = { count: 1, resetAt: now + config.windowMs };
    store.set(key, entry);
    return { allowed: true };
  }

  if (entry.count >= config.limit) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true };
}