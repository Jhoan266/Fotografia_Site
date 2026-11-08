"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getAccessibleProject } from "@/modules/projects/access";

export async function createProjectOrder(projectId: string, packId: string) {
  const user = await requireUser();
  if (!user) return { ok: false as const, error: "unauthorized" as const };

  const project = await getAccessibleProject(user, projectId);
  if (!project) return { ok: false as const, error: "forbidden" as const };

  const projectPack = await prisma.projectPack.findUnique({
    where: {
      projectId_packId: { projectId, packId },
    },
    include: { pack: true },
  });

  if (!projectPack?.pack.active) {
    return { ok: false as const, error: "invalid_pack" as const };
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      projectId,
      packId,
      amountCents: projectPack.pack.priceCents,
      currency: projectPack.pack.currency,
      status: "UNPAID",
    },
    select: { id: true },
  });

  return { ok: true as const, orderId: order.id };
}
