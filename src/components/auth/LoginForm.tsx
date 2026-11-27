"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, LoginState } from "@/lib/auth";
import Link from "next/link";

const initial: LoginState = {};

export function LoginForm({ locale, passwordChanged = false }: { locale: string; passwordChanged?: boolean }) {
  const t = useTranslations("login");
  const security = useTranslations("accountSecurity");
  const recovery = useTranslations("accountRecovery");
  const [state, formAction, pending] = useActionState(loginAction, initial);

  const errorMessage =
    state.error === "invalid"
      ? t("errorInvalid")
      : state.error === "missing"
        ? t("errorMissing")
        : state.error === "rate_limited"
          ? t("errorRate")
          : null;

  return (
    <form action={formAction} className="mx-auto w-full max-w-md space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {passwordChanged && <p role="status" className="text-sm text-white/80">{security("success")}</p>}
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-sm text-white/55">{t("subtitle")}</p>
      </div>
      <label className="block space-y-2">
        <span className="text-[11px] tracking-[0.22em] text-white/50 uppercase">
          {t("email")}
        </span>
        <input
          className="input-field"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="cliente@demo.com"
          required
        />
      </label>
      <label className="block space-y-2">
        <span className="text-[11px] tracking-[0.22em] text-white/50 uppercase">
          {t("password")}
        </span>
        <input
          className="input-field"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>
      <label className="block space-y-2">
        <span className="text-[11px] tracking-[0.22em] text-white/50 uppercase">
          {t("totp")}
        </span>
        <input
          className="input-field"
          name="totp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-describedby="login-totp-help"
        />
        <span id="login-totp-help" className="block text-sm text-white/55">{t("totpHelp")}</span>
      </label>
      {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
      <Link href={`/${locale}/reset-password`} className="block text-sm underline underline-offset-4">{recovery("forgot")}</Link>
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "…" : t("submit")}
      </button>
    </form>
  );
}
