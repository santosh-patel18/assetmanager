import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  AlreadyAllocatedError,
  BookingOverlapError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError,
  InvalidTransitionError,
  toErrorResponse,
  fromPrismaError,
} from '@/lib/errors';

// ─── Error Class Hierarchy ───────────────────────────────────────

describe('Error class hierarchy', () => {
  it('AppError should set statusCode, code, and isOperational', () => {
    const err = new AppError('test', 500, 'TEST', true);
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('TEST');
    expect(err.isOperational).toBe(true);
    expect(err.message).toBe('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('BadRequestError should have status 400', () => {
    const err = new BadRequestError('bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
  });

  it('AuthenticationError should have status 401', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHENTICATED');
    expect(err.message).toBe('Authentication required');
  });

  it('AuthorizationError should have status 403', () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('NotFoundError should have status 404', () => {
    const err = new NotFoundError('Asset');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Asset not found');
  });

  it('ConflictError should have status 409 with optional details', () => {
    const err = new ConflictError('duplicate', 'DUPLICATE', { field: 'email' });
    expect(err.statusCode).toBe(409);
    expect(err.details).toEqual({ field: 'email' });
  });

  it('AlreadyAllocatedError should suggest transfer_request', () => {
    const err = new AlreadyAllocatedError('John Doe');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('ALREADY_ALLOCATED');
    expect(err.details).toEqual({
      current_holder: 'John Doe',
      suggest: 'transfer_request',
    });
  });

  it('BookingOverlapError should include conflicting booking', () => {
    const err = new BookingOverlapError({ start: '09:00', end: '10:00' });
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('BOOKING_OVERLAP');
    expect(err.details?.conflicting_booking).toEqual({ start: '09:00', end: '10:00' });
  });

  it('ValidationError should have status 422 with field errors', () => {
    const errors = { name: ['required'], email: ['invalid format'] };
    const err = new ValidationError(errors);
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.errors).toEqual(errors);
  });

  it('RateLimitError should have status 429 with retry info', () => {
    const err = new RateLimitError(30);
    expect(err.statusCode).toBe(429);
    expect(err.retryAfterSeconds).toBe(30);
  });

  it('ServiceUnavailableError should have status 503', () => {
    const err = new ServiceUnavailableError();
    expect(err.statusCode).toBe(503);
  });

  it('InvalidTransitionError should extend BadRequestError', () => {
    const err = new InvalidTransitionError('Available', 'Lost', 'Asset');
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('Available');
    expect(err.message).toContain('Lost');
    expect(err).toBeInstanceOf(BadRequestError);
  });
});

// ─── toErrorResponse ─────────────────────────────────────────────

describe('toErrorResponse', () => {
  it('should convert AppError to response', () => {
    const err = new NotFoundError('User');
    const { status, body } = toErrorResponse(err);
    expect(status).toBe(404);
    expect(body.error).toBe('User not found');
    expect(body.code).toBe('NOT_FOUND');
  });

  it('should include details for ConflictError', () => {
    const err = new AlreadyAllocatedError('Jane');
    const { status, body } = toErrorResponse(err);
    expect(status).toBe(409);
    expect(body.details).toHaveProperty('current_holder', 'Jane');
  });

  it('should include field errors for ValidationError', () => {
    const err = new ValidationError({ name: ['required'] });
    const { body } = toErrorResponse(err);
    expect(body.details).toEqual({ name: ['required'] });
  });

  it('should include retry_after for RateLimitError', () => {
    const err = new RateLimitError(60);
    const { body } = toErrorResponse(err);
    expect(body.details).toEqual({ retry_after_seconds: 60 });
  });

  it('should return 500 for unknown errors', () => {
    const { status, body } = toErrorResponse(new Error('kaboom'));
    expect(status).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('should return 500 for non-Error throwables', () => {
    const { status, body } = toErrorResponse('string error');
    expect(status).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
  });
});

// ─── fromPrismaError ─────────────────────────────────────────────

describe('fromPrismaError', () => {
  it('should map P2002 (unique constraint) to ConflictError', () => {
    const prismaErr = { code: 'P2002', meta: { target: ['email'] } };
    const mapped = fromPrismaError(prismaErr);
    expect(mapped).toBeInstanceOf(ConflictError);
    expect(mapped!.statusCode).toBe(409);
    expect(mapped!.code).toBe('DUPLICATE_ENTRY');
  });

  it('should map P2003 (foreign key) to BadRequestError', () => {
    const prismaErr = { code: 'P2003' };
    const mapped = fromPrismaError(prismaErr);
    expect(mapped).toBeInstanceOf(BadRequestError);
    expect(mapped!.statusCode).toBe(400);
  });

  it('should map P2025 (record not found) to NotFoundError', () => {
    const prismaErr = { code: 'P2025' };
    const mapped = fromPrismaError(prismaErr);
    expect(mapped).toBeInstanceOf(NotFoundError);
    expect(mapped!.statusCode).toBe(404);
  });

  it('should map 23P01 (exclusion violation) to BookingOverlapError', () => {
    const prismaErr = { code: 'P2010', message: 'Raw query failed. Code: 23P01' };
    const mapped = fromPrismaError(prismaErr);
    expect(mapped).toBeInstanceOf(BookingOverlapError);
  });

  it('should return null for unknown errors', () => {
    const result = fromPrismaError(new Error('random'));
    expect(result).toBeNull();
  });

  it('should return null for non-objects', () => {
    expect(fromPrismaError(null)).toBeNull();
    expect(fromPrismaError(undefined)).toBeNull();
    expect(fromPrismaError('string')).toBeNull();
  });
});
