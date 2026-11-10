import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { getAuthenticatedSession, hasRecentVaultVerification } from "@/lib/session";

export async function changePhotoTrashState(request: NextRequest, id: string, trash: boolean) {
  const session = await getAuthenticatedSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!request.headers.has("origin") || !hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  if (!hasRecentVaultVerification(session)) {
    return NextResponse.json({ error: "verification_required" }, { status: 403 });
  }
  if (!id || id.length > 128) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const changed = await prisma.$transaction(async (tx) => {
    const [photo] = await tx.photo.updateManyAndReturn({
      where: { id, trashedAt: trash ? null : { not: null } },
      data: { trashedAt: trash ? new Date() : null },
      select: { projectId: true },
    });
    if (!photo) return false;

    await tx.photoAuditEvent.create({
      data: {
        actorId: session.user.id,
        projectId: photo.projectId,
        photoId: id,
        photoCount: 1,
        action: trash ? "PHOTO_TRASHED" : "PHOTO_RESTORED",
      },
    });
    return true;
  });

  if (!changed) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ trashed: trash });
}
