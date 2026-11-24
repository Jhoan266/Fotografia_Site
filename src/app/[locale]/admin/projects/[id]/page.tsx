import { ActionLink, Button, PageHeading, StatusBadge } from "@/components/ui/design-system";
import { ActionForm } from "@/components/admin/ActionForm";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { UploadPanel } from "@/components/admin/UploadPanel";
import { AdminPhotoManager } from "@/components/admin/AdminPhotoManager";
import { GalleryOrganization } from "@/components/admin/GalleryOrganization";
import { SelectionReview } from "@/components/admin/SelectionReview";
import { readSubmittedPhotos } from "@/modules/projects/selection-export";
import { previewCode } from "@/modules/photos/preview-identity";
import { getAuthenticatedSession, hasRecentVaultVerification } from "@/lib/session";
import { publishProject, updateDeliverySettings } from "@/modules/projects/actions";
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
  const protection = await getTranslations("previewProtection");
  const project = await getProjectForAdmin(id);
  if (!project) notFound();
  const format = await getFormatter();
  const expiresOn = project.expiresAt
    ? new Date(project.expiresAt.getTime() - 86_400_000).toISOString().slice(0, 10)
    : "";
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

        <ActionForm id="gallery-delivery-settings"
          action={updateDeliverySettings.bind(null, locale, id)}
          className="ds-card mt-8 space-y-5 p-5 md:p-6">
          <h2 className="font-display text-2xl">{t("deliverySettings")}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/65">{t("deliverySettingsHelp")}</p>
          <label className="flex items-start gap-3 text-sm">
            <input className="mt-1" type="checkbox" name="downloadsEnabled" defaultChecked={project.downloadsEnabled} />
            <span>{t("allowDownloads")}</span>
          </label>
          <label className="block max-w-sm space-y-2 text-sm">
            <span className="flex items-start gap-3">
              <input className="mt-1" type="checkbox" name="watermarkEnabled" defaultChecked={project.watermarkEnabled} />
              <span>{protection("enable")}</span>
            </span>
          </label>
          <label className="block max-w-xl space-y-2 text-sm">
            <span>{protection("text")}</span>
            <input className="input-field" name="watermarkText" maxLength={60} required defaultValue={project.watermarkText} />
          </label>
          <p className="max-w-2xl text-xs leading-relaxed text-white/60">{protection("help")}</p>
          <p className="text-sm text-sand">{protection("code", { code: previewCode(project.client.user.id, id) })}</p>
          <label className="block max-w-sm space-y-2 text-sm">
            <span>{t("expiresOn")}</span>
            <input className="input-field" type="date" name="expiresOn" defaultValue={expiresOn} />
          </label>
          <p className="max-w-2xl text-xs leading-relaxed text-white/55">{t("expiryHelp")}</p>
          <Button type="submit">{t("saveDeliverySettings")}</Button>
        </ActionForm>

        <details className="ds-card mt-8 space-y-4 p-5 md:p-6">
          <summary className="cursor-pointer font-display text-xl">{protection("activity")}</summary>
          <p className="text-xs leading-relaxed text-white/60">{protection("activityHelp")}</p>
          <ul className="space-y-3">
            {project.deliveryLogs.map(log => <li key={log.id} className="rounded border border-white/10 p-3 text-sm">
              <p className="break-words">{log.filename} · {protection(log.kind === "PREVIEW" ? "preview" : log.kind === "ZIP" ? "zip" : "download")}</p>
              <p className="mt-1 text-xs text-white/55">{log.clientCode} · {format.dateTime(log.lastAt, { dateStyle: "short", timeStyle: "short" })} · {protection("requests", { count: log.requests })}</p>
            </li>)}
            {!project.deliveryLogs.length && <li className="text-sm text-white/55">{protection("empty")}</li>}
          </ul>
        </details>

        <SelectionReview projectId={id} confirmed={Boolean(project.selectionConfirmedAt)}
          version={project.selectionVersion}
          items={project.selectionConfirmedAt ? readSubmittedPhotos(project.selectionSubmissions[0]?.items) : []} />

        <GalleryOrganization projectId={id} albums={project.albums}
          key={JSON.stringify([project.albums, project.coverPhotoId, activePhotos.map(p => [p.id, p.albumId])])}
          photos={activePhotos.map(p => ({ id: p.id, filename: p.filename, albumId: p.albumId }))}
          coverPhotoId={activePhotos.some(p => p.id === project.coverPhotoId) ? project.coverPhotoId : null} />

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
