import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/ui/AppHeader";
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
    <main>
      <AppHeader locale={locale} user={user} mode="admin" />
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-14 md:grid-cols-[1fr_1.1fr] md:px-8">
        <div>
          <p className="section-label">{t("clients")}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">{t("clients")}</h1>
          <ul className="mt-8 space-y-4">
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
        <form action={createClientFromForm.bind(null, locale)} className="space-y-4 border border-white/10 p-6">
          <h2 className="font-display text-2xl">{t("newClient")}</h2>
          <Field label={t("name")} name="name" required maxLength={120} />
          <Field label={t("email")} name="email" type="email" required maxLength={254} />
          <Field label={t("phone")} name="phone" maxLength={40} />
          <Field
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
          <button type="submit" className="btn-primary">{t("create")}</button>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
  maxLength,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">{label}</span>
      <input className="input-field" name={name} type={type} required={required} minLength={minLength} maxLength={maxLength} autoComplete={autoComplete} />
    </label>
  );
}
