import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";
import { requireUser } from "@/lib/session";
import { getClientPortal } from "@/modules/portal/queries";

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
  const t = await getTranslations("client.portal");
  const projects = await getClientPortal(user.id);
  const featured = projects[0];
  const number = new Intl.NumberFormat(locale);
  const date = (value: Date | null) =>
    value
      ? new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/Madrid",
        }).format(value)
      : t("privateGallery");
  const image = (photo: { thumbKey: string | null; storageKey: string }) =>
    `/api/media/${photo.thumbKey || photo.storageKey}`;
  const totals = projects.reduce(
    (sum, p) => ({
      photos: sum.photos + p._count.photos,
      favorites: sum.favorites + p.favorites,
      selected: sum.selected + p.selected,
    }),
    { photos: 0, favorites: 0, selected: 0 },
  );
  return (
    <div className="portal-dashboard">
      <div className="portal-welcome">
        <div>
          <p className="portal-eyebrow">
            <span />
            {t("yourCorner")}
          </p>
          <h1>
            {t("greeting", { name: user.name.split(" ")[0] })}
            <span>.</span>
          </h1>
          <p>{t("intro")}</p>
        </div>
        <div className="portal-welcome-note">
          <span className="portal-handwritten">{t("madeForYou")}</span>
          <p>{t("welcomeNote")}</p>
        </div>
      </div>
      <section className="portal-overview" aria-label={t("overview")}>
        {(
          [
            { icon: "projects", value: projects.length, label: t("sessions") },
            { icon: "camera", value: totals.photos, label: t("photos") },
            { icon: "heart", value: totals.favorites, label: t("favorites") },
            {
              icon: "check",
              value: totals.selected,
              label: t("albumSelection"),
            },
          ] as const
        ).map((item) => (
          <div key={item.label}>
            <span className="portal-overview-icon">
              <Icon name={item.icon} width="21" />
            </span>
            <div>
              <strong>{number.format(item.value).padStart(2, "0")}</strong>
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </section>
      {featured ? (
        <section className="portal-feature" aria-label={t("featuredSession")}>
          <Link
            href={`/${locale}/app/projects/${featured.id}`}
            className="portal-feature-image"
            aria-label={t("openSession", { title: featured.title })}
          >
            {featured.photos[0] ? (
              <Image
                src={image(featured.photos[0])}
                alt={featured.title}
                fill
                sizes="(max-width: 760px) 100vw, 60vw"
                priority
                unoptimized
              />
            ) : (
              <span className="portal-image-placeholder">
                <Icon name="camera" width="64" height="64" />
              </span>
            )}
            <span className="portal-feature-shade" />
            <span className="portal-image-topline">
              <span>{t("privateGallery")}</span>
              <Icon name="lock" width="14" />
            </span>
            <span className="portal-image-bottom">
              <small>VERA SOLÍS · PHOTOGRAPHY</small>
              <span>{t("momentsWorthKeeping")}</span>
              <span className="portal-image-arrow">
                <Icon name="arrow" />
              </span>
            </span>
          </Link>
          <div className="portal-feature-details">
            <span className="portal-ready">
              <span />
              {t("readyToDiscover")}
            </span>
            <p className="portal-feature-date">
              <Icon name="calendar" width="14" />
              {date(featured.sessionDate)}
            </p>
            <h2>{featured.title}</h2>
            <p className="portal-feature-description">
              {featured.description || t("sessionDescription")}
            </p>
            <div className="portal-feature-numbers">
              <span>
                <strong>{number.format(featured._count.photos)}</strong>
                {t("photos")}
              </span>
              <span>
                <strong>{number.format(featured.favorites)}</strong>
                {t("favorites")}
              </span>
              <span>
                <strong>{number.format(featured.selected)}</strong>
                {t("selected")}
              </span>
            </div>
            <Link
              href={`/${locale}/app/projects/${featured.id}`}
              className="portal-button"
            >
              {featured.selected || featured.favorites
                ? t("continueSelection")
                : t("discoverGallery")}
              <Icon name="arrow" width="18" />
            </Link>
            <p className="portal-feature-hint">
              <Icon name="heart" width="13" />
              {t("takeYourTime")}
            </p>
          </div>
        </section>
      ) : (
        <section className="portal-waiting">
          <div className="portal-waiting-art">
            <Icon name="camera" width="64" height="64" />
            <span>V.S.</span>
          </div>
          <div>
            <p className="portal-eyebrow">{t("comingSoon")}</p>
            <h2>{t("emptyTitle")}</h2>
            <p>{t("emptyDescription")}</p>
            <span className="portal-ready">
              <Icon name="lock" width="13" />
              {t("privateGallery")}
            </span>
          </div>
        </section>
      )}

      <div className="portal-lower-grid">
        <section id="portal-sessions" className="portal-sessions">
          <div className="portal-section-heading">
            <div>
              <p className="portal-eyebrow">{t("yourStories")}</p>
              <h2>{t("mySessions")}</h2>
            </div>
            <span>{t("galleryCount", { count: projects.length })}</span>
          </div>
          {projects.length ? (
            <ul
              className={
                projects.length === 1
                  ? "portal-session-grid is-single"
                  : "portal-session-grid"
              }
            >
              {projects.map((project) => (
                <li key={project.id} className="portal-session-card">
                  <Link
                    href={`/${locale}/app/projects/${project.id}`}
                    className="portal-session-cover"
                    aria-label={t("openSession", { title: project.title })}
                  >
                    {project.photos[0] ? (
                      <Image
                        src={image(project.photos[0])}
                        alt={project.title}
                        fill
                        sizes="(max-width:760px) 100vw, 35vw"
                        unoptimized
                      />
                    ) : (
                      <Icon name="camera" width="42" height="42" />
                    )}
                    <span className="portal-card-ready">
                      <span />
                      {t("delivered")}
                    </span>
                    <span className="portal-card-open">
                      <Icon name="arrow" width="20" />
                    </span>
                  </Link>
                  <div className="portal-session-info">
                    <p>{date(project.sessionDate)}</p>
                    <h3>
                      <Link href={`/${locale}/app/projects/${project.id}`}>
                        {project.title}
                      </Link>
                    </h3>
                    <div className="portal-session-meta">
                      <span>
                        <Icon name="camera" width="13" />
                        {number.format(project._count.photos)} {t("photos")}
                      </span>
                      <span>
                        <Icon name="heart" width="13" />
                        {number.format(project.favorites)}
                      </span>
                      <span>
                        <Icon name="check" width="13" />
                        {number.format(project.selected)}
                      </span>
                    </div>
                    <div className="portal-progress-heading">
                      <span>{t("yourSelection")}</span>
                      <span>
                        {t("selectedOf", {
                          selected: project.selected,
                          total: project._count.photos,
                        })}
                      </span>
                    </div>
                    <div
                      className="portal-progress"
                      role="progressbar"
                      aria-label={t("yourSelection")}
                      aria-valuemin={0}
                      aria-valuemax={Math.max(1, project._count.photos)}
                      aria-valuenow={project.selected}
                      aria-valuetext={t("selectedOf", {
                        selected: project.selected,
                        total: project._count.photos,
                      })}
                    >
                      <span
                        style={{
                          width: `${project._count.photos ? (project.selected / project._count.photos) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <Link
                      href={`/${locale}/app/projects/${project.id}`}
                      className="portal-card-link"
                    >
                      {t("openGallery")}
                      <Icon name="arrow" width="16" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="portal-session-empty">{t("noSessions")}</p>
          )}
        </section>
        <aside className="portal-guide" id="portal-guide">
          <span className="portal-guide-mark">
            <Icon name="heart" width="22" />
          </span>
          <p className="portal-eyebrow">{t("atYourPace")}</p>
          <h2>{t("guideTitle")}</h2>
          <p className="portal-guide-intro">{t("guideIntro")}</p>
          <ol>
            {(
              [
                ["camera", "step1", "step1Description"],
                ["heart", "step2", "step2Description"],
                ["check", "step3", "step3Description"],
                ["download", "step4", "step4Description"],
              ] as const
            ).map(([icon, title, description], index) => (
              <li key={title}>
                <span className="portal-guide-number">0{index + 1}</span>
                <div>
                  <h3>{t(title)}</h3>
                  <p>{t(description)}</p>
                </div>
                <Icon name={icon} width="17" />
              </li>
            ))}
          </ol>
          <div className="portal-privacy-note">
            <Icon name="lock" width="16" />
            <p>{t("privacyNote")}</p>
          </div>
        </aside>
      </div>
      <div className="portal-signature">
        <span />
        {t("signature")}
        <span />
      </div>
    </div>
  );
}
