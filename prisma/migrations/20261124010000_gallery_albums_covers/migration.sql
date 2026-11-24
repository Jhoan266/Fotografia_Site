CREATE TABLE "GalleryAlbum" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "GalleryAlbum_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GalleryAlbum_id_projectId_key" ON "GalleryAlbum"("id", "projectId");
CREATE INDEX "GalleryAlbum_projectId_sortOrder_idx" ON "GalleryAlbum"("projectId", "sortOrder");
ALTER TABLE "Photo" ADD COLUMN "albumId" TEXT;
CREATE INDEX "Photo_albumId_projectId_idx" ON "Photo"("albumId", "projectId");
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_albumId_projectId_fkey" FOREIGN KEY ("albumId", "projectId") REFERENCES "GalleryAlbum"("id", "projectId") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Project" ADD COLUMN "coverPhotoId" TEXT;
ALTER TABLE "Project" ADD CONSTRAINT "Project_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GalleryAlbum" ENABLE ROW LEVEL SECURITY;
