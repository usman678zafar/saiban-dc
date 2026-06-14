# Saiban Data Collector - Project Overview

A temporary field data collection app for orphan registration. Field workers collect household and child data on mobile, supervisors and reviewers process submitted records, admins complete final review, and approved records can later be migrated into the main Saiban system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.5 App Router, React 18, TypeScript |
| Runtime | Node.js 22.x required by `package.json` |
| Styling | Tailwind CSS |
| Database | PostgreSQL on Neon |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Auth | NextAuth.js v4, JWT sessions, Credentials provider |
| Validation | Zod |
| File storage | Cloudflare R2, S3-compatible API, AWS SDK v3 |
| Maps | Leaflet |
| PDF/rendering | Playwright Core + `@sparticuz/chromium` |

---

## User Roles

| Role | Access |
|---|---|
| `super_admin` | Fullest access. Can manage admins/viewers and override more application workflow restrictions. |
| `admin` | Manage projects, supervisors, reviewers, field workers, and final application review. |
| `supervisor` | Review submitted applications, approve/reject/return, and optionally create applications or manage assigned field workers. |
| `reviewer` | Review supervisor-approved applications, approve/reject/return, and optionally create applications. |
| `field_worker` | Create, edit, and submit own applications. |
| `viewer` | Read-only viewer portal with dashboards, application lists, and geo map views. |

### Bootstrap Super Admin

`lib/auth.ts` contains bootstrap logic for the first super admin account.

