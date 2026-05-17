# Saiban Orphan Data Collector - Project Overview

## Purpose

This repository is a temporary field data collection application for orphan registration. It captures orphan, parent, guardian, household, health, education, income, document, and collector metadata so records can be reviewed and later migrated into the main Saiban system.

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
- Field worker management with search, project filters, add/edit/delete modals, and generated field-worker IDs.
- New application creation for field workers and admins.
- Collector/form-filler metadata auto-filled from the signed-in user and protected by the API.
- Draft saving from every wizard step.
- Local browser persistence for in-progress new applications.
- Automatic database draft creation before the first upload when a new application does not yet have an `applicationId`.
- Document uploads to Cloudflare R2 through `/api/upload`.
- Final submission from the review step.
- Conditional form sections for mother status, guardian details, relatives, house rent, health, education, madrasa enrollment, household income, external assistance, and household assets.
- Registration numbers generated only when an application is submitted.
- Admin CSV/JSON export.
- Bilingual field labels and main step headings in English / Urdu.
- Consistent form field heights so long bilingual labels do not misalign adjacent inputs.

## Important Behavior

### Collector Metadata

Collector data is not a user-editable wizard step. The payload still contains:

- `collectorId`
- `collectorName`
- `collectorProject`
- `collectorCnic`
- `collectorAddress`
- `collectorContact`

The values are taken from the authenticated `User` record. The create API writes them from the session user, and the update API deletes these fields from the update payload so crafted requests cannot overwrite them.

### Registration Numbers

`registrationNumber` is nullable and unique. Drafts do not receive a registration number. A number is generated only when:

- a new application is created with `status: "submitted"`, or
- an existing draft transitions to `submitted`.

The current format is `APP-YYYYMMDD-HHMMSSmmm`.

### Conditional Normalization

`app/api/applications/route.ts` normalizes fields before validation:

- Deceased mother clears living/separation/employment fields and forces guardian details to be required.
- Living mother clears death fields.
- Living-but-separated mother clears death fields and requires a separation reason.
- Mother-as-guardian hides and clears separate guardian fields.
- Housewife and similar mother occupations clear monthly income.
- Non-rented homes clear rent fields.
- `healthStatus === "healthy"` clears disability, chronic illness, and medical-expense fields.
- `healthStatus === "chronic_illness"` clears disability-specific fields.
- `healthStatus === "disabled"` clears chronic-illness fields.
- School fields clear when not enrolled in school.
- Madrasa fields clear when not enrolled in madrasa.
- `schoolStudyingSince` is selected as a year in the UI and stored as a compatible date value.
- Household income, earners, and child income clear when the household has no monthly income.
- Other-aid amount/source clear when other aid is not received.
- Guardian zakat and family-holder amount are currently cleared by normalization.

### Removed Verification Steps

School principal verification and mosque imam verification are no longer part of the wizard. Legacy enum values may still exist for compatibility, but those verification screens are not shown in the current flow.

## Application Wizard

The main wizard lives in `components/orphan-application-wizard.tsx`. It is a 12-step client-side wizard backed by a `FormData` object. It supports repeatable relatives and siblings, and it stores household assets through a structured asset selection model.

The current step tabs are:

1. Father / والد
2. Mother / والدہ
3. Guardian / سرپرست
4. Relatives / رشتہ دار
5. Home / گھر
6. Assets / اثاثے
7. Child / بچہ
8. Health / صحت
9. Education & Skills / تعلیم
10. Income / آمدنی
11. Documents / دستاویزات
12. Review / جائزہ

Field labels use `fieldLabel()` from `lib/labels.ts` where possible. Validation errors shown in the wizard convert API issue paths back into readable field labels instead of raw keys like `motherName`.

### Step 1: Father Details / مرحوم والد کی تفصیلات

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

### Step 2: Mother Details / والدہ کی تفصیلات

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
- Housewife and similar occupations clear monthly income.

### Step 3: Guardian Details / سرپرست کی تفصیلات

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

If the mother is living and marked as guardian, separate guardian inputs are hidden and cleared. Otherwise, guardian name, relationship, gender, CNIC, contact, and monthly income are required on submission.

### Step 4: Relatives / قریبی رشتہ دار

Captures whether close-relative information is disclosed and repeatable relative entries.

Repeatable `relatives` entries include:

- `relativeType`
- `name`
- `age`
- `occupation`
- `occupationOther`
- `monthlyIncome`
- `supportType`
- `supportTypeOther`

If relative information is not disclosed, relatives are cleared before submission.

