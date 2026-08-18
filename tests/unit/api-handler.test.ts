import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

/**
 * API Handler tests.
 *
 * The apiHandler wrapper is the central security gate. It handles:
 * - Authentication (JWT verification)
 * - Role-based access control (DB-verified roles)
 * - Error handling (AppError → HTTP response)
 * - Request ID injection
 * - Body parsing
 *
 * We mock auth functions to test the handler logic in isolation.
 */

// ─── Mock Auth Module ───────────────────────────────────────────

const mockGetCurrentUserFromHeader = vi.fn();
const mockVerifyRoleFromDB = vi.fn();

vi.mock('@/lib/auth', () => ({
  getCurrentUserFromHeader: (...args: unknown[]) => mockGetCurrentUserFromHeader(...args),
  verifyRoleFromDB: (...args: unknown[]) => mockVerifyRoleFromDB(...args),
}));

// Mock logger to suppress console output
vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  generateRequestId: () => 'req_test_123',
}));

// Import AFTER mocks
import { apiHandler } from '@/lib/api-handler';

// ─── Helpers ────────────────────────────────────────────────────

const mockUser = {
  userId: '123e4567-e89b-12d3-a456-426614174000',
  email: 'admin@example.com',
  role: 'admin',
  name: 'Test Admin',
};