- Uses `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` if present.
- Falls back to `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- The matching login must be made from the **Admin** tab on `/signin`.
- If no matching user exists, the account is created as `super_admin`.
- If the matching user exists but has the wrong password hash or role, a successful bootstrap login updates that user to `super_admin`.

Current local `.env` expects:

```env
ADMIN_EMAIL="admin@saiban.com"
ADMIN_PASSWORD="USMANI12345"
```

Do not commit real production secrets to git.

---

## Authentication

- Sign-in page: `/signin`
- Login tabs: Volunteer, Supervisor, Reviewer, Viewer, Admin
- Volunteer login accepts phone number, CNIC, or email.
- Supervisor and reviewer login accepts phone number or email.
- Viewer and admin login use email.
- Admin tab accepts both `admin` and `super_admin` users.
- Forced password change flow exists for supervisors and reviewers using default phone-derived passwords.
- Middleware protects admin, viewer, supervisor, reviewer, dashboard, applications, and change-password routes.
- `/signup` and `/privacy-policy` are public.

---

## Field Worker Types

### Admin-Created

- Created from `/admin/field-workers`.
- Required: name, phone, CNIC, address, project, supervisor.
- Email is generated from CNIC: `{cnic}@field.saiban.local`.
- Password is set by admin.
- `selfRegistered: false`.

### Self-Registered

- Created from public `/signup`.
- Required: name and phone.
- CNIC and address are optional.
- Email is generated from phone: `{phone}@public.saiban.local`.
- Password defaults to the last 4 digits of the phone number.
- `selfRegistered: true`.
- No project/supervisor assignment by default.

Both types sign in through the Volunteer tab.

---

## Review Workflow

Application status values:

```text
draft
submitted
needs_correction
supervisor_approved
reviewer_approved
admin_approved
validated
rejected
migrated
```

Typical path:

```text
draft -> submitted -> supervisor_approved -> reviewer_approved -> admin_approved -> validated -> migrated
```

Correction/rejection paths:

```text
submitted -> needs_correction
submitted -> rejected
supervisor_approved -> rejected
reviewer_approved -> rejected
```

Super admins can act across more workflow states than normal admins.

---

## Directory Structure

```text
app/
  page.tsx                          root redirect by session role
  signin/page.tsx                   role-based login page
  signup/page.tsx                   public volunteer registration
  change-password/page.tsx          forced password change flow
  dashboard/page.tsx                shared dashboard
  applications/                     field-worker/shared application pages
  admin/                            admin and super-admin portal
  supervisor/                       supervisor portal
  reviewer/                         reviewer portal
  viewer/                           read-only viewer portal
  api/
    auth/[...nextauth]/route.ts     NextAuth handler
    register/route.ts               public self-registration
    applications/route.ts           list/create/update/delete applications
    applications/export/route.ts    CSV export
    applications/[id]/review/route.ts review PDF endpoint
    upload/route.ts                 R2 upload/delete helpers
    address-options/route.ts        district/tehsil options
    admin/*                         admin CRUD APIs
    supervisor/*                    supervisor CRUD APIs

components/
  orphan-application-wizard.tsx     main multi-step application form
  role-login.tsx                    sign-in role tabs
  login-form.tsx                    NextAuth credentials form
  admin-shell.tsx                   admin layout wrapper
  supervisor-shell.tsx              supervisor layout wrapper
  reviewer-shell.tsx                reviewer layout wrapper
  viewer-shell.tsx                  viewer layout wrapper
  viewer-geo-story-map.tsx          Leaflet map for viewer dashboard

lib/
  auth.ts                           NextAuth config and bootstrap admin logic
  prisma.ts                         Prisma client singleton
  validation.ts                     Zod schemas
  application-workflow.ts           status labels and badge styling
  field-workers.ts                  project assignment helpers
  r2.ts                             Cloudflare R2 client
  application-review-pdf.ts         PDF generation support

prisma/
  schema.prisma                     DB schema
  seed.ts                           local/dev seed script
```

---

## Orphan Application Wizard

The application form is a 12-step wizard:

| # | Step | Key Data |
|---|---|---|
| 1 | Father | Name, DOB, CNIC, occupation, death date/cause |
| 2 | Mother | Name, alive status, employment, income, remarriage |
| 3 | Guardian | Name, relationship, CNIC, income, zakat status |
| 4 | Relatives | Paternal/maternal grandfathers and uncles |
| 5 | Home | Province, district, tehsil, GPS, ownership, utilities |
| 6 | Assets | Household assets with quantity and value |
| 7 | Child | Name, DOB, gender, B-form, siblings count |
| 8 | Health | Disability, chronic disease, treatment details |
| 9 | Education & Skills | School, class, fees, madrasa, skills |
| 10 | Income | Family income, child earnings, outside aid |
| 11 | Documents | Child photo, B-form, CNICs, death certificate, school/medical files |
| 12 | Review & Submit | Summary, verifications, and terms acceptance |

Draft progress is saved client-side. Submitted records are normalized server-side before database writes.

---

## Key Business Logic

### Registration Number

Generated at submit time as:

```text
APP-YYYYMMDD-HHMMSSmmm
```

### Worker IDs

Generated sequentially as:

```text
FW-000001
FW-000002
...
```

### Application Normalization

`POST /api/applications` and update paths clear conditional fields server-side. For example, irrelevant mother death fields are cleared when mother is not marked deceased.

### File Uploads

The client asks `/api/upload` for a presigned R2 upload URL, uploads directly to R2, then stores the resulting file key on the application document record.

### Export

Admins can export applications from `/api/applications/export`. Nested data such as siblings, relatives, household assets, and documents are serialized into export columns.

---

## Neon Notes

The app uses Neon PostgreSQL through `DATABASE_URL`.

Important quota behavior:

- Neon Free has limited monthly network transfer.
- When network transfer is exceeded, DB calls can fail with messages like:

```text
Your project has exceeded the data transfer quota. Upgrade your plan to increase limits.
```

- In Neon dashboard, check organization/project usage for:
  - Compute
  - Storage
  - History
  - Network transfer
- If production usage exceeds the Free network transfer allowance, upgrade to **Launch** before Scale. Launch is the practical next tier for this app.

---

## Development Commands

```bash
npm install
npm run dev
npm run build
npm run start
npm run test:submit
npx prisma generate
npx prisma db push
```

Notes:

- Use Node.js 22.x. Node 24 may install packages but can make `next dev` unstable.
- `npm install` runs `prisma generate` through `postinstall`.
- `next.config.mjs` uses `.next-dev` as the development build directory and `.next` for production builds.
- If dependency resolution or CSS imports look stale, stop the dev server, delete `.next-dev`, and restart.
- If `leaflet/dist/leaflet.css` cannot resolve, run `npm install` and confirm `node_modules/leaflet/dist/leaflet.css` exists.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXTAUTH_URL` | App base URL, locally `http://localhost:3000` |
| `NEXTAUTH_SECRET` | JWT/session signing secret |
| `SUPER_ADMIN_EMAIL` | Optional explicit bootstrap super-admin email |
| `SUPER_ADMIN_PASSWORD` | Optional explicit bootstrap super-admin password |
| `SUPER_ADMIN_NAME` | Optional explicit bootstrap super-admin display name |
| `ADMIN_EMAIL` | Bootstrap admin email fallback |
| `ADMIN_PASSWORD` | Bootstrap admin password fallback |
| `ADMIN_NAME` | Bootstrap admin display name fallback |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `CLOUDFLARE_R2_BUCKET` | R2 bucket name |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 secret key |
| `CLOUDFLARE_R2_ACCOUNT_ID` | R2 account ID |
| `CLOUDFLARE_R2_ENDPOINT` | R2 S3-compatible endpoint |
| `CLOUDFLARE_R2_PUBLIC_URL` | Public base URL for stored files |

---

## Production Checklist

- Run on Node.js 22.x.
- Keep real database, NextAuth, R2, and Turnstile secrets outside git.
- Confirm Neon plan has enough network transfer for expected usage.
- Run `npm run build` before deployment.
- Confirm `prisma generate` runs during install/build.
- Confirm R2 public URL and upload permissions work.
- Test login from the correct role tab on `/signin`.
