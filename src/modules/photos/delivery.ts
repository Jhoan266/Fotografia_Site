import sharp from "sharp";
import type { Readable } from "node:stream";
import { MAX_UPLOAD_FILE_BYTES } from "@/lib/security";
import { getStorageProvider } from "@/modules/storage";

let active = 0;

export class DeliveryBusy extends Error {}

export async function createDeliveryCopy(input: AsyncIterable<Buffer>, signal: AbortSignal) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of input) {
    signal.throwIfAborted();
    size += chunk.byteLength;
    if (size > MAX_UPLOAD_FILE_BYTES) throw new Error("Delivery source exceeds the size limit.");
    chunks.push(chunk);
  }
  signal.throwIfAborted();

  const image = sharp(Buffer.concat(chunks, size), { failOn: "error", limitInputPixels: 64_000_000 });
  const { format } = await image.metadata();
  if (format !== "jpeg" && format !== "png" && format !== "webp") {
    throw new Error("Unsupported delivery format.");
  }

  // Sharp strips source metadata by default. Bake EXIF orientation into the pixels.
  const data = await image.rotate().toFormat(format).timeout({ seconds: 20 }).toBuffer();
  signal.throwIfAborted();
  if (data.byteLength > MAX_UPLOAD_FILE_BYTES) throw new Error("Delivery copy exceeds the size limit.");
  return { data, format };
}

export async function readDeliveryPhoto(key: string, signal: AbortSignal) {
  if (active >= 2) throw new DeliveryBusy();
  active++;
  let input: Readable | undefined;
  try {
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    input = await getStorageProvider().openReadStream(key, deadline);
    return await createDeliveryCopy(input, deadline);
  } finally {
    input?.destroy();
    active--;
  }
}
