"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function createProjectFromForm(locale: string, formData: FormData) {
  const admin = await requireRole("ADMIN");
  if (!admin) return { ok: false as const, error: "unauthorized" as const };

  const title = String(formData.get("title") || "").trim();
  const descriptionRaw = String(formData.get("description") || "").trim();
  const clientId = String(formData.get("clientId") || "").trim();
  const sessionDateRaw = String(formData.get("sessionDate") || "").trim();
  const packIds = [...new Set(formData.getAll("packIds").map(String))];

  if (!title || title.length > 160 || descriptionRaw.length > 4000 || !clientId || clientId.length > 128) {
    return { ok: false as const, error: "invalid_input" as const };
  }

  const sessionDate = sessionDateRaw ? new Date(`${sessionDateRaw}T12:00:00.000Z`) : null;
  if (sessionDate && Number.isNaN(sessionDate.getTime())) {
    return { ok: false as const, error: "invalid_date" as const };
  }

  const [client, allowedPacks] = await Promise.all([
    prisma.clientProfile.findUnique({ where: { id: clientId }, select: { id: true } }),
    packIds.length
      ? prisma.pack.findMany({
          where: { id: { in: packIds }, active: true },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  if (!client || allowedPacks.length !== packIds.length) {
    return { ok: false as const, error: "invalid_relation" as const };
  }

  const created = await prisma.project.create({
    data: {
      title,
      description: descriptionRaw || null,
      clientId: client.id,
      sessionDate,
      packs: {
        create: allowedPacks.map((pack) => ({ packId: pack.id })),
      },
    },
    select: { id: true },
  });

  redirect(`/${locale}/admin/projects/${created.id}`);
}

export async function publishProject(locale: string, projectId: string) {
  const admin = await requireRole("ADMIN");
  if (!admin) return { ok: false as const, error: "unauthorized" as const };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) return { ok: false as const, error: "not_found" as const };

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "DELIVERED" },
  });

  revalidatePath(`/${locale}/admin/projects/${projectId}`);
  return { ok: true as const };
}
