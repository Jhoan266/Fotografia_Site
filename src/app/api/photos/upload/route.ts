import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { savePhoto } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const projectId = String(form.get("projectId") || "");
  if (!projectId) {
    return NextResponse.json({ error: "missing_project" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }

  const existing = await prisma.photo.count({ where: { projectId } });
  let order = existing;
  const created = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await savePhoto(buffer, file.name);
    const photo = await prisma.photo.create({
      data: {
        projectId,
        storageKey: stored.storageKey,
        thumbKey: stored.thumbKey,
        filename: file.name,
        width: stored.width,
        height: stored.height,
        sortOrder: order++,
      },
    });
    created.push(photo.id);
  }

  return NextResponse.json({ count: created.length, ids: created });
}
