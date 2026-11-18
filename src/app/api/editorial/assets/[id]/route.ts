import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/modules/editorial/access";
import { getStorageProvider } from "@/modules/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[a-z0-9-]{1,100}$/i.test(id))
    return new NextResponse(null, { status: 404 });
  const url = "/api/editorial/assets/" + id;
  const published = await prisma.editorialModule.findMany({
    where: { id: { endsWith: "/media" } },
    select: { published: true },
  });
  const visible = published.some(
    (row) =>
      row.published &&
      typeof row.published === "object" &&
      Object.values(row.published).includes(url),
  );
  if (!visible && !(await requireEditor()))
    return new NextResponse(null, { status: 404 });
  const asset = await prisma.editorialAsset.findUnique({ where: { id } });
  if (!asset) return new NextResponse(null, { status: 404 });
  try {
    const data = await getStorageProvider().get(asset.storageKey);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": asset.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
