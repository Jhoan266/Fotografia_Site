"use client";

import { useActionState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

type ActionResult = { ok: boolean; error?: string };

export function ActionForm({ action, children, className, id }: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const t = useTranslations("admin");
  const [state, submit, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData), null,
  );
  const errors: Record<string, string> = {
    unauthorized: t("formUnauthorized"), invalid_input: t("formInvalid"),
    invalid_date: t("formInvalid"), invalid_relation: t("formRelation"),
    email_in_use: t("formEmailInUse"), not_found: t("formNotFound"),
  };
  return <form id={id} action={submit} className={className} aria-busy={pending}>
    <fieldset disabled={pending} className="min-w-0 space-y-4 disabled:opacity-60">{children}</fieldset>
    <p role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-sm text-white/80">
      {pending ? t("formPending") : state ? state.ok ? t("formSuccess") : errors[state.error ?? ""] ?? t("formError") : ""}
    </p>
  </form>;
}
