"use server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
export async function setDesignerAccess(form: FormData) {
  if (!(await requireRole("ADMIN"))) throw new Error("Unauthorized");
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || email.length > 254) throw new Error("Invalid email");
  await prisma.user.updateMany({
    where: { email, role: "CLIENT" },
    data: { editorialDesigner: form.get("enabled") === "on" },
  });
}
