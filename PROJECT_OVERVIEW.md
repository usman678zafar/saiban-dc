# Saiban Orphan Data Collector - Project Overview

## Purpose

This repository is a temporary field data collection application for orphan registration. It captures orphan, parent, guardian, household, financial, education, verification, document, and collector metadata so records can later be reviewed and migrated into the main Saiban system.

## Tech Stack

- Next.js 14 App Router
- React 18 and TypeScript
- Tailwind CSS
- Prisma ORM 7 with PostgreSQL
- NextAuth.js authentication
- Zod validation
- Cloudflare R2/S3-compatible uploads

## Current State

The app supports:

- Role-based login for admins, field workers, and viewers.
- Admin dashboard with KPI cards, recent applications, field worker summary, and quick links.
- Mobile-responsive admin pages with card views on smaller screens and tables on desktop.
- Field worker management with search, project filters, add/edit/delete modals, and generated IDs.
- New application creation for field workers and admins.
- Collector/form-filler metadata auto-filled from the signed-in user and protected by the API.
- Draft saving, local browser persistence for in-progress new applications, document uploads after draft creation, and final submission.
- Conditional form sections for mother status, guardian details, house rent, health, education, madrasa enrollment, other aid, and household assets.
- Registration numbers generated only when an application is submitted.
- Admin CSV/JSON export.

## Important Recent Behavior

### Collector metadata

Collector data is not a user-editable wizard step. The application payload still contains these fields:

- `collectorId`
- `collectorName`
- `collectorProject`
- `collectorCnic`
- `collectorAddress`
- `collectorContact`

The values are taken from the authenticated `User` record. The create API writes them from the session user, and the update API deletes these fields from the update payload so crafted requests cannot overwrite them.

### Registration numbers

`registrationNumber` is nullable and unique. Drafts do not receive a registration number. A number is generated only when:

- a new application is created with `status: "submitted"`, or
- an existing draft transitions to `submitted`.

The current format is `APP-YYYYMMDD-HHMMSSmmm`.

### Conditional normalization

`app/api/applications/route.ts` normalizes fields before validation:

- Deceased mother clears living/separation/employment fields and forces guardian details to be required.
- Living mother clears death fields.
- Living-but-separated mother clears death fields and requires a separation reason.
- Mother-as-guardian hides and clears separate guardian fields.
- Housewife mother clears monthly income.
- Non-rented homes clear rent fields.
- Healthy child clears disability/treatment/medical-expense fields.
- Education and madrasa fields are cleared when their controlling answers are false.
- Other-aid amount/source are cleared when other aid is false.
- Guardian zakat and family-holder amount are currently cleared by normalization.

## Application Wizard

The main wizard lives in `components/orphan-application-wizard.tsx`. It is a 13-step client-side wizard backed by a `FormData` object. It supports repeatable relatives and siblings, and it stores household assets through a structured asset selection model.

The current step tabs are:

1. Father / والد
2. Mother / والدہ
3. Guardian / سرپرست
4. Relatives / رشتہ دار
5. Home / گھر
6. Assets / اثاثے
7. Child / بچہ
8. Health / صحت
9. Income / آمدنی
10. School / سکول
11. Imam / امام
12. Documents / دستاویزات
13. Review / جائزہ

### Step 1: Father Details

Captures deceased father identity, education, origin, occupation, and death details:

- `fatherName`
- `fatherDob`
- `fatherAge`
- `fatherCnic`
- `fatherEducation`
- `fatherTongue`
- `fatherNativeArea`
- `fatherOccupation`
- `fatherDateOfDeath`
- `fatherCauseOfDeath`

### Step 2: Mother Details

Captures mother identity and status:

- `motherName`
- `motherDob`
- `motherAlive`
- `motherAge`
- `motherCnic`
- `motherEducation`
- `motherTongue`
- `motherNativeArea`
- `motherSeparationReason`
- `motherContact`
- `motherOccupation`
- `motherMonthlyIncome`
- `motherRemarried`
- `motherDeathDate`
- `motherDeathCause`

Key conditions:

- `motherAlive` supports living, living but separated, and deceased states.
- Separation reason is required when the mother is alive but separated.
- Contact is required when the mother is living or separated.
- Death date and death cause are required when the mother is deceased.
- Housewife occupation clears monthly income.

### Step 3: Guardian Details

Captures guardian information when a separate guardian is needed:

- `motherIsGuardian`
- `guardianName`
- `guardianRelationship`
- `guardianGender`
- `guardianCnic`
- `guardianEducation`
- `guardianMotherTongue`
- `guardianNativeArea`
- `guardianContact`
- `guardianOccupation`
- `guardianFamilyHolder`
- `guardianFamilyMembersCount`
- `guardianMonthlyIncome`
- `guardianSignatureFileKey`

