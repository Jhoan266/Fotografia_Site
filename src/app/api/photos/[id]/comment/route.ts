import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasValidSameOrigin } from "@/lib/security";
import { getAccessiblePhoto } from "@/modules/photos/access";

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

  const body = await request.json().catch(() => null);
  if (!body || typeof body.body !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const text = body.body.trim();
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "invalid_comment" }, { status: 400 });
  }

  const photo = await getAccessiblePhoto(session.user, id);
  if (!photo) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const created = await prisma.comment.create({
    data: { userId: session.user.id, photoId: id, body: text },
    include: { user: true },
  });

  return NextResponse.json({
    comment: {
      id: created.id,
      body: created.body,
      author: created.user.name,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
