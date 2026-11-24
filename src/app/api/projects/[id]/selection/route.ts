import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/session";
import { readJsonBody, jsonBodyErrorStatus } from "@/lib/json-body";
import { hasValidSameOrigin, contentDispositionAttachment } from "@/lib/security";
import { isGalleryAvailable } from "@/modules/projects/delivery-policy";
import { parseConfirmation, readSubmittedPhotos, selectionCsv, selectionText } from "@/modules/projects/selection-export";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!request.headers.has("origin") || !hasValidSameOrigin(request))
    return NextResponse.json({ error: "origin" }, { status: 403 });
  if (!(await rateLimit("selection-confirmation:" + user.id, 30, 60_000)).ok)
    return NextResponse.json({ error: "busy" }, { status: 429 });
  const { id } = await context.params;
  if (!id || id.length > 128) return NextResponse.json({ error: "invalid" }, { status: 400 });
  let body;
  try { body = await readJsonBody(request, 80 * 1024); }
  catch (error) { return NextResponse.json({ error: "invalid_body" }, { status: jsonBodyErrorStatus(error) }); }
  const reopen = body && typeof body === "object" && "action" in body && body.action === "reopen";
  const reopenVersion = body && typeof body === "object" && "version" in body ? body.version : null;
  const confirmation = parseConfirmation(body);
  if (!reopen && !confirmation) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${id} FOR UPDATE`;
    const project = await tx.project.findUnique({ where: { id }, include: { client: true } });
    if (!project) return { status: 404 };
    if (reopen) {
      if (user.role !== "ADMIN") return { status: 403 };
      if (!project.selectionConfirmedAt || reopenVersion !== project.selectionVersion) return { status: 409 };
      await tx.project.update({ where: { id }, data: { selectionConfirmedAt: null, selectionVersion: { increment: 1 } } });
      return { status: 200 };
    }
    if (user.role !== "CLIENT" || project.client.userId !== user.id || !isGalleryAvailable(project)) return { status: 403 };
    if (project.selectionConfirmedAt || project.selectionVersion !== confirmation!.version) return { status: 409 };
    const photos = await tx.photo.findMany({
      where: { projectId: id, trashedAt: null, selections: { some: { userId: user.id, status: "SELECTED" } } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, filename: true }, take: 501,
    });
    const expected = new Set(confirmation!.photoIds);
    if (!photos.length || photos.length !== expected.size || photos.some(p => !expected.has(p.id))) return { status: 409 };
    await tx.selectionSubmission.create({ data: { projectId: id, userId: user.id, version: project.selectionVersion, items: photos } });
    const confirmedAt = new Date();
    await tx.project.update({ where: { id }, data: { selectionConfirmedAt: confirmedAt } });
    return { status: 200, confirmedAt: confirmedAt.toISOString() };
  });
  return NextResponse.json(result, { status: result.status });
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireRole("ADMIN"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  if (!id || id.length > 128 || !["csv", "txt"].includes(format)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project?.selectionConfirmedAt) return NextResponse.json({ error: "not_confirmed" }, { status: 409 });
  const submission = await prisma.selectionSubmission.findUnique({ where: { projectId_version: { projectId: id, version: project.selectionVersion } } });
  if (!submission) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const items = readSubmittedPhotos(submission.items);
  return new NextResponse(format === "csv" ? selectionCsv(items) : selectionText(items), { headers: {
    "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8",
    "Content-Disposition": contentDispositionAttachment(`selection-${id}-v${submission.version}.${format}`),
    "Cache-Control": "private, no-store",
  } });
}
