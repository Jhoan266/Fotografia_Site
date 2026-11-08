"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { gallery, GalleryItem } from "@/lib/content";

export function PortfolioMosaic() {
  const t = useTranslations("portfolio");
  const [filter, setFilter] = useState<"all" | GalleryItem["category"]>("all");
  const [active, setActive] = useState<GalleryItem | null>(null);

  const items = useMemo(
    () => (filter === "all" ? gallery : gallery.filter((g) => g.category === filter)),
    [filter],
  );

  const filters = [
    { id: "all" as const, label: t("all") },
    { id: "bodas" as const, label: t("weddings") },
    { id: "sesiones" as const, label: t("sessions") },
    { id: "book" as const, label: t("book") },
  ];

  return (
    <section id="portafolio" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
      <p className="section-label">{t("label")}</p>
      <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h2 className="font-display text-3xl font-semibold md:text-5xl">{t("title")}</h2>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs tracking-wide transition ${
                filter === f.id
                  ? "bg-sand text-ink"
                  : "border border-white/20 text-white/70 hover:border-white/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid auto-rows-[220px] grid-cols-1 gap-3 md:grid-cols-3 md:auto-rows-[260px]">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className={`group relative overflow-hidden ${
              item.span === "tall" ? "mosaic-tall" : ""
            } ${item.span === "wide" ? "mosaic-wide" : ""}`}
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={item.alt}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 md:opacity-0 md:transition md:group-hover:opacity-100" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-left">
              <span className="text-sm text-white">{item.alt}</span>
              <span className="text-lg text-white/80">＋</span>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.src}
              alt={active.alt}
              className="max-h-[80vh] w-auto object-contain"
            />
            <div className="mt-4 flex items-center justify-between gap-4 text-sm text-white/80">
              <p>{active.alt}</p>
              <button type="button" className="btn-ghost !py-2" onClick={() => setActive(null)}>
                Esc
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