### Step 5: Home / گھر کی تفصیلات

Captures address, GPS, ownership, rent, residence type, utilities, and furnishing:

- `province`
- `district`
- `tehsil`
- `city`
- `residentialArea`
- `fullAddress`
- `latitude`
- `longitude`
- `gpsAccuracyMeters`
- `gpsCapturedAt`
- `houseOwnershipStatus`
- `monthlyRent`
- `rentPaidBy`
- `houseCondition`
- `residenceStructureType`
- `residenceCategory`
- `houseConditionRemarks`
- `electricityAvailable`
- `gasAvailable`
- `waterAvailable`
- `furnishingCondition`
- `furnishingConditionRemarks`

Rent fields are shown and required only for rented homes. District and tehsil are searchable; field workers can add missing options for reuse.

### Step 6: Household Assets / گھریلو اثاثے

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

Each selected asset records a value. Gold and silver also record grams through `quantity`. Custom other items can be added with name and value.

### Step 7: Child Details / یتیم بچے کی تفصیلات

Captures child identity and sibling details:

- `childName`
- `gender`
- `religion` / `specifyReligion`
- `syedStatus`
- `nationality` / `specifyNationality`
- `bFormNumber`
- `dateOfBirth`
- `age` (auto-calculated from DOB, read-only)
- `totalSiblings` (drives sibling row count)

Sibling summary cards show brothers, sisters, married count, and under-12 count derived from sibling rows.

Repeatable `siblings` entries include:

- `name`
- `relation`
- `dob`
- `age` (auto-calculated from DOB, read-only)
- `educationStatus`
- `currentlyStudying`
- `occupation`
- `monthlyIncomeOrFee`
- `maritalStatus`

### Step 8: Health / صحت کی معلومات

Orphan health information only:

- `healthStatus` - `healthy`, `chronic_illness`, or `disabled`

When disabled:

- `disabilityType`
- `disabilityCause`
- `disabilityCauseDetails` and `disabilitySince` when cause is accident or illness
- `treatmentOngoing`; if yes, `treatmentPlace` and `monthlyMedicalExpenses`

When chronic illness:

- `chronicDisease`
- `specifyDisease` when chronic disease is `other`
- `illnessSince`
- `treatmentPlace`
- `monthlyMedicalExpenses`

When healthy, medical/disability fields are hidden and cleared.

Legacy field `disabilityDetails` remains in the schema but is not shown in the UI.

### Step 9: Education & Skills / تعلیم اور ہنر

Formal and Islamic education, fees, skills, and hobbies:

- `currentlyStudying` (school enrollment)
- `enrolledInMadrasa`
- `educationUndertakingAccepted` is shown when school or madrasa is "no"; the visible undertaking sentence is Urdu-only.
- School block when studying: `currentClass`, `schoolName`, `schoolAddress`, `schoolDistanceKm` (km), `schoolTransportMode`, `schoolStudyingSince` (year-only dropdown)
- Madrasa block when enrolled: `madrasaName`, `madrasaEducationDetails` (address), `educationStartCondition` (Islamic studies level)
- Fee block when school or madrasa enrolled: `educationFree`, `monthlySchoolFee` (hidden when education is free)
- Optional fee voucher/proof upload appears after `monthlySchoolFee` when education is not free. It uses document type `fee_voucher` and the same R2-backed upload API as other documents.
- `currentSkillLearning`; if yes, `currentSkill`; if no, `technicalSkillInterest` and optionally `technicalSkill`
- `childHobbies` (multi-select checkboxes)

Legacy fields `notStudyingReason`, `educationFeeStatus`, `careerGoal`, `technicalInterest`, and `learningSkill` remain in the schema/API but are not primary wizard inputs.

### Step 10: Household Income & External Assistance / گھریلو آمدنی اور بیرونی امداد

- `totalFamilyMembers`
- `householdHasMonthlyIncome`; if no, household earners, total income, and child income are hidden
- If yes: `householdEarnersCount`, `totalHouseholdIncome` (income range)
- `childEarnsIncome`; if yes, `childWorkNature`, `childMonthlyIncome` (range)
- `receivingOtherAid`; if yes, `otherAidSource`, `monthlyAidAmount` (manual number input); if no, `assistanceApplied`, `assistanceAppliedWhere`

### Step 11: Documents Upload / دستاویزات اپ لوڈ

Document upload requires an application ID. On a new application, upload controls are visible immediately. Choosing the first file automatically saves a draft, obtains an `applicationId`, and then uploads the file.

Always requested:

