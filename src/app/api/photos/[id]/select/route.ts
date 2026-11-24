import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hasValidSameOrigin } from "@/lib/security";
import { getAccessiblePhoto } from "@/modules/photos/access";
import { isGalleryAvailable } from "@/modules/projects/delivery-policy";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id || id.length > 128) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const photo = await getAccessiblePhoto(user, id);
  if (!photo) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${photo.projectId} FOR UPDATE`;
    const current = await tx.photo.findUnique({ where: { id, trashedAt: null }, include: { project: { include: { client: true } } } });
    if (!current || (user.role === "CLIENT" && (current.project.client.userId !== user.id || !isGalleryAvailable(current.project))))
      return { status: 403 };
    if (current.project.selectionConfirmedAt) return { status: 409 };
    const existing = await tx.selection.findUnique({ where: { userId_photoId: { userId: user.id, photoId: id } } });
    if (existing) await tx.selection.delete({ where: { id: existing.id } });
    else await tx.selection.create({ data: { userId: user.id, photoId: id, status: "SELECTED" } });
    const updated = await tx.project.update({ where: { id: photo.projectId }, data: { selectionVersion: { increment: 1 } } });
    return { status: 200, selected: !existing, version: updated.selectionVersion };
  });
  return NextResponse.json(result, { status: result.status });
}
