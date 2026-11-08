import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StudioIcon } from "@/components/admin/StudioIcon";
import { RecentProjects } from "@/components/admin/RecentProjects";
import { requireRole } from "@/lib/session";
import { getAdminDashboard } from "@/modules/dashboard/queries";

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("ADMIN");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("admin");
  const data = await getAdminDashboard();
  const number = new Intl.NumberFormat(locale);
  const projectsHref = `/${locale}/admin/projects`;
  const percent = data.projects
    ? Math.round((data.delivered / data.projects) * 100)
    : 0;
  const deliveredAngle = data.projects
    ? (data.delivered / data.projects) * 360
    : 0;
  const draftAngle = data.projects
    ? ((data.delivered + data.drafts) / data.projects) * 360
    : 0;
  const statusLabels = {
    DRAFT: t("draft"),
    DELIVERED: t("delivered"),
    ARCHIVED: t("archived"),
  };
  const stats = [
    {
      label: t("studio.activeProjects"),
      value: data.drafts + data.delivered,
      icon: "projects",
      note: t("studio.draftsCount", { count: data.drafts }),
      href: projectsHref,
    },
    {
      label: t("clients"),
      value: data.clients,
      icon: "clients",
      note: t("studio.clientNote"),
      href: `/${locale}/admin/clients`,
    },
    {
      label: t("studio.deliveredGalleries"),
      value: data.delivered,
      icon: "check",
      note: t("studio.deliveryNote"),
      href: projectsHref,
    },
    {
      label: t("photos"),
      value: data.photos,
      icon: "camera",
      note: t("studio.photoNote"),
      href: projectsHref,
    },
  ] as const;
  return (
    <div className="studio-dashboard">
      <div className="studio-page-heading">
        <div>
          <p className="studio-eyebrow">
            <span />
            {t("studio.overview")}
          </p>
          <h1>
            {t("studio.greeting", { name: user.name.split(" ")[0] })}
            <span className="text-sand">.</span>
          </h1>
          <p>{t("studio.intro")}</p>
        </div>
        <div className="studio-heading-actions">
          <Link
            className="studio-outline-button ds-focus"
            href={`/${locale}/admin/clients#new-client`}
          >
            <StudioIcon name="clients" width="17" />
            {t("newClient")}
          </Link>
          <Link
            className="studio-primary-button ds-focus"
            href={projectsHref + "/new"}
          >
            <StudioIcon name="plus" width="18" />
            {t("newProject")}
          </Link>
        </div>
      </div>
      <section className="studio-metrics" aria-label={t("studio.metrics")}>
        {stats.map((stat, index) => (
          <Link
            href={stat.href}
            key={stat.label}
            className="studio-metric ds-focus"
          >
            <div className="studio-metric-top">
              <span>{stat.label}</span>
              <span className={`studio-metric-icon tone-${index}`}>
                <StudioIcon name={stat.icon} width="18" />
              </span>
            </div>
            <strong>{number.format(stat.value).padStart(2, "0")}</strong>
            <p>
              {stat.note}
              <StudioIcon name="arrow" width="15" />
            </p>
          </Link>
        ))}
      </section>
      <div className="studio-dashboard-columns">
        <div className="studio-primary-column">
          <RecentProjects
            locale={locale}
            projects={data.recentProjects.map((p) => ({
              id: p.id,
              title: p.title,
              status: p.status,
              client: p.client.user.name,
              count: p._count.photos,
              date: p.sessionDate?.toISOString() ?? null,
              thumbnail: p.photos[0]
                ? `/api/media/${p.photos[0].thumbKey || p.photos[0].storageKey}`
                : null,
            }))}
          />
          <section className="studio-engagement">
            <div className="studio-engagement-copy">
              <span className="studio-eyebrow">
                {t("studio.clientActivity")}
              </span>
              <h2>{t("studio.activityTitle")}</h2>
              <p>{t("studio.activityDescription")}</p>
            </div>
            <div className="studio-engagement-stats">
              {(
                [
                  {
                    icon: "heart",
                    value: data.favorites,
                    label: t("studio.favorites"),
                  },
                  {
                    icon: "check",
                    value: data.selections,
                    label: t("studio.selections"),
                  },
                  {
                    icon: "message",
                    value: data.comments,
                    label: t("studio.comments"),
                  },
                ] as const
              ).map((item) => (
                <div key={item.label}>
                  <StudioIcon name={item.icon} width="19" />
                  <strong>{number.format(item.value)}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="studio-panel">
            <div className="studio-panel-heading">
              <div>
                <h2>{t("studio.upcoming")}</h2>
                <p>{t("studio.upcomingDescription")}</p>
              </div>
              <StudioIcon name="calendar" />
            </div>
            {data.upcomingSessions.length ? (
              <ul className="studio-agenda">
                {data.upcomingSessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`${projectsHref}/${session.id}`}
                      className="ds-focus"
                    >
                      <span className="studio-date-tile">
                        <small>
                          {new Intl.DateTimeFormat(locale, {
                            month: "short",
                            timeZone: "Europe/Madrid",
                          }).format(session.sessionDate!)}
                        </small>
                        <strong>
                          {new Intl.DateTimeFormat(locale, {
                            day: "2-digit",
                            timeZone: "Europe/Madrid",
                          }).format(session.sessionDate!)}
                        </strong>
                      </span>
                      <div>
                        <h3>{session.title}</h3>
                        <p>{session.client.user.name}</p>
                      </div>
                      <StudioIcon name="arrow" width="17" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="studio-agenda-empty">
                <span>
                  <StudioIcon name="calendar" width="25" height="25" />
                </span>
                <div>
                  <h3>{t("studio.noUpcoming")}</h3>
                  <p>{t("studio.noUpcomingDescription")}</p>
                </div>
                <Link
                  className="studio-text-link ds-focus"
                  href={projectsHref + "/new"}
                >
                  {t("studio.schedule")} <StudioIcon name="plus" width="15" />
                </Link>
              </div>
            )}
          </section>
        </div>
        <div className="studio-secondary-column">
          <section className="studio-panel studio-deliveries">
            <div className="studio-panel-heading">
              <div>
                <h2>{t("deliveryOverview")}</h2>
                <p>{t("studio.allProjects")}</p>
              </div>
              <StudioIcon name="overview" width="18" />
            </div>
            <div
              className="studio-donut"
              role="img"
              aria-label={t("studio.deliveryPercentage", { percent })}
              style={{
                background: `conic-gradient(#c5a37d 0deg ${deliveredAngle}deg, #738c86 ${deliveredAngle}deg ${draftAngle}deg, #35383d ${draftAngle}deg 360deg)`,
              }}
            >
              <div>
                <strong>{data.projects ? percent + "%" : "—"}</strong>
                <span>{t("delivered")}</span>
              </div>
            </div>
            <dl className="studio-status-legend">
              {(
                [
                  ["DELIVERED", data.delivered],
                  ["DRAFT", data.drafts],
                  ["ARCHIVED", data.archived],
                ] as const
              ).map(([status, count]) => (
                <div key={status}>
                  <dt>
                    <span
                      className={`studio-status-dot ${status.toLowerCase()}`}
                    />
                    {statusLabels[status]}
                  </dt>
                  <dd>{number.format(count)}</dd>
                </div>
              ))}
            </dl>
            <p className="studio-delivery-foot">
              {t("studio.projectTotal", { count: data.projects })}
            </p>
          </section>
          <section className="studio-panel studio-pending">
            <div className="studio-panel-heading">
              <div>
                <h2>{t("studio.pending")}</h2>
                <p>{t("studio.pendingDescription")}</p>
              </div>
              <span className="studio-count-badge">{data.drafts}</span>
            </div>
            {data.pendingProjects.length ? (
              <ul>
                {data.pendingProjects.map((project) => (
                  <li key={project.id}>
                    <Link
                      className="ds-focus"
                      href={`${projectsHref}/${project.id}`}
                    >
                      <span className="studio-task-icon">
                        <StudioIcon
                          name={project._count.photos ? "check" : "camera"}
                          width="17"
                        />
                      </span>
                      <div>
                        <h3>{project.title}</h3>
                        <p>
                          {project._count.photos
                            ? t("studio.reviewDelivery")
                            : t("studio.addPhotos")}
                        </p>
                      </div>
                      <StudioIcon name="arrow" width="15" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="studio-pending-empty">
                <span>
                  <StudioIcon name="check" />
                </span>
                <h3>{t("studio.allCaughtUp")}</h3>
                <p>{t("studio.allCaughtUpDescription")}</p>
              </div>
            )}
          </section>
          <Link className="studio-website-card ds-focus" href={`/${locale}`}>
            <span>
              <StudioIcon name="external" width="19" />
            </span>
            <div>
              <h2>{t("studio.yourWebsite")}</h2>
              <p>{t("studio.websiteDescription")}</p>
            </div>
            <StudioIcon name="arrow" width="18" />
          </Link>
        </div>
      </div>
      <footer className="studio-dashboard-footer">
        <span>VERA SOLÍS · STUDIO</span>
        <span>{t("studio.footer")}</span>
      </footer>
    </div>
  );
}
