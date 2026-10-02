# Smart Ledger — Project Context

> Enterprise Asset & Resource Management System built with Next.js 14, TypeScript, Prisma, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3 + Radix UI primitives |
| Database | PostgreSQL 18 |
| ORM | Prisma 6.9 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Testing | Vitest + @vitest/coverage-v8 |
| Charts | Recharts |
| Icons | Lucide React |
| QR | html5-qrcode + qrcode + jspdf |
| Email | Nodemailer |
| Validation | Zod |

---

## Project Structure

```
assetflow/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page
│   │   ├── (dashboard)/           # All authenticated pages
│   │   │   ├── page.tsx           # Dashboard (KPI cards, quick actions)
│   │   │   ├── assets/            # Asset list + register form
│   │   │   ├── allocations/       # Assign/return assets
│   │   │   ├── bookings/          # Resource booking with calendar
│   │   │   ├── maintenance/       # Raise/approve/resolve maintenance
│   │   │   ├── audits/            # Audit cycles + item verification
│   │   │   ├── reports/           # Charts + CSV export
│   │   │   ├── financials/        # ★ Phase 7: Financial dashboard (KPIs, charts, tables)
│   │   │   ├── locations/         # Location hierarchy tree
│   │   │   ├── org/               # Departments + categories + employees
│   │   │   ├── scanner/           # QR code scanner
│   │   │   ├── activity/          # Activity log
│   │   │   ├── notifications/     # In-app notifications
│   │   │   └── settings/          # Password change
│   │   ├── api/                   # 18 API route groups (55+ endpoints)
│   │   │   ├── auth/              # login, signup, forgot/reset-password
│   │   │   ├── assets/            # CRUD + photo upload + QR generation
│   │   │   │   └── [id]/
│   │   │   │       ├── financials/  # ★ GET/PATCH asset financial data
│   │   │   │       └── depreciation/# ★ POST calculate & store schedule
│   │   │   ├── allocations/       # assign, return, transfer
│   │   │   ├── bookings/          # create, cancel, conflict detection
│   │   │   ├── insurance/         # ★ CRUD + /expiring endpoint
│   │   │   ├── maintenance-requests/
│   │   │   ├── audit-cycles/      # create, close, mark items
│   │   │   ├── reports/           # utilization, export CSV
│   │   │   │   ├── financial/     # ★ Aggregated financial summary
│   │   │   │   └── depreciation/  # ★ Asset-level depreciation report
│   │   │   ├── locations/         # CRUD + tree structure
│   │   │   ├── org/               # departments, categories, employees
│   │   │   ├── transfer-requests/
│   │   │   ├── notifications/     # list, mark read
│   │   │   ├── activity-log/
│   │   │   ├── dashboard/         # aggregated KPIs
│   │   │   ├── health/            # health check endpoint
│   │   │   └── public/            # public scan endpoint (no auth)
│   │   └── scan/[tag]/            # Public QR scan page
│   ├── components/
│   │   ├── layout/sidebar.tsx     # Collapsible sidebar with nav sections
│   │   └── ui/                    # 19 reusable UI components
│   ├── lib/
│   │   ├── auth.ts                # JWT, password, cookie, RBAC, dept/location scope
│   │   ├── auth-context.tsx       # React context for client-side auth
│   │   ├── db.ts                  # Prisma singleton with query logging
│   │   ├── api-handler.ts         # Centralized API route wrapper (auth + errors + logging)
│   │   ├── depreciation.ts        # ★ Pure depreciation engine (3 methods)
│   │   ├── notifier.ts            # In-app + email notifications
│   │   ├── enums.ts               # All status/role/type constants
│   │   ├── errors.ts              # Custom error hierarchy (AppError → HTTP)
│   │   ├── logger.ts              # Structured JSON logger
│   │   ├── rate-limiter.ts        # In-memory rate limiter
│   │   ├── sanitize.ts            # XSS/injection prevention
│   │   ├── pagination.ts          # Offset pagination utility
│   │   ├── validations/           # Zod schemas for all entities
│   │   │   ├── financials.ts      # ★ Asset financial fields + depreciation request
│   │   │   └── insurance.ts       # ★ Insurance policy create/update
│   │   └── use-focus-refresh.ts   # Re-fetch data on tab focus
│   ├── middleware.ts              # Auth guard, CORS, rate limiting, security headers, CSP
│   └── types/index.ts             # Shared TypeScript interfaces
├── prisma/
│   ├── schema.prisma              # 14 models (375 lines)
│   ├── seed.ts                    # Dev seed data (6 users, 6 depts, 10 assets, insurance, etc.)
│   ├── wipe.ts                    # Reset database to clean state
│   └── migrations/                # Database migrations
├── tests/unit/                    # 10 test files, 268 tests
├── docker-compose.yml             # PostgreSQL + app
├── Dockerfile                     # Multi-stage production build
└── tunnel.js                      # Localtunnel for sharing dev builds
```

---

## Database Schema (14 Models)

