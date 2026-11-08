"use client";

import { useTranslations } from "next-intl";
import { aboutImage, brand } from "@/lib/content";

export function ServicesSection() {
  const t = useTranslations("services");
  const items = ["weddings", "sessions", "book"] as const;

  return (
    <section id="servicios" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
      <p className="section-label">{t("label")}</p>
      <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold md:text-5xl">
        {t("title")}
      </h2>
      <div className="mt-12 grid gap-10 md:grid-cols-3">
        {items.map((key, i) => (
          <div key={key} className="border-t border-white/10 pt-6">
            <p className="text-sand text-xs tracking-[0.25em]">0{i + 1}</p>
            <h3 className="mt-3 font-display text-2xl">{t(`items.${key}.title`)}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {t(`items.${key}.body`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AboutSection() {
  const t = useTranslations("about");
  return (
    <section id="sobre-mi" className="mx-auto grid max-w-7xl gap-10 px-5 py-24 md:grid-cols-2 md:px-8">
      <div className="relative min-h-[420px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={aboutImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="flex flex-col justify-center">
        <p className="section-label">{t("label")}</p>
        <h2 className="mt-3 font-display text-3xl font-semibold md:text-5xl">{t("title")}</h2>
        <p className="mt-6 max-w-md font-serif text-xl italic text-white/85">
          {t("body")}
        </p>
      </div>
    </section>
  );
}

export function ProcessSection() {
  const t = useTranslations("process");
  const steps = ["1", "2", "3", "4"] as const;
  return (
    <section id="proceso" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
      <p className="section-label">{t("label")}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold md:text-5xl">{t("title")}</h2>
      <div className="mt-12 grid gap-8 md:grid-cols-4">
        {steps.map((step) => (
          <div key={step} className="border-l border-sand/40 pl-4">
            <p className="text-xs tracking-[0.25em] text-sand">{step.padStart(2, "0")}</p>
            <h3 className="mt-3 font-display text-xl">{t(`steps.${step}.title`)}</h3>
            <p className="mt-2 text-sm text-white/60">{t(`steps.${step}.body`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ContactSection() {
  const t = useTranslations("contact");
  const wa = `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(brand.whatsappMessage)}`;
  return (
    <section id="contacto" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
      <div className="border border-white/10 bg-white/[0.02] px-6 py-14 md:px-12">
        <p className="section-label">{t("label")}</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold md:text-5xl">
          {t("title")}
        </h2>
        <p className="mt-4 max-w-lg text-white/65">{t("body")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a href={wa} target="_blank" rel="noreferrer" className="btn-wa">
            {t("cta")}
          </a>
          <a href={`mailto:${brand.email}`} className="text-sm text-sand hover:underline">
            {brand.email}
          </a>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-white/10 px-5 py-10 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Vera Solís. {t("rights")}</p>
        <p>{t("placeholder")}</p>
      </div>
    </footer>
  );
}
