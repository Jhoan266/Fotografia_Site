"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { completeRecovery, type RecoveryState } from "@/modules/accounts/recovery-actions";

export function RecoveryForm({ locale }: { locale: string }) {
  const t = useTranslations("accountRecovery"), security = useTranslations("accountSecurity");
  const [state, action, pending] = useActionState(completeRecovery, {} as RecoveryState);
  return <form id="password-recovery" action={action} aria-busy={pending}>
    <input type="hidden" name="locale" value={locale} />
    <fieldset disabled={pending}>
      <label><span>{t("code")}</span><input className="input-field" name="code" required maxLength={43} minLength={43} autoComplete="off" spellCheck={false} /></label>
      <label><span>{security("new")}</span><input className="input-field" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></label>
      <label><span>{security("confirm")}</span><input className="input-field" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></label>
      <p className="password-help">{security("help")}</p>
      <button className="btn-primary" type="submit">{pending ? security("saving") : t("save")}</button>
    </fieldset>
    {state.error && <p role="alert" className="password-error">{state.error === "password" ? security("errors.invalid") : t("invalid")}</p>}
  </form>;
}
