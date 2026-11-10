import { randomUUID } from "crypto";
import sharp from "sharp";
import { getStorageProvider } from "@/modules/storage";
import type { StoredPhoto } from "@/modules/storage/types";

const MAX_PHOTO_PIXELS = 64_000_000;
const imageOptions = { failOn: "error", limitInputPixels: MAX_PHOTO_PIXELS } as const;

const extensionForFormat: Record<string, string> = {
  jpeg: ".jpg",
  png: ".png",
  webp: ".webp",
};

export async function savePhoto(buffer: Buffer): Promise<StoredPhoto> {
  const image = sharp(buffer, imageOptions);
  const meta = await image.metadata();
  const format = meta.format || "";
  const ext = extensionForFormat[format];

  if (!ext) throw new Error("Unsupported image format.");

  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height || width * height > MAX_PHOTO_PIXELS) throw new Error("Invalid image dimensions.");

  const id = randomUUID();
  const storageKey = `originals/${id}${ext}`;
  const thumbKey = `thumbs/${id}.webp`;

  const thumbnail = await image
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  const storage = getStorageProvider();
  const writes = await Promise.allSettled([
    storage.put(storageKey, buffer),
    storage.put(thumbKey, thumbnail),
  ]);

  if (writes.some((result) => result.status === "rejected")) {
    await removePhotoFiles([storageKey, thumbKey]);
    throw new Error("Photo storage write failed.");
  }

  return { storageKey, thumbKey, width, height };
}

export async function readStoredFile(key: string) {
  return getStorageProvider().get(key);
}

export async function storedFileExists(key: string) {
  return getStorageProvider().exists(key);
}

export async function openStoredFileStream(key: string) {
  return getStorageProvider().openReadStream(key);
}


export async function removePhotoFiles(keys: string[]) {
  const results = await Promise.allSettled(keys.map((key) => deleteStoredFile(key)));
  if (results.some((result) => result.status === "rejected")) {
    console.error("Upload rollback could not remove all stored files.");
  }
}

export async function deleteStoredFile(key: string) {
  return getStorageProvider().delete(key);
}
