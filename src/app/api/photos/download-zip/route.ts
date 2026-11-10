import { NextRequest, NextResponse } from "next/server";
import { ZipArchive } from "archiver";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { openStoredFileStream, storedFileExists } from "@/lib/storage";
import { sanitizeFilename } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId || projectId.length > 128) {
    return NextResponse.json({ error: "missing_project" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (
    user.role === "CLIENT" &&
    (project.client.userId !== user.id || project.status !== "DELIVERED")
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let photos = await prisma.photo.findMany({
    where: {
      projectId,
      selections: { some: { userId: user.id, status: "SELECTED" } },
    },
    orderBy: { sortOrder: "asc" },
  });

  if (!photos.length) {
    photos = await prisma.photo.findMany({
      where: { projectId, favorites: { some: { userId: user.id } } },
      orderBy: { sortOrder: "asc" },
    });
  }

  if (!photos.length) {
    photos = await prisma.photo.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    });
  }

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const usedNames = new Set<string>();

  for (const photo of photos) {
    if (!(await storedFileExists(photo.storageKey))) continue;

    const baseName = sanitizeFilename(photo.filename);
    let name = baseName;
    let n = 2;
    while (usedNames.has(name)) {
      const dot = baseName.lastIndexOf(".");
      name = dot > 0
        ? `${baseName.slice(0, dot)}-${n++}${baseName.slice(dot)}`
        : `${baseName}-${n++}`;
    }
    usedNames.add(name);
    archive.append(await openStoredFileStream(photo.storageKey), { name });
  }

  void archive.finalize();

  return new NextResponse(Readable.toWeb(archive) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="seleccion-${projectId}.zip"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
