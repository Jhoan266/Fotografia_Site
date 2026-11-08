import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AppSessionData = {
  user?: SessionUser;
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  }

  const lower = secret.toLowerCase();
  if (process.env.NODE_ENV === "production" && (lower.includes("replace_me") || lower.includes("change-me"))) {
    throw new Error("SESSION_SECRET is still using an example value.");
  }

  return secret;
}

export function getSessionOptions(): SessionOptions {
  return {
    password: sessionSecret(),
    cookieName: "vs_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<AppSessionData>(cookieStore, getSessionOptions());
}

export async function requireUser() {
  const session = await getSession();
  return session.user ?? null;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (!user || user.role !== role) return null;
  return user;
}
