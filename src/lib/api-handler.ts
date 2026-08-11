/**
 * Centralized API route handler for AssetFlow.
 *
 * Wraps route handlers with:
 * - Structured error handling (AppError → HTTP response)
 * - Request logging with timing
 * - Auth verification (optional)
 * - Role-based access control (optional)
 * - Request ID injection
 *
 * Usage:
 *   export const POST = apiHandler({
 *     roles: ['admin', 'asset_manager'],
 *     handler: async ({ user, body, params, request }) => {
 *       // your logic here
 *       return { data: result, status: 201 };
 *     },
 *   });
 */

import { NextResponse } from 'next/server';
import { getCurrentUserFromHeader, verifyRoleFromDB, type JWTPayload } from './auth';
import { AppError, AuthenticationError, AuthorizationError, toErrorResponse } from './errors';
import { createRequestLogger, generateRequestId } from './logger';
import type { EmployeeRole } from './enums';

interface ApiHandlerContext<TParams = Record<string, string>> {
  /** Authenticated user (null if auth is not required) */
  user: JWTPayload | null;
  /** Verified role from database (only if roles are specified) */
  verifiedRole: string | null;
  /** Parsed JSON body (null for GET/DELETE) */
  body: unknown;
  /** Route params (e.g., { id: '...' }) */
  params: TParams;
  /** Raw Next.js Request */
  request: Request;
  /** Request ID for tracing */
  requestId: string;
  /** Request-scoped logger */
  log: ReturnType<typeof createRequestLogger>;
}

interface ApiHandlerResult {
  data?: unknown;
  status?: number;
  headers?: Record<string, string>;
}

interface ApiHandlerConfig<TParams = Record<string, string>> {
  /** If true, no auth check is performed. Default: false (auth required). */
  public?: boolean;
  /** If set, user's DB-verified role must be one of these. */
  roles?: (EmployeeRole | string)[];
  /** The handler function. */
  handler: (ctx: ApiHandlerContext<TParams>) => Promise<ApiHandlerResult>;
}

export function apiHandler<TParams = Record<string, string>>(
  config: ApiHandlerConfig<TParams>
) {
  return async (
    request: Request,
    context?: { params?: Promise<TParams> | TParams }
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const log = createRequestLogger(requestId);

    try {
      // ─── Auth Check ──────────────────────────────────────────────
      let user: JWTPayload | null = null;
      let verifiedRole: string | null = null;

      if (!config.public) {
        user = await getCurrentUserFromHeader(request);
        if (!user) {
          throw new AuthenticationError();
        }

        log.info('Authenticated request', {
          userId: user.userId,
          path: new URL(request.url).pathname,
          method: request.method,
        });

        // ─── Role Check ──────────────────────────────────────────────
        if (config.roles && config.roles.length > 0) {
          verifiedRole = await verifyRoleFromDB(user.userId);
          if (!verifiedRole || !config.roles.includes(verifiedRole)) {
            throw new AuthorizationError(
              `This action requires one of these roles: ${config.roles.join(', ')}`
            );
          }
        }
      }

      // ─── Parse Body ──────────────────────────────────────────────
      let body: unknown = null;
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          body = await request.json();
        } catch {
          // Body is optional for some PATCH routes
          body = null;
        }
      }

      // ─── Resolve Params ──────────────────────────────────────────
      let params = {} as TParams;
      if (context?.params) {
        params = context.params instanceof Promise
          ? await context.params
          : context.params;
      }

      // ─── Execute Handler ─────────────────────────────────────────
      const result = await config.handler({
        user,
        verifiedRole,
        body,
        params,
        request,
        requestId,
        log: createRequestLogger(requestId, user?.userId),
      });

      // ─── Build Response ──────────────────────────────────────────
      const status = result.status || 200;
      const response = result.data !== undefined
        ? NextResponse.json(result.data, { status })
        : new NextResponse(null, { status });

      response.headers.set('X-Request-Id', requestId);
      if (result.headers) {
        for (const [key, value] of Object.entries(result.headers)) {
          response.headers.set(key, value);
        }
      }

      const duration = Date.now() - startTime;
      log.info('Request completed', {
        method: request.method,
        path: new URL(request.url).pathname,
        status,
        durationMs: duration,
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      const { status, body } = toErrorResponse(error);

      if (error instanceof AppError) {
        const logFn = status >= 500 ? log.error : log.warn;
        logFn('Request error', {
          method: request.method,
          path: new URL(request.url).pathname,
          status,
          code: error.code,
          durationMs: duration,
          error: error instanceof Error ? error : undefined,
        });
      } else {
        log.error('Unhandled error', {
          method: request.method,
          path: new URL(request.url).pathname,
          status,
          durationMs: duration,
          error: error instanceof Error ? error : { message: String(error) },
        });
      }

      const response = NextResponse.json(body, { status });
      response.headers.set('X-Request-Id', requestId);
      return response;
    }
  };
}
