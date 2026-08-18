# Phase 3 — Code Guide (Beginner-Friendly)

This document explains the new code and security concepts introduced in Phase 3 of AssetFlow.

---

## Security Concepts Explained

### XSS (Cross-Site Scripting)

| Property | Detail |
|----------|--------|
| **What is it?** | An attack where malicious JavaScript is injected into a web page |
| **How it works** | An attacker enters `<script>alert('hacked')</script>` as their name — when someone views that name, the script runs in their browser |
| **What can it steal?** | Session cookies, keystrokes, page content — anything the user can see |
| **Our defense** | `sanitize.ts` strips or encodes all HTML/JavaScript before it reaches the database or email templates |

```typescript
// BEFORE sanitization (dangerous):
const name = '<script>document.cookie</script>';

// AFTER sanitizeHtml() (safe):
const clean = sanitizeHtml(name);
// Result: "&lt;script&gt;document.cookie&lt;&#x2F;script&gt;"
// The browser renders this as harmless text, not executable code
```

### Input Sanitization vs. Validation

These are **two different layers** of defense:

| | Validation (Zod schemas) | Sanitization (`sanitize.ts`) |
|---|---|---|
| **When** | Before processing the request | Before storing/rendering |
| **What** | Checks structure and types | Strips dangerous content |
| **Example** | "Is `email` a valid email format?" | "Does `name` contain `<script>` tags?" |
| **Fails with** | 422 Validation Error | Silently cleans the input |

Both are needed. Validation catches malformed requests. Sanitization catches payloads that pass validation but are still dangerous.

---

## New Files Explained

### 1. `src/lib/sanitize.ts` — The Input Sanitization Toolkit

**Language**: TypeScript
**What it does**: Provides reusable functions to clean user input before it reaches the database or HTML templates.

#### Key Functions

**`escapeHtml(input)` — HTML Entity Encoding**:
```typescript
escapeHtml('<script>alert("xss")</script>');
// → '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'

// These 7 characters are encoded:
// & → &amp;    < → &lt;    > → &gt;    " → &quot;
// ' → &#x27;  / → &#x2F;  ` → &#96;
```
Why encode these? Because browsers interpret `<` as "start of HTML tag". By converting it to `&lt;`, the browser renders it as the literal character `<` instead.

**`sanitizeHtml(input)` — Full HTML Sanitization**:
```typescript
sanitizeHtml('Hello <script>alert(1)</script> World');
// → 'Hello  World'

sanitizeHtml('<img onerror=alert(1) src=x>');
// → removes onerror attribute, encodes remaining HTML
```
This function does three things in order:
1. **Strips** `<script>` tags and their content
2. **Removes** dangerous attributes (`onclick`, `onerror`, etc.)
3. **Encodes** remaining HTML entities

**`containsXSS(input)` — XSS Detection**:
```typescript
containsXSS('<script>alert(1)</script>');  // true
containsXSS('Hello World');                // false
containsXSS('onclick=steal()');            // true
```
Returns a boolean — useful for logging or rejecting suspicious input.

**`stripNullBytes(input)` — Control Character Removal**:
```typescript
stripNullBytes('hello\x00world');  // 'helloworld'
```

Why? Null bytes (`\x00`) can trick some parsers into ending a string early, allowing attackers to bypass validation. We strip them while preserving harmless whitespace characters like `\n` and `\t`.

**`sanitizeSearchInput(input, maxLength)` — Search Query Cleaning**:
```typescript
sanitizeSearchInput("admin'--");           // "admin'"
sanitizeSearchInput("value; DROP TABLE");  // "value DROP TABLE"
```
Removes SQL comment sequences (`--`, `/* */`), semicolons, and enforces a maximum length. While Prisma already parameterizes queries (making SQL injection via Prisma impossible), this provides defense-in-depth for any raw query usage.

---

### 2. `tests/unit/api-handler.test.ts` — API Security Gate Tests

**Language**: TypeScript (Vitest)
**What it does**: Tests the central `apiHandler()` wrapper that protects every API route.

#### Key Testing Concepts

**Mocking Auth Functions**:
```typescript
// We mock the auth module BEFORE importing apiHandler
const mockGetCurrentUserFromHeader = vi.fn();
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromHeader: (...args) => mockGetCurrentUserFromHeader(...args),
  verifyRoleFromDB: (...args) => mockVerifyRoleFromDB(...args),
}));

// In each test, we control what the auth functions return:
mockGetCurrentUserFromHeader.mockResolvedValue(null);  // Simulate: no token
mockGetCurrentUserFromHeader.mockResolvedValue(mockUser); // Simulate: valid user
mockVerifyRoleFromDB.mockResolvedValue('employee');    // Simulate: user is employee
```

Why mock? The `apiHandler` calls `getCurrentUserFromHeader()` which reads cookies and verifies JWTs. In unit tests, we don't want to create real JWTs — we just want to test the handler's behavior for different auth states.

**Testing RBAC (Role-Based Access Control)**:
```typescript
// Configure handler to require admin or asset_manager
const handler = apiHandler({
  roles: ['admin', 'asset_manager'],
  handler: async () => ({ data: { ok: true } }),
});

