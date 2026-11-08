import { NextRequest, NextResponse } from "next/server";
import { readStoredFile } from "@/lib/storage";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import path from "path";

export const runtime = "nodejs";

function contentTypeFor(key: string) {
  const ext = path.extname(key).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { path: parts } = await context.params;
  if (!Array.isArray(parts) || parts.length < 2 || parts.length > 3) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const key = parts.join("/");
  if (key.length > 300) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const photo = await prisma.photo.findFirst({
    where: { OR: [{ storageKey: key }, { thumbKey: key }] },
    include: { project: { include: { client: true } } },
  });
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (
    session.user.role === "CLIENT" &&
    (photo.project.client.userId !== session.user.id || photo.project.status !== "DELIVERED")
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const data = await readStoredFile(key);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(key),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: "missing_file" }, { status: 404 });
  }
}
