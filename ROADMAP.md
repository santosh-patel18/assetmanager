# AssetFlow — Complete Development Roadmap

> Enterprise Asset & Resource Management Platform  
> Last updated: August 18, 2026

---

## Table of Contents

- [Completed Phases](#-completed-phases)
- [Phase 4.5 — Quality Hardening](#phase-45--quality-hardening)
- [Phase 5 — Multi-Location & Custom Fields](#phase-5--multi-location--custom-fields)
- [Phase 6 — QR Code & Physical Tracking](#phase-6--qr-code--physical-tracking)
- [Phase 7 — Financial Module](#phase-7--financial-module)
- [Phase 8 — Vendor & Warranty Management](#phase-8--vendor--warranty-management)
- [Phase 9 — Preventive Maintenance & Scheduling](#phase-9--preventive-maintenance--scheduling)
- [Phase 10 — Mobile PWA & Advanced Reports](#phase-10--mobile-pwa--advanced-reports)
- [Phase 11 — Documentation](#phase-11--documentation)
- [Phase 12 — DevOps & Deployment](#phase-12--devops--deployment)
- [Phase 13 — Testing & Reliability](#phase-13--testing--reliability)
- [Phase 14 — Accessibility](#phase-14--accessibility-a11y)
- [Phase 15 — Advanced Security](#phase-15--advanced-security)
- [Phase 16 — Monitoring & Analytics](#phase-16--monitoring--analytics)
- [Phase 17 — Go-to-Market](#phase-17--go-to-market)
- [Timeline](#-timeline)
- [Architecture Evolution](#-architecture-evolution)
- [Key Decision Points](#-key-decision-points)

---

## ✅ Completed Phases

| Phase | Focus | Key Deliverables | Tests |
|-------|-------|-----------------|-------|
| **Phase 1** | Core Foundation | Auth, RBAC (4 roles), Prisma schema, CRUD APIs, JWT auth, password policy | 80+ |
| **Phase 2** | Full Feature Build | Allocations, Bookings (conflict detection), Maintenance workflow, Audits, Reports, Activity log, Notifications, Org management | 180+ |
| **Phase 3** | Security Hardening | Input sanitization (XSS/SQLi), rate limiting, API gateway, audit logging, account lockout, password cooldown | 268 |
| **Phase 4** | UI/UX Beautification | 6 new components (Toast, Tooltip, Skeleton, EmptyState, StatCard, Breadcrumb), sidebar upgrade, animated KPIs, staggered animations, mobile hamburger menu | 268 |

**Current stats**: 268 tests · 46 API routes · 16 pages · 12 UI components · 296-line Prisma schema

---

## Phase 4.5 — Quality Hardening

> **Goal**: Fix existing issues before adding new features  
> **Effort**: ~1 day  
> **Depends on**: Nothing

### Critical Fixes

| # | Task | Details | Effort |
|---|------|---------|--------|
| 1 | Replace `alert()`/`confirm()` | Org page uses browser dialogs instead of Toast + Dialog components | 30 min |
| 2 | Fix N+1 query | Allocations page makes 100+ API calls — create `/api/allocations` endpoint | 1 hr |
| 3 | Add pagination | All list APIs return all records — add cursor/offset pagination + UI controls | 2 hr |
| 4 | Error boundaries | Add `error.tsx`, `not-found.tsx`, `loading.tsx` to prevent white-screen crashes | 45 min |

### Moderate Fixes

| # | Task | Details | Effort |
|---|------|---------|--------|
| 5 | TypeScript interfaces | Replace `any[]` in 9 page files with shared types in `src/types/` | 1.5 hr |
| 6 | Upgrade 8 remaining pages | Add skeleton, empty state, toast, page-enter animation to: allocations, maintenance, org, audits, activity, reports, settings, signup | 2 hr |
| 7 | Button loading states | Disable + spinner on all action buttons to prevent double-submit | 1 hr |
| 8 | Confirmation dialogs | Add "Are you sure?" for: Return, Reject, Cancel, Close Audit, Delete | 45 min |

### Minor Fixes

| # | Task | Details | Effort |
|---|------|---------|--------|
| 9 | Persist sidebar state | Save collapsed/expanded to `localStorage` | 15 min |
| 10 | Favicon & app icons | Custom AssetFlow favicon, apple-touch-icon | 15 min |
| 11 | SEO meta tags | Add `<title>` + `<meta description>` per page via Next.js `metadata` | 30 min |
| 12 | Auth layout ToastProvider | Wrap auth pages so login/signup can use toasts | 10 min |
| 13 | Fix Tailwind warnings | Resolve ambiguous `ease-[cubic-bezier]` class warning | 15 min |
| 14 | Refresh data on tab focus | Re-fetch dashboard data when user returns to tab | 20 min |

---

## Phase 5 — Multi-Location & Custom Fields

> **Goal**: Make AssetFlow work for any business — from 3 franchise stores to 300 hotel properties  
> **Effort**: ~3-4 days  
> **Depends on**: Phase 4.5

### Multi-Location Hierarchy

| Task | Details |
|------|---------|
| `Location` model | Parent-child tree with unlimited depth (HQ → Region → City → Store) |
| Location CRUD API | Create, edit, delete, move, list with tree structure |
| Location selector UI | Tree dropdown component for selecting locations |
| Assign assets to locations | Every asset belongs to a location (not just department) |
| Location-scoped dashboards | Filter all KPIs, tables, reports by selected location |
| Location-scoped RBAC | Manager of Store #7 can only see Store #7's data |
| Location-based transfer | Move assets between locations with approval workflow |

### Custom Fields / Dynamic Forms

| Task | Details |
|------|---------|
| Field type support | Text, Number, Date, Dropdown (enum), Boolean, File attachment |
| Custom field builder UI | Visual form builder in category settings (already has `field_schema` in DB) |
| Dynamic form rendering | Auto-render custom fields on asset create/edit pages |
| Custom field validation | Required fields, min/max values, regex patterns |
| Search & filter by custom fields | Include custom field values in asset search |
| Custom fields in export | Include in CSV/PDF report exports |

---

## Phase 6 — QR Code & Physical Tracking

> **Goal**: Scan any asset with a phone to see its full history  
> **Effort**: ~2 days  
> **Depends on**: Phase 5

| Task | Details |
|------|---------|
| QR code generation | Auto-generate QR code per asset (encode asset ID + URL) |
| QR display on asset detail | Show QR on asset detail page with download button |
| Bulk label printing | Generate PDF sheet of QR labels (configurable grid: 2x4, 3x8, etc.) |
| Mobile scan page | Camera-based QR scanner → redirect to asset detail |
| Barcode support | Optional Code128 barcode for warehouse/handheld scanners |
| Asset photo upload | Upload/capture photo during registration, display in detail page |
| Quick check-in/out | Scan QR → one-tap assign/return asset |

---

## Phase 7 — Financial Module

> **Goal**: Track asset value, depreciation, and purchase cost for accounting  
> **Effort**: ~2-3 days  
> **Depends on**: Phase 5

| Task | Details |
|------|---------|
| Purchase tracking | Purchase price, date, PO number, invoice number, supplier |
| Depreciation engine | Straight-line, Declining balance, Sum-of-years-digits methods |
| Book value calculation | Auto-calculate current book value based on method + age |
| Salvage value | Expected residual value at end of life |
| Asset valuation dashboard | Total value by location, category, department with charts |
| Insurance tracking | Policy number, provider, coverage amount, premium, renewal date |
| Insurance renewal alerts | Notification 30 days before policy expiry |
| Financial reports | Total acquisition cost, current value, depreciation schedule, tax report |
| Currency support | Configurable currency symbol (₹, $, €, £) |

---

## Phase 8 — Vendor & Warranty Management

> **Goal**: Know who sold what, when warranties expire, and which vendors perform best  
> **Effort**: ~2 days  
> **Depends on**: Phase 7

| Task | Details |
|------|---------|
| Vendor directory | CRUD: name, company, email, phone, address, category, GST/tax ID |
| Link vendors to assets | "Purchased from" and "Serviced by" relationships |
| Warranty tracking | Start date, end date, terms, coverage type per asset |
| Warranty alerts | Notification when warranty expires in 30/15/7 days |
| Warranty claims | Submit claim → track status → resolved |
| AMC (Annual Maintenance Contract) | Contract details, cost, renewal cycle, auto-renewal flag |
| AMC renewal alerts | Notification before AMC expiry |
| Vendor performance dashboard | Average repair time, total cost, number of services per vendor |

---

## Phase 9 — Preventive Maintenance & Scheduling

> **Goal**: Stop waiting for things to break — schedule maintenance proactively  
> **Effort**: ~2-3 days  
> **Depends on**: Phase 8

| Task | Details |
|------|---------|
| Maintenance schedules | Define recurring schedule per asset: daily, weekly, monthly, quarterly, yearly |
| Auto-create requests | System auto-generates maintenance requests based on schedule |
| Maintenance calendar | Full calendar view (monthly/weekly) of all scheduled maintenance |
| Compliance tracking | Track if scheduled maintenance was completed on time |
| Overdue maintenance alerts | Notification when scheduled maintenance is missed |
| Maintenance cost tracking | Log cost per maintenance event (parts + labor) |
| Cost analysis reports | Total maintenance cost by asset, category, location, vendor |
| Maintenance history timeline | Visual timeline of all maintenance events for an asset |

---

## Phase 10 — Mobile PWA & Advanced Reports

> **Goal**: Field workers use phones, managers need PDF reports  
> **Effort**: ~3-4 days  
> **Depends on**: Phase 9

### Mobile PWA

| Task | Details |
|------|---------|
| PWA manifest | `manifest.json` with app name, icons, theme color, splash screen |
| Service worker | Cache static assets for offline access |
| Install prompt | "Add to Home Screen" banner |
| Mobile-optimized layouts | Responsive tables → card layouts on mobile |
| Mobile audit mode | Walk through location, scan QR, mark asset status from phone |
| Push notifications | Web push notifications for critical alerts (overdue, warranty expiry) |

### Advanced Reports

| Task | Details |
|------|---------|
| Report builder | Filter by date range, location, category, department, status, vendor |
| PDF generation | Branded, printable PDF reports with company logo |
| CSV/Excel export | Download filtered data as spreadsheet |
| Scheduled reports | Auto-email weekly/monthly summary to configured recipients |
| Asset lifecycle report | Visual journey: Purchased → Allocated → Maintained → Retired |
| Cost center report | Total cost (purchase + maintenance) grouped by location/department |
| Compliance report | Audit completion rates, overdue maintenance, expired warranties |

---

## Phase 11 — Documentation

> **Goal**: Make the project understandable and maintainable  
> **Effort**: ~1-2 days  
> **Can run in parallel with any phase**

| Task | Details |
|------|---------|
| README.md | Project overview, screenshots, tech stack, setup instructions, architecture diagram |
| API documentation | All 46+ endpoints documented with request/response examples (Swagger or markdown) |
| Database schema docs | ER diagram, model descriptions, relationship explanations |
| Deployment guide | Step-by-step for Vercel, Railway, Docker, VPS deployment |
| User manual | End-user guide with screenshots for each feature |
| Developer onboarding | "How to contribute" guide — code style, PR process, testing conventions |
| Environment variables | Document every `.env` variable with description, defaults, and examples |
| Changelog | Maintain `CHANGELOG.md` with version history |

---

## Phase 12 — DevOps & Deployment

> **Goal**: One-click deploy, automated pipelines, production readiness  
> **Effort**: ~2 days  
> **Can run in parallel with Phase 5-10**

| Task | Details |
|------|---------|
| Dockerfile | Multi-stage build (builder → runner) for containerized deployment |
| docker-compose.yml | App + PostgreSQL + optional Redis for dev/staging |
| GitHub Actions CI | Auto-run tests + lint + type-check on every PR |
| GitHub Actions CD | Auto-deploy to staging on merge to `develop`, production on merge to `main` |
| Database migrations | Switch from `prisma db push` to `prisma migrate` for production safety |
| Environment management | Separate configs for development, staging, production |
| Health check endpoint | `/api/health` with DB connectivity check (already exists, enhance) |
| Backup strategy | Automated daily PostgreSQL backups to cloud storage |
| SSL/HTTPS | Enforce HTTPS in production |
| Domain setup | Custom domain with DNS configuration guide |

---

## Phase 13 — Testing & Reliability

> **Goal**: Confidence that nothing breaks when you ship  
> **Effort**: ~2-3 days  
> **Can run in parallel with Phase 5-10**

| Task | Details |
|------|---------|
| Integration tests | Test actual API routes with test database (Prisma + Vitest) |
| E2E tests | Playwright tests for critical flows: login → create asset → allocate → return → audit |
| Load testing | K6 or Artillery: verify app handles 50+ concurrent users |
| API contract tests | Validate request/response schemas match TypeScript types |
| Test database seeding | Separate seed script for test environment |
| Code coverage | Target 80%+ coverage, enforce in CI |
| Snapshot tests | UI component snapshot tests for regression detection |
| Error scenario tests | Test timeout, network failure, invalid data, permission denied |

---

## Phase 14 — Accessibility (a11y)

> **Goal**: Usable by everyone, including people with disabilities  
> **Effort**: ~1-2 days  
> **Can run in parallel with any phase**

| Task | Details |
|------|---------|
| Keyboard navigation | Tab through all interactive elements in logical order |
| Focus indicators | Visible focus ring on all buttons, inputs, links |
| ARIA labels | Label all icon-only buttons, status badges, modals |
| Screen reader support | Announce dynamic content changes (toast notifications, table updates) |
| Color contrast | WCAG AA compliance (4.5:1 ratio for text, 3:1 for UI) |
| Reduced motion | Respect `prefers-reduced-motion` — disable animations for users who need it |
| Form error association | Link error messages to input fields with `aria-describedby` |
| Skip navigation | "Skip to main content" link for keyboard users |
| Alt text | Descriptive alt text on all images and icons |
| Accessibility audit | Run axe-core or Lighthouse a11y audit, fix all critical issues |

---

## Phase 15 — Advanced Security

> **Goal**: Production-grade security beyond Phase 3 hardening  
> **Effort**: ~2 days  
> **Should complete before go-to-market**

| Task | Details |
|------|---------|
| Two-Factor Authentication (2FA) | TOTP via Google Authenticator / Authy |
| CSRF protection | Anti-CSRF tokens on all state-changing forms |
| Content Security Policy (CSP) | Strict CSP headers to prevent XSS |
| JWT refresh tokens | Short-lived access tokens + long-lived refresh tokens |
| Force logout all devices | Admin can force-logout a user from all sessions |
| Session management dashboard | User can see active sessions + revoke them |
| Password history | Prevent reusing last 5 passwords |
| IP allowlisting | Optional: restrict admin access to specific IPs |
| Data encryption at rest | Encrypt sensitive fields (email, phone) in database |
| Security headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Dependency audit | `npm audit` in CI, auto-PR for vulnerable dependencies |
| Penetration testing | Manual or automated security scan (OWASP ZAP) |

---

## Phase 16 — Monitoring & Analytics

> **Goal**: Know when something breaks before users report it  
> **Effort**: ~1-2 days  
> **Should complete before go-to-market**

| Task | Details |
|------|---------|
| Error tracking | Sentry integration for real-time crash reports with stack traces |
| Performance monitoring | Track API response times, slow queries, memory usage |
| Uptime monitoring | External health check every 5 minutes, alert on downtime |
| Usage analytics | Track feature usage: which pages visited, which actions performed |
| User activity heatmap | Most active hours, busiest locations |
| API usage dashboard | Request count by endpoint, error rates, p95 latency |
| Database monitoring | Connection pool usage, slow query log, table size growth |
| Alerting | Slack/email alerts for: errors spike, API down, DB connection lost |
| Log aggregation | Centralized logging (structured JSON) for debugging production issues |

---

## Phase 17 — Go-to-Market

> **Goal**: Turn the product into a business  
> **Effort**: ~3-5 days  
> **Depends on**: Phases 5-10 mostly complete

| Task | Details |
|------|---------|
| Landing page | Marketing website explaining the product, features, screenshots |
| Pricing tiers | Free (1 location, 50 assets) → Pro (unlimited) → Enterprise (custom) |
| Demo mode | One-click demo with pre-loaded data for prospects |
| Onboarding wizard | First-time setup: create org → add locations → define categories → invite team |
| Multi-tenancy | Single deployment serves multiple customers with data isolation |
| Billing integration | Stripe/Razorpay subscription management |
| Customer support | Help center, knowledge base, in-app chat widget |
| White-labeling | Custom logo, colors, domain per tenant |
| Multi-language (i18n) | UI language switcher (English, Hindi, Spanish, etc.) |
| Legal | Terms of service, privacy policy, data processing agreement |
| App store listings | PWA listing on Microsoft Store, Google Play (TWA) |

---

## 📊 Timeline

```
Phase 4.5  ████░░░░░░░░░░░░░░░░░░░░░░  Quality Hardening     (~1 day)
Phase 5    ████████████░░░░░░░░░░░░░░░  Multi-Location        (~3-4 days)
Phase 6    ██████░░░░░░░░░░░░░░░░░░░░░  QR Codes              (~2 days)
Phase 7    ████████░░░░░░░░░░░░░░░░░░░  Financials            (~2-3 days)
Phase 8    ██████░░░░░░░░░░░░░░░░░░░░░  Vendor & Warranty     (~2 days)
Phase 9    ████████░░░░░░░░░░░░░░░░░░░  Preventive Maint.     (~2-3 days)
Phase 10   ████████████░░░░░░░░░░░░░░░  Mobile & Reports      (~3-4 days)
Phase 11   ██████░░░░░░░░░░░░░░░░░░░░░  Documentation         (~1-2 days)  ← parallel
Phase 12   ██████░░░░░░░░░░░░░░░░░░░░░  DevOps                (~2 days)    ← parallel
Phase 13   ████████░░░░░░░░░░░░░░░░░░░  Testing               (~2-3 days)  ← parallel
Phase 14   ██████░░░░░░░░░░░░░░░░░░░░░  Accessibility         (~1-2 days)  ← parallel
Phase 15   ██████░░░░░░░░░░░░░░░░░░░░░  Security              (~2 days)
Phase 16   ██████░░░░░░░░░░░░░░░░░░░░░  Monitoring            (~1-2 days)
Phase 17   ██████████████░░░░░░░░░░░░░  Go-to-Market          (~3-5 days)
           ─────────────────────────────────────────────────────────────────
           Total estimated effort: ~30-40 days
```

---

## 🏗 Architecture Evolution

```
TODAY (Phase 1-4)                           TARGET (Phase 17)
─────────────────────                       ─────────────────────────────
Single office                          →    Multi-tenant, multi-location
Hardcoded asset fields                 →    Dynamic custom fields per category
Manual asset lookup                    →    QR scan → instant details
No financial tracking                  →    Full depreciation + valuation
No vendor management                   →    Vendor directory + AMC tracking
Reactive maintenance only              →    Preventive scheduling + calendar
Desktop only                           →    PWA mobile app + offline mode
No documentation                       →    Full API docs + user manual
Manual deployment                      →    CI/CD + Docker + auto-deploy
Unit tests only (268)                  →    Unit + Integration + E2E + Load
No accessibility                       →    WCAG AA compliant
Basic JWT auth                         →    2FA + refresh tokens + CSP
No monitoring                          →    Sentry + uptime + alerts
Single user project                    →    SaaS product with billing
English only                           →    Multi-language (i18n)
```

---

## 🔑 Key Decision Points

### Before Phase 5
- **Location model**: Flat list or tree hierarchy? Just "locations" or "buildings → floors → rooms"?
- **Tenant isolation**: Shared database with tenant_id column, or separate databases per tenant?

### Before Phase 7
- **Currency**: Single currency (₹) or multi-currency with exchange rates?
- **Depreciation**: Which methods are mandatory? Straight-line only or all three?

### Before Phase 10
- **Mobile strategy**: PWA (faster, cheaper) or React Native (richer, harder)?
- **Offline scope**: View-only offline, or allow creating records offline and syncing?

### Before Phase 15
- **2FA enforcement**: Optional for all users, or mandatory for admins?
- **Session duration**: How long before auto-logout? 24h? 7 days?

### Before Phase 17
- **Hosting**: Self-hosted (customer's server) or SaaS (your server)?
- **Pricing model**: Per-user, per-asset, per-location, or flat tier?
- **Target market**: India-first or global from day one?

---

## 📎 Quick Reference

| Metric | Current | Target |
|--------|---------|--------|
| API Routes | 46 | ~80+ |
| Pages | 16 | ~25+ |
| UI Components | 12 | ~20+ |
| Test Count | 268 | 500+ |
| Test Types | Unit only | Unit + Integration + E2E |
| Database Models | 12 | ~18+ |
| Supported Industries | Any (basic) | Any (fully configurable) |
| Deployment | Manual | CI/CD + Docker |
| Mobile Support | Responsive | PWA + offline |
| Languages | English | Multi-language |
| Auth | JWT | JWT + 2FA + refresh tokens |
