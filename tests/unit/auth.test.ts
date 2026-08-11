import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePasswordComplexity,
  checkLoginAllowed,
  recordFailedLogin,
  clearFailedLogins,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
} from '@/lib/auth';

// ─── Password Complexity ─────────────────────────────────────────

describe('validatePasswordComplexity', () => {
  it('should accept a strong password', () => {
    const result = validatePasswordComplexity('MyStr0ng!Pass');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject a password shorter than 8 characters', () => {
    const result = validatePasswordComplexity('Ab1!xyz');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  it('should reject a password longer than 128 characters', () => {
    const result = validatePasswordComplexity('A'.repeat(129) + 'a1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at most 128 characters long');
  });

  it('should reject a password without uppercase letters', () => {
    const result = validatePasswordComplexity('lowercase1!only');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should reject a password without lowercase letters', () => {
    const result = validatePasswordComplexity('UPPERCASE1!ONLY');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should reject a password without numbers', () => {
    const result = validatePasswordComplexity('NoNumbers!Here');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('should reject a password without special characters', () => {
    const result = validatePasswordComplexity('NoSpecial1Chars');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  it('should return multiple errors for a very weak password', () => {
    const result = validatePasswordComplexity('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ─── Login Attempt Tracking ──────────────────────────────────────

describe('Login attempt tracking', () => {
  const testEmail = 'lockout-test@example.com';

  beforeEach(() => {
    clearFailedLogins(testEmail);
  });

  it('should allow login when no failed attempts exist', () => {
    const check = checkLoginAllowed(testEmail);
    expect(check.allowed).toBe(true);
  });

  it('should allow login after a few failed attempts (below threshold)', () => {
    recordFailedLogin(testEmail);
    recordFailedLogin(testEmail);
    const check = checkLoginAllowed(testEmail);
    expect(check.allowed).toBe(true);
  });

  it('should lock account after MAX_LOGIN_ATTEMPTS (default 5)', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedLogin(testEmail);
    }
    const check = checkLoginAllowed(testEmail);
    expect(check.allowed).toBe(false);
    expect(check.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('should clear failed logins on clearFailedLogins', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedLogin(testEmail);
    }
    clearFailedLogins(testEmail);
    const check = checkLoginAllowed(testEmail);
    expect(check.allowed).toBe(true);
  });
});

// ─── Bcrypt ──────────────────────────────────────────────────────

describe('hashPassword / verifyPassword', () => {
  it('should hash and verify a password', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject a wrong password', async () => {
    const hash = await hashPassword('CorrectPassword1!');
    const isValid = await verifyPassword('WrongPassword1!', hash);
    expect(isValid).toBe(false);
  });

  it('should produce different hashes for the same password (salted)', async () => {
    const password = 'SamePassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2); // different salts
  });
});

// ─── JWT ─────────────────────────────────────────────────────────

describe('generateToken / verifyToken', () => {
  const payload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'employee',
    name: 'Test User',
  };

  it('should generate and verify a token', () => {
    const token = generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(payload.userId);
    expect(decoded!.email).toBe(payload.email);
    expect(decoded!.role).toBe(payload.role);
    expect(decoded!.name).toBe(payload.name);
  });

  it('should return null for an invalid token', () => {
    const decoded = verifyToken('invalid.token.here');
    expect(decoded).toBeNull();
  });

  it('should return null for a tampered token', () => {
    const token = generateToken(payload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    const decoded = verifyToken(tampered);
    expect(decoded).toBeNull();
  });
});
