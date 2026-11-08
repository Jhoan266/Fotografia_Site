import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
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

  const existing = await prisma.selection.findUnique({
    where: {
      userId_photoId: { userId: session.user.id, photoId: id },
    },
  });

  if (existing) {
    await prisma.selection.delete({ where: { id: existing.id } });
    return NextResponse.json({ selected: false });
  }

  await prisma.selection.create({
    data: {
      userId: session.user.id,
      photoId: id,
      status: "SELECTED",
    },
  });
  return NextResponse.json({ selected: true });
}
