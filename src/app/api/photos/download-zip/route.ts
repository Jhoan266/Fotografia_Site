import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSession, hasRecentVaultVerification } from "@/lib/session";
import { getStorageProvider } from "@/modules/storage";
import { MAX_ZIP_PHOTOS, ZIP_TIMEOUT_MS, ZipLimitExceeded, planZip, reserveZipExport, streamZip } from "@/modules/photos/zip-export";
import { contentDispositionAttachment, hasValidSameOrigin } from "@/lib/security";

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

  const release = reserveZipExport(user.id);
  if (!release) {
    return NextResponse.json({ error: "export_busy" }, {
      status: 429,
      headers: { "Retry-After": "5" },
    });
  }

  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(ZIP_TIMEOUT_MS)]);
  let streaming = false;
  try {
    const query = {
      take: MAX_ZIP_PHOTOS + 1,
      orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
      select: { filename: true, storageKey: true },
    };
    const activePhotos = { projectId, trashedAt: null };
    let photos = await prisma.photo.findMany({
      ...query,
      where: { ...activePhotos, selections: { some: { userId: user.id, status: "SELECTED" } } },
    });
    if (!photos.length) {
      photos = await prisma.photo.findMany({
        ...query,
        where: { ...activePhotos, favorites: { some: { userId: user.id } } },
      });
    }
    if (!photos.length) {
      photos = await prisma.photo.findMany({ ...query, where: activePhotos });
    }

    const storage = getStorageProvider();
    const entries = await planZip(photos, storage, signal);
    if (user.role === "ADMIN") {
      await prisma.photoAuditEvent.create({
        data: { actorId: user.id, projectId, photoCount: entries.length, action: "ZIP_REQUESTED" },
      });
    }

    const body = streamZip(entries, storage, signal, release, user.role === "CLIENT");
    streaming = true;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDispositionAttachment(`seleccion-${projectId}.zip`),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ZipLimitExceeded) {
      return NextResponse.json({ error: "export_too_large" }, { status: 413 });
    }
    if (signal.aborted) {
      return NextResponse.json({ error: "export_timeout" }, { status: 408 });
    }
    console.error("ZIP export could not be prepared", error);
    return NextResponse.json({ error: "export_unavailable" }, { status: 503 });
  } finally {
    if (!streaming) release();
  }
}