If the mother is living and marked as the guardian, separate guardian inputs are hidden and cleared. Otherwise, guardian name, relationship, and contact are required on submission.

### Step 4: Relatives

Captures grandparents and repeatable uncle/relative entries.

Grandparent fields:

- `paternalGrandfatherName`
- `paternalGrandfatherAge`
- `paternalGrandfatherOccupation`
- `paternalGrandfatherIncome`
- `maternalGrandfatherName`
- `maternalGrandfatherAge`
- `maternalGrandfatherOccupation`
- `maternalGrandfatherIncome`

Repeatable `relatives` entries include:

- `relativeType`
- `name`
- `age`
- `occupation`
- `monthlyIncome`

### Step 5: Home

Captures address, location, ownership, rent, and condition:

- `city`
- `district`
- `tehsil`
- `residentialArea`
- `fullAddress`
- `longitude`
- `latitude`
- `houseOwnershipStatus`
- `monthlyRent`
- `rentPaidBy`
- `houseCondition`
- `houseConditionRemarks`
- `furnishingCondition`
- `furnishingConditionRemarks`

Rent fields are shown and required only for rented homes.

### Step 6: Household Assets

Household assets are defined in `lib/household-assets.ts` and submitted as `householdAssets`.

Current asset keys:

- `fridge`
- `sewing_machine`
- `furniture`
- `vehicle`
- `livestock`
- `property`
- `smartphone`
- `cash_savings`
- `business_inventory`
- `gold`
- `silver`
- `other`

Each selected asset records a value. Gold and silver also record grams through `quantity`.

### Step 7: Child Details

Captures child and sibling context:

- `childName`
- `gender`
- `caste`
- `sect`
- `bFormNumber`
- `dateOfBirth`
- `age`
- `totalBrothers`
- `totalSisters`
- `registeredBrothers`
- `registeredSisters`
- `siblingsUnder12`
- `childLivesWithMother`
- `livingSituationNotes`

Repeatable `siblings` entries include:

- `name`
- `age`
- `occupation`
- `monthlyIncomeOrFee`

### Step 8: Health and Education

Captures health, disability, study status, school, fee, and madrasa information:

- `healthStatus`
- `disabilityDetails`
- `treatmentPlace`
- `monthlyMedicalExpenses`
- `currentlyStudying`
- `notStudyingReason`
- `educationStartCondition`
- `currentClass`
- `schoolName`
- `schoolAddress`
- `educationFeeStatus`
- `monthlySchoolFee`
- `enrolledInMadrasa`
- `madrasaName`
- `madrasaEducationDetails`

Medical expenses are required when health status is sick or disabled. School details are required when currently studying. Madrasa details are required when enrolled in madrasa.

### Step 9: Income and Aid

Captures career, skill, income, and aid details:

- `careerGoal`
- `technicalInterest`
- `learningSkill`
- `childMonthlyIncome`
- `householdEarnersCount`
- `totalHouseholdIncome`
- `receivingOtherAid`
- `otherAidSource`
- `monthlyAidAmount`
- `notAppliedElsewhereReason`

Aid source and amount are required only when other aid is received.

### Step 10: Educational Institution Verification

Uploads the school verification letter image through `FileUpload` using:

- document type: `principal_verification`
- label: `School Verification Letter Image`

### Step 11: Mosque Imam Verification

Uploads the imam verification letter image through `FileUpload` using:

- document type: `imam_verification`
- label: `Imam Verification Letter Image`

### Step 12: Documents Upload

Documents can be uploaded only after the application has been saved as a draft and has an `applicationId`.

Always requested:

- `child_photo` - Child Photo
- `child_b_form` - Child B-Form
- `father_cnic` - Father CNIC

Conditionally requested:

- `mother_cnic` when mother is not deceased.
- `mother_death_certificate` when mother is deceased.
- `guardian_cnic` when a separate guardian is required.
- `medical_report` when health status is sick or disabled.

The upload component accepts `image/*,.pdf`. Existing documents can be removed through `/api/upload?documentId=...`.

### Step 13: Terms and Review

The final step captures:

- `termsAccepted`

Users can save as draft or submit the application. Drafts remain editable. Submitted applications are ready for admin review.

## Navigation and Persistence

The wizard uses:

- `step` - current step number.
- `formData` - main form state.
- `message` - success/error message.
- `isSubmitting` - draft/submission loading state.
- `applicationId` - created application ID, required before document upload.
- `documents` - uploaded document state.

