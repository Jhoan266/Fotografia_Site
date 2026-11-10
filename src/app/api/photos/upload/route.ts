import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { removePhotoFiles, savePhoto } from "@/modules/storage/photo-storage";
import { readUploadForm, UploadBodyTimedOut, UploadBodyTooLarge } from "@/modules/photos/upload-body";
import {
  hasValidSameOrigin,
  isAllowedImageType,
  MAX_UPLOAD_FILE_BYTES,
  MAX_UPLOAD_FILES,
  MAX_UPLOAD_REQUEST_BYTES,
  sanitizeFilename,
} from "@/lib/security";

export const runtime = "nodejs";

let uploadInProgress = false;

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!request.headers.has("origin") || !hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  if (uploadInProgress) {
    return NextResponse.json({ error: "upload_busy" }, {
      status: 429,
      headers: { "Retry-After": "5" },
    });
  }

  uploadInProgress = true;
  try {
    return await processUpload(request);
  } finally {
    uploadInProgress = false;
  }
}

async function processUpload(request: Request) {
  let form: FormData;
  try {
    form = await readUploadForm(request, MAX_UPLOAD_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof UploadBodyTooLarge) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    if (error instanceof UploadBodyTimedOut) {
      return NextResponse.json({ error: "upload_timeout" }, { status: 408 });
    }
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
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

  const staged: (Awaited<ReturnType<typeof savePhoto>> & { filename: string })[] = [];
  try {
    for (const file of files) {
      const stored = await savePhoto(Buffer.from(await file.arrayBuffer()));
      staged.push({ ...stored, filename: sanitizeFilename(file.name) });
    }

    const created = await prisma.$transaction(async (tx) => {
      const { _max } = await tx.photo.aggregate({ where: { projectId }, _max: { sortOrder: true } });
      const start = (_max.sortOrder ?? -1) + 1;
      return tx.photo.createManyAndReturn({
        data: staged.map((photo, index) => ({ ...photo, projectId, sortOrder: start + index })),
        select: { id: true, sortOrder: true },
      });
    });

    const ids = created.sort((a, b) => a.sortOrder - b.sortOrder).map((photo) => photo.id);
    return NextResponse.json({ count: ids.length, ids });
  } catch (error) {
    await removePhotoFiles(staged.flatMap(({ storageKey, thumbKey }) => [storageKey, thumbKey]));
    console.error("Photo upload failed", error);
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }
}
