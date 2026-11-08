import type { StorageProvider } from "@/modules/storage/types";
import { LocalStorageProvider } from "@/modules/storage/local";
import { S3StorageProvider } from "@/modules/storage/s3";

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;

  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();

  if (driver === "local") {
    provider = new LocalStorageProvider();
    return provider;
  }

  if (driver === "s3") {
    provider = new S3StorageProvider();
    return provider;
  }

  throw new Error(`Unsupported STORAGE_DRIVER "${driver}".`);
}
