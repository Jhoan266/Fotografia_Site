import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasValidSameOrigin } from "@/lib/security";

async function canAccessPhoto(userId: string, role: string, photoId: string) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { project: { include: { client: true } } },
  });
  if (!photo) return null;
  if (role === "ADMIN") return photo;
  if (photo.project.client.userId === userId && photo.project.status === "DELIVERED") return photo;
  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id || id.length > 128) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const photo = await canAccessPhoto(session.user.id, session.user.role, id);
  if (!photo) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const existing = await prisma.favorite.findUnique({
    where: { userId_photoId: { userId: session.user.id, photoId: id } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorite: false });
  }

  await prisma.favorite.create({ data: { userId: session.user.id, photoId: id } });
  return NextResponse.json({ favorite: true });
}
