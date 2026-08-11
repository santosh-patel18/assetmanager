/**
 * In-memory rate limiter for AssetFlow API routes.
 * 
 * For production, replace with Redis-backed rate limiting (e.g., @upstash/ratelimit).
 * This in-memory implementation works for single-instance deployments.
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const keys = Array.from(store.keys());
  for (const key of keys) {
    const entry = store.get(key);
    if (entry && now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_GENERAL || '100', 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
};

const AUTH_CONFIG: RateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_AUTH || '10', 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
};

/**
 * Extract client identifier from request.
 * Uses X-Forwarded-For in production (behind load balancer), falls back to a generic key.
 */
function getClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return ip;
}

/**
 * Check rate limit for a request.
 * Returns null if allowed, or a NextResponse with 429 if rate limited.
 */
export function checkRateLimit(
  request: Request,
  configOverride?: Partial<RateLimitConfig>
): NextResponse | null {
  const config = { ...DEFAULT_CONFIG, ...configOverride };
  const clientKey = getClientKey(request);
  const key = `${clientKey}:${new URL(request.url).pathname}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    logger.warn('Rate limit exceeded', {
      clientKey,
      path: new URL(request.url).pathname,
      count: entry.count,
      maxRequests: config.maxRequests,
    });

    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        details: { retry_after_seconds: retryAfter },
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(entry.resetAt / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Rate limit specifically for auth endpoints (stricter).
 */
export function checkAuthRateLimit(request: Request): NextResponse | null {
  return checkRateLimit(request, AUTH_CONFIG);
}

/**
 * Get rate limit headers to attach to successful responses.
 */
export function getRateLimitHeaders(request: Request): Record<string, string> {
  const clientKey = getClientKey(request);
  const key = `${clientKey}:${new URL(request.url).pathname}`;
  const entry = store.get(key);
  const config = DEFAULT_CONFIG;

  if (!entry) return {};

  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, config.maxRequests - entry.count).toString(),
    'X-RateLimit-Reset': Math.ceil(entry.resetAt / 1000).toString(),
  };
}
