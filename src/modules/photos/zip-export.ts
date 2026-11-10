import { ZipArchive } from "archiver";
import { once } from "node:events";
import { Readable } from "node:stream";
import { sanitizeFilename } from "@/lib/security";
import type { StorageProvider } from "@/modules/storage/types";

export const MAX_ZIP_PHOTOS = 500;
export const MAX_ZIP_BYTES = 2 * 1024 ** 3;
export const ZIP_TIMEOUT_MS = 10 * 60_000;

type PhotoEntry = { filename: string; storageKey: string };
type ZipEntry = { name: string; key: string; size: number };

const activeUsers = new Set<string>();

export function reserveZipExport(userId: string) {
  if (activeUsers.has(userId) || activeUsers.size >= 2) return null;
  activeUsers.add(userId);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeUsers.delete(userId);
  };
}

export class ZipLimitExceeded extends Error {}

export async function planZip(
  photos: PhotoEntry[],
  storage: Pick<StorageProvider, "size">,
  signal: AbortSignal,
  maxBytes = MAX_ZIP_BYTES,
) {
  if (photos.length > MAX_ZIP_PHOTOS) throw new ZipLimitExceeded();
  let total = 0;
  const entries: ZipEntry[] = [];
  const names = new Set<string>();

  for (const photo of photos) {
    signal.throwIfAborted();
    const size = await storage.size(photo.storageKey, signal);
    if (size === null) continue;
    total += size;
    if (total > maxBytes) throw new ZipLimitExceeded();

    const base = sanitizeFilename(photo.filename);
    const dot = base.lastIndexOf(".");
    let name = base;
    for (let n = 2; names.has(name); n++) {
      name = dot > 0 ? `${base.slice(0, dot)}-${n}${base.slice(dot)}` : `${base}-${n}`;
    }
    names.add(name);
    entries.push({ name, key: photo.storageKey, size });
  }
  return entries;
}

export function streamZip(
  entries: ZipEntry[],
  storage: Pick<StorageProvider, "openReadStream">,
  signal: AbortSignal,
  release: () => void,
) {
  signal.throwIfAborted();
  const archive = new ZipArchive({ store: true });
  const stopped = new AbortController();
  const sourceSignal = AbortSignal.any([signal, stopped.signal]);
  const output = Readable.toWeb(archive, {
    strategy: { highWaterMark: 64 * 1024, size: (chunk: Uint8Array) => chunk.byteLength },
  }) as ReadableStream<Uint8Array>;
  const abort = () => {
    archive.abort();
    archive.destroy(signal.reason);
  };
  signal.addEventListener("abort", abort, { once: true });
  archive.once("close", () => {
    signal.removeEventListener("abort", abort);
    stopped.abort();
    archive.abort();
    release();
  });

  async function* readEntry(entry: ZipEntry) {
    const input = await storage.openReadStream(entry.key, sourceSignal);
    let remaining = entry.size;
    try {
      for await (const chunk of input) {
        sourceSignal.throwIfAborted();
        remaining -= chunk.byteLength;
        if (remaining < 0) throw new ZipLimitExceeded();
        yield chunk;
      }
      if (remaining !== 0) throw new Error("ZIP source size changed.");
    } finally {
      input.destroy();
    }
  }

  void (async () => {
    for (const entry of entries) {
      sourceSignal.throwIfAborted();
      const input = Readable.from(readEntry(entry), { objectMode: false });
      const complete = once(archive, "entry", { signal: sourceSignal });
      input.once("error", (error) => archive.destroy(error));
      archive.append(input, { name: entry.name });
      await complete;
    }
    await archive.finalize();
  })().catch((error) => archive.destroy(error));

  return output;
}
