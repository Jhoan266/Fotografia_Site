import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/lib/auth";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { Icon } from "@/components/ui/Icon";
import { PortalNavigation } from "@/components/client/PortalNavigation";

export default async function ClientLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser();
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("client.portal");
  async function logout() {
    "use server";
    await logoutAction(locale);
  }
  return (
    <div className="portal-shell portal-dark studio-shell">
      <a href="#portal-content" className="portal-skip">
        {t("skip")}
      </a>
      <aside className="studio-sidebar portal-sidebar">
        <Link href={`/${locale}/app`} className="studio-brand ds-focus">
          <span className="studio-brand-symbol">
            <Icon name="camera" width="23" height="23" />
          </span>
          <span>
            <strong>
              Vera Solís<span className="text-sand">.</span>
            </strong>
            <small>PHOTOGRAPHY STUDIO</small>
          </span>
        </Link>
        <p className="studio-nav-label">{t("privateSpace")}</p>
        <PortalNavigation
          locale={locale}
          labels={{
            home: t("home"),
            sessions: t("mySessions"),
            guide: t("guide"),
          }}
        />
        <div className="studio-sidebar-bottom">
          <div className="studio-sidebar-note">
            <span className="section-label">{t("madeForYou")}</span>
            <p>{t("welcomeNote")}</p>
            <Link href={`/${locale}/app#portal-sessions`} className="ds-focus">
              {t("mySessions")}
              <Icon name="arrow" width="16" />
            </Link>
          </div>
          <Link href={`/${locale}`} className="studio-nav-link ds-focus">
            <Icon name="external" />
            {t("website")}
          </Link>
          <form action={logout}>
            <button type="submit" className="studio-nav-link ds-focus w-full">
              <Icon name="logout" />
              {t("logout")}
            </button>
          </form>
          <div className="studio-profile">
            <span className="studio-avatar">
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{t("clientAccount")}</small>
            </div>
            <span className="studio-online" aria-label={t("privateSpace")} />
          </div>
        </div>
      </aside>
      <div className="studio-workspace">
        <header className="studio-topbar portal-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-sand">
              <Icon name="overview" width="17" />
            </span>
            <span className="text-sm text-white/50">{t("privateSpace")}</span>
            <span className="text-white/20">/</span>
            <span className="text-sm">{t("home")}</span>
          </div>
          <div className="portal-header-tools">
            <LocaleSwitcher current={locale} />
            <details className="portal-account">
              <summary aria-label={t("account")}>
                <span className="portal-avatar">
                  {user.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="portal-account-name">{user.name}</span>
                <span className="portal-account-chevron">⌄</span>
              </summary>
              <div className="portal-account-menu">
                <p>{user.email}</p>
                {user.role === "ADMIN" && (
                  <Link href={`/${locale}/admin`}>{t("backStudio")}</Link>
                )}
                <Link href={`/${locale}`}>{t("website")}</Link>
                <form action={logout}>
                  <button type="submit">
                    <Icon name="logout" width="15" />
                    {t("logout")}
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <main id="portal-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="portal-footer">
          <Link href={`/${locale}`} className="portal-footer-brand">
            Vera Solís.
          </Link>
          <p>{t("footer")}</p>
          <span>
            <Icon name="lock" width="12" />
            {t("privateGallery")}
          </span>
        </footer>
      </div>
    </div>
  );
}
