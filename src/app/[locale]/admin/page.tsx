import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/ui/AppHeader";
import { ActionLink, Card, EmptyState, PageHeading, StatCard, StatusBadge } from "@/components/ui/design-system";
import { requireRole } from "@/lib/session";
import { getAdminDashboard } from "@/modules/dashboard/queries";

export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("ADMIN");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("admin");
  const data = await getAdminDashboard();
  const number = new Intl.NumberFormat(locale);
  const statusLabels = { DRAFT: t("draft"), DELIVERED: t("delivered"), ARCHIVED: t("archived") };
  const projectsHref = `/${locale}/admin/projects`;

  return <main>
    <AppHeader locale={locale} user={user} mode="admin" />
    <section className="mx-auto max-w-6xl space-y-8 px-5 py-10 md:px-8 md:py-14">
      <PageHeading eyebrow={t("panel")} title={t("welcome", { name: user.name })}
        description={t("dashboardDescription")}
        actions={<><ActionLink href={`/${locale}/admin/clients#new-client`} secondary>{t("newClient")}</ActionLink>
          <ActionLink href={`${projectsHref}/new`}>{t("newProject")}</ActionLink></>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("clients")} value={number.format(data.clients)} href={`/${locale}/admin/clients`} />
        <StatCard label={t("projects")} value={number.format(data.projects)} href={projectsHref} />
        <StatCard label={t("photos")} value={number.format(data.photos)} href={projectsHref} />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-5 md:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">{t("recentProjects")}</h2>
            <ActionLink href={projectsHref} secondary>{t("viewAll")}</ActionLink>
          </div>
          {data.recentProjects.length === 0 ?
            <EmptyState title={t("emptyProjects")} description={t("emptyProjectsDescription")}>
              <ActionLink href={`${projectsHref}/new`}>{t("newProject")}</ActionLink>
            </EmptyState> :
            <ul className="divide-y divide-white/10">{data.recentProjects.map((project) =>
              <li key={project.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`${projectsHref}/${project.id}`} className="ds-focus rounded text-lg font-medium text-white hover:text-sand">
                    <span className="break-words">{project.title}</span>
                  </Link>
                  <p className="mt-1 break-words text-sm text-white/65">{project.client.user.name}</p>
                  <p className="mt-2 text-xs text-white/60">
                    {number.format(project._count.photos)} {t("photos")}
                    {project.sessionDate && <> · <time dateTime={project.sessionDate.toISOString()}>
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Madrid" }).format(project.sessionDate)}
                    </time></>}
                  </p>
                </div>
                <div className="shrink-0"><StatusBadge status={project.status}>{statusLabels[project.status]}</StatusBadge></div>
              </li>)}</ul>}
        </Card>
        <Card className="p-5 md:p-6">
          <h2 className="font-display text-2xl">{t("deliveryOverview")}</h2>
          <p className="mt-2 text-sm text-white/65">{t("deliveryDescription")}</p>
          <dl className="mt-6 space-y-4">
            {([["DRAFT", data.drafts], ["DELIVERED", data.delivered], ["ARCHIVED", data.archived]] as const).map(([status, count]) =>
              <div key={status} className="flex items-center justify-between gap-3">
                <dt><StatusBadge status={status}>{statusLabels[status]}</StatusBadge></dt>
                <dd className="text-xl tabular-nums">{number.format(count)}</dd>
              </div>)}
          </dl>
        </Card>
      </div>
    </section>
  </main>;
}
