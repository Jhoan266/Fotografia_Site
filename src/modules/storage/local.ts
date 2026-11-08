import { access, mkdir, readFile, writeFile } from "fs/promises";
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

  async exists(key: string) {
    try {
      await access(resolveStorageKey(key));
      return true;
    } catch {
      return false;
    }
  }

  openReadStream(key: string) {
    return createReadStream(resolveStorageKey(key));
  }
}
