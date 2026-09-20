import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Configuration ───────────────────────────────────────────────
const COOKIE_NAME = 'assetflow_token';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const PUBLIC_PATHS = [
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/public',
  '/api/health',
  '/login',
  '/signup',
  '/forgot-password',
  '/scan',
];

const AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

// ─── CORS Configuration ─────────────────────────────────────────
// In production, restrict to explicit origins from env var.
// In development, allow localhost.
const ALLOWED_ORIGINS: string[] = IS_PRODUCTION
  ? (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const CORS_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const CORS_HEADERS = 'Content-Type, Authorization, X-Request-Id';
const CORS_MAX_AGE = '86400'; // 24 hours — browsers cache preflight

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (!IS_PRODUCTION) return true; // Allow all origins in dev
  return ALLOWED_ORIGINS.includes(origin);
}

function addCorsHeaders(response: NextResponse, origin: string | null): void {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', CORS_METHODS);
    response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', CORS_MAX_AGE);
    response.headers.set('Vary', 'Origin');
  }
}

// ─── In-memory rate limiter for middleware (Edge-compatible) ──────
// Note: The full rate limiter in src/lib/rate-limiter.ts uses Node.js APIs.
// Middleware runs on the Edge runtime, so we use a simplified version here.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkEdgeRateLimit(ip: string, path: string, maxRequests: number, windowMs: number): boolean {
  const key = `${ip}:${path}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= maxRequests;
}

// ─── Request ID Generator ────────────────────────────────────────
let counter = 0;
function generateRequestId(): string {
  counter = (counter + 1) % 1_000_000;
  return `req_${Date.now()}_${counter.toString(36)}`;
}

// ─── Security Headers ────────────────────────────────────────────
function addSecurityHeaders(response: NextResponse): void {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy — don't leak full URLs to third parties
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy — disable unused browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(), interest-cohort=()'
  );

  // HSTS — force HTTPS in production (1 year, include subdomains)
  if (IS_PRODUCTION) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Content Security Policy — restrict resource origins
  const csp = IS_PRODUCTION
    ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
    : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws://localhost:*; frame-ancestors 'none'";
  response.headers.set('Content-Security-Policy', csp);
}

// ─── Middleware ───────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = generateRequestId();
  const origin = request.headers.get('origin');

  // Allow static files (bypass all checks)
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // ─── CORS preflight (OPTIONS) for API routes ───────────────────
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const response = new NextResponse(null, { status: 204 });
    addCorsHeaders(response, origin);
    response.headers.set('X-Request-Id', requestId);
    return response;
  }

  // ─── Rate limiting on auth endpoints ───────────────────────────
  if (AUTH_PATHS.some(p => pathname.startsWith(p))) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = checkEdgeRateLimit(ip, 'auth', 10, 60_000); // 10 req/min for auth

    if (!allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
      response.headers.set('Retry-After', '60');
      response.headers.set('X-Request-Id', requestId);
      addSecurityHeaders(response);
      addCorsHeaders(response, origin);
      return response;
    }
  }

  // ─── Public paths (no auth required) ───────────────────────────
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    const response = NextResponse.next();
    response.headers.set('X-Request-Id', requestId);
    addSecurityHeaders(response);
    if (pathname.startsWith('/api/')) addCorsHeaders(response, origin);
    return response;
  }

  // ─── Auth check for protected routes ───────────────────────────
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      // API routes return 401
      const response = NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
      response.headers.set('X-Request-Id', requestId);
      addSecurityHeaders(response);
      addCorsHeaders(response, origin);
      return response;
    }
    // Page routes redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Authenticated request — pass through with headers ─────────
  const response = NextResponse.next();
  response.headers.set('X-Request-Id', requestId);
  addSecurityHeaders(response);
  if (pathname.startsWith('/api/')) addCorsHeaders(response, origin);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
