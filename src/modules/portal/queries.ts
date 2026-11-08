import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function getClientPortal(userId: string) {
  const user = await requireRole("CLIENT");
  if (!user || user.id !== userId) throw new Error("Unauthorized");
  const where = { client: { userId }, status: "DELIVERED" as const };
  const [projects, interactions] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [
        { sessionDate: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        sessionDate: true,
        _count: { select: { photos: true } },
        photos: {
          take: 3,
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          select: { thumbKey: true, storageKey: true },
        },
      },
    }),
    prisma.photo.findMany({
      where: {
        project: where,
        OR: [
          { favorites: { some: { userId } } },
          { selections: { some: { userId, status: "SELECTED" } } },
        ],
      },
      select: {
        projectId: true,
        favorites: { where: { userId }, select: { id: true } },
        selections: {
          where: { userId, status: "SELECTED" },
          select: { id: true },
        },
      },
    }),
  ]);
  const counts = new Map<string, { favorites: number; selected: number }>();
  for (const photo of interactions) {
    const count = counts.get(photo.projectId) ?? { favorites: 0, selected: 0 };
    count.favorites += photo.favorites.length;
    count.selected += photo.selections.length;
    counts.set(photo.projectId, count);
  }
  return projects.map((project) => ({
    ...project,
    favorites: counts.get(project.id)?.favorites ?? 0,
    selected: counts.get(project.id)?.selected ?? 0,
  }));
}
