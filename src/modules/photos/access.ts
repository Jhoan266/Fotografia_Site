import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AccessUser = {
  id: string;
  role: Role;
};

export async function getAccessiblePhoto(user: AccessUser, photoId: string) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: {
      project: {
        include: {
          client: true,
        },
      },
    },
  });

  if (!photo) return null;
  if (user.role === "ADMIN") return photo;

  const canAccess =
    photo.project.client.userId === user.id &&
    photo.project.status === "DELIVERED";

  return canAccess ? photo : null;
}

export async function assertPhotoExists(photoId: string) {
  return prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true },
  });
}