| Model | Purpose |
|-------|---------|
| `Department` | Hierarchical org structure (parent-child) |
| `Location` | Multi-level location tree (HQ → Floor → Room) |
| `Employee` | Users with 5 roles: admin, finance_manager, asset_manager, department_head, employee |
| `AssetCategory` | Categories with dynamic JSON field schemas |
| `Asset` | Physical assets with tags, QR codes, photos, custom attributes, financial fields |
| `AssetStateLog` | Immutable status change audit trail |
| `Allocation` | Asset → Employee/Department assignments |
| `TransferRequest` | Request/Approve workflow for asset transfers |
| `ResourceBooking` | Time-slot bookings with overlap detection |
| `MaintenanceRequest` | Raise → Approve → Resolve lifecycle |
| `AuditCycle` + `AuditItem` | Periodic asset verification cycles |
| `ActivityLog` | Full audit trail of every action |
| `Notification` | In-app notification store |
| `InsurancePolicy` | ★ Insurance coverage for assets (Phase 7) |
| `DepreciationRecord` | ★ Monthly depreciation schedule entries (Phase 7) |

### Asset Financial Fields (Phase 7)
- `purchaseOrderNumber`, `invoiceNumber`, `supplier` — procurement data
- `depreciationMethod` — straight_line / declining_balance / sum_of_years
- `usefulLifeMonths`, `salvageValue` — depreciation parameters
- `warrantyEndDate` — warranty tracking

---

## RBAC (5 Roles)

| Role | Permissions |
|------|------------|
| `admin` | Full access — all CRUD, org management, system settings, financials |
| `finance_manager` | ★ Full financial authority (depreciation, insurance, valuation, reports, exports). Read-only access to assets, allocations, bookings, maintenance. Cannot modify asset lifecycle/status. |
| `asset_manager` | Manage assets, allocations, maintenance, audits, reports, financials |
| `department_head` | View dept assets, approve transfers, manage dept employees, view dept financials |
| `employee` | View own assets, raise maintenance, book resources |

### Financial RBAC Constants (enums.ts)
- `FINANCIAL_ROLES` — Admin, Finance Manager, Asset Manager (write access)
- `FINANCIAL_VIEW_ROLES` — Above + Department Head (read access, dept-scoped)

---

## Current Status

### ✅ Completed Phases

1. **Phase 1 — Core Foundation**: Auth, RBAC, schema, CRUD APIs
2. **Phase 2 — Full Feature Build**: All business modules (assets, allocations, bookings, maintenance, audits, reports, notifications, org management)
3. **Phase 3 — Security Hardening**: Input sanitization, rate limiting, API gateway, 268 unit tests
4. **Phase 4 — UI/UX Beautification**: Premium design system, animations, responsive sidebar, toast notifications
5. **Phase 4.5 — Quality Hardening**: Fixed N+1 queries, added pagination, error boundaries, TypeScript interfaces, confirmation dialogs
6. **Phase 5 — Multi-Location & Custom Fields**: Location hierarchy, location-scoped RBAC, dynamic custom fields per category
7. **Phase 6 — QR Code & Physical Tracking**: QR generation, bulk PDF label printing, camera scanner, photo upload
8. **Phase 7 — Financial Module** *(In Progress)*:
   - ✅ Finance Manager role added to RBAC
   - ✅ Prisma schema: 7 financial fields on Asset, InsurancePolicy model, DepreciationRecord model
   - ✅ Depreciation engine (3 methods: straight-line, declining-balance, sum-of-years)
   - ✅ Zod validations for financials and insurance
   - ✅ API endpoints: asset financials, depreciation, insurance CRUD, expiring, reports
   - ✅ Financials dashboard page (KPIs, valuation charts, depreciation table, insurance table)
   - ✅ Sidebar updated with Financials nav and FM role access
   - ✅ Seed data with Finance Manager user and sample financial/insurance data
   - 🔲 Remaining: run seed to populate data, test all endpoints end-to-end, add financial tab on asset detail page

### 📋 Next Phases (Not Started)

- Phase 8 — Vendor & Warranty Management
- Phase 9 — Preventive Maintenance Scheduling
- Phase 10 — Mobile PWA & Advanced Reports
- Phase 11-17 — Documentation, DevOps, Testing, a11y, Security, Monitoring, Go-to-Market

---

## Key Identifiers

| Item | Value |
|------|-------|
| Project name | **Smart Ledger** |
| Package name | `smart-ledger` |
| Logo initials | `SL` |
| Cookie name | `smartledger_token` |
| localStorage key | `smartledger-sidebar-collapsed` |
| Email domain | `@smartledger.com` |
| SMTP sender | `Smart Ledger <noreply@smartledger.com>` |
| Database name | `smartledger` |
| Export filename | `smartledger_export_YYYY-MM-DD.csv` |
| Tunnel subdomain | `smartledger-erp` |
| GitHub repo | `santosh-patel18/assetmanager` |

---

## Dev Credentials (Seed Data)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartledger.com | Admin@123 |
| Finance Manager | finance@smartledger.com | Finance@123 |
| Asset Manager | manager@smartledger.com | Manager@123 |
| Department Head | head@smartledger.com | Head@123 |
| Employee | charlie@smartledger.com | Employee@123 |
| Employee | diana@smartledger.com | Employee@123 |

---

## Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run test             # Run 268 unit tests
npm run db:seed          # Seed database with sample data
npm run db:migrate       # Run Prisma migrations
npm run db:push          # Push schema changes (dev only)
```
