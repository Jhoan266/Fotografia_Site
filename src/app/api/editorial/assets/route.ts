import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { requireEditor } from "@/modules/editorial/access";
import { readUploadForm } from "@/modules/photos/upload-body";
import { hasValidSameOrigin, sanitizeFilename } from "@/lib/security";
import { getStorageProvider } from "@/modules/storage";
import { prisma } from "@/lib/prisma";

let busy = false;
export async function POST(request: NextRequest) {
  if (!(await requireEditor()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!request.headers.has("origin") || !hasValidSameOrigin(request))
    return NextResponse.json({ error: "origin" }, { status: 403 });
  if (busy) return NextResponse.json({ error: "busy" }, { status: 429 });
  busy = true;
  const storage = getStorageProvider();
  let key: string | undefined;
  try {
    const form = await readUploadForm(request, 10 * 1024 * 1024 + 65536);
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 10 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new Error("Invalid image");
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 64_000_000,
      failOn: "error",
    });
    const { format } = await image.metadata();
    if (!format || !["jpeg", "png", "webp"].includes(format))
      throw new Error("Invalid format");
    const data = await image
      .rotate()
      .resize({ width: 3000, withoutEnlargement: true })
      .webp({ quality: 90 })
      .timeout({ seconds: 20 })
      .toBuffer();
    key = "editorial/" + randomUUID() + ".webp";
    await storage.put(key, data);
    const asset = await prisma.editorialAsset.create({
      data: {
        storageKey: key,
        mime: "image/webp",
        filename: sanitizeFilename(file.name),
      },
    });
    return NextResponse.json({ url: "/api/editorial/assets/" + asset.id });
  } catch {
    if (key) await storage.delete(key).catch(() => undefined);
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  } finally {
    busy = false;
  }
}
