/**
 * Centralized error hierarchy for AssetFlow.
 * All API routes should throw these instead of returning manual error responses.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── 400 Bad Request ─────────────────────────────────────────────
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code: string = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

// ─── 401 Unauthenticated ─────────────────────────────────────────
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: string = 'UNAUTHENTICATED') {
    super(message, 401, code);
  }
}

// ─── 403 Unauthorized (wrong role / scope) ───────────────────────
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

// ─── 404 Not Found ───────────────────────────────────────────────
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', code: string = 'NOT_FOUND') {
    super(`${resource} not found`, 404, code);
  }
}

// ─── 409 Conflict ────────────────────────────────────────────────
export class ConflictError extends AppError {
  public readonly details?: Record<string, unknown>;

  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT', details?: Record<string, unknown>) {
    super(message, 409, code);
    this.details = details;
  }
}

export class AlreadyAllocatedError extends ConflictError {
  constructor(currentHolder: string) {
    super('Asset is already allocated', 'ALREADY_ALLOCATED', {
      current_holder: currentHolder,
      suggest: 'transfer_request',
    });
  }
}

export class BookingOverlapError extends ConflictError {
  constructor(conflictingBooking?: { start: string; end: string }) {
    super('Booking overlaps with an existing reservation', 'BOOKING_OVERLAP', {
      conflicting_booking: conflictingBooking,
    });
  }
}

// ─── 422 Validation Error ────────────────────────────────────────
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>, message: string = 'Validation failed') {
    super(message, 422, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

// ─── 429 Rate Limit ──────────────────────────────────────────────
export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number = 60) {
    super('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ─── 503 Service Unavailable ─────────────────────────────────────
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

// ─── Invalid State Transition ────────────────────────────────────
export class InvalidTransitionError extends BadRequestError {
  constructor(from: string, to: string, entityType: string = 'Asset') {
    super(`Invalid ${entityType} status transition from "${from}" to "${to}"`);
  }
}

// ─── Prisma Error Codes → AppError mapping ───────────────────────
const PRISMA_ERROR_MAP: Record<string, (meta?: Record<string, unknown>) => AppError> = {
  P2002: (meta) => new ConflictError(
    `A record with this ${(meta?.target as string[])?.join(', ') || 'value'} already exists`,
    'DUPLICATE_ENTRY'
  ),
  P2003: () => new BadRequestError('Referenced record does not exist', 'FOREIGN_KEY_VIOLATION'),
  P2025: () => new NotFoundError('Record'),
};

/**
 * Convert a Prisma error into an AppError.
 * Returns null if the error is not a known Prisma error.
 */
export function fromPrismaError(error: unknown): AppError | null {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    const prismaCode = (error as { code: string }).code;
    const meta = 'meta' in error ? (error as { meta: Record<string, unknown> }).meta : undefined;
    const mapper = PRISMA_ERROR_MAP[prismaCode];
    if (mapper) return mapper(meta);

    // PostgreSQL 23P01 = exclusion constraint violation (booking overlap)
    if (
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string' &&
      (error as { message: string }).message.includes('23P01')
    ) {
      return new BookingOverlapError();
    }
  }
  return null;
}

// ─── Centralized error → HTTP response ───────────────────────────
export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

export function toErrorResponse(error: unknown): { status: number; body: ErrorResponse } {
  // Known application error
  if (error instanceof AppError) {
    const body: ErrorResponse = {
      error: error.message,
      code: error.code,
    };

    if (error instanceof ConflictError && error.details) {
      body.details = error.details;
    }
    if (error instanceof ValidationError) {
      body.details = error.errors;
    }
    if (error instanceof RateLimitError) {
      body.details = { retry_after_seconds: error.retryAfterSeconds };
    }

    return { status: error.statusCode, body };
  }

  // Check if it's a Prisma error
  const prismaError = fromPrismaError(error);
  if (prismaError) {
    return toErrorResponse(prismaError);
  }

  // Unknown error — hide internals in production
  const isDev = process.env.NODE_ENV === 'development';
  return {
    status: 500,
    body: {
      error: isDev && error instanceof Error ? error.message : 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
  };
}
