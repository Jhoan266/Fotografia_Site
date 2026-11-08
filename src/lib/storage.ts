import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

const driver = process.env.STORAGE_DRIVER || "local";

function rootDir() {
  const configured = process.env.STORAGE_LOCAL_PATH || "storage";
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
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

export async function savePhoto(
  buffer: Buffer,
  originalName: string,
): Promise<StoredPhoto> {
  await ensureDirs();
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const id = randomUUID();
  const storageKey = `originals/${id}${ext}`;
  const thumbKey = `thumbs/${id}.webp`;

  const image = sharp(buffer);
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  if (driver === "local") {
    const root = rootDir();
    await writeFile(path.join(root, storageKey), buffer);
    const thumb = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    await writeFile(path.join(root, thumbKey), thumb);
  } else {
    // S3/MinIO hook — local fallback keeps v1 reliable
    const root = rootDir();
    await writeFile(path.join(root, storageKey), buffer);
    const thumb = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    await writeFile(path.join(root, thumbKey), thumb);
  }

  return { storageKey, thumbKey, width, height };
}

export async function readStoredFile(key: string) {
  const root = rootDir();
  return readFile(path.join(root, key));
}

export function absoluteStoragePath(key: string) {
  return path.join(/*turbopackIgnore: true*/ rootDir(), key);
}
