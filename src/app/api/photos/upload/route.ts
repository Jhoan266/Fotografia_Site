import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { savePhoto } from "@/lib/storage";
import {
  hasValidSameOrigin,
  isAllowedImageType,
  MAX_UPLOAD_FILE_BYTES,
  MAX_UPLOAD_FILES,
  MAX_UPLOAD_REQUEST_BYTES,
  sanitizeFilename,
} from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength && contentLength > MAX_UPLOAD_REQUEST_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  const form = await request.formData();
  const projectId = String(form.get("projectId") || "").trim();
  if (!projectId || projectId.length > 128) {
    return NextResponse.json({ error: "missing_project" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }
  if (files.length > MAX_UPLOAD_FILES) {
    return NextResponse.json({ error: "too_many_files" }, { status: 400 });
  }

  for (const file of files) {
    if (!isAllowedImageType(file.type)) {
      return NextResponse.json({ error: "unsupported_file_type" }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_FILE_BYTES) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 413 });
    }
  }

  const existing = await prisma.photo.count({ where: { projectId } });
  let order = existing;
  const created: string[] = [];

  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await savePhoto(buffer, file.name);
      const photo = await prisma.photo.create({
        data: {
          projectId,
          storageKey: stored.storageKey,
          thumbKey: stored.thumbKey,
          filename: sanitizeFilename(file.name),
          width: stored.width,
          height: stored.height,
          sortOrder: order++,
        },
      });
      created.push(photo.id);
    }
  } catch (error) {
    console.error("Photo upload failed", error);
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  return NextResponse.json({ count: created.length, ids: created });
}
