"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, LoginState } from "@/lib/auth";

const initial: LoginState = {};

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("login");
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
      {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "…" : t("submit")}
      </button>
    </form>
  );
}
