import { NextRequest, NextResponse } from "next/server";
import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { absoluteStoragePath } from "@/lib/storage";
import { createReadStream, existsSync } from "fs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "missing_project" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (
    session.user.role === "CLIENT" &&
    (project.client.userId !== session.user.id || project.status !== "DELIVERED")
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let photos = await prisma.photo.findMany({
    where: {
      projectId,
      selections: {
        some: { userId: session.user.id, status: "SELECTED" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  if (!photos.length) {
    photos = await prisma.photo.findMany({
      where: {
        projectId,
        favorites: { some: { userId: session.user.id } },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  if (!photos.length) {
    photos = await prisma.photo.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    });
  }

  const pass = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on("error", (err: Error) => pass.destroy(err));
  archive.pipe(pass);

  for (const photo of photos) {
    const full = absoluteStoragePath(photo.storageKey);
    if (existsSync(full)) {
      archive.append(createReadStream(full), { name: photo.filename });
    }
  }
  void archive.finalize();

  // Collect into a buffer for reliable NextResponse compatibility
  const chunks: Buffer[] = [];
  for await (const chunk of pass) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const zipBuffer = Buffer.concat(chunks);

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="seleccion-${projectId}.zip"`,
    },
  });
}
