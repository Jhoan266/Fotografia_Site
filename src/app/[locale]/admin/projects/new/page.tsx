import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/ui/AppHeader";
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
    <main>
      <AppHeader locale={locale} user={user} mode="admin" />
      <section className="mx-auto max-w-3xl px-5 py-14 md:px-8">
        <p className="section-label">{t("projects")}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">{t("projects")}</h1>
        <h2 className="mt-2 text-xl text-white/70">{t("newProject")}</h2>
        <form action={createProjectFromForm.bind(null, locale)} className="mt-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">{t("title")}</span>
            <input className="input-field" name="title" required maxLength={160} />
          </label>
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
          <label className="block space-y-2">
            <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">{t("sessionDate")}</span>
            <input className="input-field" type="date" name="sessionDate" />
          </label>
          <fieldset className="space-y-3">
            <legend className="text-[11px] tracking-[0.2em] text-white/50 uppercase">{t("packs")}</legend>
            {packs.map((pack) => (
              <label key={pack.id} className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="packIds" value={pack.id} className="accent-sand" />
                {pack.name}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="btn-primary">{t("create")}</button>
        </form>
      </section>
    </main>
  );
}
