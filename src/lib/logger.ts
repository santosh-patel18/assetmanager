/**
 * Structured logger for AssetFlow.
 * Outputs JSON in production (machine-parseable), pretty-prints in development.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Asset created', { assetId: '...', userId: '...' });
 *   logger.error('Failed to allocate', { error, assetId: '...' });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = ['password', 'passwordHash', 'password_hash', 'token', 'secret', 'authorization', 'cookie'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (value instanceof Error) {
      sanitized[key] = {
        name: value.name,
        message: value.message,
        ...(IS_PRODUCTION ? {} : { stack: value.stack }),
      };
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      sanitized[key] = sanitize(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function formatEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    return JSON.stringify(entry);
  }

  // Pretty-print for development
  const { timestamp, level, message, ...rest } = entry;
  const prefix = `[${timestamp}] ${level.toUpperCase().padEnd(5)}`;
  const context = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  return `${prefix} ${message}${context}`;
}

function log(level: LogLevel, message: string, data: Record<string, unknown> = {}): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitize(data),
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
  info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
  error: (message: string, data?: Record<string, unknown>) => log('error', message, data),
};

// ─── Request-scoped logger ───────────────────────────────────────
/**
 * Create a logger with request context baked in.
 * Usage in API routes:
 *   const log = createRequestLogger(requestId, userId);
 *   log.info('Asset allocated', { assetId: '...' });
 */
export function createRequestLogger(requestId?: string, userId?: string) {
  const context: Record<string, unknown> = {};
  if (requestId) context.requestId = requestId;
  if (userId) context.userId = userId;

  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', message, { ...context, ...data }),
    info: (message: string, data?: Record<string, unknown>) => log('info', message, { ...context, ...data }),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', message, { ...context, ...data }),
    error: (message: string, data?: Record<string, unknown>) => log('error', message, { ...context, ...data }),
  };
}

// ─── Request ID generator ────────────────────────────────────────
let counter = 0;
export function generateRequestId(): string {
  counter = (counter + 1) % 1_000_000;
  return `req_${Date.now()}_${counter.toString(36)}`;
}
