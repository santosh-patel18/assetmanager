# AssetFlow

**Enterprise Asset & Resource Management System**

A full-stack web application for organizations to track, manage, and control their physical assets — laptops, desks, vehicles, equipment, and more.

[![CI/CD](https://github.com/santosh-patel18/assetmanager/actions/workflows/ci.yml/badge.svg)](https://github.com/santosh-patel18/assetmanager/actions)

---

## Features

### Core Asset Management
- 📦 **Asset Registry** — Register, categorize, and track all organizational assets
- 🏷️ **Asset Tags** — Unique auto-generated identifiers for every asset
- 📊 **Custom Attributes** — Define category-specific fields (JSON schema-based)
- 🔄 **Lifecycle Tracking** — Track status transitions (Available → Allocated → Maintenance → Disposed)
- 🗑️ **Soft Delete** — Nothing is permanently lost — deleted records are recoverable

### Allocation & Transfers
- 👤 **Employee Allocation** — Assign assets to employees or departments
- 🔀 **Transfer Requests** — Request and approve asset transfers between teams
- 📅 **Expected Return Dates** — Track and alert on overdue returns
- 📋 **Condition Tracking** — Record asset condition on allocation and return

### Bookings & Scheduling
- 📅 **Resource Booking** — Book shared assets (meeting rooms, vehicles, equipment)
- ⏰ **Time-Slot Management** — Prevent double-booking with overlap detection
- 🚫 **Cancellation Support** — Cancel bookings with audit trail

### Maintenance
- 🔧 **Maintenance Requests** — Employees raise issues with priority levels
- ✅ **Approval Workflow** — Managers approve/reject maintenance requests
- 👨‍🔧 **Technician Assignment** — Assign and track repair progress
- 📈 **Maintenance History** — Full history per asset

### Audit & Compliance
- 🔍 **Audit Cycles** — Create scheduled audit cycles scoped by department or location
- ✔️ **Physical Verification** — Mark assets as Verified, Missing, or Damaged
- 📊 **Discrepancy Resolution** — Resolve audit findings with tracked actions

### Organization Management
- 🏢 **Department Hierarchy** — Nested departments with parent-child relationships
- 👥 **Employee Management** — CRUD with role assignment and status tracking
- 📂 **Asset Categories** — Organize assets with custom field schemas
- 📝 **Registration Approval** — Admin approval workflow for new signups

### Notifications
- 🔔 **In-App Notifications** — Real-time notification feed with read/unread tracking
- 📧 **Email Notifications** — SMTP-based email alerts via Nodemailer
- 📋 **Event Coverage** — Asset assignments, transfers, maintenance, bookings, audits

### Reporting & Analytics
- 📊 **Dashboard KPIs** — Available/allocated counts, overdue returns, active bookings
- 📈 **Utilization Reports** — Asset utilization rates across departments
- 🗓️ **Booking Heatmaps** — Visualize peak booking times
- 🔧 **Maintenance Frequency** — Identify high-maintenance assets
- 📥 **CSV Export** — Export any report as CSV

### Security
- 🔐 **JWT Authentication** — Secure token-based auth with HTTP-only cookies
- 🔑 **Role-Based Access Control** — 4 roles: Employee, Department Head, Asset Manager, Admin
- 🛡️ **Account Lockout** — Automatic lockout after failed login attempts
- 🚦 **Rate Limiting** — Request throttling on all endpoints
- 🔒 **CORS Protection** — Configurable origin allowlist
- 📋 **Security Headers** — CSP, HSTS, X-Frame-Options, and more
- 🔏 **Password Hashing** — bcrypt with 12 rounds

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TailwindCSS |
| **Backend** | Next.js API Routes (Node.js) |
| **Database** | PostgreSQL 16+ |
| **ORM** | Prisma 6 |
| **Auth** | JWT + bcryptjs |
| **Validation** | Zod |
| **Email** | Nodemailer |
| **Testing** | Vitest |
| **CI/CD** | GitHub Actions |
| **Containerization** | Docker |

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 16+
- **npm** 10+

### 1. Clone & Install

```bash
git clone https://github.com/santosh-patel18/assetmanager.git
cd assetmanager
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/assetflow?schema=public"
JWT_SECRET="generate-with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Set Up Database

```bash
# Create the database (if it doesn't exist)
createdb assetflow

# Run migrations
npx prisma migrate deploy

# (Optional) Seed with sample data
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Tests

```bash
npm test                # Run all unit tests
npm run test:coverage   # Run with coverage report
```

---

## Docker Setup

```bash
# Start app + database
docker compose up -d

# Run migrations
docker compose exec app npx prisma migrate deploy
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List assets (with search, filter, pagination) |
| POST | `/api/assets` | Create asset |
| GET | `/api/assets/:id` | Get asset details |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Soft-delete asset |
| POST | `/api/assets/:id/allocate` | Allocate asset |

### Allocations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/allocations/:id/return` | Return allocated asset |
| POST | `/api/allocations/:id/transfer-request` | Request transfer |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | List bookings |
| POST | `/api/bookings` | Create booking |
| POST | `/api/bookings/:id/cancel` | Cancel booking |

### Maintenance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/maintenance-requests` | List maintenance requests |
| POST | `/api/maintenance-requests` | Create maintenance request |
| POST | `/api/maintenance-requests/:id/approve` | Approve |
| POST | `/api/maintenance-requests/:id/reject` | Reject |
| POST | `/api/maintenance-requests/:id/assign-technician` | Assign technician |
| POST | `/api/maintenance-requests/:id/resolve` | Mark resolved |

### Organization
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/org/departments` | List/create departments |
| GET/PUT/DELETE | `/api/org/departments/:id` | Department CRUD |
| GET | `/api/org/employees` | List employees |
| PATCH | `/api/org/employees/:id/role` | Change role |
| PATCH | `/api/org/employees/:id/department` | Change department |
| GET/POST | `/api/org/categories` | List/create categories |
| POST | `/api/org/registrations/:id/approve` | Approve signup |
| POST | `/api/org/registrations/:id/reject` | Reject signup |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/utilization` | Asset utilization report |
| GET | `/api/reports/department-allocation` | Department allocation summary |
| GET | `/api/reports/booking-heatmap` | Booking time heatmap |
| GET | `/api/reports/maintenance-frequency` | Maintenance frequency report |
| GET | `/api/reports/export` | CSV export |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Dashboard KPIs and alerts |
| GET | `/api/activity-log` | Activity audit trail |
| GET | `/api/notifications` | User notifications |
| PATCH | `/api/notifications/:id/read` | Mark notification read |
| GET | `/api/health` | Health check |

---

## Database Schema

```mermaid
erDiagram
    Department ||--o{ Employee : employs
    Department ||--o{ Department : "has children"
    Department ||--o{ Asset : owns
    AssetCategory ||--o{ Asset : categorizes
    Asset ||--o{ Allocation : "allocated via"
    Asset ||--o{ ResourceBooking : "booked via"
    Asset ||--o{ MaintenanceRequest : "maintained via"
    Asset ||--o{ AuditItem : "audited in"
    Asset ||--o{ AssetStateLog : "state tracked"
    Employee ||--o{ Allocation : allocates
    Employee ||--o{ ResourceBooking : books
    Employee ||--o{ MaintenanceRequest : raises
    Employee ||--o{ TransferRequest : requests
    Employee ||--o{ ActivityLog : performs
    Employee ||--o{ Notification : receives
    AuditCycle ||--o{ AuditItem : contains
    Allocation ||--o{ TransferRequest : "transferred via"
```

---

## Project Structure

```
assetflow/
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, Signup, Forgot Password pages
│   │   ├── (dashboard)/       # All dashboard pages
│   │   └── api/               # 45 API route handlers
│   ├── components/
│   │   ├── layout/            # Header, Sidebar
│   │   └── ui/                # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts            # Authentication engine
│   │   ├── db.ts              # Prisma client + soft-delete
│   │   ├── enums.ts           # Centralized constants
│   │   ├── errors.ts          # Error hierarchy
│   │   ├── logger.ts          # Structured logger
│   │   ├── notifier.ts        # In-app + email notifications
│   │   ├── pagination.ts      # Pagination utilities
│   │   ├── rate-limiter.ts    # Request throttling
│   │   ├── api-handler.ts     # API route wrapper
│   │   └── validations/       # Zod schemas
│   └── middleware.ts          # CORS, security, auth middleware
├── prisma/
│   ├── schema.prisma          # Database schema (14 models)
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Sample data seeder
├── tests/
│   └── unit/                  # Unit tests (Vitest)
├── docs/                      # Phase documentation
├── .github/workflows/ci.yml   # CI/CD pipeline
├── Dockerfile                 # Container build
└── docker-compose.yml         # Local dev stack
```

---

## License

This project is private. All rights reserved.
