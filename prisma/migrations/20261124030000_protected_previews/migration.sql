ALTER TABLE "Project" ADD COLUMN "watermarkEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "watermarkText" TEXT NOT NULL DEFAULT 'VISTA PREVIA';
-- Keep existing download permissions; new sessions start in review mode.
ALTER TABLE "Project" ALTER COLUMN "downloadsEnabled" SET DEFAULT false;
CREATE TABLE "PhotoDeliveryLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "actorId" TEXT NOT NULL,
  "clientCode" TEXT NOT NULL,
  "photoId" TEXT,
  "filename" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "photoCount" INTEGER NOT NULL DEFAULT 1,
  "requests" INTEGER NOT NULL DEFAULT 1,
  "firstAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PhotoDeliveryLog_projectId_lastAt_idx" ON "PhotoDeliveryLog"("projectId", "lastAt");
ALTER TABLE "PhotoDeliveryLog" ENABLE ROW LEVEL SECURITY;
