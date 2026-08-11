# Phase 1 — Complete Walkthrough

## What Is AssetFlow?

AssetFlow is an **Enterprise Asset & Resource Management System** — a web application that helps organizations track, manage, and control their physical assets (laptops, desks, vehicles, equipment, etc.). Think of it like an inventory management system, but specifically designed for companies to know:

- **Who** has which asset
- **Where** each asset is
- **What condition** it's in
- **When** it was assigned, returned, or maintained

---

## What Was Phase 1 About?

Phase 1 focused on building the **backend foundation** — the server-side infrastructure that the application needs before any user-facing features (dashboards, forms, etc.) can work reliably. Think of it like building the foundation, plumbing, and electrical wiring of a house before adding rooms and furniture.

### The 6 Things We Built

| # | Feature | Purpose |
|---|---------|---------|
| 1 | **CORS Configuration** | Allows the frontend (browser) to safely talk to the backend (server) |
| 2 | **Login Attempt Tracking** | Locks accounts after too many wrong passwords to prevent hacking |
| 3 | **Soft-Delete Middleware** | "Deletes" records by hiding them instead of permanently erasing them |
| 4 | **Testing Framework Setup** | Installed tools to automatically check if the code works correctly |
| 5 | **Unit Tests** | Wrote 103 automated checks to verify the code works |
| 6 | **Environment Configuration** | Documented all settings the app needs to run |

---

## 1. CORS Configuration

### What Is CORS?

**CORS** stands for **Cross-Origin Resource Sharing**. When your browser loads a webpage from `https://myapp.com` and that page tries to send a request to `https://api.myapp.com`, the browser blocks it by default. This is a security feature — it prevents malicious websites from stealing your data.

CORS is the mechanism that tells the browser: *"It's okay, I trust requests from this specific website."*

### How It Works in AssetFlow

