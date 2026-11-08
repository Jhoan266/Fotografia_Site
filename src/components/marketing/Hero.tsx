"use client";

import { useTranslations } from "next-intl";
import { brand, heroImage } from "@/lib/content";

export function Hero() {
  const t = useTranslations("hero");
  const wa = `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(brand.whatsappMessage)}`;

  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      <div className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-20 pt-28 md:px-8 md:pb-24">
        <p className="section-label mb-5 animate-fade-up text-white/80">
          {t("location")}
        </p>
        <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[0.95] tracking-tight text-white md:text-7xl lg:text-8xl">
          <span className="block overflow-hidden">
            <span className="block animate-mask-reveal">{t("brand")}</span>
          </span>
          <span className="mt-1 block overflow-hidden text-sand">
            <span className="block animate-mask-reveal [animation-delay:120ms]">
              {t("specialty")}
            </span>
          </span>
        </h1>
        <p className="mt-6 max-w-xl font-serif text-xl italic text-white/90 md:text-2xl">
          {t("tagline")}
        </p>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65 md:text-base">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href={wa} target="_blank" rel="noreferrer" className="btn-wa">
            <WhatsAppIcon />
            {t("ctaWhatsapp")}
          </a>
          <a href="#portafolio" className="btn-ghost">
            {t("ctaPortfolio")}
            <span aria-hidden>↓</span>
          </a>
        </div>
      </div>

      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-wa text-black shadow-soft"
        aria-label="WhatsApp"
      >
        <WhatsAppIcon />
      </a>
    </section>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65a11.9 11.9 0 0 0 5.76 1.47h.01c6.55 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.44ZM12.07 21.15h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.74.98 1-3.64-.24-.37a9.86 9.86 0 0 1-1.51-5.25c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.98c0 5.45-4.44 9.85-9.89 9.85Zm5.43-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.04-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}
