import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/session";
import { logoutAction } from "@/lib/auth";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { StudioNavigation } from "@/components/admin/StudioNavigation";
import { StudioIcon } from "@/components/admin/StudioIcon";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireRole("ADMIN");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("admin");
  return (
    <div className="studio-shell">
      <a href="#studio-content" className="studio-skip">
        {t("studio.skip")}
      </a>
      <aside className="studio-sidebar">
        <Link href={`/${locale}/admin`} className="studio-brand ds-focus">
          <span className="studio-brand-symbol">
            <StudioIcon name="camera" width="23" height="23" />
          </span>
          <span>
            <strong>
              Vera Solís<span className="text-sand">.</span>
            </strong>
            <small>PHOTOGRAPHY STUDIO</small>
          </span>
        </Link>
        <p className="studio-nav-label">{t("studio.workspace")}</p>
        <StudioNavigation
          locale={locale}
          labels={{
            overview: t("studio.overview"),
            projects: t("projects"),
            clients: t("clients"),
            vault: t("vault.title"),
          }}
        />
        <div className="studio-sidebar-bottom">
          <div className="studio-sidebar-note">
            <span className="section-label">{t("studio.yourSpace")}</span>
            <p>{t("studio.sidebarNote")}</p>
            <Link href={`/${locale}/admin/projects/new`} className="ds-focus">
              {t("newProject")} <StudioIcon name="arrow" width="16" />
            </Link>
          </div>
          <Link href={`/${locale}`} className="studio-nav-link ds-focus">
            <StudioIcon name="external" />
            {t("studio.visitSite")}
          </Link>
          <form
            action={async () => {
              "use server";
              await logoutAction(locale);
            }}
          >
            <button className="studio-nav-link ds-focus w-full" type="submit">
              <StudioIcon name="logout" />
              {t("studio.logout")}
            </button>
          </form>
          <div className="studio-profile">
            <span className="studio-avatar">
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{t("studio.photographer")}</small>
            </div>
            <span className="studio-online" aria-label={t("studio.active")} />
          </div>
        </div>
      </aside>
      <div className="studio-workspace">
        <header className="studio-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-sand">
              <StudioIcon name="overview" width="17" />
            </span>
            <span className="text-sm text-white/50">
              {t("studio.workspace")}
            </span>
            <span className="text-white/20">/</span>
            <span className="text-sm">{t("panel")}</span>
          </div>
          <LocaleSwitcher current={locale} />
        </header>
        <main id="studio-content" className="studio-main">
          {children}
        </main>
      </div>
    </div>
  );
}
