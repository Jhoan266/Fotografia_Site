import { mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import type { StorageProvider } from "@/modules/storage/types";

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

export class LocalStorageProvider implements StorageProvider {
  async put(key: string, data: Buffer) {
    const target = resolveStorageKey(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
    return { key, size: data.byteLength };
  }

  async get(key: string) {
    return readFile(resolveStorageKey(key));
  }

  async size(key: string, signal?: AbortSignal) {
    signal?.throwIfAborted();
    try {
      const entry = await stat(resolveStorageKey(key));
      return entry.isFile() ? entry.size : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string) {
    await rm(resolveStorageKey(key), { force: true });
  }

  openReadStream(key: string, signal?: AbortSignal) {
    return createReadStream(resolveStorageKey(key), { signal });
  }
}