- `child_photo` - child photo
- `child_b_form` - child B-Form
- `father_cnic` - father CNIC
- `father_death_certificate` - father death certificate

Conditionally requested:

- `mother_cnic` when mother is not deceased
- `mother_death_certificate` when mother is deceased
- `guardian_cnic` when a separate guardian is required
- `medical_report` when `healthStatus` is `chronic_illness` or `disabled`

Optional/non-step-11 uploads:

- `fee_voucher` from the Education & Skills fee block

The upload component accepts `image/*,.pdf`. Existing documents can be removed through `/api/upload?documentId=...`. Re-uploading the same document type replaces that item in wizard state.

### Step 12: Terms and Review / شرائط اور جائزہ

The final step captures:

- `termsAccepted`

Users submit the application from the final review step. Drafts remain editable. Submitted applications are ready for admin review. Review sections mirror wizard data: collector, mother, guardian, address, GPS, home, relatives, household assets, child, health, education, and income.

## Navigation and Persistence

The wizard uses:

- `step` - current step number from 1 to 12
- `formData` - main form state
- `message` - success/error message
- `isSubmitting` - draft/submission loading state
- `applicationId` - created application ID, reused for draft updates and uploads
- `documents` - uploaded document state

For new applications, local browser persistence uses a storage key based on the collector ID or collector CNIC. Persisted state is merged with authenticated collector metadata so collector fields remain current.

Navigation behavior:

- Back is disabled on step 1.
- Next is available through step 11.
- Save Draft is available on every step and creates or updates the server-side draft.
- Submit Application is shown only on step 12.
- Step tabs are horizontally scrollable on mobile and grid-based on larger screens.

## Key Files

- `prisma/schema.prisma` - database models and enums
- `prisma.config.ts` - Prisma CLI configuration for Prisma 7
- `lib/prisma.ts` - shared Prisma client
- `lib/auth.ts` - NextAuth configuration and role handling
- `lib/validation.ts` - Zod validation schemas and submission rules
- `lib/labels.ts` - English/Urdu field labels
- `lib/application-prefill.ts` - collector prefill helper for new applications
- `lib/household-assets.ts` - household asset definitions, labels, and API conversion helpers
- `lib/r2.ts` - Cloudflare R2/S3-compatible upload client
- `components/orphan-application-wizard.tsx` - main multi-step application wizard
- `components/file-upload.tsx` - document upload/remove UI
- `components/field-worker-manager.tsx` - admin field worker list, filters, add/edit/delete UI
- `components/application-status-actions.tsx` - admin status workflow controls
- `components/application-migration-fields.tsx` - migration metadata UI
- `app/api/applications/route.ts` - create/update application API
- `app/api/upload/route.ts` - document upload/delete API
- `app/api/admin/field-workers/route.ts` - create field worker API
- `app/api/admin/field-workers/[id]/route.ts` - update/delete field worker API
- `app/api/applications/export/route.ts` - admin export endpoint
- `app/api/address-options/route.ts` - district/tehsil custom option API

## Database Notes

Important models:

- `User`
- `OrphanApplication`
- `Sibling`
- `Relative`
- `HouseholdAsset`
- `ApplicationDocument`
- `AuditLog`
- `AddressOption`

Important enums:

- `UserRole`: `admin`, `field_worker`, `viewer`
- `ApplicationStatus`: `draft`, `submitted`, `needs_correction`, `validated`, `rejected`, `migrated`
- `MigrationStatus`: `pending`, `validated`, `migrated`, `rejected`
- `DocumentType`: `child_photo`, `child_b_form`, `father_cnic`, `father_death_certificate`, `mother_cnic`, `mother_death_certificate`, `guardian_cnic`, `school_letter`, `fee_voucher`, `medical_report`, `imam_verification`, `principal_verification`, `house_photo`, `other`

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

- Requires authentication.
- Requires an existing application ID for uploads.
- The wizard can create a draft automatically before upload when a new application does not have an ID yet.
- Accepts JPEG/JPG, PNG, WebP, and PDF up to 5 MB.
- Compresses large images to WebP.
- Stores files in Cloudflare R2/S3-compatible storage when configured.
- Stores document metadata in `ApplicationDocument`.
- Supports deletion by document ID and removes the file from R2.

## Operational Notes

- `npx prisma generate` should be run after schema changes.
- `npx prisma db push` was used during development to sync the current database schema.
- `npm run lint` currently triggers Next.js interactive ESLint setup if ESLint has not been configured.
- `npx tsc --noEmit` is the current non-interactive TypeScript verification command.
