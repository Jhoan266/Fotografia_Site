"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireRole } from "@/lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createClientFromForm(locale: string, formData: FormData) {
  const admin = await requireRole("ADMIN");
  if (!admin) return { ok: false as const, error: "unauthorized" as const };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phoneRaw = String(formData.get("phone") || "").trim();
  const notesRaw = String(formData.get("notes") || "").trim();
  const password = String(formData.get("password") || "");

  if (
    !name ||
    name.length > 120 ||
    !EMAIL_RE.test(email) ||
    email.length > 254 ||
    password.length < 12 ||
    password.length > 128 ||
    phoneRaw.length > 40 ||
    notesRaw.length > 2000
  ) {
    return { ok: false as const, error: "invalid_input" as const };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { ok: false as const, error: "email_in_use" as const };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "CLIENT",
      clientProfile: {
        create: {
          phone: phoneRaw || null,
          notes: notesRaw || null,
        },
      },
    },
  });

  revalidatePath(`/${locale}/admin/clients`);
  return { ok: true as const };
}
