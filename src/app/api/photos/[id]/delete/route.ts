import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hasValidSameOrigin } from "@/lib/security";
import { deleteStoredFile } from "@/lib/storage";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id || id.length > 128) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      storageKey: true,
      thumbKey: true,
      sortOrder: true,
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.photo.delete({ where: { id } }),
    prisma.photo.updateMany({
      where: {
        projectId: photo.projectId,
        sortOrder: { gt: photo.sortOrder },
      },
      data: { sortOrder: { decrement: 1 } },
    }),
  ]);

  const keys = [photo.storageKey, photo.thumbKey].filter((value): value is string => Boolean(value));
  const cleanup = await Promise.allSettled(keys.map((key) => deleteStoredFile(key)));
  const orphaned = cleanup.filter((result) => result.status === "rejected").length;

  return NextResponse.json({ deleted: true, orphanedObjects: orphaned });
}
