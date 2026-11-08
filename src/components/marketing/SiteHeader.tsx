"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/ui/BrandMark";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { brand } from "@/lib/content";

export function SiteHeader({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const wa = `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(brand.whatsappMessage)}`;

  const links = [
    { href: `#servicios`, label: t("services") },
    { href: `#portafolio`, label: t("portfolio") },
    { href: `#sobre-mi`, label: t("about") },
    { href: `#proceso`, label: t("process") },
    { href: `#contacto`, label: t("contact") },
  ];

  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-8">
        <BrandMark locale={locale} />
        <nav className="hidden items-center gap-6 text-sm text-white/70 lg:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LocaleSwitcher current={locale} />
          <Link
            href={`/${locale}/login`}
            className="hidden text-sm text-white/70 hover:text-white sm:inline"
          >
            {t("clientArea")}
          </Link>
          <a href={wa} target="_blank" rel="noreferrer" className="btn-wa !py-2 !text-xs">
            {t("whatsapp")}
          </a>
        </div>
      </div>
    </header>
  );
}
