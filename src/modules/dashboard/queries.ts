import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function getAdminDashboard() {
  const user = await requireRole("ADMIN");
  if (!user) throw new Error("Unauthorized");

  const [clients, projects, photos, statuses, recentProjects] = await prisma.$transaction([
    prisma.clientProfile.count(),
    prisma.project.count(),
    prisma.photo.count(),
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.project.findMany({
      take: 6,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true, title: true, status: true, sessionDate: true,
        client: { select: { user: { select: { name: true } } } },
        _count: { select: { photos: true } },
      },
    }),
  ]);
  const count = (status: "DRAFT" | "DELIVERED" | "ARCHIVED") =>
    statuses.find((item) => item.status === status)?._count._all ?? 0;
  return { clients, projects, photos, drafts: count("DRAFT"),
    delivered: count("DELIVERED"), archived: count("ARCHIVED"), recentProjects };
}
