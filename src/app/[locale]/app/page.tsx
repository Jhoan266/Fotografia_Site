import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/ui/AppHeader";
import { requireUser } from "@/lib/session";
import { listDeliveredProjectsForClient } from "@/modules/projects/queries";

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role === "ADMIN") redirect(`/${locale}/admin`);

  const t = await getTranslations("client");
  const projects = await listDeliveredProjectsForClient(user.id);

  return (
    <main>
      <AppHeader locale={locale} user={user} mode="client" />
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <p className="section-label">{t("label")}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">
          {t("hello", { name: user.name.split(" ")[0] })}
        </h1>
        <div className="mt-8 h-px bg-white/10" />
        {projects.length === 0 ? (
          <p className="mt-10 text-white/55">{t("empty")}</p>
        ) : (
          <ul className="mt-10 space-y-8">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/${locale}/app/projects/${project.id}`} className="group block">
                  <p className="text-xs tracking-[0.2em] text-sand uppercase">
                    {t("photos", { count: project._count.photos })}
                    {project.sessionDate ? ` · ${project.sessionDate.toLocaleDateString(locale)}` : ""}
                  </p>
                  <h2 className="mt-2 font-display text-2xl transition group-hover:text-sand-soft">{project.title}</h2>
                  <p className="mt-2 text-sm text-white/60">{t("delivered")}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
