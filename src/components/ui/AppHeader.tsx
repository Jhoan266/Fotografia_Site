import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/ui/BrandMark";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { logoutAction } from "@/lib/auth";
import type { SessionUser } from "@/lib/session";

export async function AppHeader({
  locale,
  user,
  mode,
}: {
  locale: string;
  user: SessionUser;
  mode: "client" | "admin";
}) {
  const t = await getTranslations("nav");

  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-8">
        <BrandMark
          locale={locale}
          href={mode === "admin" ? `/${locale}/admin` : `/${locale}/app`}
          accent={mode === "admin"}
        />
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-white/75">
          <LocaleSwitcher current={locale} />
          {mode === "client" ? (
            <Link href={`/${locale}/app`} className="hover:text-white">
              {t("sessions")}
            </Link>
          ) : (
            <>
              <Link href={`/${locale}/admin`} className="hover:text-white">
                {t("panel")}
              </Link>
              <Link href={`/${locale}/admin/clients`} className="hover:text-white">
                {t("clients")}
              </Link>
              <Link href={`/${locale}/admin/projects`} className="text-sand hover:text-sand-soft">
                {t("projects")}
              </Link>
            </>
          )}
          <span className="hidden text-white/40 sm:inline">·</span>
          <span className="text-white/90">{user.name}</span>
          <form
            action={async () => {
              "use server";
              await logoutAction(locale);
            }}
          >
            <button type="submit" className="hover:text-white">
              {t("logout")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
