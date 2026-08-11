import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { EmployeeStatus } from './enums';
import { logger } from './logger';

// SECURITY: Fail hard if JWT_SECRET is not configured — never use a fallback
if (!process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is not set. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}
const JWT_SECRET: string = process.env.JWT_SECRET;

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'assetflow_token';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─── Login attempt tracking (account lockout) ─────────────────────
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_DURATION_MS = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10) * 60 * 1000;

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

// Cleanup stale lockout entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const keys = Array.from(loginAttempts.keys());
  for (const key of keys) {
    const entry = loginAttempts.get(key);
    if (!entry) continue;
    if (!entry.lockedUntil || now > entry.lockedUntil) {
      if (now - entry.lastAttempt > LOCKOUT_DURATION_MS) {
        loginAttempts.delete(key);
      }
    }
  }
}, 10 * 60 * 1000);

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

// ─── Password Complexity ──────────────────────────────────────────
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordComplexity(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Password must be at least 8 characters long');
  if (password.length > 128) errors.push('Password must be at most 128 characters long');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least one special character');

  return { valid: errors.length === 0, errors };
}

// ─── Login Attempt Tracking ───────────────────────────────────────
export function checkLoginAllowed(email: string): { allowed: boolean; retryAfterSeconds?: number } {
  const entry = loginAttempts.get(email);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // Reset if lockout has expired
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    loginAttempts.delete(email);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(email: string): void {
  const entry = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  entry.count++;
  entry.lastAttempt = Date.now();

  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    logger.warn('Account locked due to excessive failed login attempts', {
      email,
      attempts: entry.count,
      lockedUntilMs: entry.lockedUntil,
    });
  }

  loginAttempts.set(email, entry);
}

export function clearFailedLogins(email: string): void {
  loginAttempts.delete(email);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUserFromHeader(request: Request): Promise<JWTPayload | null> {
  // Try cookie first
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const cookieToken = tokenMatch?.[1];
  
  // Then try Authorization header
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  const token = cookieToken || bearerToken;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Re-verify the user's role against the database.
 * JWT role is a hint only — this function is the source of truth for privileged mutations.
 */
export async function verifyRoleFromDB(userId: string): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });
  if (!employee || employee.status !== EmployeeStatus.ACTIVE) return null;
  return employee.role;
}

/**
 * Get the department scope for a department head via recursive CTE.
 * Returns all department IDs the user has authority over (their dept + sub-depts).
 */
export async function getDepartmentScope(userId: string): Promise<string[]> {
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
    select: { departmentId: true },
  });
  if (!employee?.departmentId) return [];

  const result = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE dept_tree AS (
      SELECT id, name, parent_department_id FROM departments WHERE id = ${employee.departmentId}::uuid
      UNION ALL
      SELECT d.id, d.name, d.parent_department_id
      FROM departments d JOIN dept_tree dt ON d.parent_department_id = dt.id
    )
    SELECT id FROM dept_tree
  `;
  return result.map(r => r.id);
}

export function setTokenCookie(token: string): string {
  const secure = IS_PRODUCTION ? '; Secure' : '';
  const sameSite = IS_PRODUCTION ? 'Strict' : 'Lax';
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=${sameSite}${secure}; Max-Age=${7 * 24 * 60 * 60}`;
}

export function clearTokenCookie(): string {
  const secure = IS_PRODUCTION ? '; Secure' : '';
  const sameSite = IS_PRODUCTION ? 'Strict' : 'Lax';
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=${sameSite}${secure}; Max-Age=0`;
}

export { COOKIE_NAME };
