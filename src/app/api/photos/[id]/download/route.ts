import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readStoredFile } from "@/lib/storage";
import { contentDispositionAttachment } from "@/lib/security";
import { getAccessiblePhoto } from "@/modules/photos/access";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const photo = await getAccessiblePhoto(session.user, id);
  if (!photo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const data = await readStoredFile(photo.storageKey);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": contentDispositionAttachment(photo.filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "missing_file" }, { status: 404 });
  }
}
