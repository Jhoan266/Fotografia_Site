import { setRequestLocale } from "next-intl/server";
import { BrandMark } from "@/components/ui/BrandMark";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <BrandMark locale={locale} />
        <div className="flex items-center gap-4">
          <LocaleSwitcher current={locale} />
          <Link href={`/${locale}/login`} className="text-sm text-white/70">
            {t("clientArea")}
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl items-center px-5 py-16 md:px-8 md:py-24">
        <LoginForm locale={locale} />
      </div>
    </main>
  );
}
