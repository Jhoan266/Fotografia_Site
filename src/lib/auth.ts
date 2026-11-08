"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const locale = String(formData.get("locale") || "es");

  if (!email || !password) {
    return { error: "missing" };
  }

  const limited = rateLimit(`login:${email}`, 8, 60_000);
  if (!limited.ok) {
    return { error: "rate_limited" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "invalid" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "invalid" };
  }

  const session = await getSession();
  session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  await session.save();

  if (user.role === "ADMIN") {
    redirect(`/${locale}/admin`);
  }
  redirect(`/${locale}/app`);
}

export async function logoutAction(locale = "es") {
  const session = await getSession();
  session.destroy();
  redirect(`/${locale}/login`);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
