# Phase 1 — Code Guide (Beginner-Friendly)

This document explains **every language, technology, and code pattern** used in Phase 1 of AssetFlow. It's written for someone who's just starting out — no prior coding knowledge assumed.

---

## Table of Contents

1. [Languages & Technologies Used](#languages--technologies-used)
2. [File Types Explained](#file-types-explained)
3. [Libraries & Frameworks Used](#libraries--frameworks-used)
4. [Every Phase 1 File Explained](#every-phase-1-file-explained)
5. [Common Code Patterns Explained](#common-code-patterns-explained)

---

## Languages & Technologies Used

### TypeScript (`.ts` files)

| Property | Detail |
|----------|--------|
| **What is it?** | A programming language built on top of JavaScript |
| **Created by** | Microsoft (2012) |
| **Main purpose** | Building web applications (both frontend and backend) |
| **Why use it over JavaScript?** | TypeScript adds **types** — it checks your code for mistakes *before* you run it |

#### What Are "Types"?

In regular JavaScript:
```javascript
let age = 25;       // JavaScript doesn't care what type this is
age = "twenty-five"; // This is allowed — but it could cause bugs later
```

In TypeScript:
```typescript
let age: number = 25;       // TypeScript knows this MUST be a number
age = "twenty-five";         // ❌ ERROR! TypeScript catches this mistake immediately
```

#### TypeScript Basics Used in This Project

```typescript
// 1. Variables with types
const name: string = "AssetFlow";    // Text
const maxAttempts: number = 5;       // Number
const isActive: boolean = true;      // True/False

// 2. Interfaces — define the "shape" of data
interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

// 3. Functions with typed parameters and return values
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// 4. Arrays
const roles: string[] = ['admin', 'employee', 'manager'];

// 5. Optional properties (? means it might not exist)
interface LoginResult {
  allowed: boolean;
  retryAfterSeconds?: number;  // This is optional
}

// 6. Union types (can be one of several types)
type Status = 'Active' | 'Inactive' | 'Pending';  // Can ONLY be one of these 3 values

// 7. Async/Await — for operations that take time (like database queries)
async function findUser(email: string): Promise<Employee | null> {
  const user = await database.findOne({ email });  // Wait for DB response
  return user;
}

// 8. Generics — reusable code that works with different types
function getFirst<T>(items: T[]): T {
  return items[0];
}
// getFirst<string>(["a", "b"]) → returns "a"
// getFirst<number>([1, 2, 3]) → returns 1

// 9. `as const` — makes values immutable (can't be changed)
const Status = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
} as const;
// Status.ACTIVE is always 'Active' — TypeScript enforces this
```

---

### JSON (`.json` files)

| Property | Detail |
|----------|--------|
| **What is it?** | JavaScript Object Notation — a data format |
| **Main purpose** | Storing configuration, transferring data between systems |
| **Used for** | `package.json` (project settings), `tsconfig.json` (TypeScript settings) |

```json
{
  "name": "assetflow",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "test": "vitest run"
  }
}
```

---

### YAML (`.yml` files)

| Property | Detail |
|----------|--------|
| **What is it?** | A human-readable data format (like JSON but cleaner) |
| **Main purpose** | Configuration files |
| **Used for** | Docker Compose, GitHub Actions CI/CD |

```yaml
# docker-compose.yml — defines services that run together
services:
  db:
    image: postgres:16
    ports:
      - "5432:5432"
```

---

### SQL (`.sql` files)

| Property | Detail |
|----------|--------|
| **What is it?** | Structured Query Language — the language for databases |
| **Main purpose** | Creating tables, inserting/querying/updating data |
| **Used for** | Database initialization scripts |

```sql
-- Create a table
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE
);

-- Query data
SELECT * FROM employees WHERE status = 'Active';
```

---

### Dockerfile

| Property | Detail |
|----------|--------|
| **What is it?** | Instructions for building a Docker container (a portable package of your app) |
| **Main purpose** | Making the app run the same way on any computer |
| **Analogy** | Like a recipe that creates an identical "box" containing your app + all its dependencies |

---

## File Types Explained

| Extension | Language/Format | Purpose in This Project |
|-----------|----------------|------------------------|
| `.ts` | TypeScript | All application code (backend logic, API routes, tests) |
| `.tsx` | TypeScript + JSX | React components (frontend — not in Phase 1) |
| `.json` | JSON | Configuration (package.json, tsconfig.json) |
| `.yml` | YAML | Docker and CI/CD configuration |
| `.sql` | SQL | Database scripts |
| `.env` | Environment file | Secret configuration (database passwords, API keys) |
| `.gitignore` | Git config | Tells Git which files to NOT track (node_modules, .env, etc.) |

---

## Libraries & Frameworks Used

### Node.js (Runtime)

| Property | Detail |
|----------|--------|
| **What is it?** | A way to run JavaScript/TypeScript **outside** the browser (on a server) |
| **Analogy** | If JavaScript is a language, Node.js is the "speaker" that can talk on the server side |
| **Why?** | Before Node.js, JavaScript could only run in browsers. Node.js lets you build backend servers with it. |

### Next.js (Web Framework)

| Property | Detail |
|----------|--------|
| **What is it?** | A framework built on top of Node.js for building full-stack web apps |
| **Created by** | Vercel |
| **Key feature** | **File-based routing** — create a file at `src/app/api/auth/login/route.ts` and it automatically becomes the API endpoint `/api/auth/login` |
| **Used for** | Both the frontend (React pages) and backend (API routes) of AssetFlow |

### Prisma (Database ORM)

| Property | Detail |
|----------|--------|
| **What is it?** | An **ORM** (Object-Relational Mapper) — lets you talk to the database using TypeScript instead of SQL |
| **Analogy** | Instead of writing `SELECT * FROM employees WHERE id = '123'`, you write `prisma.employee.findUnique({ where: { id: '123' } })` |
| **Why?** | Type safety, auto-completion, easier to read, prevents SQL injection attacks |

```typescript
// Without Prisma (raw SQL — error-prone):
const result = await db.query("SELECT * FROM employees WHERE email = $1", [email]);

// With Prisma (TypeScript — type-safe):
const employee = await prisma.employee.findUnique({ where: { email } });
// TypeScript knows `employee` has fields: id, name, email, role, etc.
```

### Zod (Validation Library)

| Property | Detail |
|----------|--------|
| **What is it?** | A library for validating data (checking if it's in the right format) |
| **Used for** | Validating user input (login forms, signup forms, API request bodies) |
| **Why?** | Never trust data from the user — always validate it first |

```typescript
import { z } from 'zod';

// Define what valid login data looks like
const loginSchema = z.object({
  email: z.string().email('Invalid email'),      // Must be a valid email
  password: z.string().min(1, 'Required'),        // Must not be empty
});

// Validate user input
const result = loginSchema.safeParse({ email: 'test@x.com', password: '123' });
if (!result.success) {
  // result.error contains what went wrong
}
```

### bcryptjs (Password Hashing)

| Property | Detail |
|----------|--------|
| **What is it?** | A library for securely hashing passwords |
| **Why not store passwords directly?** | If the database is hacked, attackers would see everyone's passwords. Hashing converts them into unreadable strings. |
| **How it works** | `"MyPassword123!" → "$2b$12$LJ3m4ys..."` (one-way — you can't reverse it) |

```typescript
// Hashing (when user signs up)
const hash = await bcrypt.hash("MyPassword123!", 12);
// Result: "$2b$12$LJ3m4ys..." — stored in the database

// Verifying (when user logs in)
const isCorrect = await bcrypt.compare("MyPassword123!", hash);
// Returns: true
```

### jsonwebtoken / JWT (Authentication Tokens)

| Property | Detail |
|----------|--------|
| **What is it?** | **JSON Web Tokens** — a way to prove a user is logged in without checking the database on every request |
| **Analogy** | Like a wristband at a concert — once you get one (login), you can access areas (API routes) without showing your ticket (password) again |
| **Structure** | `header.payload.signature` — three parts separated by dots |

```
eyJhbGciOiJIUzI1NiJ9.          ← Header (algorithm used)
eyJ1c2VySWQiOiIxMjMifQ.        ← Payload (user data: id, email, role)
SflKxwRJSMeKKF2QT4fwpM         ← Signature (proves it wasn't tampered with)
```

### Vitest (Testing Framework)

| Property | Detail |
|----------|--------|
| **What is it?** | A fast test runner for TypeScript/JavaScript projects |
| **Created by** | The Vite team |
| **Analogy** | Like an automated grading system — you tell it what the correct answers are, and it checks your code against them |

```typescript
import { describe, it, expect } from 'vitest';

describe('Math', () => {                    // Group of related tests
  it('should add numbers correctly', () => { // One specific test
    expect(2 + 2).toBe(4);                   // Check: does 2+2 equal 4?
  });

  it('should multiply correctly', () => {
    expect(3 * 5).toBe(15);
  });
});
```

---

## Every Phase 1 File Explained

### 1. `src/middleware.ts` — The Gatekeeper

**Language**: TypeScript  
**Type**: Next.js Middleware  
**What it does**: Runs **before** every request reaches your API routes. It's like a security guard at the entrance.

**Key responsibilities**:
- **CORS** — Decides which websites can talk to your API
- **Rate limiting** — Blocks users who send too many requests (10 per minute for auth)
- **Security headers** — Adds protective HTTP headers to every response
- **Authentication check** — Redirects unauthenticated users to the login page
- **Request ID** — Assigns a unique ID to every request for debugging/tracing

**Key pattern — `as const`**:
```typescript
const CORS_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
// This value can never be accidentally changed
```

---

### 2. `src/lib/auth.ts` — The Authentication Engine

**Language**: TypeScript  
**Type**: Utility module (library)  
**What it does**: Handles everything related to user authentication.

**Functions in this file**:

| Function | What It Does |
|----------|-------------|
| `validatePasswordComplexity()` | Checks if a password meets security rules (8+ chars, uppercase, lowercase, number, special char) |
| `checkLoginAllowed()` | Returns whether a user is locked out |
| `recordFailedLogin()` | Increments the failure counter |
| `clearFailedLogins()` | Resets the failure counter after successful login |
| `hashPassword()` | Converts a password into an unreadable hash (using bcrypt) |
| `verifyPassword()` | Checks if a password matches its hash |
| `generateToken()` | Creates a JWT token containing user info |
| `verifyToken()` | Checks if a JWT token is valid and not tampered with |
| `getCurrentUser()` | Reads the JWT from the cookie and returns the user info |
| `getCurrentUserFromHeader()` | Reads JWT from cookie OR Authorization header |
| `verifyRoleFromDB()` | Double-checks the user's role against the database (not just the JWT) |
| `getDepartmentScope()` | Finds all sub-departments a department head manages (using recursive SQL) |
| `setTokenCookie()` | Creates the cookie string to send to the browser |
| `clearTokenCookie()` | Creates a cookie string that expires immediately (logs out) |

**Key pattern — `Map` for in-memory storage**:
```typescript
const loginAttempts = new Map<string, LoginAttempt>();
// Map is like a dictionary:
//   "john@company.com" → { count: 3, lastAttempt: 1691234567890 }
//   "jane@company.com" → { count: 1, lastAttempt: 1691234599999 }
```

---

### 3. `src/lib/db.ts` — The Database Connection

**Language**: TypeScript  
**Type**: Prisma Client configuration  
**What it does**: Creates and configures the database connection with soft-delete behavior.

**Key pattern — Prisma Client Extensions (`$extends`)**:
```typescript
const extended = baseClient.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        // This code runs EVERY TIME you call prisma.*.findMany()
        // It automatically adds: WHERE deletedAt IS NULL
        if (isSoftDeleteModel(model)) {
          args.where = { ...args.where, deletedAt: null };
        }
        return query(args);  // Run the actual database query
      },
    },
  },
});
```

**Key pattern — Singleton**:
```typescript
// Only create ONE database connection, reuse it across the entire app
const globalForPrisma = globalThis as unknown as { prisma: ... };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
```

**Two exports**:
- `prisma` — Normal client (soft-deleted records are hidden)
- `prismaUnscoped` — Raw client (shows everything, including soft-deleted)

---

### 4. `src/lib/enums.ts` — The Single Source of Truth

**Language**: TypeScript  
**Type**: Constants/enum definitions  
**What it does**: Defines all the status values, roles, and categories used throughout the app.

**Why not just use strings?**

```typescript
// ❌ BAD — easy to make typos, no autocomplete
if (employee.status === 'active') { }  // Was it "active" or "Active"?

// ✅ GOOD — type-safe, autocomplete works, typos caught at compile time
if (employee.status === EmployeeStatus.ACTIVE) { }
```

**Key pattern — `as const` objects (instead of TypeScript `enum`)**:
```typescript
export const AssetStatus = {
  AVAILABLE: 'Available',
  ALLOCATED: 'Allocated',
  DISPOSED: 'Disposed',
} as const;

// This creates a TYPE from the object values:
export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];
// Result: type AssetStatus = 'Available' | 'Allocated' | 'Disposed'
```

**Key feature — State machine transitions**:
```typescript
// Defines which status can change to which other status
export const ASSET_STATUS_TRANSITIONS: Record<AssetStatus, readonly AssetStatus[]> = {
  'Available': ['Allocated', 'Reserved', 'Under Maintenance', 'Retired', 'Disposed'],
  'Allocated': ['Available', 'Under Maintenance', 'Lost'],
  'Disposed': [],  // Terminal state — once disposed, it's done
};

export function isValidAssetTransition(from: AssetStatus, to: AssetStatus): boolean {
  return ASSET_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
```

---

### 5. `src/lib/errors.ts` — The Error Hierarchy

**Language**: TypeScript  
**Type**: Error class definitions  
**What it does**: Defines custom error classes so all errors are handled consistently.

**Why custom errors?**

```typescript
// ❌ BAD — inconsistent error responses
return NextResponse.json({ error: 'Not found' }, { status: 404 });
return NextResponse.json({ msg: 'Forbidden' }, { status: 403 });

// ✅ GOOD — consistent error format everywhere
throw new NotFoundError('Asset');
// Automatically becomes: { error: "Asset not found", code: "NOT_FOUND" }, status: 404
```

**Key pattern — Class inheritance**:
```typescript
class AppError extends Error { }           // Base class
  class BadRequestError extends AppError { }   // 400
  class AuthenticationError extends AppError { } // 401
  class NotFoundError extends AppError { }       // 404
  class ConflictError extends AppError { }       // 409
    class AlreadyAllocatedError extends ConflictError { }  // Specific 409
    class BookingOverlapError extends ConflictError { }    // Specific 409
  class ValidationError extends AppError { }   // 422
  class RateLimitError extends AppError { }    // 429
```

**Key function — `toErrorResponse()`**:
Converts any error (custom or unexpected) into a clean HTTP response:
```typescript
// In your API route:
throw new NotFoundError('Asset');
// toErrorResponse converts it to:
// → { status: 404, body: { error: "Asset not found", code: "NOT_FOUND" } }
```

---

### 6. `src/lib/logger.ts` — The Structured Logger

**Language**: TypeScript  
**Type**: Logging utility  
**What it does**: Outputs log messages in a structured format.

**Two modes**:
- **Development**: Pretty-printed for humans
  ```
  [2026-08-11T10:30:00Z] INFO  Asset created {"assetId":"abc123"}
  ```
- **Production**: JSON for machines (log aggregators like DataDog, CloudWatch)
  ```json
  {"timestamp":"2026-08-11T10:30:00Z","level":"info","message":"Asset created","assetId":"abc123"}
  ```

**Key feature — Sensitive data redaction**:
```typescript
logger.info('Login', { email: 'user@x.com', password: 'secret123' });
// Output: { email: "user@x.com", password: "[REDACTED]" }
// Passwords, tokens, and secrets are automatically hidden from logs
```

---

### 7. `src/lib/rate-limiter.ts` — The Traffic Controller

**Language**: TypeScript  
**Type**: Rate limiting utility  
**What it does**: Prevents abuse by limiting how many requests a client can send.

**How it works**:
- Each client (identified by IP address) has a counter
- The counter resets every 60 seconds (configurable)
- General endpoints: 100 requests per minute
- Auth endpoints: 10 requests per minute (stricter)

**Response when rate limited**:
```json
{
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMITED",
  "details": { "retry_after_seconds": 45 }
}
```

---

### 8. `src/lib/api-handler.ts` — The API Route Wrapper

**Language**: TypeScript  
**Type**: Higher-order function (a function that returns a function)  
**What it does**: Wraps every API route with consistent auth checking, error handling, and logging.

**Without api-handler (repetitive)**:
```typescript
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    const role = await verifyRoleFromDB(user.userId);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // ... actual logic
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

**With api-handler (clean)**:
```typescript
export const POST = apiHandler({
  roles: ['admin'],
  handler: async ({ user, body, log }) => {
    // Just write your business logic — auth, errors, logging are handled for you
    return { data: result, status: 201 };
  },
});
```

---

### 9. `src/lib/validations/auth.ts` — Input Validation Schemas

**Language**: TypeScript (using Zod library)  
**Type**: Validation schemas  
**What it does**: Defines the exact shape of valid user input for auth-related forms.

```typescript
// Login: must have a valid email and a non-empty password
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Signup: must also have a name and optionally a department
export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department_id: z.string().uuid().optional().nullable(),
});
```

---

### 10. `src/app/api/auth/login/route.ts` — The Login API Endpoint

**Language**: TypeScript  
**Type**: Next.js API route  
**What it does**: Handles POST requests to `/api/auth/login`.

This file ties together many of the modules above:
- Uses `loginSchema` from validations
- Uses `checkLoginAllowed`, `recordFailedLogin`, `clearFailedLogins` from auth
- Uses `prisma` from db (with soft-delete filtering)
- Uses `logger` for structured logging
- Uses `EmployeeStatus` from enums

---

### 11. `vitest.config.ts` — Test Configuration

**Language**: TypeScript  
**Type**: Configuration file  
**What it does**: Tells Vitest how to find and run tests.

```typescript
export default defineConfig({
  test: {
    globals: true,          // `describe`, `it`, `expect` are available without imports
    environment: 'node',    // Run in Node.js (not a browser)
    include: ['tests/**/*.test.ts'],  // Find test files here
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),  // @/lib/auth → ./src/lib/auth
    },
  },
});
```

---

### 12. Test Files (`tests/unit/*.test.ts`)

**Language**: TypeScript  
**Type**: Test files  
**Pattern**: Arrange → Act → Assert

```typescript
// Arrange: set up test data
const password = 'MyStr0ng!Pass';

// Act: run the function being tested
const result = validatePasswordComplexity(password);

// Assert: check the result
expect(result.valid).toBe(true);
expect(result.errors).toHaveLength(0);
```

---

## Common Code Patterns Explained

### `export` and `import`

```typescript
// In auth.ts — EXPORT means "make this available to other files"
export function hashPassword(password: string) { ... }

// In login/route.ts — IMPORT means "use something from another file"
import { hashPassword } from '@/lib/auth';
```

### `async` / `await`

```typescript
// Some operations take time (database queries, API calls, file reads)
// async/await lets you "wait" for them without freezing the app

async function login(email: string, password: string) {
  const user = await prisma.employee.findUnique({ where: { email } });
  //           ^^^^^ Wait for the database to respond before continuing
  
  const isValid = await verifyPassword(password, user.passwordHash);
  //              ^^^^^ Wait for bcrypt to finish comparing
  
  return isValid;
}
```

### `try` / `catch`

```typescript
// Wraps code that might fail — if it does, the catch block handles it
try {
  const data = await riskyOperation();
  // If this throws an error, execution jumps to catch
} catch (error) {
  // Handle the error gracefully instead of crashing
  logger.error('Something went wrong', { error });
}
```

### The `Record` type

```typescript
// Record<KeyType, ValueType> — a typed dictionary/map
const scores: Record<string, number> = {
  'Alice': 95,
  'Bob': 87,
  'Charlie': 92,
};
// TypeScript ensures: all keys are strings, all values are numbers
```

### The spread operator (`...`)

```typescript
// Copies properties from one object into another
const defaults = { color: 'blue', size: 'medium' };
const custom = { size: 'large', weight: 'heavy' };

const merged = { ...defaults, ...custom };
// Result: { color: 'blue', size: 'large', weight: 'heavy' }
// Notice: 'size' from custom overrides 'size' from defaults
```

---

## Summary

| Technology | Role in AssetFlow |
|-----------|-------------------|
| **TypeScript** | All application code — type-safe JavaScript |
| **Next.js** | Web framework — handles routing, API endpoints, and frontend |
| **Prisma** | Talks to PostgreSQL database with type safety |
| **Zod** | Validates all user input before processing |
| **bcryptjs** | Securely hashes and verifies passwords |
| **jsonwebtoken** | Creates/verifies authentication tokens (JWT) |
| **Vitest** | Runs automated tests to verify code correctness |
| **PostgreSQL** | The database that stores all application data |
| **Docker** | Packages the app for consistent deployment anywhere |

Every file, function, and pattern in Phase 1 serves one goal: **build a rock-solid, secure backend foundation** that Phase 2 (and beyond) can build upon with confidence.
