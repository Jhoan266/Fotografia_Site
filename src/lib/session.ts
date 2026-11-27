import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { getSessionOptions, type AppSessionData, type SessionUser } from "@/lib/session-cookie";

async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<AppSessionData>(cookieStore, getSessionOptions());
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function startSession(user: SessionUser, adminVerified: boolean, expectedPasswordHash: string) {
  const session = await getSession();
  const token = randomBytes(32).toString("base64url");
  const lifetime = user.role === "ADMIN" ? 12 * 60 * 60 : 7 * 24 * 60 * 60;
  const now = new Date();
  const created = await prisma.$transaction(async tx => {
    // Serialize sign-in with password rotation: a previously checked password
    // cannot create a fresh session after rotation has revoked the old ones.
    const valid = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "id" = ${user.id}
      AND "passwordHash" = ${expectedPasswordHash} AND "role"::text = ${user.role}
      FOR UPDATE
    `;
    if (!valid.length) return false;
    await tx.authSession.deleteMany({
      where: { userId: user.id, expiresAt: { lte: now } },
    });
    await tx.authSession.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        adminVerified,
        expiresAt: new Date(now.getTime() + lifetime * 1000),
      },
    });
    return true;
  });
  if (!created) return false;
  session.user = user;
  session.token = token;
  await session.save();
  return true;
}

export async function endSession() {
  const session = await getSession();
  if (session.token) {
    await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(session.token) } });
  }
  session.destroy();
}

export async function getAuthenticatedSession(allowPasswordChange = false) {
  const { user, token } = await getSession();
  if (!user || !token) return null;
  const active = await prisma.authSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: { gt: new Date() },
      user: { role: user.role, ...(!allowPasswordChange ? { mustChangePassword: false } : {}) },
      ...(user.role === "ADMIN" ? { adminVerified: true } : {}),
    },
    select: {
      tokenHash: true,
      vaultVerifiedUntil: true,
      user: { select: { id: true, email: true, name: true, role: true, mustChangePassword: true } },
    },
  });
  return active;
}

export function hasRecentVaultVerification(session: Awaited<ReturnType<typeof getAuthenticatedSession>>) {
  return session?.user.role === "ADMIN" &&
    (session.vaultVerifiedUntil?.getTime() ?? 0) > Date.now();
}

export async function requireUser() {
  return (await getAuthenticatedSession())?.user ?? null;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (!user || user.role !== role) return null;
  return user;
}
