import { prisma } from "@/lib/prisma";

export function listProjectsForAdmin() {
  return prisma.project.findMany({
    include: {
      client: { include: { user: true } },
      _count: { select: { photos: { where: { trashedAt: null } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getProjectForAdmin(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
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