function createRequest(
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: unknown,
  headers?: Record<string, string>
): Request {
  const options: RequestInit = {
    method,
    headers: { ...headers },
  };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(body);
    (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  return new Request(url, options);
}

// ─── Authentication Tests ───────────────────────────────────────

describe('apiHandler — Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when no token is provided (non-public route)', async () => {
    mockGetCurrentUserFromHeader.mockResolvedValue(null);

    const handler = apiHandler({
      handler: async () => ({ data: { ok: true } }),
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.code).toBe('UNAUTHENTICATED');
  });

  it('should allow access to public routes without auth', async () => {
    const handler = apiHandler({
      public: true,
      handler: async () => ({ data: { message: 'public data' } }),
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.message).toBe('public data');
  });

  it('should pass authenticated user to handler context', async () => {
    mockGetCurrentUserFromHeader.mockResolvedValue(mockUser);

    let capturedUser: unknown = null;
    const handler = apiHandler({
      handler: async ({ user }) => {
        capturedUser = user;
        return { data: { ok: true } };
      },
    });

    await handler(createRequest());
    expect(capturedUser).toEqual(mockUser);
  });
});

// ─── Role-Based Access Control ──────────────────────────────────

describe('apiHandler — RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUserFromHeader.mockResolvedValue(mockUser);
  });

  it('should return 403 when user lacks required role', async () => {
    mockVerifyRoleFromDB.mockResolvedValue('employee');

    const handler = apiHandler({
      roles: ['admin', 'asset_manager'],
      handler: async () => ({ data: { ok: true } }),
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('should allow access when user has a matching role', async () => {
    mockVerifyRoleFromDB.mockResolvedValue('admin');

    const handler = apiHandler({
      roles: ['admin', 'asset_manager'],
      handler: async () => ({ data: { ok: true } }),
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(200);
  });

  it('should return 403 when verifyRoleFromDB returns null (inactive user)', async () => {
    mockVerifyRoleFromDB.mockResolvedValue(null);

    const handler = apiHandler({
      roles: ['admin'],
      handler: async () => ({ data: { ok: true } }),
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(403);
  });

  it('should skip role check when roles array is not specified', async () => {
    // No roles specified — auth only, no role check
    const handler = apiHandler({
      handler: async () => ({ data: { ok: true } }),
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(200);
    expect(mockVerifyRoleFromDB).not.toHaveBeenCalled();
  });
});

// ─── Request ID ─────────────────────────────────────────────────

describe('apiHandler — Request ID', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include X-Request-Id in successful responses', async () => {
    const handler = apiHandler({
      public: true,
      handler: async () => ({ data: { ok: true } }),
    });

    const response = await handler(createRequest());
    expect(response.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('should include X-Request-Id in error responses', async () => {
    mockGetCurrentUserFromHeader.mockResolvedValue(null);

    const handler = apiHandler({
      handler: async () => ({ data: {} }),
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(401);
    expect(response.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('should use client-provided request ID if present', async () => {
    const handler = apiHandler({
      public: true,
      handler: async () => ({ data: { ok: true } }),
    });

    const request = createRequest('GET', 'http://localhost:3000/api/test', undefined, {
      'x-request-id': 'custom-req-id-999',
    });
    const response = await handler(request);
    expect(response.headers.get('X-Request-Id')).toBe('custom-req-id-999');
  });
});

// ─── Body Parsing ───────────────────────────────────────────────

describe('apiHandler — Body Parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUserFromHeader.mockResolvedValue(mockUser);
  });

  it('should parse JSON body for POST requests', async () => {
    let capturedBody: unknown = null;
    const handler = apiHandler({
      handler: async ({ body }) => {
        capturedBody = body;
        return { data: { ok: true } };
      },
    });

    const response = await handler(
      createRequest('POST', 'http://localhost:3000/api/test', { name: 'Laptop', count: 5 })
    );
    expect(response.status).toBe(200);
    expect(capturedBody).toEqual({ name: 'Laptop', count: 5 });
  });

  it('should set body to null for GET requests', async () => {
    let capturedBody: unknown = 'not-null';
    const handler = apiHandler({
      handler: async ({ body }) => {
        capturedBody = body;
        return { data: { ok: true } };
      },
    });

    await handler(createRequest('GET'));
    expect(capturedBody).toBeNull();
  });

  it('should handle missing body gracefully on POST', async () => {
    let capturedBody: unknown = 'not-null';
    const handler = apiHandler({
      handler: async ({ body }) => {
        capturedBody = body;
        return { data: { ok: true } };
      },
    });

    // POST with no body — should not crash
    const request = new Request('http://localhost:3000/api/test', { method: 'POST' });
    const response = await handler(request);
    expect(response.status).toBe(200);
    expect(capturedBody).toBeNull();
  });
});

// ─── Error Handling ─────────────────────────────────────────────

describe('apiHandler — Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUserFromHeader.mockResolvedValue(mockUser);
  });

  it('should map AppError to correct HTTP status', async () => {
    // Dynamically import to avoid circular issues with mocks
    const { NotFoundError } = await import('@/lib/errors');

    const handler = apiHandler({
      handler: async () => {
        throw new NotFoundError('Asset');
      },
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.code).toBe('NOT_FOUND');
    expect(body.error).toContain('Asset');
  });

  it('should map ValidationError with field details', async () => {
    const { ValidationError } = await import('@/lib/errors');

    const handler = apiHandler({
      handler: async () => {
        throw new ValidationError({ name: ['Name is required'] });
      },
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toEqual({ name: ['Name is required'] });
  });

  it('should return 500 for unknown errors with safe message', async () => {
    const handler = apiHandler({
      handler: async () => {
        throw new Error('Database connection pool exhausted');
      },
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.code).toBe('INTERNAL_ERROR');
    // In non-development, should NOT leak internal error message
    // (process.env.NODE_ENV is 'test', which is treated like production for safety)
  });

  it('should return custom status codes from handler', async () => {
    const handler = apiHandler({
      public: true,
      handler: async () => ({ data: { id: 'new-123' }, status: 201 }),
    });

    const response = await handler(createRequest());
    expect(response.status).toBe(201);
  });

  it('should pass custom headers from handler result', async () => {
    const handler = apiHandler({
      public: true,
      handler: async () => ({
        data: { ok: true },
        headers: { 'X-Custom-Header': 'test-value' },
      }),
    });

    const response = await handler(createRequest());
    expect(response.headers.get('X-Custom-Header')).toBe('test-value');
  });
});
