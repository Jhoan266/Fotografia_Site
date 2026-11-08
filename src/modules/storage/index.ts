import type { StorageProvider } from "@/modules/storage/types";
import { LocalStorageProvider } from "@/modules/storage/local";

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;

  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();

  if (driver === "local") {
    provider = new LocalStorageProvider();
    return provider;
  }

  throw new Error(
    `Storage driver "${driver}" is not configured. Implement and register a provider before enabling it.`,
  );
}