**File**: [middleware.ts](file:///d:/study/projrcts/assetflow/assetflow/src/middleware.ts)

```
Browser (localhost:3000)  →  "Can I send a request?"  →  Server
                          ←  "Yes, I trust you"       ←  Server (CORS headers)
```

The middleware handles this in these steps:

1. **Reads the origin** — Where is the request coming from? (e.g., `http://localhost:3000`)
2. **Checks the allow-list** — Is this origin trusted?
   - In **development**: All localhost origins are allowed
   - In **production**: Only origins listed in the `ALLOWED_ORIGINS` environment variable
3. **Adds CORS headers** to the response:
   - `Access-Control-Allow-Origin` — Which websites can make requests
   - `Access-Control-Allow-Methods` — Which HTTP methods are allowed (GET, POST, etc.)
   - `Access-Control-Allow-Headers` — Which custom headers can be sent
   - `Access-Control-Max-Age` — How long the browser can cache this permission (24 hours)

4. **Handles preflight requests** — Before sending a POST/PUT/DELETE, the browser sends a "preflight" OPTIONS request to ask for permission first. The middleware responds with a `204 No Content` and the CORS headers.

### Security Headers (Bonus)

The middleware also adds these security headers to every response:

| Header | What It Does |
|--------|-------------|
| `X-Frame-Options: DENY` | Prevents your site from being embedded in an iframe (stops clickjacking attacks) |
| `X-Content-Type-Options: nosniff` | Stops browsers from guessing file types (prevents MIME sniffing attacks) |
| `X-XSS-Protection` | Activates the browser's built-in XSS filter |
| `Content-Security-Policy` | Controls which scripts/styles/images can load on your page |
| `Strict-Transport-Security` | Forces HTTPS in production |

---

## 2. Login Attempt Tracking (Account Lockout)

### Why Do We Need This?

Without lockout protection, an attacker could try millions of password combinations (called a **brute-force attack**). The lockout system stops this by temporarily locking the account after too many wrong attempts.

### How It Works

**File**: [auth.ts](file:///d:/study/projrcts/assetflow/assetflow/src/lib/auth.ts)  
**File**: [login/route.ts](file:///d:/study/projrcts/assetflow/assetflow/src/app/api/auth/login/route.ts)

The system tracks login attempts using three functions:

#### `checkLoginAllowed(email)`
- Checks if the account is currently locked
- If locked, returns `{ allowed: false, retryAfterSeconds: 842 }` (how many seconds until unlock)
- If not locked, returns `{ allowed: true }`

#### `recordFailedLogin(email)`
- Adds 1 to the failure counter for this email
- If the counter reaches **5** (configurable via `MAX_LOGIN_ATTEMPTS`):
  - Locks the account for **15 minutes** (configurable via `LOCKOUT_DURATION_MINUTES`)
  - Logs a warning

#### `clearFailedLogins(email)`
- Resets the failure counter to 0
- Called after a **successful login**

### The Login Flow (Step by Step)

```
User submits email + password
         │
         ▼
   ┌─────────────────────┐
   │ checkLoginAllowed()  │──── Account locked? → Return 429 "Try again later"
   └─────────┬───────────┘
             │ allowed
             ▼
   ┌─────────────────────┐
   │ Find user in DB      │──── Not found? → recordFailedLogin() → Return 401
   └─────────┬───────────┘
             │ found
             ▼
   ┌─────────────────────┐
   │ Check account status │──── Pending? → Return 401 "Awaiting approval"
   │                      │──── Inactive? → Return 401 "Contact admin"
   └─────────┬───────────┘
             │ active
             ▼
   ┌─────────────────────┐
   │ Verify password      │──── Wrong? → recordFailedLogin() + update DB → Return 401
   └─────────┬───────────┘
             │ correct
             ▼
   ┌─────────────────────┐
   │ Successful login!    │
   │ • clearFailedLogins()│
   │ • Reset DB counters  │
   │ • Set lastLoginAt    │
   │ • Generate JWT token │
   │ • Log activity       │
   └─────────────────────┘
```

### Dual-Layer Tracking

The system tracks failed logins in **two places**:

1. **In-memory** (fast, server RAM) — Used for real-time lockout checking
2. **In the database** (`failedLoginAttempts` column) — Survives server restarts

---

## 3. Soft-Delete Middleware (Prisma Extensions)

### What Is Soft Delete?

When you "delete" a record in most apps, it's actually **not erased** from the database. Instead, a `deletedAt` timestamp is set, and the record is hidden from normal queries. This is called a **soft delete**.

Why? Because:
- **Audit trail** — You can always see what existed before
- **Recovery** — An admin can "undelete" a record
- **Data integrity** — Other records that reference the deleted one don't break

### How It Works

**File**: [db.ts](file:///d:/study/projrcts/assetflow/assetflow/src/lib/db.ts)

The Prisma client is extended with custom behavior for three models: **Department**, **Employee**, and **Asset**.

#### Read Operations (Auto-filter)
When you run:
```typescript
const assets = await prisma.asset.findMany();
```
The extension **automatically** adds `WHERE deletedAt IS NULL` — so you only see non-deleted records without writing any extra code.

#### Delete Operations (Auto-convert)
When you run:
```typescript
await prisma.asset.delete({ where: { id: '...' } });
```
The extension **converts** this into:
```typescript
await prisma.asset.update({ where: { id: '...' }, data: { deletedAt: new Date() } });
```
So the record is **marked** as deleted, not actually removed.

#### Bypassing Soft Delete
For admin views, audit trails, or recovery features, use `prismaUnscoped`:
```typescript
import { prismaUnscoped } from '@/lib/db';

// This WILL show deleted records
const allAssets = await prismaUnscoped.asset.findMany({
  where: { deletedAt: { not: null } },
});
```

---

## 4. Testing Framework (Vitest)

### What Is Vitest?

Vitest is a **test runner** — a tool that automatically runs your code with known inputs and checks if the outputs are correct. Think of it like a teacher who grades your homework instantly.

### Setup

**File**: [vitest.config.ts](file:///d:/study/projrcts/assetflow/assetflow/vitest.config.ts)

Key configuration:
- **Environment**: `node` (not a browser — these are backend tests)
- **Path alias**: `@/` maps to `./src/` (so imports like `@/lib/auth` work)
- **Coverage thresholds**: At least 50% of statements, 40% of branches, 50% of functions must be tested
- **Timeout**: 10 seconds per test (prevents hanging tests)

### How to Run Tests

```bash
npm test                # Run all tests
npm run test:coverage   # Run tests + show code coverage report
```

---

## 5. Unit Tests (103 Tests)

### What They Test

We wrote 4 test files covering the core backend logic:

#### [enums.test.ts](file:///d:/study/projrcts/assetflow/assetflow/tests/unit/enums.test.ts) — 28 tests
- Verifies every asset status has defined transitions
- Verifies `isValidAssetTransition()` allows valid transitions and blocks invalid ones
- Verifies `Disposed` is a terminal state (nothing transitions out of it)

#### [auth.test.ts](file:///d:/study/projrcts/assetflow/assetflow/tests/unit/auth.test.ts) — 18 tests
- **Password complexity**: Tests all 6 rules (length, uppercase, lowercase, number, special char)
- **Login lockout**: Tests the full cycle (attempts → lockout → clear)
- **Bcrypt**: Tests password hashing and verification (round-trip)
- **JWT**: Tests token generation, verification, and tamper detection

#### [errors.test.ts](file:///d:/study/projrcts/assetflow/assetflow/tests/unit/errors.test.ts) — 24 tests
- Verifies all error classes produce correct HTTP status codes and error codes
- Verifies `toErrorResponse()` converts errors to proper HTTP responses
- Verifies `fromPrismaError()` handles database-specific error codes (P2002, P2025, 23P01)

#### [validations.test.ts](file:///d:/study/projrcts/assetflow/assetflow/tests/unit/validations.test.ts) — 33 tests
- Tests `loginSchema`, `signupSchema`, `forgotPasswordSchema` accept valid data and reject invalid data
- Tests `createAssetSchema` required fields
- Tests `validateAttributesAgainstSchema()` with various field types

---

## 6. Environment Configuration

**File**: [.env.example](file:///d:/study/projrcts/assetflow/assetflow/.env.example)

This file documents every environment variable the app needs. Key additions in Phase 1:

| Variable | Purpose | Default |
|----------|---------|---------|
| `ALLOWED_ORIGINS` | Comma-separated list of trusted frontend domains for CORS | (none in prod) |
| `MAX_LOGIN_ATTEMPTS` | Failed logins before lockout | `5` |
| `LOCKOUT_DURATION_MINUTES` | How long the lockout lasts | `15` |

---

## How Everything Connects

Here's the big picture of how all Phase 1 components work together when a user logs in:

```
Browser sends POST /api/auth/login
         │
         ▼
   ┌─────────────────┐
   │   MIDDLEWARE     │  ← CORS headers added, security headers added,
   │  (middleware.ts) │     rate limiting checked, request ID generated
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  LOGIN ROUTE     │  ← Validates input (validations/auth.ts)
   │  (login/route.ts)│     Checks lockout (auth.ts)
   │                  │     Finds user in DB (db.ts → with soft-delete filtering)
   │                  │     Verifies password (auth.ts → bcrypt)
   │                  │     Generates JWT token (auth.ts → jsonwebtoken)
   │                  │     Logs everything (logger.ts)
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  ERROR HANDLER   │  ← If anything goes wrong, errors.ts converts it
   │  (errors.ts)     │     to a clean, consistent HTTP error response
   └─────────────────┘
```

### Key Design Principles in Phase 1

1. **Defense in Depth** — Multiple security layers (CORS, rate limiting, lockout, password hashing)
2. **Fail Safely** — No JWT secret? App crashes on startup instead of using a weak default
3. **Consistency** — All errors follow the same `{ error, code, details }` format
4. **Auditability** — Structured logging with request IDs for tracing issues
5. **Data Safety** — Soft deletes preserve data; nothing is permanently destroyed
6. **Testability** — 103 automated tests verify the core logic works correctly
