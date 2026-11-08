import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/ui/AppHeader";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("ADMIN");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("admin");

  const [clients, projects, photos] = await Promise.all([
    prisma.clientProfile.count(),
    prisma.project.count(),
    prisma.photo.count(),
  ]);

  return (
    <main>
      <AppHeader locale={locale} user={user} mode="admin" />
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <p className="section-label">{t("panel")}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">{t("panel")}</h1>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Stat label={t("clients")} value={clients} href={`/${locale}/admin/clients`} />
          <Stat label={t("projects")} value={projects} href={`/${locale}/admin/projects`} />
          <Stat label={t("photos")} value={photos} href={`/${locale}/admin/projects`} />
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="border border-white/10 p-6 transition hover:border-sand/40">
      <p className="text-xs tracking-[0.2em] text-sand uppercase">{label}</p>
      <p className="mt-3 font-display text-4xl">{value}</p>
    </Link>
  );
}
