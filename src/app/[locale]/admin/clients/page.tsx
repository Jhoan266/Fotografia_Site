import { ActionForm } from "@/components/admin/ActionForm";
import { Button, EmptyState, FormField } from "@/components/ui/design-system";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/session";
import { createClientFromForm } from "@/modules/clients/actions";
import { listClientsForAdmin } from "@/modules/clients/queries";

export default async function AdminClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("ADMIN");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("admin");
  const clients = await listClientsForAdmin();

  return (
    <div>
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-14 md:grid-cols-[1fr_1.1fr] md:px-8">
        <div>
          <p className="section-label">{t("clients")}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">{t("clients")}</h1>
          <div className="mt-8">{clients.length === 0 && <EmptyState title={t("emptyClients")} description={t("emptyClientsDescription")} />}</div>
          <ul className="mt-4 space-y-4">
            {clients.map((c) => (
              <li key={c.id} className="border-b border-white/10 pb-4">
                <p className="text-lg">{c.user.name}</p>
                <p className="text-sm text-white/55">
                  {c.user.email}
                  {c.phone ? ` · ${c.phone}` : ""}
                </p>
                <p className="mt-1 text-xs text-sand">
                  {c._count.projects} {t("projects").toLowerCase()}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <ActionForm id="new-client" action={createClientFromForm.bind(null, locale)} className="ds-card scroll-mt-6 space-y-4 p-6">
          <h2 className="font-display text-2xl">{t("newClient")}</h2>
          <FormField label={t("name")} name="name" required maxLength={120} />
          <FormField label={t("email")} name="email" type="email" required maxLength={254} />
          <FormField label={t("phone")} name="phone" maxLength={40} />
          <FormField
            label={t("password")}
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
          <label className="block space-y-2">
            <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">{t("notes")}</span>
            <textarea name="notes" maxLength={2000} className="input-field min-h-24" />
          </label>
          <Button type="submit">{t("create")}</Button>
        </ActionForm>
      </section>
    </div>
  );
}

