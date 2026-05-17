# Saiban Data Collector — Project Overview

A temporary field data collection app for orphan registration. Field workers fill multi-step forms on mobile; records are later reviewed by admins and migrated into the main Saiban system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma 7 |
| Auth | NextAuth.js v4 — JWT strategy, Credentials provider |
| Validation | Zod |
| File storage | Cloudflare R2 (S3-compatible), AWS SDK v3 |

---

## User Roles

| Role | Access |
|---|---|
| `admin` | Full access — manage field workers, review/validate/export all applications |
| `field_worker` | Create and edit own applications, view own list |
| `viewer` | Read-only (reserved, not fully implemented) |

### Bootstrap Admin
If `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars are set and no admin user exists yet, the first login with those credentials auto-creates the admin account.

---

## Field Worker Types

### Admin-Created
- Created by admin via `/admin/field-workers`
- **Required:** name, phone, CNIC (13 digits), address, project
- Email: `{cnic}@field.saiban.local`
- Password: set by admin (default = last 4 digits of phone)
- `selfRegistered: false`

### Self-Registered (Public)
- Sign up via `/signup` (public, no auth required)
- **Required:** name, phone — CNIC and address are optional
- Email: `{phone}@public.saiban.local`
- Password: automatically last 4 digits of phone number
- `selfRegistered: true`
- No project assigned

Both types sign in the same way (phone number or CNIC + password) through the Field Worker tab on `/signin`.

---

## Authentication

- Sign-in page: `/signin` (role toggle: Field Worker / Admin)
- Field worker login accepts: phone number, CNIC, or email as identifier
- Admin login accepts: email only
- Middleware (`middleware.ts`) protects `/admin/*` and `/applications/*`
- `/signup` is public (not in middleware matcher)

---

## Directory Structure

```
app/
  page.tsx                          → redirects to /signin
  signin/page.tsx                   → login page
  signup/page.tsx                   → public self-registration page
  dashboard/page.tsx                → viewer dashboard
  applications/
    page.tsx                        → field worker application list (paginated, scoped to own)
    new/page.tsx                    → start new application
    [id]/page.tsx                   → view application
    [id]/edit/page.tsx              → edit application
  admin/
    page.tsx                        → admin dashboard
    applications/page.tsx           → all applications list (paginated)
    applications/new/page.tsx       → admin create application
    applications/[id]/page.tsx      → admin view application
    field-workers/page.tsx          → manage field workers
  api/
    auth/[...nextauth]/route.ts     → NextAuth handler
    register/route.ts               → POST — public self-registration
    applications/route.ts           → GET (list), POST (create), PATCH (update draft)
    applications/export/route.ts    → GET — CSV export with nested data
    admin/field-workers/route.ts    → GET (list), POST (create admin worker)
    admin/field-workers/[id]/route.ts → PATCH, DELETE
    upload/route.ts                 → POST — presigned R2 upload URL
    address-options/route.ts        → GET, POST — district/tehsil options

components/
  orphan-application-wizard.tsx     → 12-step wizard (main form, ~3000 lines)
  field-worker-manager.tsx          → admin field worker CRUD + filter UI
  signup-form.tsx                   → public registration form
  role-login.tsx                    → sign-in page with role toggle
  login-form.tsx                    → credentials form
  admin-shell.tsx                   → admin layout wrapper

lib/
  auth.ts                           → NextAuth config, bootstrap admin logic
  prisma.ts                         → Prisma client singleton
  validation.ts                     → Zod schemas for application data
  field-workers.ts                  → fieldWorkerProjects array (4 projects)
  labels.ts                         → bilingual (EN/UR) field labels
  household-assets.ts               → asset type definitions
  address-utils.ts                  → district/tehsil helpers
  pakistan-address-data.ts          → static province/district/tehsil data
  application-prefill.ts            → prefill logic for edit mode
  r2.ts                             → Cloudflare R2 / S3 client

prisma/
  schema.prisma                     → DB models (User, OrphanApplication, Sibling, Relative, HouseholdAsset, ApplicationDocument, AuditLog, AddressOption)
```

---

## Orphan Application — 12 Wizard Steps

| # | Step | Key Data |
|---|---|---|
| 1 | Father | Name, DOB, CNIC, occupation, cause/date of death |
| 2 | Mother | Name, alive status, employment, income, remarriage |
| 3 | Guardian | Name, relationship, CNIC, income, zakat status |
| 4 | Relatives | Paternal/maternal grandfathers and uncles (up to 4) |
| 5 | Home | Province, district, tehsil, GPS, house ownership, utilities |
| 6 | Assets | Household assets with quantity and value |
| 7 | Child | Name, DOB, gender, B-form, siblings count |
| 8 | Health | Disability, chronic disease, treatment details |
| 9 | Education & Skills | School enrollment, class, fees, madrasa, skills |
| 10 | Income | Family income, child earnings, other aid |
| 11 | Documents | Upload: child photo, B-form, father/mother CNIC, death cert, school letter, medical report, etc. |
| 12 | Review & Submit | Summary + imam/principal verification + terms acceptance |

Draft progress is auto-saved to `localStorage`. On submit the wizard calls `POST /api/applications`.

---

## Application Statuses

```
draft → submitted → needs_correction
                 → validated → migrated
                             → rejected
```

---

## Field Worker Projects

```
Link Road / لنک روڈ
Talagang / تلہ گنگ
Schools / مکاتب
Volunteer / رضاکار
```

Self-registered workers have no project assignment.

---

## Key Business Logic

### Registration Number
Format: `APP-YYYYMMDD-HHMMSSmmm` — generated at submit time with zero-padded time parts to avoid collisions.

### Worker IDs
Sequential `FW-000001`, `FW-000002`, … — generated at creation time with a 5-retry collision loop.

### Application Normalization (POST /api/applications)
On submit, conditional fields are cleared server-side based on parent field values:
- If `motherAlive !== 'no'` → clear mother death fields
- If `fatherOccupation !== 'other'` → clear other-occupation text
- etc.

### CSV Export (GET /api/applications/export)
Admin-only. Exports all applications with nested `siblings`, `relatives`, `householdAssets` serialized as JSON strings in their columns.

### File Uploads
Client requests a presigned PUT URL from `/api/upload`, uploads directly to R2, then stores the `fileKey` in the application record.

### Pagination
- Field worker list: 20 per page (scoped to `createdById`)
- Admin list: 50 per page (all applications)

---

## Dev Commands

```bash
npm run dev           # start local dev server
npm run build         # prisma generate + next build
npm run test:submit   # smoke test (scripts/smoke-submit-application.mjs)
npx prisma db push    # push schema changes to database
npx prisma generate   # regenerate Prisma client (run after schema changes)
```

> **Note:** After any change to `prisma/schema.prisma`, always run `npx prisma generate` (and `npx prisma db push` if it's a new field). If the app still uses the old client, delete `.next/` and restart.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon pooler URL) |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | App base URL |
| `ADMIN_EMAIL` | Bootstrap admin email |
| `ADMIN_PASSWORD` | Bootstrap admin password |
| `ADMIN_NAME` | Bootstrap admin display name |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public base URL for R2 files |
