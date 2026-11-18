ALTER TABLE "User" ADD COLUMN "editorialDesigner" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "EditorialModule" ("id" TEXT PRIMARY KEY, "revision" INTEGER NOT NULL DEFAULT 0, "draft" JSONB NOT NULL, "published" JSONB, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "EditorialRevision" ("id" TEXT PRIMARY KEY, "moduleId" TEXT NOT NULL, "revision" INTEGER NOT NULL, "action" TEXT NOT NULL, "actorId" TEXT NOT NULL, "content" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "EditorialRevision_moduleId_createdAt_idx" ON "EditorialRevision"("moduleId", "createdAt");
CREATE TABLE "EditorialAsset" ("id" TEXT PRIMARY KEY, "storageKey" TEXT NOT NULL UNIQUE, "mime" TEXT NOT NULL, "filename" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE "EditorialModule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EditorialRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EditorialAsset" ENABLE ROW LEVEL SECURITY;
