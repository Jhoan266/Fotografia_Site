import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isGalleryAvailable } from "./delivery-policy";

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
    isGalleryAvailable(project);

  return canAccess ? project : null;
}
