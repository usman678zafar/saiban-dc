ALTER TABLE "OrphanApplication"
ADD COLUMN "filledFieldsPercentage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "filledFieldsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totalMeaningfulFields" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "OrphanApplication_status_filledFieldsPercentage_idx" ON "OrphanApplication"("status", "filledFieldsPercentage");
CREATE INDEX "OrphanApplication_updatedAt_idx" ON "OrphanApplication"("updatedAt");
CREATE INDEX "OrphanApplication_createdAt_idx" ON "OrphanApplication"("createdAt");
