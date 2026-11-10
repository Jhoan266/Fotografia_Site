import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { readStoredFile } from "@/lib/storage";
import { contentDispositionAttachment } from "@/lib/security";
import { getAccessiblePhoto } from "@/modules/photos/access";

import { DeliveryBusy, readDeliveryPhoto } from "@/modules/photos/delivery";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const photo = await getAccessiblePhoto(user, id);
  if (!photo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const delivered = user.role === "CLIENT" ? await readDeliveryPhoto(photo.storageKey, request.signal) : null;
    const data = delivered?.data ?? await readStoredFile(photo.storageKey);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": delivered ? `image/${delivered.format}` : "application/octet-stream",
        "Content-Disposition": contentDispositionAttachment(photo.filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DeliveryBusy) return NextResponse.json({ error: "delivery_busy" }, { status: 429 });
    return NextResponse.json({ error: "missing_file" }, { status: 404 });
  }
}
