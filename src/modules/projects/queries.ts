import { prisma } from "@/lib/prisma";

export function listProjectsForAdmin() {
  return prisma.project.findMany({
    include: {
      client: { include: { user: true } },
      coverPhoto: { select: { thumbKey: true, storageKey: true, trashedAt: true } },
      photos: { where: { trashedAt: null }, take: 1, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { thumbKey: true, storageKey: true } },
      _count: { select: { photos: { where: { trashedAt: null } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getProjectForAdmin(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      selectionSubmissions: { orderBy: { version: "desc" }, take: 1 },
      deliveryLogs: { orderBy: { lastAt: "desc" }, take: 20 },
      albums: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      client: { include: { user: true } },
      photos: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      packs: { include: { pack: true } },
    },
  });
}

export function listActivePacks() {
  return prisma.pack.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export function listDeliveredProjectsForClient(userId: string) {
  return prisma.project.findMany({
    where: {
      status: "DELIVERED",
      client: { userId },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { _count: { select: { photos: { where: { trashedAt: null } } } } },
    orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAdminDashboardMetrics() {
  const [clients, projects, photos] = await Promise.all([
    prisma.clientProfile.count(),
    prisma.project.count(),
    prisma.photo.count({ where: { trashedAt: null } }),
  ]);
  return { clients, projects, photos };
}
