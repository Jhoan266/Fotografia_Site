"use server";

import bcrypt from "bcryptjs";
import { adminTotpStep } from "@/lib/admin-totp";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { endSession, startSession } from "@/lib/session";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";

export type LoginState = {
  error?: string;
};

const locales = new Set(["es", "en", "fr"]);

function loginKey(prefix: string, value: string) {
  const digest = createHash("sha256").update(value).digest("hex");
  return `${prefix}:${digest}`;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const requestedLocale = String(formData.get("locale") || "es");
  const locale = locales.has(requestedLocale) ? requestedLocale : "es";

  if (!email || !password || email.length > 254 || password.length > 128) {
    return { error: "invalid" };
  }

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || requestHeaders.get("x-real-ip") || "unknown";

  const emailLimitKey = loginKey("login-email", email);
  const ipLimitKey = loginKey("login-ip", ip);

  const [emailLimit, ipLimit] = await Promise.all([
    rateLimit(emailLimitKey, 8, 5 * 60_000),
    rateLimit(ipLimitKey, 30, 5 * 60_000),
  ]);

  if (!emailLimit.ok || !ipLimit.ok) {
    return { error: "rate_limited" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await bcrypt.hash(password, 12);
    return { error: "invalid" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "invalid" };
  }

  if (user.role === "ADMIN") {
    const code = formData.get("totp");
    const step = typeof code === "string" ? adminTotpStep(user.email, code) : null;
    if (step === null) return { error: "invalid" };

    const consumed = await prisma.user.updateMany({
      where: {
        id: user.id,
        role: "ADMIN",
        passwordHash: user.passwordHash,
        OR: [{ lastTotpStep: null }, { lastTotpStep: { lt: step } }],
      },
      data: { lastTotpStep: step },
    });
    if (consumed.count !== 1) return { error: "invalid" };
  }

  await Promise.all([clearRateLimit(emailLimitKey), clearRateLimit(ipLimitKey)]);

  await startSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }, user.role === "ADMIN");

  if (user.role === "ADMIN") {
    redirect(`/${locale}/admin`);
  }
  redirect(`/${locale}/app`);
}

export async function logoutAction(locale = "es") {
  const safeLocale = locales.has(locale) ? locale : "es";
  await endSession();
  redirect(`/${safeLocale}/login`);
}

export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128) {
    throw new Error("Password must be between 12 and 128 characters.");
  }
  return bcrypt.hash(password, 12);
}
