"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { recoverClientPassword } from "./recovery";
import { validNewPassword } from "@/lib/password-policy";

export type RecoveryState = { error?: "invalid" | "password" };

export async function completeRecovery(_previous: RecoveryState, form: FormData): Promise<RecoveryState> {
  const origin = (await headers()).get("origin"), configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin || !configured || origin !== new URL(configured).origin) return { error: "invalid" };
  const code = form.get("code"), password = form.get("password");
  if (typeof password !== "string" || !validNewPassword(password) || password !== form.get("confirmation")) return { error: "password" };
  if (typeof code !== "string" || !await recoverClientPassword(code.trim(), password)) return { error: "invalid" };
  const locale = form.get("locale");
  const safeLocale = typeof locale === "string" && ["es", "en", "fr"].includes(locale) ? locale : "es";
  redirect(`/${safeLocale}/login?passwordChanged=1`);
}
