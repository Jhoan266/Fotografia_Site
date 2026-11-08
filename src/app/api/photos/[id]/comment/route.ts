import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const text = String(body.body || "").trim();
  if (!text) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

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

  const comment = await prisma.comment.create({
    data: {
      userId: session.user.id,
      photoId: id,
      body: text.slice(0, 2000),
    },
    include: { user: true },
  });

  return NextResponse.json({
    comment: {
      id: comment.id,
      body: comment.body,
      author: comment.user.name,
      createdAt: comment.createdAt.toISOString(),
    },
  });
}
