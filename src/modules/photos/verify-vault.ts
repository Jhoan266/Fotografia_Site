"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthenticatedSession } from "@/lib/session";

export async function verifyVault(_previous: number | null, formData: FormData) {
  const password = formData.get("password");
  const session = await getAuthenticatedSession();
  if (!session || session.user.role !== "ADMIN" ||
      typeof password !== "string" || !password || password.length > 128) {
    return null;
  }

  const { ok } = await rateLimit(`vault-verification:${session.user.id}`, 5, 5 * 60_000);
  if (!ok) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;

  const now = new Date();
  const expires = new Date(now.getTime() + 5 * 60_000);
  const result = await prisma.authSession.updateMany({
    where: {
      tokenHash: session.tokenHash,
      adminVerified: true,
      expiresAt: { gt: now },
      user: { role: "ADMIN", passwordHash: user.passwordHash },
    },
    data: { vaultVerifiedUntil: expires },
  });

  return result.count === 1 ? expires.getTime() : null;
}
