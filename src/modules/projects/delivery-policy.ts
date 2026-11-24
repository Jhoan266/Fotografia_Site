type GalleryPolicy = {
  status: string;
  expiresAt: Date | null;
  downloadsEnabled: boolean;
};

export function isGalleryAvailable(project: Pick<GalleryPolicy, "status" | "expiresAt">, now = new Date()) {
  return project.status === "DELIVERED" &&
    (project.expiresAt === null || project.expiresAt.getTime() > now.getTime());
}

export function canDownloadGallery(project: GalleryPolicy, now = new Date()) {
  return project.downloadsEnabled && isGalleryAvailable(project, now);
}

/** A date is inclusive; expiry is the following midnight in UTC. */
export function parseGalleryExpiry(date: string): Date | null | undefined {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(date + "T00:00:00.000Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return undefined;
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed;
}
