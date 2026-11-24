import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { previewCode } from "./preview-identity";

export async function recordClientDelivery(actorId: string, projectId: string, kind: "PREVIEW" | "DOWNLOAD" | "ZIP", filename: string, photoId: string | null, photoCount = 1) {
  const now = new Date();
  const id = createHash("sha256").update(JSON.stringify([actorId, projectId, photoId, kind, now.toISOString().slice(0, 13)])).digest("hex");
  await prisma.photoDeliveryLog.upsert({ where: { id },
    create: { id, actorId, projectId, clientCode: previewCode(actorId, projectId), kind, filename, photoId, photoCount, firstAt: now, lastAt: now },
    update: { requests: { increment: 1 }, lastAt: now, photoCount },
  });
}
