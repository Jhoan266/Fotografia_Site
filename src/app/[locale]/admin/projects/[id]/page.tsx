import { ActionLink, Button, PageHeading, StatusBadge } from "@/components/ui/design-system";
import { ActionForm } from "@/components/admin/ActionForm";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { UploadPanel } from "@/components/admin/UploadPanel";
import { AdminPhotoManager } from "@/components/admin/AdminPhotoManager";
import { getAuthenticatedSession, hasRecentVaultVerification } from "@/lib/session";
import { publishProject } from "@/modules/projects/actions";
import { getProjectForAdmin } from "@/modules/projects/queries";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await getAuthenticatedSession();
  if (session?.user.role !== "ADMIN") redirect(`/${locale}/login`);
  const t = await getTranslations("admin");
  const project = await getProjectForAdmin(id);
  if (!project) notFound();
  const format = await getFormatter();
  const activePhotos = project.photos.filter((photo) => photo.trashedAt === null);
  const trashedPhotos = project.photos.flatMap(({ id, filename, trashedAt }) => trashedAt ? [
    { id, filename, trashedAt: format.dateTime(trashedAt, { dateStyle: "medium" }) },
  ] : []);

  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <PageHeading eyebrow={t("projects")} title={project.title}
          description={`${project.client.user.name} · ${project.client.user.email}`}
          actions={<ActionLink href={`/${locale}/admin/projects`} secondary>{t("backToProjects")}</ActionLink>} />
        <div className="mt-4"><StatusBadge status={project.status}>
          {t(({ DRAFT: "draft", DELIVERED: "delivered", ARCHIVED: "archived" } as const)[project.status])}
        </StatusBadge></div>

        <div className="mt-8 flex flex-wrap gap-3">
          <ActionForm action={publishProject.bind(null, locale, id)}>
            <Button type="submit" disabled={project.status === "DELIVERED"}>{t("publish")}</Button>
          </ActionForm>
        </div>

        <div className="ds-card mt-8 p-5 md:p-6">
          <h2 className="font-display text-2xl">{t("upload")}</h2>
          <div className="mt-4"><UploadPanel projectId={project.id} label={t("upload")} /></div>
        </div>

        <div className="ds-card mt-8 p-5 md:p-6">
          <h2 className="font-display text-2xl">{t("photos")} ({activePhotos.length})</h2>
          <div className="mt-4">
            <AdminPhotoManager
              projectId={project.id}
              key={JSON.stringify([activePhotos.map((photo) => photo.id), trashedPhotos.map((photo) => photo.id)])}
              trashedPhotos={trashedPhotos}
              initialVerifiedUntil={hasRecentVaultVerification(session) ? session.vaultVerifiedUntil!.getTime() : 0}
              initialPhotos={activePhotos.map((photo) => ({
                id: photo.id,
                filename: photo.filename,
                thumbUrl: `/api/media/${photo.thumbKey || photo.storageKey}`,
              }))}
            />
          </div>
        </div>

        {project.packs.length > 0 && (
          <div className="ds-card mt-8 p-5 md:p-6">
            <h2 className="font-display text-2xl">{t("packs")}</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {project.packs.map(({ pack }) => (
                <li key={pack.id}>{pack.name} — {new Intl.NumberFormat(locale, { style: "currency", currency: pack.currency }).format(pack.priceCents / 100)}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