For new applications, local browser persistence uses a storage key based on the collector ID or collector CNIC. Persisted state is merged with the authenticated collector metadata so collector fields remain current.

Navigation behavior:

- Back is disabled on step 1.
- Next is available through step 12.
- Save Draft and Submit Application are shown on step 13.
- Step tabs are horizontally scrollable on mobile and grid-based on larger screens.

## Key Files

- `prisma/schema.prisma` - Database models and enums.
- `prisma.config.ts` - Prisma CLI configuration for Prisma 7.
- `lib/prisma.ts` - Shared Prisma client.
- `lib/auth.ts` - NextAuth configuration and role handling.
- `lib/validation.ts` - Zod validation schemas and submission rules.
- `lib/labels.ts` - English/Urdu field labels.
- `lib/application-prefill.ts` - Collector prefill helper for new applications.
- `lib/household-assets.ts` - Household asset definitions, labels, and API conversion helpers.
- `lib/r2.ts` - Cloudflare R2/S3-compatible upload client.
- `components/orphan-application-wizard.tsx` - Main multi-step application wizard.
- `components/file-upload.tsx` - Document upload/remove UI.
- `components/field-worker-manager.tsx` - Admin field worker list, filters, add/edit/delete UI.
- `components/application-status-actions.tsx` - Admin status workflow controls.
- `components/application-migration-fields.tsx` - Migration metadata UI.
- `app/api/applications/route.ts` - Create/update application API.
- `app/api/upload/route.ts` - Document upload/delete API.
- `app/api/admin/field-workers/route.ts` - Create field worker API.
- `app/api/admin/field-workers/[id]/route.ts` - Edit/delete field worker API.
- `app/api/applications/export/route.ts` - Admin export endpoint.

## Database Notes

Important models:

- `User`
- `OrphanApplication`
- `Sibling`
- `Relative`
- `HouseholdAsset`
- `ApplicationDocument`
- `AuditLog`

Important enums:

- `UserRole`: `admin`, `field_worker`, `viewer`
- `ApplicationStatus`: `draft`, `submitted`, `needs_correction`, `validated`, `rejected`, `migrated`
- `MigrationStatus`: `pending`, `validated`, `migrated`, `rejected`
- `DocumentType`: includes child, parent, guardian, school, imam, health, house, and other document types.

`OrphanApplication.registrationNumber` remains unique and nullable. `User.fieldWorkerId`, `User.address`, and `User.project` support collector prefill and field worker management.

## API Behavior

### `POST /api/applications`

- Requires authentication.
- Normalizes conditional fields.
- Validates input with `getOrphanApplicationSchema`.
- Writes collector metadata from the authenticated user.
- Creates related siblings, relatives, and household assets.
- Generates `registrationNumber` only when creating a submitted application.

### `PATCH /api/applications`

- Requires authentication.
- Allows the creator or an admin to update.
- Normalizes conditional fields.
- Validates input with `getOrphanApplicationSchema`.
- Protects collector fields from being overwritten.
- Replaces related siblings, relatives, and household assets when those arrays are included.
- Generates `registrationNumber` when a draft transitions to submitted.

### `/api/upload`

- Requires an existing application ID for uploads.
- Stores document metadata in `ApplicationDocument`.
- Supports deletion by document ID.
- Uses Cloudflare R2/S3-compatible storage when configured.

## Admin Area

The admin dashboard shows:

- Total Applications
- Submitted
- Validated
- Migrated
- Rejected
- Users
- Admins

It also includes recent applications, field worker summary, and quick links to create and review applications.

Field worker management supports:

- Search.
- Project filter chips.
- Add field worker modal.
- Edit modal.
- Delete confirmation.
- Generated field worker IDs in the `FW-000001` format.

## Project Structure

- `app/` - Next.js pages and API routes.
- `components/` - Shared UI components.
- `lib/` - Shared utilities, auth, validation, labels, Prisma, R2, and form helpers.
- `prisma/` - Prisma schema and seed script.
- `scripts/` - Smoke tests and utility scripts.
- `types/` - TypeScript module definitions.
- `assests/` - Static project assets, including the logo.

## Development Commands

- `npm run dev` - start local development server.
- `npm run build` - run Prisma generate and Next.js production build.
- `npm run start` - start production server.
- `npm run prisma` - run Prisma CLI commands.
- `npm run test:submit` - run the submission smoke test script.
- `npx prisma generate` - regenerate Prisma client.
- `npx prisma db push` - push schema changes to the configured database.

## Verification

Recent verification should include:

- `npx prisma generate`
- `npx prisma db push`
- `npm run build`
- `npm run test:submit` when validating application submission behavior.
