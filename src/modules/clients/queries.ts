import { prisma } from "@/lib/prisma";

export function listClientsForAdmin() {
  return prisma.clientProfile.findMany({
    include: { user: true, _count: { select: { projects: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function listClientOptions() {
  return prisma.clientProfile.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}
