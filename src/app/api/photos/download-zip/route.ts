import { NextRequest, NextResponse } from "next/server";
import { ZipArchive } from "archiver";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSession, hasRecentVaultVerification } from "@/lib/session";
import { openStoredFileStream, storedFileExists } from "@/lib/storage";
import { hasValidSameOrigin, sanitizeFilename } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return downloadZip(request, "CLIENT");
}

export async function POST(request: NextRequest) {
  return downloadZip(request, "ADMIN");
}

async function downloadZip(request: NextRequest, role: "ADMIN" | "CLIENT") {
  const session = await getAuthenticatedSession();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (user.role !== role) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (role === "ADMIN") {
    if (!request.headers.has("origin") || !hasValidSameOrigin(request)) {
      return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
    }
    if (!hasRecentVaultVerification(session)) {
      return NextResponse.json({ error: "verification_required" }, { status: 403 });
    }
  }

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

  if (user.role === "ADMIN") {
    await prisma.photoAuditEvent.create({
      data: {
        actorId: user.id,
        projectId,
        photoCount: photos.length,
        action: "ZIP_REQUESTED",
      },
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
