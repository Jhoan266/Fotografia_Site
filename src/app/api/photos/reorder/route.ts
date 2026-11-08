import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";
  const photoIds = Array.isArray(body?.photoIds) ? body.photoIds.filter((id: unknown): id is string => typeof id === "string") : [];

  if (!projectId || projectId.length > 128 || photoIds.length > 1000) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const uniqueIds = [...new Set(photoIds)];
  if (uniqueIds.length !== photoIds.length) {
    return NextResponse.json({ error: "duplicate_ids" }, { status: 400 });
  }

  const existing = await prisma.photo.findMany({
    where: { projectId },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });

  if (existing.length !== photoIds.length) {
    return NextResponse.json({ error: "incomplete_order" }, { status: 400 });
  }

  const expected = new Set(existing.map((photo) => photo.id));
  if (photoIds.some((id) => !expected.has(id))) {
    return NextResponse.json({ error: "foreign_photo" }, { status: 400 });
  }

  await prisma.$transaction(
    photoIds.map((id, sortOrder) =>
      prisma.photo.update({
        where: { id },
        data: { sortOrder },
      }),
    ),
  );

  return NextResponse.json({ reordered: true });
}
