import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEditor } from "@/modules/editorial/access";
import { modules, isModule } from "@/modules/editorial/schema";
import { readEditorialModule } from "@/modules/editorial/queries";
import { prisma } from "@/lib/prisma";
import { ModuleEditor } from "@/components/editorial/ModuleEditor";
import { setDesignerAccess } from "@/modules/editorial/team";

export default async function Studio({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const { locale } = await params;
  const user = await requireEditor();
  if (!user) notFound();
  const moduleKey = (await searchParams).module ?? "hero";
  if (!isModule(moduleKey)) notFound();
  const row = await readEditorialModule(locale, moduleKey, true);
  const history = await prisma.editorialRevision.findMany({
    where: { moduleId: locale + "/" + moduleKey },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, revision: true, action: true, createdAt: true },
  });
  const assets =
    moduleKey === "media"
      ? await prisma.editorialAsset.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, filename: true },
        })
      : [];
  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[230px_1fr]">
      <aside className="space-y-6">
        <h1 className="font-display text-3xl">Estudio de contenido</h1>
        <nav className="grid gap-2">
          {modules.map(([key, label]) => (
            <Link
              key={key}
              aria-current={key === moduleKey ? "page" : undefined}
              className={`ds-focus rounded px-3 py-2 ${key === moduleKey ? "bg-sand text-ink" : "bg-white/5"}`}
              href={`/${locale}/studio?module=${key}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2">
          {["es", "en", "fr"].map((lang) => (
            <Link key={lang} href={`/${lang}/studio?module=${moduleKey}`}>
              {lang.toUpperCase()}
            </Link>
          ))}
        </div>
        <Link className="block text-sand" href={`/${locale}/studio/preview`}>
          Vista previa
        </Link>
        <Link className="block text-sand" href={`/${locale}/studio/present`}>
          Presentar web
        </Link>
        <Link
          className="block text-sand"
          href={`/${locale}/${user.role === "ADMIN" ? "admin" : "app"}`}
        >
          Volver al panel
        </Link>
      </aside>
      <section className="min-w-0 space-y-6">
        <h2 className="font-display text-3xl">
          {modules.find(([key]) => key === moduleKey)![1]}
        </h2>
        <ModuleEditor
          key={locale + moduleKey}
          locale={locale}
          module={moduleKey}
          initial={row.values}
          revision={row.revision}
          owner={user.role === "ADMIN"}
          assets={assets}
          history={history.map((item) => ({
            ...item,
            date: item.createdAt.toLocaleString(locale),
          }))}
        />
        {user.role === "ADMIN" && (
          <details className="ds-card p-5">
            <summary>Acceso de diseñadores</summary>
            <p className="my-3 text-sm text-white/60">
              Usa una cuenta individual existente. El permiso permite editar
              borradores y medios.
            </p>
            <form action={setDesignerAccess} className="space-y-3">
              <label className="block">
                Correo
                <input
                  className="input-field"
                  name="email"
                  type="email"
                  required
                />
              </label>
              <label className="flex gap-2">
                <input name="enabled" type="checkbox" />
                Habilitar como diseñador
              </label>
              <button className="btn-ghost">Guardar permiso</button>
            </form>
          </details>
        )}
      </section>
    </main>
  );
}
