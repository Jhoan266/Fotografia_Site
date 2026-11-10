import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProjectAccessUser = {
  id: string;
  role: Role;
};

export async function getAccessibleProject(user: ProjectAccessUser, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  });

  if (!project) return null;
  if (user.role === "ADMIN") return project;

  const canAccess =
    project.client.userId === user.id &&
    project.status === "DELIVERED";

  return canAccess ? project : null;
}
