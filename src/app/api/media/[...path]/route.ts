import { NextRequest, NextResponse } from "next/server";
import { readStoredFile } from "@/lib/storage";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import path from "path";
import { isGalleryAvailable } from "@/modules/projects/delivery-policy";
import { DeliveryBusy, readDeliveryPhoto } from "@/modules/photos/delivery";
import { readProtectedPreview } from "@/modules/photos/protected-preview";
import { previewCode } from "@/modules/photos/preview-identity";
import { recordClientDelivery } from "@/modules/photos/delivery-log";
import { limitClientDelivery } from "@/modules/photos/client-delivery-limit";

export const runtime = "nodejs";

function contentTypeFor(key: string) {
  const ext = path.extname(key).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { path: parts } = await context.params;
  if (!Array.isArray(parts) || parts.length < 2 || parts.length > 3) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const key = parts.join("/");
  if (key.length > 300) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const photo = await prisma.photo.findFirst({
    where: { trashedAt: null, OR: [{ storageKey: key }, { thumbKey: key }] },
    include: { project: { include: { client: true } } },
  });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const isPreview = key === photo.thumbKey || !photo.thumbKey;

  if (
    user.role === "CLIENT" &&
    (photo.project.client.userId !== user.id || !isGalleryAvailable(photo.project) ||
      (!isPreview && key === photo.storageKey && !photo.project.downloadsEnabled))
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (user.role === "CLIENT") {
    const limited = await limitClientDelivery(user.id, isPreview ? "preview" : "download");
    if (limited) return limited;
  }

  try {
    if (user.role === "CLIENT" && isPreview && (photo.project.watermarkEnabled || !photo.thumbKey)) {
      const data = await readProtectedPreview(photo.storageKey, photo.project.watermarkText,
        previewCode(user.id, photo.projectId), request.nextUrl.searchParams.get("view") === "large", request.signal, photo.project.watermarkEnabled);
      await recordClientDelivery(user.id, photo.projectId, "PREVIEW", photo.filename, photo.id);
      return new NextResponse(new Uint8Array(data), { headers: {
        "Content-Type": "image/webp", "Cache-Control": "private, no-store, no-transform", "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      } });
    }
    const delivered = user.role === "CLIENT" && key === photo.storageKey
      ? await readDeliveryPhoto(key, request.signal)
      : null;
    const data = delivered?.data ?? await readStoredFile(key);
    if (user.role === "CLIENT") await recordClientDelivery(user.id, photo.projectId, isPreview ? "PREVIEW" : "DOWNLOAD", photo.filename, photo.id);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": delivered ? `image/${delivered.format}` : contentTypeFor(key),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    if (error instanceof DeliveryBusy) return NextResponse.json({ error: "delivery_busy" }, { status: 429 });
    return NextResponse.json({ error: "missing_file" }, { status: 404 });
  }
}
