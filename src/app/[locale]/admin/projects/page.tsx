import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/ui/AppHeader";
import { requireRole } from "@/lib/session";
import { listProjectsForAdmin } from "@/modules/projects/queries";

export default async function AdminProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("ADMIN");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("admin");
  const projects = await listProjectsForAdmin();

  return (
    <main>
      <AppHeader locale={locale} user={user} mode="admin" />
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">{t("projects")}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold">{t("projects")}</h1>
          </div>
          <Link href={`/${locale}/admin/projects/new`} className="btn-primary">{t("newProject")}</Link>
        </div>
        <ul className="mt-10 space-y-5">
          {projects.map((p) => (
            <li key={p.id} className="border-b border-white/10 pb-5">
              <Link href={`/${locale}/admin/projects/${p.id}`} className="group block">
                <p className="text-xs tracking-[0.18em] text-sand uppercase">
                  {p.status} · {p._count.photos} {t("photos").toLowerCase()}
                </p>
                <h2 className="mt-2 text-xl group-hover:text-sand-soft">{p.title}</h2>
                <p className="mt-1 text-sm text-white/55">{p.client.user.name} · {p.client.user.email}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
