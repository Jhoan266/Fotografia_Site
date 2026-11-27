"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePassword, type PasswordChangeState } from "@/modules/accounts/actions";

export function PasswordChangeForm({ locale }: { locale: string }) {
  const t = useTranslations("accountSecurity");
  const [state, action, pending] = useActionState(changePassword, {} as PasswordChangeState);
  return <form id="password-change" action={action} aria-busy={pending}>
    <input type="hidden" name="locale" value={locale} />
    <fieldset disabled={pending}>
      {([ ["currentPassword", "current", "current-password"], ["newPassword", "new", "new-password"],
        ["confirmation", "confirm", "new-password"] ] as const).map(([name, label, autoComplete]) =>
        <label key={name}><span>{t(label)}</span><input className="input-field" name={name} type="password"
          required minLength={name === "currentPassword" ? undefined : 12} maxLength={72} autoComplete={autoComplete} /></label>)}
      <p className="password-help">{t("help")}</p>
      <button type="submit" className="btn-primary">{pending ? t("saving") : t("save")}</button>
    </fieldset>
    {state.error && <p role="alert" className="password-error">{t(`errors.${state.error}`)}</p>}
  </form>;
}
