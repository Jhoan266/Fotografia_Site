import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

const driver = process.env.STORAGE_DRIVER || "local";

function rootDir() {
  const configured = process.env.STORAGE_LOCAL_PATH || "storage";
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
}

function resolveStorageKey(key: string) {
  if (!key || key.includes("\0") || path.isAbsolute(key)) {
    throw new Error("Invalid storage key.");
  }

  const root = rootDir();
  const resolved = path.resolve(root, key);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

async function ensureDirs() {
  const root = rootDir();
  await mkdir(path.join(root, "originals"), { recursive: true });
  await mkdir(path.join(root, "thumbs"), { recursive: true });
}

export type StoredPhoto = {
  storageKey: string;
  thumbKey: string;
  width: number;
  height: number;
};

const extensionForFormat: Record<string, string> = {
  jpeg: ".jpg",
  png: ".png",
  webp: ".webp",
};

export async function savePhoto(
  buffer: Buffer,
  _originalName: string,
): Promise<StoredPhoto> {
  await ensureDirs();

  const image = sharp(buffer, { failOn: "error" });
  const meta = await image.metadata();
  const format = meta.format || "";
  const ext = extensionForFormat[format];

  if (!ext) {
    throw new Error("Unsupported image format.");
  }

  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) {
    throw new Error("Invalid image dimensions.");
  }

  if (driver !== "local") {
    throw new Error(`Storage driver "${driver}" is not implemented yet.`);
  }

  const id = randomUUID();
  const storageKey = `originals/${id}${ext}`;
  const thumbKey = `thumbs/${id}.webp`;

  await writeFile(resolveStorageKey(storageKey), buffer);
  const thumb = await sharp(buffer)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  await writeFile(resolveStorageKey(thumbKey), thumb);

  return { storageKey, thumbKey, width, height };
}

export async function readStoredFile(key: string) {
  return readFile(resolveStorageKey(key));
}

export function absoluteStoragePath(key: string) {
  return resolveStorageKey(key);
}
