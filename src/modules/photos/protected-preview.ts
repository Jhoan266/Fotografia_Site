import sharp from "sharp";
import path from "node:path";
import { createHash } from "node:crypto";
import { getStorageProvider } from "@/modules/storage";
import { MAX_UPLOAD_FILE_BYTES } from "@/lib/security";
import { DeliveryBusy } from "./delivery";

export const PREVIEW_EDGE = 1200;
export const LARGE_PREVIEW_EDGE = 2560;
const FONT = path.join(process.cwd(), "public/fonts/NotoSans.ttf");
const escapeMarkup = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export async function renderProtectedPreview(input: Buffer, text: string, code: string, large = false, watermark = true) {
  const base = await sharp(input, { failOn: "error", limitInputPixels: 64_000_000 })
    .rotate().resize({ width: large ? LARGE_PREVIEW_EDGE : PREVIEW_EDGE, height: large ? LARGE_PREVIEW_EDGE : PREVIEW_EDGE,
      fit: "inside", withoutEnlargement: true }).png().timeout({ seconds: 20 }).toBuffer({ resolveWithObject: true });
  if (!watermark) {
    const data = await sharp(base.data).webp({ lossless: true }).timeout({ seconds: 20 }).toBuffer();
    if (data.length > MAX_UPLOAD_FILE_BYTES) throw new Error("Preview exceeds delivery limit");
    return data;
  }
  const label = `${escapeMarkup(text.normalize("NFKC").replace(/[\u0000-\u001f]/g, " ").slice(0, 60))}\nCLIENTE ${escapeMarkup(code)}`;
  const glyphs = await sharp({ text: { text: `<span foreground="#ffffff">${label}</span>`, font: "Noto Sans 22", fontfile: FONT, rgba: true, width: 380, align: "centre" } })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Soft white letters with a dark offset remain legible on light and dark photos.
  const white = Buffer.from(glyphs.data), black = Buffer.from(glyphs.data);
  for (let i = 0; i < white.length; i += 4) {
    white[i + 3] = Math.round(white[i + 3] * 0.32);
    black[i] = black[i + 1] = black[i + 2] = 0;
    black[i + 3] = Math.round(black[i + 3] * 0.22);
  }
  const raw = { width: glyphs.info.width, height: glyphs.info.height, channels: 4 as const };
  const tile = await sharp({ create: { width: glyphs.info.width + 52, height: glyphs.info.height + 95, channels: 4, background: "#00000000" } })
    .composite([{ input: black, raw, left: 27, top: 48 }, { input: white, raw, left: 26, top: 47 }])
    .png().toBuffer();
  const rotated = await sharp(tile).rotate(-25, { background: "#00000000" }).resize({ width: base.info.width, height: base.info.height, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const data = await sharp(base.data).composite([{ input: rotated, tile: true }])
    .webp({ lossless: true }).timeout({ seconds: 20 }).toBuffer();
  if (data.length > MAX_UPLOAD_FILE_BYTES) throw new Error("Preview exceeds delivery limit");
  return data;
}

let active = 0;
const waiters: { signal: AbortSignal; resolve: () => void; reject: (reason: unknown) => void; abort: () => void }[] = [];
async function acquire(signal: AbortSignal) {
  signal.throwIfAborted();
  if (active < 2) { active++; return; }
  if (waiters.length >= 24) throw new DeliveryBusy();
  await new Promise<void>((resolve, reject) => {
    const entry = { signal, resolve, reject, abort: () => {
      const i = waiters.indexOf(entry); if (i >= 0) waiters.splice(i, 1);
      reject(signal.reason);
    } };
    waiters.push(entry); signal.addEventListener("abort", entry.abort, { once: true });
    if (signal.aborted) entry.abort();
  });
}
function release() {
  const entry = waiters.shift();
  if (entry) { entry.signal.removeEventListener("abort", entry.abort); entry.resolve(); }
  else active--;
}

const cache = new Map<string, { data: Buffer; expires: number }>();
let cacheBytes = 0;
const pending = new Map<string, Promise<Buffer>>();

export async function readProtectedPreview(key: string, text: string, code: string, large: boolean, signal: AbortSignal, watermark = true) {
  const cacheKey = createHash("sha256").update(JSON.stringify([key, text, code, large, watermark])).digest("hex");
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) { cache.delete(cacheKey); cache.set(cacheKey, hit); return hit.data; }
  const existing = pending.get(cacheKey);
  if (existing) return existing;
  if (pending.size >= 26) throw new DeliveryBusy();
  const work = (async () => {
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    await acquire(deadline);
    try {
      deadline.throwIfAborted();
      const storage = getStorageProvider();
      const size = await storage.size(key, deadline);
      if (size === null || size > MAX_UPLOAD_FILE_BYTES) throw new Error("Invalid preview source");
      const stream = await storage.openReadStream(key, deadline);
      const chunks: Buffer[] = []; let bytes = 0;
      try { for await (const chunk of stream) { deadline.throwIfAborted(); bytes += chunk.length; if (bytes > MAX_UPLOAD_FILE_BYTES) throw new Error("Preview source too large"); chunks.push(chunk); } }
      finally { stream.destroy(); }
      const data = await renderProtectedPreview(Buffer.concat(chunks), text, code, large, watermark);
      deadline.throwIfAborted();
      const old = cache.get(cacheKey); if (old) { cacheBytes -= old.data.length; cache.delete(cacheKey); }
      while (cache.size && (cacheBytes + data.length > 48 * 1024 * 1024 || cache.size >= 64)) {
        const first = cache.keys().next().value!; cacheBytes -= cache.get(first)!.data.length; cache.delete(first);
      }
      cache.set(cacheKey, { data, expires: Date.now() + 5 * 60_000 }); cacheBytes += data.length;
      return data;
    } finally { release(); }
  })();
  pending.set(cacheKey, work);
  try { return await work; } finally { pending.delete(cacheKey); }
}
