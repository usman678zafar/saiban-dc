# Saiban Orphan Data Collector - Project Overview

## Purpose

This repository is a temporary field data collection application for orphan registration, built to gather detailed orphan and household data for later migration into the main Saiban system.

## Recent Fixes Applied

### Prisma configuration fix
- Created a root-level `prisma.config.ts` file.
- Added `import 'dotenv/config';` so Prisma CLI can load `.env` values.
- Configured Prisma datasource using `process.env.DATABASE_URL`.
- Verified that `prisma db push` succeeds with the project setup.

### Database synchronization
- Ran `npx prisma db push` successfully.
- Confirmed the Postgres database now contains tables matching the Prisma schema.
- Resolved the runtime error where `prisma.orphanApplication.count()` failed because the `OrphanApplication` table was missing.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM v7
- PostgreSQL
- NextAuth.js for authentication
- Zod for validation
- Cloudflare R2 planned for file storage

## Key Files

- `prisma/schema.prisma` - Defines all models and enums including `OrphanApplication`, `User`, `Sibling`, `Relative`, `HouseholdAsset`, `ApplicationDocument`, `AuditLog`, and more.
- `prisma.config.ts` - Root Prisma config file used by the CLI to resolve the datasource URL.
- `lib/prisma.ts` - Exports the Prisma client used by the app.
- `app/dashboard/page.tsx` - Dashboard page that fetches and displays application counts by status.
- `app/applications/new/page.tsx` - New application entry point rendering the wizard.
- `components/orphan-application-wizard.tsx` - Multi-step application form component.
- `app/api/applications/route.ts` - API route to create orphan applications with authentication and validation.

## Application Form Overview

The orphan application form is implemented as a multi-step wizard in `components/orphan-application-wizard.tsx`.

### Steps

1. **Form Filler Details**
   - `registrationNumber`
   - `collectorName`
   - `collectorProject`
   - `collectorCnic`
   - `collectorAddress`
   - `collectorContact`

2. **Orphan Child Details**
   - `childName`
   - `gender`
   - `bFormNumber`
   - `dateOfBirth`
   - `age`

3. **Required Documents**
   - `child_photo`
   - `child_b_form`
   - `father_cnic`
   - `mother_cnic`

4. **Declarations and Review**
   - `termsAccepted`
   - Review summary before saving the draft

### Form behavior

- Uses React state with `useState` for current step, form data, submission status, and messages.
- Includes Next.js client-side controls for step navigation.
- Sends a POST request to `/api/applications` on final submit.
- Saves new applications as draft with `status: 'draft'`.
- Handles errors and displays success/failure messages.

### Field labels

- The form uses bilingual labels from `lib/labels.ts`.
- Labels are displayed in both Urdu and English.

### Document handling

- The form supports file upload through the `FileUpload` component.
- Uploaded documents are stored in `formData.documents`.
- Document removal is handled locally in the form state; server-side removal is marked as TODO.

## API and Validation

### `app/api/applications/route.ts`

- Requires authenticated users with a valid session.
- Fetches the signed-in user from Prisma by email.
- Validates request body with `getOrphanApplicationSchema` from `lib/validation.ts`.
- Creates `OrphanApplication` records with related `siblings`, `relatives`, and `householdAssets`.
- Returns JSON with the created application or an error message.

## Dashboard

The dashboard page fetches status counts from Prisma:

- Total applications
- Draft applications
- Submitted applications
- Validated applications
- Rejected applications
- Migrated applications

This page was failing before the Prisma fix because the database table did not exist.

## Project Structure

- `app/` - Next.js app router pages and API routes.
- `components/` - React components used by pages.
- `lib/` - Shared utilities, Prisma client, auth setup, labels, validation.
- `prisma/` - Prisma schema and config.
- `types/` - TypeScript definitions.

## Notes

- The application currently saves drafts and supports workflow for orphan data collection.
- The Prisma schema is already rich and designed for field data migration.
- The current form implementation is step-based and supports English/Urdu labels.
- `prisma.config.ts` is now required for Prisma 7 CLI operations with this setup.

## Next Steps

- Expand the wizard to capture the full model fields in `OrphanApplication`.
- Complete server-side document upload and removal.
- Add application edit/update flows.
- Build admin UI for status transitions and migration review.
- Add charts and export features to the dashboard.
