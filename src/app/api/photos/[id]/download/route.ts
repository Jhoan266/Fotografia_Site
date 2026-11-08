import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { readStoredFile } from "@/lib/storage";
import path from "path";

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
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { project: { include: { client: true } } },
  });
  if (!photo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (
    session.user.role === "CLIENT" &&
    (photo.project.client.userId !== session.user.id ||
      photo.project.status !== "DELIVERED")
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const data = await readStoredFile(photo.storageKey);
  const filename = photo.filename || path.basename(photo.storageKey);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
