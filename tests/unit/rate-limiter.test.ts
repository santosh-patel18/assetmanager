import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, checkAuthRateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

/**
 * Rate limiter tests.
 *
 * The rate limiter uses an in-memory Map store, which persists across tests
 * within the same module. We use unique paths/IPs per test to avoid collisions.
 */

// Helper: create a mock Request with optional headers
function mockRequest(
  path: string,
  options: { ip?: string; method?: string } = {}
): Request {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  if (options.ip) headers.set('x-forwarded-for', options.ip);
  return new Request(url, {
    method: options.method || 'GET',
    headers,
  });
}

// ─── checkRateLimit ─────────────────────────────────────────────

describe('checkRateLimit', () => {
  it('should allow requests under the limit', () => {
    const req = mockRequest('/api/test-under-limit', { ip: '10.0.0.1' });
    const result = checkRateLimit(req, { maxRequests: 100, windowMs: 60_000 });
    expect(result).toBeNull(); // null = allowed
  });

  it('should return 429 when limit is exceeded', () => {
    const path = '/api/test-exceed-' + Date.now();
    const ip = '10.0.0.2';

    // Exhaust the limit (3 requests max)
    for (let i = 0; i < 3; i++) {
      checkRateLimit(mockRequest(path, { ip }), { maxRequests: 3, windowMs: 60_000 });
    }

    // 4th request should be blocked
    const result = checkRateLimit(
      mockRequest(path, { ip }),
      { maxRequests: 3, windowMs: 60_000 }
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it('should include Retry-After header in 429 response', async () => {
    const path = '/api/test-retry-header-' + Date.now();
    const ip = '10.0.0.3';

    for (let i = 0; i < 2; i++) {
      checkRateLimit(mockRequest(path, { ip }), { maxRequests: 2, windowMs: 60_000 });
    }

    const result = checkRateLimit(
      mockRequest(path, { ip }),
      { maxRequests: 2, windowMs: 60_000 }
    );
    expect(result).not.toBeNull();
    expect(result!.headers.get('Retry-After')).toBeTruthy();

    const body = await result!.json();
    expect(body.code).toBe('RATE_LIMITED');
    expect(body.details.retry_after_seconds).toBeGreaterThan(0);
  });

  it('should include rate limit headers in 429 response', () => {
    const path = '/api/test-rl-headers-' + Date.now();
    const ip = '10.0.0.4';

    for (let i = 0; i < 5; i++) {
      checkRateLimit(mockRequest(path, { ip }), { maxRequests: 5, windowMs: 60_000 });
    }

    const result = checkRateLimit(
      mockRequest(path, { ip }),
      { maxRequests: 5, windowMs: 60_000 }
    );
    expect(result).not.toBeNull();
    expect(result!.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(result!.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(result!.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('should track different paths separately', () => {
    const ip = '10.0.0.5';
    const suffix = Date.now();

    // Exhaust limit on path A
    for (let i = 0; i < 2; i++) {
      checkRateLimit(
        mockRequest(`/api/path-a-${suffix}`, { ip }),
        { maxRequests: 2, windowMs: 60_000 }
      );
    }

    // Path B should still be allowed
    const result = checkRateLimit(
      mockRequest(`/api/path-b-${suffix}`, { ip }),
      { maxRequests: 2, windowMs: 60_000 }
    );
    expect(result).toBeNull();
  });

  it('should track different IPs separately', () => {
    const path = '/api/test-ip-separate-' + Date.now();

    // Exhaust limit for IP A
    for (let i = 0; i < 2; i++) {
      checkRateLimit(mockRequest(path, { ip: '192.168.1.1' }), { maxRequests: 2, windowMs: 60_000 });
    }

    // IP B should still be allowed
    const result = checkRateLimit(
      mockRequest(path, { ip: '192.168.1.2' }),
      { maxRequests: 2, windowMs: 60_000 }
    );
    expect(result).toBeNull();
  });

  it('should reset counter after window expires', () => {
    vi.useFakeTimers();
    try {
      const path = '/api/test-window-reset-' + Date.now();
      const ip = '10.0.0.6';
      const windowMs = 5000;

      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit(mockRequest(path, { ip }), { maxRequests: 3, windowMs });
      }

      // Should be blocked now
      const blocked = checkRateLimit(
        mockRequest(path, { ip }),
        { maxRequests: 3, windowMs }
      );
      expect(blocked).not.toBeNull();

      // Advance time past the window
      vi.advanceTimersByTime(windowMs + 100);

      // Should be allowed again
      const allowed = checkRateLimit(
        mockRequest(path, { ip }),
        { maxRequests: 3, windowMs }
      );
      expect(allowed).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });


  it('should use "unknown" when no X-Forwarded-For header', () => {
    const path = '/api/test-no-ip-' + Date.now();
    // Request without ip header — should default to "unknown"
    const result = checkRateLimit(mockRequest(path), { maxRequests: 100, windowMs: 60_000 });
    expect(result).toBeNull();
  });
});

// ─── checkAuthRateLimit ─────────────────────────────────────────

describe('checkAuthRateLimit', () => {
  it('should use stricter auth limits', () => {
    const path = '/api/auth/login-test-' + Date.now();
    const ip = '10.0.0.10';

    // Auth default is 10 req/min (from env or default)
    // Send 10 requests — they should all pass
    for (let i = 0; i < 10; i++) {
      const result = checkAuthRateLimit(mockRequest(path, { ip }));
      expect(result).toBeNull();
    }

    // 11th request should be blocked
    const blocked = checkAuthRateLimit(mockRequest(path, { ip }));
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });
});

// ─── getRateLimitHeaders ────────────────────────────────────────

describe('getRateLimitHeaders', () => {
  it('should return rate limit headers for tracked requests', () => {
    const path = '/api/test-get-headers-' + Date.now();
    const ip = '10.0.0.20';
    const req = mockRequest(path, { ip });

    // Make a request to create an entry
    checkRateLimit(req, { maxRequests: 100, windowMs: 60_000 });

    const headers = getRateLimitHeaders(mockRequest(path, { ip }));
    expect(headers['X-RateLimit-Limit']).toBeDefined();
    expect(headers['X-RateLimit-Remaining']).toBeDefined();
    expect(headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('should return empty object for untracked requests', () => {
    const headers = getRateLimitHeaders(
      mockRequest('/api/never-seen-' + Date.now(), { ip: '99.99.99.99' })
    );
    expect(headers).toEqual({});
  });

  it('should show decreasing remaining count', () => {
    const path = '/api/test-decreasing-' + Date.now();
    const ip = '10.0.0.21';

    checkRateLimit(mockRequest(path, { ip }), { maxRequests: 10, windowMs: 60_000 });
    const h1 = getRateLimitHeaders(mockRequest(path, { ip }));

    checkRateLimit(mockRequest(path, { ip }), { maxRequests: 10, windowMs: 60_000 });
    const h2 = getRateLimitHeaders(mockRequest(path, { ip }));

    expect(parseInt(h2['X-RateLimit-Remaining'])).toBeLessThan(
      parseInt(h1['X-RateLimit-Remaining'])
    );
  });
});
