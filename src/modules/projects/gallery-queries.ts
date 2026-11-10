import { prisma } from "@/lib/prisma";

export function getClientProjectGallery(projectId: string, userId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      photos: {
        where: { trashedAt: null },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          favorites: { where: { userId } },
          selections: { where: { userId } },
          comments: {
            include: { user: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      packs: {
        include: { pack: true },
      },
    },
  });
}
