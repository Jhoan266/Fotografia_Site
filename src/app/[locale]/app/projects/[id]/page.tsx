import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GalleryClient } from "@/components/client/GalleryClient";
import { PackRequest } from "@/components/client/PackRequest";
import { Icon } from "@/components/ui/Icon";
import { requireUser } from "@/lib/session";
import { createProjectOrder } from "@/modules/orders/actions";
import { getClientProjectGallery } from "@/modules/projects/gallery-queries";

export default async function ProjectGalleryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("client");
  const p = await getTranslations("client.portal");
  const project = await getClientProjectGallery(id, user.id);
  if (!project) notFound();
  if (
    user.role === "CLIENT" &&
    (project.client.userId !== user.id || project.status !== "DELIVERED")
  )
    redirect(`/${locale}/app`);
  const photos = project.photos.map((photo) => ({
    id: photo.id,
    filename: photo.filename,
    thumbUrl: `/api/media/${photo.thumbKey || photo.storageKey}`,
    favorite: photo.favorites.length > 0,
    selected: photo.selections.some((s) => s.status === "SELECTED"),
    comments: photo.comments.map((c) => ({
      id: c.id,
      body: c.body,
      author: c.user.name,
      createdAt: c.createdAt.toISOString(),
    })),
  }));
  return (
    <div className="portal-gallery-page">
      <section className="portal-gallery-cover">
        {photos[0] && (
          <Image
            src={photos[0].thumbUrl}
            alt=""
            fill
            sizes="100vw"
            unoptimized
            priority
          />
        )}
        <div className="portal-gallery-cover-shade" />
        <div className="portal-gallery-cover-content">
          <Link href={`/${locale}/app`} className="portal-gallery-back">
            <Icon name="arrow" width="15" />
            {p("mySessions")}
          </Link>
          <div className="portal-gallery-title">
            <p className="portal-eyebrow">
              <Icon name="lock" width="12" />
              {p("privateGallery")}
            </p>
            <h1>{project.title}</h1>
            <p>
              {project.sessionDate && (
                <>
                  <span>
                    {new Intl.DateTimeFormat(locale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "Europe/Madrid",
                    }).format(project.sessionDate)}
                  </span>
                  <span className="portal-meta-dot" />
                </>
              )}
              <span>{t("photos", { count: photos.length })}</span>
            </p>
          </div>
          <span className="portal-cover-stamp">{p("madeForYou")}</span>
        </div>
      </section>
      <section className="portal-gallery-content">
        <div className="portal-gallery-intro">
          <div>
            <p className="portal-eyebrow">{p("yourStoryInImages")}</p>
            <h2>{p("galleryIntro")}</h2>
          </div>
          <p>{p("galleryInstructions")}</p>
        </div>
        <GalleryClient locale={locale} projectId={project.id} photos={photos} />
      </section>
      {project.packs.length > 0 && (
        <section className="portal-albums">
          <div className="portal-albums-heading">
            <div>
              <p className="portal-eyebrow">{p("beyondTheScreen")}</p>
              <h2>{p("albumTitle")}</h2>
            </div>
            <p>{p("albumIntro")}</p>
          </div>
          <ul className="portal-album-grid">
            {project.packs.map(({ pack }) => (
              <li key={pack.id}>
                <span className="portal-album-icon">
                  <Icon name="projects" width="32" height="32" />
                </span>
                <div className="portal-album-details">
                  <h3>{pack.name}</h3>
                  <p>{pack.description}</p>
                  <strong>
                    {new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: pack.currency,
                    }).format(pack.priceCents / 100)}
                  </strong>
                  <PackRequest
                    action={createProjectOrder.bind(null, project.id, pack.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
