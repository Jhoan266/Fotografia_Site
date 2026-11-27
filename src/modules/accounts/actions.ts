"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSession, endSession } from "@/lib/session";
import { fitsPasswordLimit, validNewPassword } from "@/lib/password-policy";
import { rateLimit } from "@/lib/rate-limit";

export type PasswordChangeState = { error?: "unauthorized" | "invalid" | "current" | "same" | "rate" };

export async function changePassword(locale: string, _previous: PasswordChangeState, form: FormData): Promise<PasswordChangeState> {
  const session = await getAuthenticatedSession(true);
  if (!session) return { error: "unauthorized" };
  const origin = (await headers()).get("origin");
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin || !configured || origin !== new URL(configured).origin) return { error: "unauthorized" };

  const current = form.get("currentPassword"), next = form.get("newPassword"), confirmation = form.get("confirmation");
  if (typeof current !== "string" || !fitsPasswordLimit(current) ||
      typeof next !== "string" || !validNewPassword(next) || next !== confirmation) return { error: "invalid" };
  if (current === next) return { error: "same" };
  const limit = await rateLimit(`password-change:${session.user.id}`, 6, 15 * 60_000);
  if (!limit.ok) return { error: "rate" };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user || !await bcrypt.compare(current, user.passwordHash)) return { error: "current" };
  const passwordHash = await bcrypt.hash(next, 12);
  const changed = await prisma.$transaction(async tx => {
    const result = await tx.user.updateMany({
      where: { id: session.user.id, passwordHash: user.passwordHash,
        sessions: { some: { tokenHash: session.tokenHash, expiresAt: { gt: new Date() },
          ...(session.user.role === "ADMIN" ? { adminVerified: true } : {}) } } },
      data: { passwordHash, mustChangePassword: false },
    });
    if (result.count !== 1) return false;
    await tx.authSession.deleteMany({ where: { userId: session.user.id } });
    return true;
  });
  if (!changed) return { error: "unauthorized" };
  await endSession();
  const safeLocale = ["es", "en", "fr"].includes(locale) ? locale : "es";
  redirect(`/${safeLocale}/login?passwordChanged=1`);
}
