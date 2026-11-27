import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { validNewPassword } from "@/lib/password-policy";
import { newRecoveryCode, recoveryDigest, validRecoveryCode, RECOVERY_LIFETIME_MS } from "./recovery-token";

export async function issueClientRecovery(userId: string, issuerId: string) {
  return prisma.$transaction(async tx => {
    const target = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "id" = ${userId} AND "role" = 'CLIENT' FOR UPDATE
    `;
    if (!target.length) return null;
    const code = newRecoveryCode(), expiresAt = new Date(Date.now() + RECOVERY_LIFETIME_MS);
    await tx.passwordRecoveryToken.deleteMany({ where: { userId } });
    await tx.passwordRecoveryToken.create({ data: { tokenHash: recoveryDigest(code), userId, issuerId, expiresAt } });
    return { code, expiresAt };
  });
}

export async function recoverClientPassword(code: string, password: string) {
  if (!validRecoveryCode(code) || !validNewPassword(password)) return false;
  const tokenHash = recoveryDigest(code);
  const token = await prisma.passwordRecoveryToken.findUnique({ where: { tokenHash } });
  if (!token || token.expiresAt.getTime() <= Date.now()) return false;
  const limit = await rateLimit(`password-recovery-use:${token.userId}`, 6, RECOVERY_LIFETIME_MS);
  if (!limit.ok) return false;
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.$transaction(async tx => {
    // The same user lock serializes issue, use, password change and sign-in.
    const target = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "id" = ${token.userId} AND "role" = 'CLIENT' FOR UPDATE
    `;
    if (!target.length) return false;
    const consumed = await tx.passwordRecoveryToken.deleteMany({
      where: { tokenHash, userId: token.userId, expiresAt: { gt: new Date() } },
    });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: token.userId }, data: { passwordHash, mustChangePassword: false } });
    await tx.authSession.deleteMany({ where: { userId: token.userId } });
    return true;
  });
}
