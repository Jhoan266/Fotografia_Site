type Change =
  | { action: "create"; name: string }
  | { action: "rename"; albumId: string; name: string }
  | { action: "delete"; albumId: string }
  | { action: "reorder"; albumIds: string[] }
  | { action: "assign"; albumId: string | null; photoIds: string[] }
  | { action: "cover"; photoId: string | null };

const id = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 128;
const ids = (value: unknown, max: number): value is string[] => Array.isArray(value) &&
  value.length <= max && value.every(id) && new Set(value).size === value.length;

export function parseOrganizationChange(input: unknown): Change | null {
  if (!input || typeof input !== "object") return null;
  const b = input as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  switch (b.action) {
    case "create": return name && name.length <= 120 ? { action: "create", name } : null;
    case "rename": return id(b.albumId) && name && name.length <= 120 ? { action: "rename", albumId: b.albumId, name } : null;
    case "delete": return id(b.albumId) ? { action: "delete", albumId: b.albumId } : null;
    case "reorder": return ids(b.albumIds, 100) ? { action: "reorder", albumIds: b.albumIds } : null;
    case "assign": return (b.albumId === null || id(b.albumId)) && ids(b.photoIds, 500) && b.photoIds.length > 0
      ? { action: "assign", albumId: b.albumId, photoIds: b.photoIds } : null;
    case "cover": return b.photoId === null || id(b.photoId) ? { action: "cover", photoId: b.photoId } : null;
    default: return null;
  }
}