// Simulate an employee trying to access it
mockVerifyRoleFromDB.mockResolvedValue('employee');
const response = await handler(createRequest());
expect(response.status).toBe(403); // Forbidden!
```

This verifies that the RBAC system works correctly — even if someone gets a valid JWT, they can't access endpoints that require elevated roles.

---

### 3. `tests/unit/rate-limiter.test.ts` — Rate Limiting Tests

**Language**: TypeScript (Vitest)
**What it does**: Tests the in-memory rate limiter that prevents DDoS and brute-force attacks.

#### Key Testing Concepts

**Unique Paths per Test**:
```typescript
// Each test uses a unique path to avoid cross-test interference
const path = '/api/test-exceed-' + Date.now();
```
The rate limiter stores counts per `${ip}:${path}` key. Using `Date.now()` ensures each test gets a fresh counter.

**Fake Timers for Window Reset**:
```typescript
vi.useFakeTimers();
try {
  // ... exhaust the rate limit ...

  // Advance time past the window
  vi.advanceTimersByTime(5100); // 5 seconds + 100ms buffer

  // Should be allowed again
  const result = checkRateLimit(request);
  expect(result).toBeNull(); // null = allowed
} finally {
  vi.useRealTimers(); // Always restore real timers
}
```
We can't wait real seconds in a test. `vi.useFakeTimers()` lets us control `Date.now()` and advance it instantly.

---

### 4. `tests/unit/activity-logger.test.ts` — Audit Trail Tests

**Language**: TypeScript (Vitest)
**What it does**: Tests the activity logger that creates audit trail records.

#### Key Pattern: Never Crash the Request

```typescript
it('should catch and log database errors gracefully', async () => {
  // Simulate a database failure
  mockCreate.mockRejectedValue(new Error('Database connection lost'));

  // logActivity should NOT throw — it must resolve normally
  await expect(logActivity('user-123', 'login')).resolves.toBeUndefined();

  // But the error IS logged (for debugging)
  expect(mockLoggerError).toHaveBeenCalledOnce();
});
```

The activity logger uses a **"fire-and-forget"** pattern. If the database is down, logging an audit trail should not break the user's request. The `try/catch` in `logActivity` ensures this — and these tests prove it works.

---

## Common Patterns Explained

### `vi.mock()` — Module Mocking

```typescript
vi.mock('@/lib/db', () => ({
  prisma: {
    activityLog: {
      create: (...args) => mockCreate(...args),
    },
  },
}));
```

This replaces the real Prisma client with a fake one. When code does `prisma.activityLog.create(...)`, it actually calls our `mockCreate` function — which we control in each test.

**Rule**: `vi.mock()` calls are **hoisted** by Vitest to the top of the file. They run before any imports. That's why you see `import { logActivity }` AFTER the mock declarations.

### `vi.fn()` — Spy Functions

```typescript
const mockCreate = vi.fn();

// In a test:
mockCreate.mockResolvedValue({ id: 'mock-id' }); // Success
mockCreate.mockRejectedValue(new Error('fail'));  // Failure

// After calling the code:
expect(mockCreate).toHaveBeenCalledOnce();
expect(mockCreate.mock.calls[0][0].data.actorId).toBe('user-123');
```

`vi.fn()` creates a function that:
1. Records every call (arguments, return values)
2. Can be programmed to return specific values
3. Can be checked with assertions

### RegExp `g` Flag Pitfall (Bug We Fixed)

```typescript
// BAD: RegExp with `g` flag is STATEFUL
const pattern = /script/gi;
pattern.test('script');  // true  (lastIndex = 6)
pattern.test('script');  // false (starts from index 6, finds nothing)
pattern.test('script');  // true  (wraps around)

// GOOD: Without `g` flag, each test() starts from index 0
const pattern = /script/i;
pattern.test('script');  // true (always)
pattern.test('script');  // true (always)
```

The `g` (global) flag causes `.test()` to remember where it left off (`lastIndex`). This is useful for `matchAll()` but breaks `test()` when called multiple times. In `sanitize.ts`, we removed the `g` flag since we only need to check if a pattern exists (not find all occurrences).

---

## Summary of Phase 3 Additions

| Category | What's New |
|----------|-----------|
| **Sanitization** | `escapeHtml()`, `sanitizeHtml()`, `containsXSS()`, `stripNullBytes()`, `sanitizeSearchInput()` |
| **RBAC Testing** | Verified 401/403 responses for unauthenticated and unauthorized access |
| **Rate Limiting Tests** | Window expiry with fake timers, per-IP/path tracking |
| **Audit Trail Tests** | Graceful failure, metadata serialization |
| **Validation Coverage** | All 6 validation schemas now tested (auth, assets, bookings, maintenance, audit, org) |
| **Mocking** | `vi.mock()`, `vi.fn()`, `vi.useFakeTimers()` patterns |

Total test count: **138 (Phase 2) → 268 (Phase 3)** = +130 new tests
