import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function getAdminDashboard() {
  const user = await requireRole("ADMIN");
  if (!user) throw new Error("Unauthorized");

  const [clients, projects, photos, drafts, delivered, archived, recentProjects] = await prisma.$transaction([
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
        id: true, title: true, status: true, sessionDate: true,
        client: { select: { user: { select: { name: true } } } },
        _count: { select: { photos: true } },
      },
    }),
  ]);
  return { clients, projects, photos, drafts, delivered, archived, recentProjects };
}
