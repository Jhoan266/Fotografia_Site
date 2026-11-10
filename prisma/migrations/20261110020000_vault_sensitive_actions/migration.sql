ALTER TABLE "AuthSession" ADD COLUMN "vaultVerifiedUntil" TIMESTAMP(3);

CREATE TYPE "PhotoAuditAction" AS ENUM ('ZIP_REQUESTED', 'PHOTO_DELETED');

CREATE TABLE "PhotoAuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "photoId" TEXT,
    "photoCount" INTEGER NOT NULL,
    "action" "PhotoAuditAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhotoAuditEvent_projectId_createdAt_idx" ON "PhotoAuditEvent"("projectId", "createdAt");
