import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  verifyPassword,
  generateToken,
  setTokenCookie,
  checkLoginAllowed,
  recordFailedLogin,
  clearFailedLogins,
} from '@/lib/auth';
import { loginSchema } from '@/lib/validations/auth';
import { logActivity } from '@/lib/activity-logger';
import { EmployeeStatus } from '@/lib/enums';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { email, password } = result.data;

    // ─── Check account lockout ─────────────────────────────────────
    const lockoutCheck = checkLoginAllowed(email);
    if (!lockoutCheck.allowed) {
      logger.warn('Login attempt on locked account', { email });
      return NextResponse.json(
        {
          error: 'Account temporarily locked due to too many failed attempts. Please try again later.',
          code: 'ACCOUNT_LOCKED',
          details: { retry_after_seconds: lockoutCheck.retryAfterSeconds },
        },
        {
          status: 429,
          headers: { 'Retry-After': String(lockoutCheck.retryAfterSeconds) },
        }
      );
    }

    // ─── Find employee ─────────────────────────────────────────────
    const employee = await prisma.employee.findUnique({ where: { email } });
    if (!employee) {
      // Record failure even for non-existent accounts (prevents user enumeration timing)
      recordFailedLogin(email);
      return NextResponse.json(
        { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // ─── Check account status ──────────────────────────────────────
    if (employee.status === EmployeeStatus.PENDING) {
      return NextResponse.json(
        { error: 'Your registration is still pending admin approval. Please wait for your credentials.', code: 'PENDING_APPROVAL' },
        { status: 401 }
      );
    }

    if (employee.status !== EmployeeStatus.ACTIVE) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact your admin.', code: 'ACCOUNT_INACTIVE' },
        { status: 401 }
      );
    }

    // ─── Verify password ───────────────────────────────────────────
    const validPassword = await verifyPassword(password, employee.passwordHash);
    if (!validPassword) {
      recordFailedLogin(email);

      // Also persist failed attempt count to DB (survives server restart)
      await prisma.employee.update({
        where: { id: employee.id },
        data: { failedLoginAttempts: { increment: 1 } },
      }).catch((err) => {
        logger.error('Failed to update failedLoginAttempts in DB', { error: err, employeeId: employee.id });
      });

      logger.info('Failed login attempt', { email, employeeId: employee.id });

      return NextResponse.json(
        { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // ─── Successful login ──────────────────────────────────────────
    clearFailedLogins(email);

    // Update DB: clear failures, record login time
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    }).catch((err) => {
      logger.error('Failed to update login metadata in DB', { error: err, employeeId: employee.id });
    });

    const token = generateToken({
      userId: employee.id,
      email: employee.email,
      role: employee.role,
      name: employee.name,
    });

    // Log the activity (fire-and-forget)
    logActivity(employee.id, 'login', 'employee', employee.id).catch(() => {});

    logger.info('Successful login', { email, employeeId: employee.id, role: employee.role });

    const response = NextResponse.json({
      token,
      role: employee.role,
      user_id: employee.id,
      name: employee.name,
    });
    response.headers.set('Set-Cookie', setTokenCookie(token));
    return response;
  } catch (error) {
    logger.error('Login error', { error: error instanceof Error ? error : { message: String(error) } });
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
