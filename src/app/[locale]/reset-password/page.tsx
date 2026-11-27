import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RecoveryForm } from "@/components/auth/RecoveryForm";

export const metadata = { robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("accountRecovery");
  return <main className="password-page"><div className="password-card">
    <p className="password-eyebrow">{t("label")}</p><h1>{t("title")}</h1><p>{t("help")}</p>
    <RecoveryForm locale={locale} /><Link href={`/${locale}/login`}>{t("back")}</Link>
  </div></main>;
}
