import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/ui/AppHeader";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("ADMIN");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("admin");

  const [clients, packs] = await Promise.all([
    prisma.clientProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pack.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  async function createProject(formData: FormData) {
    "use server";
    const admin = await requireRole("ADMIN");
    if (!admin) return;
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim() || null;
    const clientId = String(formData.get("clientId") || "");
    const sessionDateRaw = String(formData.get("sessionDate") || "");
    const packIds = formData.getAll("packIds").map(String);
    if (!title || !clientId) return;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        clientId,
        sessionDate: sessionDateRaw ? new Date(sessionDateRaw) : null,
        packs: {
          create: packIds.map((packId) => ({ packId })),
        },
      },
    });
    redirect(`/${locale}/admin/projects/${project.id}`);
  }

  return (
    <main>
      <AppHeader locale={locale} user={user} mode="admin" />
      <section className="mx-auto max-w-3xl px-5 py-14 md:px-8">
        <p className="section-label">{t("projects")}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">{t("projects")}</h1>
        <h2 className="mt-2 text-xl text-white/70">{t("newProject")}</h2>
        <form action={createProject} className="mt-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">
              {t("title")}
            </span>
            <input className="input-field" name="title" required />
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">
              {t("description")}
            </span>
            <textarea className="input-field min-h-28" name="description" />
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">
              {t("client")}
            </span>
            <select className="input-field" name="clientId" required defaultValue="">
              <option value="" disabled>
                —
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.user.name} • {c.user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] tracking-[0.2em] text-white/50 uppercase">
              {t("sessionDate")}
            </span>
            <input className="input-field" type="date" name="sessionDate" />
          </label>
          <fieldset className="space-y-3">
            <legend className="text-[11px] tracking-[0.2em] text-white/50 uppercase">
              {t("packs")}
            </legend>
            {packs.map((pack) => (
              <label key={pack.id} className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="packIds" value={pack.id} className="accent-sand" />
                {pack.name}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="btn-primary">
            {t("create")}
          </button>
        </form>
      </section>
    </main>
  );
}
