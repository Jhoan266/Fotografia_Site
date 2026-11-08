import path from "path";
import type { NextRequest } from "next/server";

export const MAX_UPLOAD_FILES = 10;
export const MAX_UPLOAD_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_REQUEST_BYTES = MAX_UPLOAD_FILES * MAX_UPLOAD_FILE_BYTES + 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedImageType(type: string) {
  return ALLOWED_IMAGE_TYPES.has(type.toLowerCase());
}

export function sanitizeFilename(value: string) {
  const base = path.basename(value || "photo");
  const normalized = base.normalize("NFKC").replace(/[\r\n"\\]/g, "_");
  const safe = normalized.replace(/[^\p{L}\p{N}._() -]/gu, "_").trim();
  return (safe || "photo").slice(0, 180);
}

export function contentDispositionAttachment(filename: string) {
  const safe = sanitizeFilename(filename);
  const ascii = safe.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export function hasValidSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const allowedOrigin = configured ? new URL(configured).origin : request.nextUrl.origin;

  try {
    return new URL(origin).origin === allowedOrigin;
  } catch {
    return false;
  }
}
