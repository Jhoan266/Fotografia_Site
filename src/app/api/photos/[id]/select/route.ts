import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hasValidSameOrigin } from "@/lib/security";
import { getAccessiblePhoto } from "@/modules/photos/access";

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

  const existing = await prisma.selection.findUnique({
    where: { userId_photoId: { userId: user.id, photoId: id } },
  });

  if (existing) {
    await prisma.selection.delete({ where: { id: existing.id } });
    return NextResponse.json({ selected: false });
  }

  await prisma.selection.create({
    data: { userId: user.id, photoId: id, status: "SELECTED" },
  });
  return NextResponse.json({ selected: true });
}
