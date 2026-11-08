import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/lib/auth";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { Icon } from "@/components/ui/Icon";

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
  return (
    <div className="portal-shell">
      <a href="#portal-content" className="portal-skip">
        {t("skip")}
      </a>
      <header className="portal-header">
        <div className="portal-header-inner">
          <Link href={`/${locale}/app`} className="portal-brand">
            <span>
              Vera Solís<span>.</span>
            </span>
            <small>PHOTOGRAPHY</small>
          </Link>
          <nav aria-label={t("navigation")} className="portal-navigation">
            <Link href={`/${locale}/app`}>{t("mySessions")}</Link>
            <Link href={`/${locale}/app#portal-guide`}>{t("guide")}</Link>
          </nav>
          <div className="portal-header-tools">
            <span className="portal-private">
              <Icon name="lock" width="13" />
              {t("privateSpace")}
            </span>
            <LocaleSwitcher current={locale} appearance="light" />
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
                <form
                  action={async () => {
                    "use server";
                    await logoutAction(locale);
                  }}
                >
                  <button type="submit">
                    <Icon name="logout" width="15" />
                    {t("logout")}
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main id="portal-content">{children}</main>
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
  );
}
