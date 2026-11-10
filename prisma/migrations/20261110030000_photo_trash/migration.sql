ALTER TABLE "Photo" ADD COLUMN "trashedAt" TIMESTAMP(3);
CREATE INDEX "Photo_projectId_trashedAt_idx" ON "Photo"("projectId", "trashedAt");

ALTER TYPE "PhotoAuditAction" ADD VALUE 'PHOTO_TRASHED';
ALTER TYPE "PhotoAuditAction" ADD VALUE 'PHOTO_RESTORED';
