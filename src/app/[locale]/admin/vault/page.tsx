import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { AdminPhotoManager } from "@/components/admin/AdminPhotoManager";
import { UploadPanel } from "@/components/admin/UploadPanel";
import { Icon } from "@/components/ui/Icon";
import { PageHeading, StatusBadge } from "@/components/ui/design-system";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSession, hasRecentVaultVerification } from "@/lib/session";

export default async function VaultPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    client?: string | string[];
    project?: string | string[];
  }>;
}) {
  const { locale } = await params;
  const session = await getAuthenticatedSession();
  if (session?.user.role !== "ADMIN") redirect(`/${locale}/login`);
  const { client, project } = await searchParams;
  if (Array.isArray(client) || Array.isArray(project) || (project && !client))
    notFound();

  const t = await getTranslations("admin");
  const base = `/${locale}/admin/vault`;
  const clientHref = `${base}?client=${encodeURIComponent(client ?? "")}`;
  const folder = client
    ? await prisma.clientProfile.findUnique({
        where: { id: client },
        select: { user: { select: { name: true } } },
      })
    : null;
  if (client && !folder) notFound();
  const current = project
    ? await prisma.project.findFirst({
        where: { id: project, clientId: client },
        select: {
          id: true,
          title: true,
          photos: {
            where: { trashedAt: null },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            select: {
              id: true,
              filename: true,
              thumbKey: true,
              storageKey: true,
            },
          },
        },
      })
    : null;
  if (project && !current) notFound();
  const clients = client
    ? []
    : await prisma.clientProfile.findMany({
        orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
        select: {
          id: true,
          user: { select: { name: true } },
          _count: { select: { projects: true } },
        },
      });
  const projects =
    client && !current
      ? await prisma.project.findMany({
          where: { clientId: client },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            title: true,
            status: true,
            _count: { select: { photos: { where: { trashedAt: null } } } },
          },
        })
      : [];
  const format = await getFormatter();
  const trashedPhotos = current ? (await prisma.photo.findMany({
    where: { projectId: current.id, trashedAt: { not: null } },
    orderBy: [{ trashedAt: "desc" }, { id: "asc" }],
    select: { id: true, filename: true, trashedAt: true },
  })).flatMap(({ id, filename, trashedAt }) => trashedAt ? [
    { id, filename, trashedAt: format.dateTime(trashedAt, { dateStyle: "medium" }) },
  ] : []) : [];
  const statuses = {
    DRAFT: t("draft"),
    DELIVERED: t("delivered"),
    ARCHIVED: t("archived"),
  };
  const photos =
    current?.photos.map((photo) => ({
      id: photo.id,
      filename: photo.filename,
      thumbUrl:
        "/api/media/" +
        (photo.thumbKey ?? photo.storageKey)
          .split("/")
          .map(encodeURIComponent)
          .join("/"),
    })) ?? [];

  return (
    <div>
      <section className="mx-auto max-w-6xl space-y-8 px-5 py-12 md:px-8">
        <PageHeading
          eyebrow={t("vault.private")}
          title={current?.title ?? folder?.user.name ?? t("vault.title")}
          description={t("vault.intro")}
        />
        <nav
          aria-label={t("vault.title")}
          className="flex flex-wrap items-center gap-3 text-sm text-sand"
        >
          <Link href={base} prefetch={false}>
            {t("vault.folders")}
          </Link>
          {folder && (
            <>
              <span aria-hidden="true">/</span>
              <Link href={clientHref} prefetch={false}>
                {folder.user.name}
              </Link>
            </>
          )}
        </nav>
        {current ? (
          <>
            <div className="ds-card space-y-4 p-5 md:p-6">
              <h2 className="font-display text-xl">{t("upload")}</h2>
              <UploadPanel
                key={current.id}
                projectId={current.id}
                label={t("upload")}
              />
            </div>
            <div className="ds-card space-y-4 p-5 md:p-6">
              <h2 className="font-display text-xl">
                {t("photos")} ({photos.length})
              </h2>
              {photos.length || trashedPhotos.length ? (
                <AdminPhotoManager
                  key={JSON.stringify([photos.map((photo) => photo.id), trashedPhotos.map((photo) => photo.id)])}
                  projectId={current.id}
                  initialPhotos={photos}
                  trashedPhotos={trashedPhotos}
                  initialVerifiedUntil={hasRecentVaultVerification(session) ? session.vaultVerifiedUntil!.getTime() : 0}
                  downloadLabel={t("vault.download")}
                />
              ) : (
                <p>{t("vault.empty")}</p>
              )}
            </div>
          </>
        ) : (
          <>
            {!clients.length && !projects.length && (
              <p className="ds-card p-6">{t("vault.empty")}</p>
            )}
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {clients.map((item) => (
                <li key={item.id}>
                  <Link
                    className="ds-card ds-focus block space-y-3 p-6 hover:border-sand/40"
                    href={`${base}?client=${encodeURIComponent(item.id)}`}
                    prefetch={false}
                  >
                    <Icon name="projects" className="text-sand" />
                    <h2 className="break-words font-medium">
                      {item.user.name}
                    </h2>
                    <p className="text-sm text-white/60">
                      {t("projects")} · {item._count.projects}
                    </p>
                  </Link>
                </li>
              ))}
              {projects.map((item) => (
                <li key={item.id}>
                  <Link
                    className="ds-card ds-focus block space-y-3 p-6 hover:border-sand/40"
                    href={`${clientHref}&project=${encodeURIComponent(item.id)}`}
                    prefetch={false}
                  >
                    <Icon name="projects" className="text-sand" />
                    <h2 className="break-words font-medium">{item.title}</h2>
                    <p className="text-sm text-white/60">
                      {t("photos")} · {item._count.photos}
                    </p>
                    <StatusBadge status={item.status}>
                      {statuses[item.status]}
                    </StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
