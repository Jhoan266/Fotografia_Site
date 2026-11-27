import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAuthenticatedSession } from "@/lib/session";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";

export const metadata = { robots: { index: false, follow: false } };

export default async function PasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getAuthenticatedSession(true);
  if (!session) redirect(`/${locale}/login`);
  const t = await getTranslations("accountSecurity");
  return <main className="password-page"><div className="password-card">
    <p className="password-eyebrow">{t("label")}</p><h1>{session.user.mustChangePassword ? t("firstTitle") : t("title")}</h1>
    <p>{session.user.mustChangePassword ? t("firstHelp") : t("description")}</p>
    <PasswordChangeForm locale={locale} />
    {!session.user.mustChangePassword && <Link href={`/${locale}/${session.user.role === "ADMIN" ? "admin" : "app"}`}>{t("back")}</Link>}
  </div></main>;
}
