import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/ui/AppHeader";
import { UploadPanel } from "@/components/admin/UploadPanel";
import { requireRole } from "@/lib/session";
import { publishProject } from "@/modules/projects/actions";
import { getProjectForAdmin } from "@/modules/projects/queries";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireRole("ADMIN");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("admin");
  const project = await getProjectForAdmin(id);
  if (!project) notFound();

  return (
    <main>
      <AppHeader locale={locale} user={user} mode="admin" />
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <p className="section-label">{t("projects")}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">{project.title}</h1>
        <p className="mt-2 text-sm text-white/55">{project.client.user.name} · {project.client.user.email}</p>
        <p className="mt-2 text-xs tracking-[0.18em] text-sand uppercase">{t("status")}: {project.status}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <form action={publishProject.bind(null, locale, id)}>
            <button type="submit" className="btn-primary">{t("publish")}</button>
          </form>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-2xl">{t("upload")}</h2>
          <div className="mt-4"><UploadPanel projectId={project.id} label={t("upload")} /></div>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-2xl">{t("photos")} ({project.photos.length})</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {project.photos.map((photo) => (
              <div key={photo.id} className="aspect-[4/5] overflow-hidden bg-ink-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${photo.thumbKey || photo.storageKey}`} alt={photo.filename} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {project.packs.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-2xl">{t("packs")}</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {project.packs.map(({ pack }) => (
                <li key={pack.id}>{pack.name} — {(pack.priceCents / 100).toFixed(2)} {pack.currency}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
