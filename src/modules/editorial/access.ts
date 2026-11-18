import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function requireEditor() {
  const user = await requireUser();
  if (!user) return null;
  const permissions = await prisma.user.findUnique({
    where: { id: user.id },
    select: { editorialDesigner: true },
  });
  return user.role === "ADMIN" || permissions?.editorialDesigner ? user : null;
}
