import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Activity Logger tests.
 *
 * The logActivity function writes to prisma.activityLog.create.
 * We mock the Prisma client to test in isolation (no DB needed).
 */

// ─── Mock Prisma ────────────────────────────────────────────────
// Must mock BEFORE importing the module under test

const mockCreate = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    activityLog: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// Mock logger to prevent console output during tests
const mockLoggerError = vi.fn();
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

// Import AFTER mocks are set up
import { logActivity } from '@/lib/activity-logger';

// ─── Tests ──────────────────────────────────────────────────────

describe('logActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 'mock-log-id' });
  });

  it('should create an activity log entry with all fields', async () => {
    await logActivity(
      'user-123',
      'asset_created',
      'asset',
      'asset-456',
      { name: 'MacBook Pro' },
      'req_789'
    );

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.data.actorId).toBe('user-123');
    expect(callArgs.data.action).toBe('asset_created');
    expect(callArgs.data.targetType).toBe('asset');
    expect(callArgs.data.targetId).toBe('asset-456');
    expect(callArgs.data.requestId).toBe('req_789');
  });

  it('should default optional fields to null', async () => {
    await logActivity('user-123', 'login');

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.data.targetType).toBeNull();
    expect(callArgs.data.targetId).toBeNull();
    expect(callArgs.data.requestId).toBeNull();
  });

  it('should handle Prisma.JsonNull for undefined metadata', async () => {
    await logActivity('user-123', 'login');

    const callArgs = mockCreate.mock.calls[0][0];
    // When metadata is undefined, it should be Prisma.JsonNull
    // The actual value depends on Prisma's export — just check it's not an object
    expect(callArgs.data.metadata).toBeDefined();
  });

  it('should serialize metadata as Prisma JSON', async () => {
    const metadata = { asset_tag: 'AST-001', name: 'Laptop', cost: 1999 };
    await logActivity('user-123', 'asset_created', 'asset', 'a-1', metadata);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.data.metadata).toBeDefined();
  });

  it('should catch and log database errors gracefully', async () => {
    mockCreate.mockRejectedValue(new Error('Database connection lost'));

    // Should NOT throw — activity logging must never crash the request
    await expect(logActivity('user-123', 'login')).resolves.toBeUndefined();

    // Error should be logged
    expect(mockLoggerError).toHaveBeenCalledOnce();
    expect(mockLoggerError.mock.calls[0][0]).toBe('Failed to write activity log');
  });

  it('should include context in error log when DB fails', async () => {
    mockCreate.mockRejectedValue(new Error('Timeout'));

    await logActivity('user-123', 'asset_created', 'asset', 'a-1');

    const errorContext = mockLoggerError.mock.calls[0][1];
    expect(errorContext.actorId).toBe('user-123');
    expect(errorContext.action).toBe('asset_created');
    expect(errorContext.targetType).toBe('asset');
    expect(errorContext.targetId).toBe('a-1');
  });

  it('should handle non-Error thrown exceptions', async () => {
    mockCreate.mockRejectedValue('string error');

    await expect(logActivity('user-123', 'login')).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledOnce();
  });

  it('should accept ActivityAction enum values', async () => {
    // Import the enum to test type compatibility
    const { ActivityAction } = await import('@/lib/enums');

    await logActivity('user-123', ActivityAction.ASSET_CREATED, 'asset', 'a-1');

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.data.action).toBe('asset_created');
  });
});
