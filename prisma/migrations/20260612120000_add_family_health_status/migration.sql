ALTER TABLE "OrphanApplication"
  ADD COLUMN "motherHealthStatus" TEXT,
  ADD COLUMN "motherDisabilityRemarks" TEXT,
  ADD COLUMN "guardianHealthStatus" TEXT,
  ADD COLUMN "guardianDisabilityRemarks" TEXT;

ALTER TABLE "Sibling"
  ADD COLUMN "healthStatus" TEXT,
  ADD COLUMN "disabilityRemarks" TEXT;
