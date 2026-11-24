import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { hasValidSameOrigin } from "@/lib/security";
import { readJsonBody, jsonBodyErrorStatus } from "@/lib/json-body";
import { parseOrganizationChange } from "@/modules/projects/organization-input";
import { rateLimit } from "@/lib/rate-limit";

class InvalidOrganization extends Error {}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!request.headers.has("origin") || !hasValidSameOrigin(request))
    return NextResponse.json({ error: "origin" }, { status: 403 });
  if (!(await rateLimit("organization:" + user.id, 120, 60_000)).ok)
    return NextResponse.json({ error: "busy" }, { status: 429 });
  const { id } = await context.params;
  if (!id || id.length > 128) return NextResponse.json({ error: "invalid" }, { status: 400 });
  let change;
  try { change = parseOrganizationChange(await readJsonBody(request, 80 * 1024)); }
  catch (error) { return NextResponse.json({ error: "invalid_body" }, { status: jsonBodyErrorStatus(error) }); }
  if (!change) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const result = await prisma.$transaction(async tx => {
      // Serialize organizational changes within a session, including album deletion.
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Project" WHERE "id" = ${id} FOR UPDATE`;
      if (!rows.length) return null;
      if (change.action === "create") {
        if (await tx.galleryAlbum.count({ where: { projectId: id } }) >= 100) throw new InvalidOrganization();
        const last = await tx.galleryAlbum.aggregate({ where: { projectId: id }, _max: { sortOrder: true } });
        return tx.galleryAlbum.create({ data: { projectId: id, name: change.name, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
      }
      if (change.action === "cover") {
        if (change.photoId && !(await tx.photo.findFirst({ where: { id: change.photoId, projectId: id, trashedAt: null } })))
          throw new InvalidOrganization();
        await tx.project.update({ where: { id }, data: { coverPhotoId: change.photoId } });
      } else if (change.action === "reorder") {
        const albums = await tx.galleryAlbum.findMany({ where: { projectId: id }, select: { id: true } });
        if (albums.length !== change.albumIds.length || albums.some(a => !change.albumIds.includes(a.id))) throw new InvalidOrganization();
        for (const [sortOrder, albumId] of change.albumIds.entries())
          await tx.galleryAlbum.update({ where: { id: albumId }, data: { sortOrder } });
      } else {
        if (change.albumId && !(await tx.galleryAlbum.findFirst({ where: { id: change.albumId, projectId: id } })))
          throw new InvalidOrganization();
        if (change.action === "rename") {
          await tx.galleryAlbum.update({ where: { id: change.albumId }, data: { name: change.name } });
        } else if (change.action === "delete") {
          // Deleting an album never deletes its files, selections, or comments.
          await tx.photo.updateMany({ where: { projectId: id, albumId: change.albumId }, data: { albumId: null } });
          await tx.galleryAlbum.delete({ where: { id: change.albumId } });
        } else {
          const count = await tx.photo.count({ where: { id: { in: change.photoIds }, projectId: id, trashedAt: null } });
          if (count !== change.photoIds.length) throw new InvalidOrganization();
          await tx.photo.updateMany({ where: { id: { in: change.photoIds }, projectId: id, trashedAt: null }, data: { albumId: change.albumId } });
        }
      }
      return { ok: true };
    }, { timeout: 15_000 });
    return NextResponse.json(result ?? { error: "not_found" }, { status: result ? 200 : 404 });
  } catch (error) {
    if (error instanceof InvalidOrganization) return NextResponse.json({ error: "invalid_relation" }, { status: 400 });
    console.error("Gallery organization failed");
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
