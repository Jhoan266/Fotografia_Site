import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StudioIcon } from "@/components/admin/StudioIcon";
import { RecentProjects } from "@/components/admin/RecentProjects";
import { CollectionCover } from "@/components/ui/CollectionCover";
import { requireRole } from "@/lib/session";
import { getAdminDashboard } from "@/modules/dashboard/queries";
export default async function AdminHomePage({ params }: {
    params: Promise<{
        locale: string;
    }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const user = await requireRole("ADMIN");
    if (!user)
        redirect('/' + locale + '/login');
    const t = await getTranslations("admin"), a = await getTranslations("atelier");
    const data = await getAdminDashboard(), number = new Intl.NumberFormat(locale), base = '/' + locale + '/admin/projects';
    const featured = data.recentProjects.find(p => p.photos.length) || data.recentProjects[0];
    const preview = (project: typeof data.recentProjects[number] | undefined) => {
        const photo = project?.coverPhoto?.trashedAt === null ? project.coverPhoto : project?.photos[0];
        return photo ? '/api/media/' + (photo.thumbKey || photo.storageKey) : null;
    };
    const stats = [{ label: t("studio.activeProjects"), value: data.drafts + data.delivered, href: base }, { label: t("clients"), value: data.clients, href: '/' + locale + '/admin/clients' }, { label: t("studio.deliveredGalleries"), value: data.delivered, href: base }, { label: t("photos"), value: data.photos, href: base }];
    return <div className="studio-dashboard atelier-dashboard">
  <div className="studio-page-heading"><div><p className="studio-eyebrow">{a("studioLabel")}</p><h1>{t("studio.greeting", { name: user.name.split(' ')[0] })}<span>.</span></h1><p>{a("studioIntro")}</p></div>
   <div className="studio-heading-actions"><Link className="studio-outline-button ds-focus" href={'/' + locale + '/admin/clients#new-client'}>{t("newClient")}</Link><Link className="studio-primary-button ds-focus" href={base + '/new'}><StudioIcon name="plus" width="17"/>{t("newProject")}</Link></div>
  </div>
  <section className="atelier-feature" aria-label={a("spotlight")}>
   <Link href={featured ? base + '/' + featured.id : base + '/new'} className="atelier-feature-photo ds-focus"><CollectionCover src={preview(featured)} title={featured?.title || a("firstStory")} priority/><span className="atelier-photo-caption"><span>{a("spotlight")}</span><strong>{featured?.title || a("firstStory")}</strong><span>{featured?.client.user.name || a("firstStoryBody")} <span aria-hidden="true">↗</span></span></span></Link>
   <div className="atelier-feature-copy"><p className="studio-eyebrow">{a("creativeSpace")}</p><h2>{a("heroTitle")}</h2><p>{a("heroBody")}</p><Link href={base} className="atelier-text-link ds-focus">{a("exploreCollections")} <span aria-hidden="true">↗</span></Link><span className="atelier-signature">Vera Solís</span></div>
  </section>
  <section className="studio-metrics" aria-label={t("studio.metrics")}>{stats.map(s => <Link href={s.href} key={s.label} className="studio-metric ds-focus"><strong>{number.format(s.value).padStart(2, '0')}</strong><span>{s.label}</span></Link>)}</section>
  <RecentProjects locale={locale} projects={data.recentProjects.map(p => ({ id: p.id, title: p.title, status: p.status, client: p.client.user.name, count: p._count.photos, date: p.sessionDate?.toISOString() ?? null, thumbnail: preview(p) }))}/>
  <div className="atelier-operations">
   <section className="studio-panel"><div className="studio-panel-heading"><div><p className="studio-eyebrow">{a("nextChapter")}</p><h2>{t("studio.upcoming")}</h2></div><StudioIcon name="calendar"/></div>
    {data.upcomingSessions.length ? <ul className="studio-agenda">{data.upcomingSessions.map(s => <li key={s.id}><Link href={base + '/' + s.id} className="ds-focus"><span className="studio-date-tile"><small>{new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'Europe/Madrid' }).format(s.sessionDate!)}</small><strong>{new Intl.DateTimeFormat(locale, { day: '2-digit', timeZone: 'Europe/Madrid' }).format(s.sessionDate!)}</strong></span><div><h3>{s.title}</h3><p>{s.client.user.name}</p></div><StudioIcon name="arrow" width="17"/></Link></li>)}</ul> : <div className="atelier-empty-inline"><p>{t("studio.noUpcomingDescription")}</p><Link href={base + '/new'} className="atelier-text-link">{t("studio.schedule")} ↗</Link></div>}
   </section>
   <section className="studio-panel studio-pending"><div className="studio-panel-heading"><div><p className="studio-eyebrow">{a("inProgress")}</p><h2>{t("studio.pending")}</h2></div><span className="studio-count-badge">{data.drafts}</span></div>
    {data.pendingProjects.length ? <ul>{data.pendingProjects.map(p => <li key={p.id}><Link href={base + '/' + p.id} className="ds-focus"><span className="studio-task-icon"><StudioIcon name={p._count.photos ? 'check' : 'camera'} width="17"/></span><div><h3>{p.title}</h3><p>{p._count.photos ? t("studio.reviewDelivery") : t("studio.addPhotos")}</p></div><StudioIcon name="arrow" width="15"/></Link></li>)}</ul> : <div className="atelier-empty-inline"><h3>{t("studio.allCaughtUp")}</h3><p>{t("studio.allCaughtUpDescription")}</p></div>}
   </section>
  </div>
  <section className="atelier-connections"><div><p className="studio-eyebrow">{t("studio.clientActivity")}</p><h2>{a("connectionTitle")}</h2></div><dl>{[{ label: t("studio.favorites"), value: data.favorites }, { label: t("studio.selections"), value: data.selections }, { label: t("studio.comments"), value: data.comments }].map(s => <div key={s.label}><dd>{number.format(s.value)}</dd><dt>{s.label}</dt></div>)}</dl></section>
  <section className="atelier-studio-footer"><div><p className="studio-eyebrow">{t("deliveryOverview")}</p><p>{t("draft")}: {data.drafts} · {t("delivered")}: {data.delivered} · {t("archived")}: {data.archived}</p></div><Link href={'/' + locale} className="atelier-text-link">{t("studio.yourWebsite")} ↗</Link></section>
  <footer className="studio-dashboard-footer"><span>VERA SOLÍS · STUDIO</span><span>{t("studio.footer")}</span></footer>
 </div>;
}
