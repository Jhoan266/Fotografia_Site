ALTER TABLE "Project" ADD COLUMN "selectionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "selectionConfirmedAt" TIMESTAMP(3);
CREATE TABLE "SelectionSubmission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "items" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SelectionSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SelectionSubmission_projectId_version_key" ON "SelectionSubmission"("projectId", "version");
ALTER TABLE "SelectionSubmission" ENABLE ROW LEVEL SECURITY;
