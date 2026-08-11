import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, createRequestLogger } from '@/lib/logger';

// ─── Logger Output ───────────────────────────────────────────────

describe('logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages', () => {
    logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0][0]).toContain('INFO');
    expect(consoleSpy.mock.calls[0][0]).toContain('Test message');
  });

  it('should log error messages to stderr', () => {
    logger.error('Error occurred');
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0][0]).toContain('ERROR');
  });

  it('should log warn messages', () => {
    logger.warn('Warning issued');
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('WARN');
  });

  it('should include context data in output', () => {
    logger.info('Asset created', { assetId: 'abc123' });
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('abc123');
  });

  it('should include a timestamp', () => {
    logger.info('Timed message');
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ─── Sensitive Data Sanitization ─────────────────────────────────

describe('logger — sanitization', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should redact password fields', () => {
    logger.info('Login attempt', { email: 'test@x.com', password: 'secret123' });
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('secret123');
  });

  it('should redact token fields', () => {
    logger.info('Auth check', { token: 'eyJhbGciOiJIUzI1NiJ9.xxx' });
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('should redact passwordHash fields', () => {
    logger.info('User data', { passwordHash: '$2b$12$hash...' });
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('$2b$12$hash');
  });

  it('should redact nested sensitive fields', () => {
    logger.info('Nested data', { user: { password: 'secret', name: 'John' } });
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('John');
    expect(output).not.toContain('"secret"');
  });

  it('should handle Error objects in data', () => {
    const err = new Error('Something broke');
    logger.info('Error context', { error: err });
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('Something broke');
  });

  it('should preserve non-sensitive fields', () => {
    logger.info('Normal data', { assetId: 'abc', status: 'Active' });
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('abc');
    expect(output).toContain('Active');
  });
});

// ─── Request-Scoped Logger ───────────────────────────────────────

describe('createRequestLogger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should include requestId in all log entries', () => {
    const log = createRequestLogger('req_abc123');
    log.info('Test');
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('req_abc123');
  });

  it('should include userId when provided', () => {
    const log = createRequestLogger('req_abc', 'user_xyz');
    log.info('Test');
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('user_xyz');
  });

  it('should merge additional data with context', () => {
    const log = createRequestLogger('req_123');
    log.info('Asset action', { assetId: 'asset_456' });
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('req_123');
    expect(output).toContain('asset_456');
  });

  it('should support all log levels', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const log = createRequestLogger('req_multi');
    log.debug('debug msg');
    log.info('info msg');
    log.warn('warn msg');
    log.error('error msg');

    expect(consoleSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
