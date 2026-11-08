import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/ui/AppHeader";
import { GalleryClient } from "@/components/client/GalleryClient";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createProjectOrder } from "@/modules/orders/actions";

export default async function ProjectGalleryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("client");
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      photos: {
        orderBy: { sortOrder: "asc" },
        include: {
          favorites: { where: { userId: user.id } },
          selections: { where: { userId: user.id } },
          comments: {
            include: { user: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      packs: { include: { pack: true } },
    },
  });

  if (!project) notFound();
  if (user.role === "CLIENT" && project.client.userId !== user.id) {
    redirect(`/${locale}/app`);
  }
  if (user.role === "CLIENT" && project.status !== "DELIVERED") {
    redirect(`/${locale}/app`);
  }

  const photos = project.photos.map((photo) => ({
    id: photo.id,
    filename: photo.filename,
    thumbUrl: `/api/media/${photo.thumbKey || photo.storageKey}`,
    favorite: photo.favorites.length > 0,
    selected: photo.selections.some((s) => s.status === "SELECTED"),
    comments: photo.comments.map((c) => ({
      id: c.id,
      body: c.body,
      author: c.user.name,
      createdAt: c.createdAt.toISOString(),
    })),
  }));

  return (
    <main>
      <AppHeader locale={locale} user={user} mode="client" />
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <Link href={`/${locale}/app`} className="text-sm text-white/50 hover:text-white">
          ← {t("back")}
        </Link>
        <p className="section-label mt-6">{t("galleryLabel")}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold md:text-5xl">
          {project.title}
        </h1>
        <p className="mt-3 text-white/60">{t("delivered")}</p>

        <GalleryClient locale={locale} projectId={project.id} photos={photos} />

        {project.packs.length > 0 && (
          <div className="mt-16 border-t border-white/10 pt-10">
            <h2 className="font-display text-2xl">{t("packs")}</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {project.packs.map(({ pack }) => (
                <li key={pack.id} className="border border-white/10 p-5">
                  <h3 className="text-lg">{pack.name}</h3>
                  <p className="mt-2 text-sm text-white/55">{pack.description}</p>
                  <p className="mt-4 text-sand">
                    {(pack.priceCents / 100).toFixed(2)} {pack.currency}
                  </p>
                  <form
                    className="mt-4"
                    action={async () => {
                      "use server";
                      await createProjectOrder(project.id, pack.id);
                    }}
                  >
                    <button type="submit" className="btn-ghost !py-2 text-xs">
                      {t("packsSoon")}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-white/40">{t("orderStub")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
