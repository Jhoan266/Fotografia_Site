import { ActionLink, Button, EmptyState, FormField, PageHeading } from "@/components/ui/design-system";
import { ActionForm } from "@/components/admin/ActionForm";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/session";
import { listClientOptions } from "@/modules/clients/queries";
import { createProjectFromForm } from "@/modules/projects/actions";
import { listActivePacks } from "@/modules/projects/queries";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("ADMIN");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("admin");
  const [clients, packs] = await Promise.all([listClientOptions(), listActivePacks()]);

  return (
    <div>
      <section className="mx-auto max-w-3xl px-5 py-14 md:px-8">
        <PageHeading eyebrow={t("projects")} title={t("newProject")}
          actions={<ActionLink href={`/${locale}/admin/projects`} secondary>{t("backToProjects")}</ActionLink>} />
        {clients.length === 0 ? <div className="mt-8">
          <EmptyState title={t("emptyClients")} description={t("projectNeedsClient")}>
            <ActionLink href={`/${locale}/admin/clients#new-client`}>{t("newClient")}</ActionLink>
          </EmptyState>
        </div> :
        <ActionForm action={createProjectFromForm.bind(null, locale)} className="ds-card mt-8 p-6">
          <FormField label={t("title")} name="title" required maxLength={160} />
          <label className="block space-y-2">
            <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">{t("description")}</span>
            <textarea className="input-field min-h-28" name="description" maxLength={4000} />
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">{t("client")}</span>
            <select className="input-field" name="clientId" required defaultValue="">
              <option value="" disabled>—</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.user.name} • {c.user.email}</option>)}
            </select>
          </label>
          <FormField label={t("sessionDate")} type="date" name="sessionDate" />
          <fieldset className="space-y-3">
            <legend className="text-[11px] tracking-[0.2em] text-white/50 uppercase">{t("packs")}</legend>
            {packs.map((pack) => (
              <label key={pack.id} className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="packIds" value={pack.id} className="accent-sand" />
                {pack.name}
              </label>
            ))}
          </fieldset>
          <Button type="submit">{t("create")}</Button>
        </ActionForm>}
      </section>
    </div>
  );
}
