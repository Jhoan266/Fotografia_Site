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
    prisma.photo.count({ where: { trashedAt: null } }),
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
        _count: { select: { photos: { where: { trashedAt: null } } } },
        photos: {
          where: { trashedAt: null },
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
        _count: { select: { photos: { where: { trashedAt: null } } } },
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
    prisma.favorite.count({ where: { photo: { trashedAt: null } } }),
    prisma.selection.count({ where: { status: "SELECTED", photo: { trashedAt: null } } }),
    prisma.comment.count({ where: { photo: { trashedAt: null } } }),
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
