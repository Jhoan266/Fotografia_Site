import Link from "next/link";
import {
  ActionLink,
  EmptyState,
  PageHeading,
  StatusBadge,
} from "@/components/ui/design-system";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/session";
import { listProjectsForAdmin } from "@/modules/projects/queries";

export default async function AdminProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("ADMIN");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("admin");
  const projects = await listProjectsForAdmin();

  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <PageHeading
          eyebrow={t("panel")}
          title={t("projects")}
          actions={
            <ActionLink href={`/${locale}/admin/projects/new`}>
              {t("newProject")}
            </ActionLink>
          }
        />
        {projects.length === 0 && (
          <div className="mt-10">
            <EmptyState
              title={t("emptyProjects")}
              description={t("emptyProjectsDescription")}
            >
              <ActionLink href={`/${locale}/admin/projects/new`}>
                {t("newProject")}
              </ActionLink>
            </EmptyState>
          </div>
        )}
        <ul className="workspace-project-list mt-10 space-y-5">
          {projects.map((p) => (
            <li key={p.id} className="ds-card p-5">
              <Link
                href={`/${locale}/admin/projects/${p.id}`}
                className="ds-focus group block rounded"
              >
                <div className="flex flex-wrap items-center gap-y-2 text-xs">
                  <StatusBadge status={p.status}>
                    {t(
                      (
                        {
                          DRAFT: "draft",
                          DELIVERED: "delivered",
                          ARCHIVED: "archived",
                        } as const
                      )[p.status],
                    )}
                  </StatusBadge>
                  <span className="ml-3 text-white/65">
                    {p._count.photos} {t("photos")}
                  </span>
                </div>
                <h2 className="mt-2 break-words text-xl group-hover:text-sand-soft">
                  {p.title}
                </h2>
                <p className="mt-1 break-words text-sm leading-relaxed text-white/55">
                  {p.client.user.name} · {p.client.user.email}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
