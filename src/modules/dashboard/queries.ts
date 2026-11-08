import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function getAdminDashboard() {
  const user = await requireRole("ADMIN");
  if (!user) throw new Error("Unauthorized");

  const [
    clients,
    projects,
    photos,
    drafts,
    delivered,
    archived,
    recentProjects,
    pendingProjects,
    upcomingSessions,
    favorites,
    selections,
    comments,
  ] = await prisma.$transaction([
    prisma.clientProfile.count(),
    prisma.project.count(),
    prisma.photo.count(),
    prisma.project.count({ where: { status: "DRAFT" } }),
    prisma.project.count({ where: { status: "DELIVERED" } }),
    prisma.project.count({ where: { status: "ARCHIVED" } }),
    prisma.project.findMany({
      take: 6,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        sessionDate: true,
        client: { select: { user: { select: { name: true } } } },
        _count: { select: { photos: true } },
        photos: {
          take: 1,
          orderBy: { sortOrder: "asc" },
          select: { thumbKey: true, storageKey: true },
        },
      },
    }),
    prisma.project.findMany({
      where: { status: "DRAFT" },
      take: 3,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        _count: { select: { photos: true } },
        client: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.project.findMany({
      where: { status: { not: "ARCHIVED" }, sessionDate: { gte: new Date() } },
      take: 3,
      orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        sessionDate: true,
        client: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.favorite.count(),
    prisma.selection.count({ where: { status: "SELECTED" } }),
    prisma.comment.count(),
  ]);
  return {
    clients,
    projects,
    photos,
    drafts,
    delivered,
    archived,
    recentProjects,
    pendingProjects,
    upcomingSessions,
    favorites,
    selections,
    comments,
  };
}
